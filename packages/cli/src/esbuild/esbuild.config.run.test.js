import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { run } from "./esbuild.config.js";

describe("esbuild.config.js run()", () => {
    it("orchestrates the build process correctly", async (t) => {
        const routes = [
            {
                filename: "index.html",
                entryPoints: ["src/pages/client/index.js", "src/pages/global.css"],
                jsx: "src/pages/index.jsx",
            },
        ];

        const getConfig = t.mock.fn(() => routes);
        const build = t.mock.fn(async () => ({}));
        const write = t.mock.fn(async () => {});
        const makeDir = t.mock.fn(async () => {});
        const exit = t.mock.fn();

        await run({ getConfig, build, write, makeDir, exit });

        assert.strictEqual(getConfig.mock.calls.length, 1);
        assert.strictEqual(makeDir.mock.calls.length, 2);
        assert.strictEqual(write.mock.calls.length, 1);
        assert.strictEqual(build.mock.calls.length, 2, "Should call build for client and server");

        // Verify client build options
        const clientCall = build.mock.calls[0];
        assert.strictEqual(clientCall.arguments[0].platform, "browser");
        assert.deepStrictEqual(clientCall.arguments[0].entryPoints, ["src/pages/client/index.js", "src/pages/global.css"]);

        // Verify server build options
        const serverCall = build.mock.calls[1];
        assert.strictEqual(serverCall.arguments[0].platform, "node");
        assert.ok(serverCall.arguments[0].entryPoints.includes("src/pages/index.jsx"));

        assert.strictEqual(exit.mock.calls.length, 0);
    });

    it("handles errors by logging and exiting with code 1", async (t) => {
        const getConfig = t.mock.fn(() => {
            throw new Error("Config failure");
        });
        const build = t.mock.fn();
        const write = t.mock.fn();
        const makeDir = t.mock.fn();
        const exit = t.mock.fn();

        // Stub console.error to avoid cluttering test output
        const consoleError = t.mock.method(console, "error", () => {});

        await run({ getConfig, build, write, makeDir, exit });

        assert.strictEqual(exit.mock.calls.length, 1);
        assert.strictEqual(exit.mock.calls[0].arguments[0], 1);
        assert.strictEqual(consoleError.mock.calls.length, 1);
        assert.match(consoleError.mock.calls[0].arguments[0], /Config failure/);
    });

    it("passes allowed build config from BUILD environment variable", async (t) => {
        const routes = [{ filename: "index.html", entryPoints: [], jsx: "index.jsx" }];
        const getConfig = t.mock.fn(() => routes);
        const build = t.mock.fn(async () => ({}));
        const write = t.mock.fn(async () => {});
        const makeDir = t.mock.fn(async () => {});

        const originalBuildEnv = process.env.BUILD;
        process.env.BUILD = JSON.stringify({ minify: false, target: "esnext" });

        try {
            await run({ getConfig, build, write, makeDir });

            const clientCall = build.mock.calls[0];
            assert.strictEqual(clientCall.arguments[0].minify, false);
            assert.strictEqual(clientCall.arguments[0].target, "esnext");
        } finally {
            process.env.BUILD = originalBuildEnv;
        }
    });

    it("blocks dangerous BUILD env overrides (outdir, entryPoints, plugins, write)", async (t) => {
        const routes = [{ filename: "index.html", entryPoints: ["client.js"], jsx: "index.jsx" }];
        const getConfig = t.mock.fn(() => routes);
        const build = t.mock.fn(async () => ({}));
        const write = t.mock.fn(async () => {});
        const makeDir = t.mock.fn(async () => {});

        const originalBuildEnv = process.env.BUILD;
        process.env.BUILD = JSON.stringify({
            minify: false, // allowed
            outdir: "/malicious/path", // blocked
            outfile: "/malicious/output.js", // blocked
            entryPoints: ["/malicious/entry.js"], // blocked
            plugins: [{ name: "malicious-plugin" }], // blocked
            write: false, // blocked
            stdin: { contents: "evil" }, // blocked
        });

        try {
            await run({ getConfig, build, write, makeDir });

            const clientCall = build.mock.calls[0];
            // Allowed key passes through
            assert.strictEqual(clientCall.arguments[0].minify, false);
            // Blocked keys do not override defaults - verify they are NOT the malicious values
            assert.notStrictEqual(clientCall.arguments[0].outdir, "/malicious/path");
            assert.notDeepStrictEqual(clientCall.arguments[0].entryPoints, ["/malicious/entry.js"]);
            // Original entryPoints preserved
            assert.deepStrictEqual(clientCall.arguments[0].entryPoints, ["client.js"]);
            // Plugins not overridden (default plugins remain)
            assert.strictEqual(clientCall.arguments[0].plugins.length, 1);
            // Blocked keys are undefined
            assert.strictEqual(clientCall.arguments[0].write, undefined);
            assert.strictEqual(clientCall.arguments[0].outfile, undefined);
            assert.strictEqual(clientCall.arguments[0].stdin, undefined);
        } finally {
            process.env.BUILD = originalBuildEnv;
        }
    });
});
