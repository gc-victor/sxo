/**
 * @fileoverview Tests for build command handler.
 *
 * @module cli/commands/build.test
 */

import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it, mock } from "node:test";
import { log } from "../ui.js";
import { handleBuildCommand } from "./build.js";

const originalExitCode = process.exitCode;
const ROUTES_PATH = "dist/server/routes.json";

describe("cli/commands/build", () => {
    /** @type {Record<string, ReturnType<typeof mock.method>>} */
    let logMocks;

    before(() => {
        logMocks = {
            info: mock.method(log, "info", () => {}),
            success: mock.method(log, "success", () => {}),
            warn: mock.method(log, "warn", () => {}),
            error: mock.method(log, "error", () => {}),
        };
    });

    after(() => {
        mock.restoreAll();
        process.exitCode = originalExitCode;
    });

    beforeEach(() => {
        logMocks.info.mock.resetCalls();
        logMocks.success.mock.resetCalls();
        logMocks.warn.mock.resetCalls();
        logMocks.error.mock.resetCalls();
        process.exitCode = undefined;
    });

    function createMockResolveConfig(overrides = {}) {
        return async () => ({
            pagesDir: "src/pages",
            outDir: "dist",
            port: 3000,
            env: {},
            ...overrides,
        });
    }

    it("successfully builds project and prints summary", async () => {
        let summaryWasCalled = false;
        const inject = {
            resolveConfig: createMockResolveConfig(),
            validatePagesFolder: async () => {},
            runRuntime: async () => ({ success: true }),
            pathExists: async () => true,
            printBuildSummary: async () => {
                summaryWasCalled = true;
            },
        };

        await handleBuildCommand({}, inject);

        assert.equal(process.exitCode, undefined, "Should not set exit code on success");
        assert.ok(summaryWasCalled, "Should call printBuildSummary");
    });

    it("fails when esbuild process fails", async () => {
        const inject = {
            resolveConfig: createMockResolveConfig(),
            validatePagesFolder: async () => {},
            runRuntime: async () => ({ success: false, code: 1 }),
            pathExists: async () => true,
            printBuildSummary: async () => {},
        };

        await handleBuildCommand({}, inject);

        const errorCalls = logMocks.error.mock.calls;
        const errorMessages = errorCalls.map((c) => c.arguments[0]);

        assert.ok(
            errorMessages.some((msg) => msg.includes("esbuild process failed")),
            "Should log esbuild failure message",
        );
        assert.equal(process.exitCode, 1);
    });

    it("fails when routes.json is not created", async () => {
        const inject = {
            resolveConfig: createMockResolveConfig(),
            validatePagesFolder: async () => {},
            runRuntime: async () => ({ success: true }),
            pathExists: async () => false, // routes.json missing
            printBuildSummary: async () => {},
        };

        await handleBuildCommand({}, inject);

        const errorCalls = logMocks.error.mock.calls;
        const errorMessages = errorCalls.map((c) => c.arguments[0]);

        assert.ok(
            errorMessages.some((msg) => msg.includes("Missing") && msg.includes(ROUTES_PATH)),
            "Should log missing routes.json error",
        );
        assert.equal(process.exitCode, 1);
    });

    it("validates pages folder before building", async () => {
        let validateWasCalled = false;
        let validatePath = null;
        const inject = {
            resolveConfig: createMockResolveConfig({ pagesDir: "custom/pages" }),
            validatePagesFolder: async (path) => {
                validateWasCalled = true;
                validatePath = path;
            },
            runRuntime: async () => ({ success: true }),
            pathExists: async () => true,
            printBuildSummary: async () => {},
        };

        await handleBuildCommand({}, inject);

        assert.ok(validateWasCalled, "Should call validatePagesFolder");
        assert.equal(validatePath, "custom/pages", "Should validate correct pages directory");
    });

    it("passes environment variables to build process", async () => {
        let capturedEnv = null;
        const customEnv = { NODE_ENV: "production", CUSTOM_VAR: "value" };
        const inject = {
            resolveConfig: createMockResolveConfig({ env: customEnv }),
            validatePagesFolder: async () => {},
            runRuntime: async (_script, opts) => {
                capturedEnv = opts.env;
                return { success: true };
            },
            pathExists: async () => true,
            printBuildSummary: async () => {},
        };

        await handleBuildCommand({}, inject);

        assert.deepEqual(capturedEnv, customEnv, "Should pass environment variables to build");
    });

    it("sets proper exit code on build failure", async () => {
        const inject = {
            resolveConfig: createMockResolveConfig(),
            validatePagesFolder: async () => {},
            runRuntime: async () => ({ success: false, code: 42 }),
            pathExists: async () => true,
            printBuildSummary: async () => {},
        };

        await handleBuildCommand({}, inject);

        assert.equal(process.exitCode, 42, "Should set exit code from build process");
    });
});
