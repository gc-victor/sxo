import assert from "node:assert/strict";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { setTimeout as sleep } from "node:timers/promises";
import { spawnProcess, spawnRuntime, terminate } from "./spawn.js";

async function withTempDir(fn) {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "sxo-spawn-"));
    try {
        return await fn(dir);
    } finally {
        try {
            await fsp.rm(dir, { recursive: true, force: true, maxRetries: 2 });
        } catch {
            // ignore cleanup error
        }
    }
}

async function writeTempScript(dir, filename, content) {
    const abs = path.join(dir, filename);
    await fsp.mkdir(path.dirname(abs), { recursive: true });
    await fsp.writeFile(abs, content, "utf8");
    return abs;
}

test("spawnProcess: line callbacks receive stdout/stderr lines with prefix", async () => {
    const linesOut = [];
    const linesErr = [];

    // Node one-liner that writes two stdout and two stderr lines with mixed line endings
    const nodeCode = [
        'process.stdout.write("A\\n");',
        'process.stdout.write("B\\r\\n");',
        'process.stderr.write("E1\\n");',
        'process.stderr.write("E2\\r\\n");',
    ].join("");

    const { wait } = spawnProcess(process.execPath, ["-e", nodeCode], {
        stdio: "pipe",
        inheritOutput: false,
        prefix: "[P] ",
        onStdout: (line) => linesOut.push(line),
        onStderr: (line) => linesErr.push(line),
    });

    const res = await wait;
    assert.equal(res.success, true);

    // Our wrapper prefixes callback lines
    assert.deepEqual(linesOut, ["[P] A", "[P] B"]);
    assert.deepEqual(linesErr, ["[P] E1", "[P] E2"]);
});

test("terminate(): sends SIGTERM and script exits cleanly", async () => {
    await withTempDir(async (dir) => {
        const script = await writeTempScript(
            dir,
            "wait-on-term.mjs",
            `
        // Exit cleanly on SIGTERM
        process.on("SIGTERM", () => {
          // small delay to simulate cleanup work
          setTimeout(() => process.exit(0), 50);
        });
        // Keep process alive
        setInterval(() => {}, 1000);
      `.trim(),
        );

        const { child, wait } = spawnRuntime(script, { cwd: dir, stdio: "pipe", inheritOutput: false });

        // Give it a moment to start
        await sleep(150);

        // Ask it to terminate gracefully
        terminate(child, "SIGTERM", 2000);

        const res = await wait;
        // Should exit cleanly on SIGTERM (cross-platform tolerant)
        assert.ok(res.code === 0 || res.signal !== null || res.success === true, "child should have exited after SIGTERM");
    });
});

test("spawnProcess: AbortSignal stops the child via SIGTERM", async () => {
    await withTempDir(async (dir) => {
        const script = await writeTempScript(
            dir,
            "abortable.mjs",
            `
        // Exit 0 on SIGTERM (graceful)
        process.on("SIGTERM", () => process.exit(0));
        // Keep running
        setInterval(() => {}, 1000);
      `.trim(),
        );

        const ctrl = new AbortController();

        const { wait } = spawnRuntime(script, {
            cwd: dir,
            stdio: "pipe",
            inheritOutput: false,
            signal: ctrl.signal,
        });

        // Abort after a short delay, spawn wrapper should terminate the child
        await sleep(200);
        ctrl.abort();

        const res = await wait;
        // Expect the child to exit (code 0 if SIGTERM handler ran)
        assert.ok(res.code === 0 || res.success === false, "child should have exited after abort");
    });
});

test("spawnProcess: onStdout/onStderr still work with long single chunks", async () => {
    const out = [];
    const err = [];
    // One long chunk write with multiple lines
    const bigOut = "line1\n" + "line2\n" + "line3\n";
    const bigErr = "e1\n" + "e2\n";

    const code = `
    process.stdout.write(${JSON.stringify(bigOut)});
    process.stderr.write(${JSON.stringify(bigErr)});
  `;

    const { wait } = spawnProcess(process.execPath, ["-e", code], {
        stdio: "pipe",
        inheritOutput: false,
        onStdout: (line) => out.push(line),
        onStderr: (line) => err.push(line),
    });

    const res = await wait;
    assert.equal(res.success, true);
    assert.deepEqual(out, ["line1", "line2", "line3"]);
    assert.deepEqual(err, ["e1", "e2"]);
});
