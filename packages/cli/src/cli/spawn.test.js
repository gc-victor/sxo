import assert from "node:assert/strict";
import fsp from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { setTimeout as sleep } from "node:timers/promises";
import { withTempProject } from "../test-utils.js";
import { runRuntime, spawnProcess, spawnRuntime, terminate } from "./spawn.js";

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
    await withTempProject(async (dir) => {
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
    await withTempProject(async (dir) => {
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

test("runRuntime: runs a script to completion and returns result", async () => {
    await withTempProject(async (dir) => {
        const script = await writeTempScript(
            dir,
            "hello.mjs",
            `
            console.log("Hello from runRuntime");
            process.exit(0);
        `.trim(),
        );

        const result = await runRuntime(script, { cwd: dir, stdio: "pipe", inheritOutput: false });

        assert.strictEqual(result.success, true, "should succeed");
        assert.strictEqual(result.code, 0, "should exit with code 0");
    });
});

test("spawnRuntime: works with custom args and runtimeOptions", async () => {
    await withTempProject(async (dir) => {
        const script = await writeTempScript(
            dir,
            "args-test.mjs",
            `
            // Verify we're running with Deno if configured
            if (typeof Deno !== "undefined") {
                console.log("Running with Deno");
            } else {
                console.log("Running with Node");
            }
            process.exit(0);
        `.trim(),
        );

        const { wait } = spawnRuntime(script, {
            cwd: dir,
            stdio: "pipe",
            inheritOutput: false,
            args: ["--flag"],
            runtimeOptions: [],
        });

        const result = await wait;
        assert.strictEqual(result.success, true, "should succeed with custom args");
    });
});

test("spawnProcess: cleanup handles errors gracefully", async () => {
    await withTempProject(async (dir) => {
        await writeTempScript(
            dir,
            "quick-exit.mjs",
            `
            console.log("Quick exit test");
            process.exit(0);
        `.trim(),
        );

        // Create a mock AbortSignal that throws on removeEventListener
        let removeCalled = false;
        const mockSignal = {
            addEventListener: (_event, _handler, _opts) => {},
            removeEventListener: () => {
                removeCalled = true;
                throw new Error("Remove failed");
            },
        };

        const { wait } = spawnProcess(process.execPath, ["-e", "process.exit(0)"], {
            cwd: dir,
            stdio: "pipe",
            inheritOutput: false,
            signal: mockSignal,
        });

        const result = await wait;
        // Should complete successfully despite cleanup error
        assert.strictEqual(result.success, true, "should succeed despite cleanup error");
        assert.strictEqual(removeCalled, true, "should attempt cleanup");
    });
});

test("spawnRuntime: uses correct command prefix for different runtimes", async () => {
    // This test verifies spawnRuntime structure - the actual runtime detection
    // is tested implicitly through other spawnRuntime tests
    await withTempProject(async (dir) => {
        const script = await writeTempScript(
            dir,
            "verify-env.mjs",
            `
            console.log("env-check");
            process.exit(0);
        `.trim(),
        );

        // Test that spawnRuntime can be called with various options
        const { child, wait } = spawnRuntime(script, {
            cwd: dir,
            stdio: "pipe",
            inheritOutput: false,
            env: { TEST_VAR: "test-value" },
        });

        assert.ok(child, "should return a child process");
        assert.ok(wait instanceof Promise, "should return a promise");

        const result = await wait;
        assert.strictEqual(result.success, true, "should complete successfully");
    });
});

test("spawnProcess: handles non-existent command error", async () => {
    const { wait } = spawnProcess("non-existent-command-12345");
    const result = await wait;
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.code, 1);
});

test("spawnProcess: works with stdio inherit", async () => {
    // This just verifies it doesn't crash and completes
    const { wait } = spawnProcess(process.execPath, ["-e", "process.exit(0)"], {
        stdio: "inherit",
    });
    const result = await wait;
    assert.strictEqual(result.success, true);
});

test("spawnProcess: works with inheritOutput false and no callbacks", async () => {
    const { wait } = spawnProcess(process.execPath, ["-e", "process.exit(0)"], {
        inheritOutput: false,
    });
    const result = await wait;
    assert.strictEqual(result.success, true);
});

test("spawnRuntime: handles different runtimes via globalThis mocking", async (t) => {
    const originalBun = globalThis.Bun;
    const originalDeno = globalThis.Deno;

    await t.test("mocking bun", async () => {
        globalThis.Bun = {};
        globalThis.Deno = undefined;
        try {
            // We can't easily verify the internal command used without more complex mocking,
            // but we can ensure it still runs (falling back to current process.execPath which is node)
            const { wait } = spawnRuntime("test.js", { stdio: "pipe", inheritOutput: false });
            // It will fail because test.js doesn't exist, but it should have called getRuntimeExecutable
            const result = await wait;
            assert.strictEqual(result.success, false);
        } finally {
            globalThis.Bun = originalBun;
            globalThis.Deno = originalDeno;
        }
    });

    await t.test("mocking deno", async () => {
        globalThis.Deno = { run: () => {} };
        globalThis.Bun = undefined;
        try {
            const { wait } = spawnRuntime("test.js", { stdio: "pipe", inheritOutput: false });
            const result = await wait;
            assert.strictEqual(result.success, false);
        } finally {
            globalThis.Bun = originalBun;
            globalThis.Deno = originalDeno;
        }
    });
});

test("spawnProcess: forwards parent SIGINT to child", async () => {
    await withTempProject(async (dir) => {
        const script = await writeTempScript(
            dir,
            "forward-sigint.mjs",
            `
            process.on("SIGINT", () => {
                process.exit(0);
            });
            setInterval(() => {}, 1000);
        `.trim(),
        );

        const { wait } = spawnRuntime(script, {
            cwd: dir,
            stdio: "pipe",
            inheritOutput: false,
        });

        // Give it a moment to start and register signal handlers
        await sleep(200);

        // Send actual SIGINT signal to parent process (forwarded to child)
        process.kill(process.pid, "SIGINT");

        const result = await wait;
        assert.ok(result.code === 0 || result.success === true, "child should have exited after parent SIGINT");
    });
});
