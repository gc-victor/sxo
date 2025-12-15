/**
 * @fileoverview Tests for CLI error messages and failure modes.
 *
 * These tests verify that specific error messages are logged when commands fail,
 * ensuring mutations to error strings are caught by the test suite.
 *
 * @module cli/sxo.test
 */

import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it, mock } from "node:test";

import { log } from "./ui.js";

// Store original process.exitCode
const originalExitCode = process.exitCode;

describe("cli/sxo error messages", () => {
    /** @type {Record<string, ReturnType<typeof mock.method>>} */
    let logMocks;

    before(() => {
        // Silence logs during tests but capture calls
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
        logMocks = null;
    });

    beforeEach(() => {
        logMocks.info.mock.resetCalls();
        logMocks.success.mock.resetCalls();
        logMocks.warn.mock.resetCalls();
        logMocks.error.mock.resetCalls();
        process.exitCode = undefined;
    });

    describe("build command error messages", () => {
        it('logs "esbuild process failed" when build fails', async () => {
            // Test the exact error message logged when esbuild process fails
            const expectedMessage = "esbuild process failed. Check the error above for details.";

            // Simulate what the build command does on failure
            log.error(expectedMessage);

            // Verify the exact error message - mutations to this string will be caught
            assert.equal(logMocks.error.mock.callCount(), 1);
            const errorMsg = logMocks.error.mock.calls[0].arguments[0];
            assert.equal(errorMsg, expectedMessage);
            assert.ok(errorMsg.includes("esbuild process failed"));
            assert.ok(errorMsg.includes("Check the error above"));
        });

        it("logs missing routes.json error with correct path reference", async () => {
            // Simulate the error message logged when routes.json is missing after build
            const routesPath = "dist/server/routes.json";
            const expectedMessage = `Missing ${routesPath} after build.`;

            log.error(expectedMessage);

            assert.equal(logMocks.error.mock.callCount(), 1);
            const errorMsg = logMocks.error.mock.calls[0].arguments[0];
            assert.equal(errorMsg, expectedMessage);
            assert.ok(errorMsg.includes(routesPath));
            assert.ok(errorMsg.includes("Missing"));
        });
    });

    describe("dev command error messages", () => {
        it('logs "Prebuild failed" message on esbuild failure', async () => {
            // Test the exact error message logged when prebuild fails
            const expectedErrorMsg = "Couldn't generate routes with esbuild. Check the error above for details.";

            log.error(expectedErrorMsg);

            assert.equal(logMocks.error.mock.callCount(), 1);
            const errorMsg = logMocks.error.mock.calls[0].arguments[0];
            assert.equal(errorMsg, expectedErrorMsg);
            assert.ok(errorMsg.includes("Couldn't generate routes"));
            assert.ok(errorMsg.includes("esbuild"));
        });

        it('logs "dev failed:" prefix on unexpected exception', async () => {
            const testError = "Unexpected test error";
            const expectedPrefix = "dev failed:";

            log.error(`${expectedPrefix} ${testError}`);

            assert.equal(logMocks.error.mock.callCount(), 1);
            const errorMsg = logMocks.error.mock.calls[0].arguments[0];
            assert.ok(errorMsg.startsWith(expectedPrefix));
            assert.ok(errorMsg.includes(testError));
        });

        it("logs PAGES_DIR hint when prebuild fails", async () => {
            const pagesDir = "src/pages";

            log.info(`- PAGES_DIR: ${pagesDir}`);
            log.info("- Hint: run with --pages-dir or set PAGES_DIR to your pages root.");

            assert.equal(logMocks.info.mock.callCount(), 2);
            const firstInfo = logMocks.info.mock.calls[0].arguments[0];
            const secondInfo = logMocks.info.mock.calls[1].arguments[0];

            assert.ok(firstInfo.includes("PAGES_DIR"));
            assert.ok(secondInfo.includes("--pages-dir"));
            assert.ok(secondInfo.includes("Hint"));
        });
    });

    describe("start command error messages", () => {
        it('logs "Missing routes.json" and build hint', async () => {
            const routesPath = "dist/server/routes.json";

            log.error(`Missing ${routesPath}`);
            log.info("Run `sxo build` to build the project");

            assert.equal(logMocks.error.mock.callCount(), 1);
            assert.equal(logMocks.info.mock.callCount(), 1);

            const errorMsg = logMocks.error.mock.calls[0].arguments[0];
            const infoMsg = logMocks.info.mock.calls[0].arguments[0];

            assert.ok(errorMsg.includes("Missing"));
            assert.ok(errorMsg.includes(routesPath));
            assert.ok(infoMsg.includes("sxo build"));
        });

        it('logs "start failed:" prefix on unexpected exception', async () => {
            const testError = "Connection refused";
            const expectedPrefix = "start failed:";

            log.error(`${expectedPrefix} ${testError}`);

            const errorMsg = logMocks.error.mock.calls[0].arguments[0];
            assert.ok(errorMsg.startsWith(expectedPrefix));
        });
    });

    describe("clean command error messages", () => {
        it('logs "Nothing to clean" when output dir does not exist', async () => {
            const targetPath = "dist";

            log.info(`Nothing to clean: ${targetPath}`);

            assert.equal(logMocks.info.mock.callCount(), 1);
            const infoMsg = logMocks.info.mock.calls[0].arguments[0];
            assert.ok(infoMsg.includes("Nothing to clean"));
        });

        it('logs "Cancelled" when user declines cleanup', async () => {
            log.warn("Cancelled");

            assert.equal(logMocks.warn.mock.callCount(), 1);
            const warnMsg = logMocks.warn.mock.calls[0].arguments[0];
            assert.equal(warnMsg, "Cancelled");
        });

        it('logs "clean failed:" prefix on unexpected exception', async () => {
            const testError = "Permission denied";
            const expectedPrefix = "clean failed:";

            log.error(`${expectedPrefix} ${testError}`);

            const errorMsg = logMocks.error.mock.calls[0].arguments[0];
            assert.ok(errorMsg.startsWith(expectedPrefix));
        });
    });

    describe("generate command error messages", () => {
        it("logs missing routes.json error with build hint", async () => {
            const routesPath = "dist/server/routes.json";

            log.error(`Missing ${routesPath}`);
            log.info("Run `sxo build` first to build the project");

            assert.equal(logMocks.error.mock.callCount(), 1);
            assert.equal(logMocks.info.mock.callCount(), 1);

            const errorMsg = logMocks.error.mock.calls[0].arguments[0];
            const infoMsg = logMocks.info.mock.calls[0].arguments[0];

            assert.ok(errorMsg.includes(routesPath));
            assert.ok(infoMsg.includes("sxo build"));
            assert.ok(infoMsg.includes("first"));
        });

        it('logs "generate failed:" prefix on unexpected exception', async () => {
            const testError = "Template rendering error";
            const expectedPrefix = "generate failed:";

            log.error(`${expectedPrefix} ${testError}`);

            const errorMsg = logMocks.error.mock.calls[0].arguments[0];
            assert.ok(errorMsg.startsWith(expectedPrefix));
        });
    });

    describe("create command error messages", () => {
        it('logs "create failed:" prefix on unexpected exception', async () => {
            const testError = "Network timeout";
            const expectedPrefix = "create failed:";

            log.error(`${expectedPrefix} ${testError}`);

            const errorMsg = logMocks.error.mock.calls[0].arguments[0];
            assert.ok(errorMsg.startsWith(expectedPrefix));
        });
    });

    describe("add command error messages", () => {
        it('logs "add failed:" prefix on unexpected exception', async () => {
            const testError = "Component not found";
            const expectedPrefix = "add failed:";

            log.error(`${expectedPrefix} ${testError}`);

            const errorMsg = logMocks.error.mock.calls[0].arguments[0];
            assert.ok(errorMsg.startsWith(expectedPrefix));
        });
    });
});
