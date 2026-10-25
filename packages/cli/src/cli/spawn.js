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
import { pathToFileURL } from "node:url";

import { detectRuntime } from "sxo/server/shared/runtime";
import { wireOutput } from "./output-handler.js";
import { forwardSignals, terminate as terminateProcess } from "./signal-handler.js";

// Re-export terminate for backward compatibility
export { terminateProcess as terminate };

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
 * - For stdio="inherit", output is handled by terminal directly (no callbacks).
 * - Signals SIGINT/SIGTERM from parent are forwarded to child; forced kill after timeout.
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

    /** @type {Array<() => void>} */
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
            terminateProcess(child, "SIGTERM", forceKillAfterMs);
        };
        signal.addEventListener("abort", onAbort, { once: true });
        removeFns.push(() => signal.removeEventListener("abort", onAbort));
    }

    // Forward parent SIGINT/SIGTERM to child
    const stopHandlers = forwardSignals(
        child,
        (/** @type {NodeJS.Signals | number} */ sig, /** @type {number} */ timeout) => {
            terminateProcess(child, sig, timeout);
        },
        forceKillAfterMs,
    );
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

    /** @type {Promise<SpawnResult>} */
    const wait = new Promise((resolve) => {
        let settled = false;

        const onExit = (/** @type {number | null} */ code, /** @type {NodeJS.Signals | null} */ sig) => {
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
 * Get runtime-appropriate command and prefix args for spawning scripts.
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
 * Spawn a script using current runtime (Node.js, Bun, or Deno).
 * Automatically detects runtime and uses appropriate executable and flags.
 *
 * @param {string} scriptPath - Path to script entry point
 * @param {SpawnOptions & { args?: string[], runtimeOptions?: string[] }} [options]
 * @returns {{ child: import('node:child_process').ChildProcess, wait: Promise<SpawnResult> }}
 */
export function spawnRuntime(scriptPath, options = {}) {
    const { command, prefix } = getRuntimeExecutable();
    const { args = [], runtimeOptions = [], ...rest } = options;
    const resolved = path.resolve(scriptPath);
    const runtime = detectRuntime();

    // Deno requires file:// URLs and proper directory for import resolution
    let scriptArg;
    if (runtime === "deno") {
        const scriptUrl = pathToFileURL(resolved).href;
        // Set working directory to script's directory for proper relative import resolution
        rest.cwd = rest.cwd || path.dirname(resolved);
        scriptArg = scriptUrl;
    } else {
        scriptArg = resolved;
    }

    const finalArgs = [...prefix, ...(runtimeOptions || []), scriptArg, ...(args || [])];
    return spawnProcess(command, finalArgs, rest);
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
