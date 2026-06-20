import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it, mock } from "node:test";
import { log } from "../ui.js";
import { handleBuildCommand } from "./build.js";
import { handleCleanCommand } from "./clean.js";
import { handleDevCommand } from "./dev.js";
import { handleGenerateCommand } from "./generate.js";
import { handleStartCommand } from "./start.js";

const originalExitCode = process.exitCode;

describe("cli/commands error handling", () => {
    /** @type {Record<string, ReturnType<typeof mock.method>>} */
    let logMocks;

    before(() => {
        logMocks = {
            error: mock.method(log, "error", () => {}),
        };
    });

    after(() => {
        mock.restoreAll();
        process.exitCode = originalExitCode;
    });

    beforeEach(() => {
        logMocks.error.mock.resetCalls();
        process.exitCode = undefined;
    });

    const errorToThrow = new Error("Mocked failure");

    it("handleBuildCommand catches and logs errors", async () => {
        const inject = {
            resolveConfig: async () => {
                throw errorToThrow;
            },
        };
        await handleBuildCommand({}, inject);
        assert.equal(process.exitCode, 1);
        assert.ok(logMocks.error.mock.calls[0].arguments[0].includes("build failed: Mocked failure"));
    });

    it("handleCleanCommand catches and logs errors", async () => {
        const inject = {
            resolveConfig: async () => {
                throw errorToThrow;
            },
        };
        await handleCleanCommand({}, inject);
        assert.equal(process.exitCode, 1);
        assert.ok(logMocks.error.mock.calls[0].arguments[0].includes("clean failed: Mocked failure"));
    });

    it("handleDevCommand catches and logs errors", async () => {
        const inject = {
            resolveConfig: async () => {
                throw errorToThrow;
            },
        };
        await handleDevCommand({}, inject);
        assert.equal(process.exitCode, 1);
        assert.ok(logMocks.error.mock.calls[0].arguments[0].includes("dev failed: Mocked failure"));
    });

    it("handleGenerateCommand catches and logs errors", async () => {
        const inject = {
            resolveConfig: async () => {
                throw errorToThrow;
            },
        };
        await handleGenerateCommand({}, inject);
        assert.equal(process.exitCode, 1);
        assert.ok(logMocks.error.mock.calls[0].arguments[0].includes("generate failed: Mocked failure"));
    });

    it("handleStartCommand catches and logs errors", async () => {
        const inject = {
            resolveConfig: async () => {
                throw errorToThrow;
            },
        };
        await handleStartCommand({}, inject);
        assert.equal(process.exitCode, 1);
        assert.ok(logMocks.error.mock.calls[0].arguments[0].includes("start failed: Mocked failure"));
    });

    it("handleDevCommand handles prebuild failure with missing code", async () => {
        const inject = {
            resolveConfig: async () => ({ pagesDir: "pages", env: {} }),
            validatePagesFolder: async () => {},
            runRuntime: async () => ({ success: false, code: null }),
            createSpinner: () => ({ start: () => {}, fail: () => {} }),
        };
        // We need to partially mock log too if we want to be sure
        await handleDevCommand({}, inject);
        assert.equal(process.exitCode, 1, "Should default to exit code 1 when code is null");
    });

    it("handleDevCommand handles server exit with missing code", async () => {
        const inject = {
            resolveConfig: async () => ({ pagesDir: "pages", env: {}, outDir: "dist" }),
            validatePagesFolder: async () => {},
            runRuntime: async () => ({ success: true }),
            spawnRuntime: () => ({
                child: { once: () => {} },
                wait: Promise.resolve({ success: false, code: null }),
            }),
            ensureDir: async () => {},
        };
        await handleDevCommand({}, inject);
        assert.equal(process.exitCode, 1, "Should default to exit code 1 when code is null");
    });

    it("handleBuildCommand handles build failure with missing code", async () => {
        const inject = {
            resolveConfig: async () => ({ pagesDir: "pages", env: {} }),
            validatePagesFolder: async () => {},
            runRuntime: async () => ({ success: false, code: null }),
        };
        await handleBuildCommand({}, inject);
        assert.equal(process.exitCode, 1, "Should default to exit code 1 when code is null");
    });

    it("handleStartCommand handles server exit with missing code", async () => {
        const inject = {
            resolveConfig: async () => ({ env: {}, outDir: "dist" }),
            pathExists: async () => true,
            spawnRuntime: () => ({
                wait: Promise.resolve({ success: false, code: null }),
            }),
        };
        await handleStartCommand({}, inject);
        assert.equal(process.exitCode, 1, "Should default to exit code 1 when code is null");
    });
});
