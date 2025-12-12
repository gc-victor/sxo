/**
 * Robust, cross-platform spawn wrapper for sxo CLI
 * Node >= 20, ESM
 *
 * Features:
 * - Cross-platform Node spawn via process.execPath
 * - Streamed stdout/stderr with line-wise callbacks and optional tee to parent stdio
 * - Graceful signal forwarding (SIGINT/SIGTERM) with optional forced kill
 * - AbortSignal support to cancel processes
 * - Clean listener teardown on exit
 */

import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { detectRuntime } from "../server/shared/runtime.js";

/**
 * @typedef {Object} SpawnOptions
 * @property {string} [cwd]             - Working directory
 * @property {Record<string,string|undefined>} [env] - Environment vars to merge with process.env
 * @property {"pipe"|"inherit"} [stdio] - Stdio mode (default: "pipe")
 * @property {boolean} [inheritOutput]  - Tee child output to parent stdio when stdio="pipe" (default: true)
 * @property {(line: string, chunk: Buffer) => void} [onStdout] - Line callback for stdout
 * @property {(line: string, chunk: Buffer) => void} [onStderr] - Line callback for stderr
 * @property {string} [prefix]          - Optional prefix to add to each output line
 * @property {AbortSignal} [signal]     - AbortSignal to cancel the process
 * @property {number} [forceKillAfterMs]- Force SIGKILL after this many ms on shutdown (default: 5000)

 */

/**
 * @typedef {Object} SpawnResult
 * @property {number|null} code
 * @property {NodeJS.Signals|null} signal
 * @property {boolean} success
 * @property {number} pid
 */

/**
 * Spawn a child process with robust handling.
 * - For stdio="pipe", output is line-buffered and streamed to callbacks and optionally to parent stdio.
 * - For stdio="inherit", output is handled by the terminal directly (no callbacks).
 * - Signals SIGINT/SIGTERM from the parent are forwarded to the child; forced kill after timeout.
 *
 * @param {string} command
 * @param {string[]} [args]
 * @param {SpawnOptions} [options]
 * @returns {{ child: import('node:child_process').ChildProcess, wait: Promise<SpawnResult> }}
 */
export function spawnProcess(command, args = [], options = {}) {
    const { cwd, env, stdio = "pipe", inheritOutput = true, onStdout, onStderr, prefix = "", signal, forceKillAfterMs = 5000 } = options;

    const childEnv = { ...process.env, ...(env || {}) };

    const usePipe = stdio !== "inherit";
    const child = spawn(command, args, {
        cwd,
        env: childEnv,
        windowsHide: true,
        stdio: usePipe ? ["inherit", "pipe", "pipe"] : "inherit",
    });

    const removeFns = [];
    const cleanup = () => {
        while (removeFns.length) {
            try {
                const fn = removeFns.pop();
                fn?.();
            } catch {
                // ignore teardown errors
            }
        }
    };

    // Wire abort signal -> terminate child
    if (signal && typeof signal.addEventListener === "function") {
        const onAbort = () => {
            terminate(child, "SIGTERM", forceKillAfterMs);
        };
        signal.addEventListener("abort", onAbort, { once: true });
        removeFns.push(() => signal.removeEventListener("abort", onAbort));
    }

    // Forward parent SIGINT/SIGTERM to child
    const stopHandlers = forwardSignals(child, forceKillAfterMs);
    removeFns.push(...stopHandlers);

    // Output wiring (line-buffered) if not inheriting stdio
    if (usePipe) {
        if (child.stdout) {
            wireOutput(child.stdout, onStdout, inheritOutput ? process.stdout : null, prefix);
        }
        if (child.stderr) {
            wireOutput(child.stderr, onStderr, inheritOutput ? process.stderr : null, prefix);
        }
    }

    const wait = new Promise((resolve) => {
        let settled = false;

        const onExit = (code, sig) => {
            if (settled) return;
            settled = true;
            cleanup();
            const res = {
                code: typeof code === "number" ? code : null,
                signal: sig ?? null,
                success: code === 0,
                pid: child.pid ?? -1,
            };
            resolve(res);
        };

        child.once("exit", onExit);
        child.once("error", (_err) => onExit(1, null));
    });

    return { child, wait };
}

/**
 * Get the runtime-appropriate command and prefix args for spawning scripts.
 * Detects Node.js, Bun, or Deno and returns the correct executable configuration.
 *
 * @returns {{ command: string, prefix: string[] }}
 */
function getRuntimeExecutable() {
    const runtime = detectRuntime();
    switch (runtime) {
        case "bun":
            // Bun can execute scripts directly via its process.execPath
            return { command: process.execPath, prefix: [] };
        case "deno":
            // Deno needs 'run' subcommand and permissions
            return {
                command: process.execPath,
                prefix: ["run", "--allow-all"],
            };
        default:
            return { command: process.execPath, prefix: [] };
    }
}

/**
 * Spawn a script using the current runtime (Node.js, Bun, or Deno).
 * Automatically detects the runtime and uses the appropriate executable and flags.
 *
 * @param {string} scriptPath - Path to the script entry point
 * @param {SpawnOptions & { args?: string[], runtimeOptions?: string[] }} [options]
 * @returns {{ child: import('node:child_process').ChildProcess, wait: Promise<SpawnResult> }}
 */
export function spawnRuntime(scriptPath, options = {}) {
    const { command, prefix } = getRuntimeExecutable();
    const { args = [], runtimeOptions = [], ...rest } = options;
    const resolved = path.resolve(scriptPath);
    const finalArgs = [...prefix, ...(runtimeOptions || []), resolved, ...(args || [])];
    return spawnProcess(command, finalArgs, rest);
}

/**
 * Forward SIGINT and SIGTERM from parent to child with an optional forced kill timeout.
 * @param {import('node:child_process').ChildProcess} child
 * @param {number} forceKillAfterMs
 * @returns {Array<() => void>} cleanup functions
 */
function forwardSignals(child, forceKillAfterMs) {
    const cleanups = [];

    const makeHandler = (sig) => {
        return () => {
            terminate(child, sig, forceKillAfterMs);
        };
    };

    const onSigint = makeHandler("SIGINT");
    const onSigterm = makeHandler("SIGTERM");

    process.on("SIGINT", onSigint);
    process.on("SIGTERM", onSigterm);

    cleanups.push(() => process.off("SIGINT", onSigint));
    cleanups.push(() => process.off("SIGTERM", onSigterm));

    // Also clean these on child exit
    const onChildExit = () => {
        try {
            process.off("SIGINT", onSigint);
            process.off("SIGTERM", onSigterm);
        } catch {}
    };
    child.once("exit", onChildExit);
    cleanups.push(() => child.off("exit", onChildExit));

    return cleanups;
}

/**
 * Line-buffered wiring for a Readable stream.
 * - Invokes onLine(line, rawChunk) on each line
 * - Optionally tees raw chunk to a tee stream (like process.stdout)
 *
 * @param {import('node:stream').Readable} readable
 * @param {(line: string, chunk: Buffer) => void} [onLine]
 * @param {import('node:stream').Writable|null} tee
 * @param {string} prefix
 */
function wireOutput(readable, onLine, tee, prefix = "") {
    // Keep raw tee behavior, and provide clean line-buffered callbacks
    let buffer = "";
    readable.on("data", (chunk) => {
        try {
            const raw = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);

            // Tee first to preserve terminal behavior
            if (tee) {
                if (prefix) {
                    const text = raw.toString("utf8");
                    const parts = text.split(/\r?\n/);
                    for (let i = 0; i < parts.length; i++) {
                        const part = parts[i];
                        if (i < parts.length - 1 || part.length > 0) {
                            const out = `${prefix}${part}`;
                            tee.write(`${out}\n`);
                        }
                    }
                } else {
                    tee.write(raw);
                }
            }

            // Accumulate and emit complete lines to callback
            buffer += raw.toString("utf8");
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() ?? "";
            if (onLine) {
                for (const line of lines) {
                    try {
                        onLine(prefix ? prefix + line : line, raw);
                    } catch {
                        // ignore callback errors
                    }
                }
            }
        } catch {
            // ignore stream errors
        }
    });

    const flush = () => {
        if (buffer.length > 0 && onLine) {
            try {
                onLine(prefix ? prefix + buffer : buffer, Buffer.from(buffer));
            } catch {
                // ignore callback errors
            }
        }
    };

    readable.on("close", flush);
    readable.on("end", flush);
}

/**
 * Attempt graceful termination, then force kill after timeout.
 * Works cross-platform; on Windows, signals are emulated by Node.
 *
 * @param {import('node:child_process').ChildProcess} child
 * @param {NodeJS.Signals|string} signal
 * @param {number} forceAfterMs
 */
export function terminate(child, signal = "SIGTERM", forceAfterMs = 5000) {
    if (!child || child.killed) return;

    try {
        child.kill(signal);
    } catch {
        // ignore kill errors
    }

    // If the process doesn't exit in time, force kill
    const timer = setTimeout(
        () => {
            if (!child.killed) {
                try {
                    child.kill("SIGKILL");
                } catch {
                    // ignore
                }
            }
        },
        Math.max(0, forceAfterMs),
    );

    // Clear the timer when the child exits
    child.once("exit", () => clearTimeout(timer));
}

/**
 * Convenience helper to run a script to completion using the current runtime.
 * @param {string} scriptPath
 * @param {SpawnOptions & { args?: string[], runtimeOptions?: string[] }} [options]
 * @returns {Promise<SpawnResult>}
 */
export async function runRuntime(scriptPath, options = {}) {
    const { wait } = spawnRuntime(scriptPath, options);
    return await wait;
}
