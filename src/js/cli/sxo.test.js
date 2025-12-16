/**
 * @fileoverview Tests for CLI command error messages and failure modes.
 *
 * These tests verify that specific error messages are logged when commands fail,
 * by invoking the actual command handlers with mocked dependencies.
 *
 * @module cli/sxo.test
 */

import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it, mock } from "node:test";

import { handleBuildCommand, handleCleanCommand, handleDevCommand, handleGenerateCommand, handleStartCommand } from "./commands.js";
import { log } from "./ui.js";

/**
 * Default routes path used by CLI commands.
 * This matches the default value of ROUTES_RELATIVE_PATH from constants.js
 * when using default config (outDir: "dist").
 *
 * Note: We don't import ROUTES_RELATIVE_PATH directly because constants.js
 * has top-level await for config resolution which complicates test imports.
 */
const ROUTES_PATH = "dist/server/routes.json";

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

    /**
     * Creates a mock config resolver that returns a minimal config.
     * @param {object} [overrides] - Config overrides
     * @returns {Function} Mock resolveConfig function
     */
    function createMockResolveConfig(overrides = {}) {
        return async () => ({
            pagesDir: "src/pages",
            outDir: "dist",
            port: 3000,
            open: false,
            env: {},
            ...overrides,
        });
    }

    describe("build command error messages", () => {
        it('logs "esbuild process failed" when build fails', async () => {
            // Arrange: mock dependencies to trigger esbuild failure
            const inject = {
                resolveConfig: createMockResolveConfig(),
                validatePagesFolder: async () => {},
                runRuntime: async () => ({ success: false, code: 1 }),
                ensureBuiltRoutesJson: async () => true,
                printBuildSummary: async () => {},
            };

            // Act: invoke the actual build command handler
            await handleBuildCommand({}, inject);

            // Assert: verify the exact error message was logged
            const errorCalls = logMocks.error.mock.calls;
            assert.ok(errorCalls.length >= 1, "Expected at least one error log call");

            const errorMessages = errorCalls.map((c) => c.arguments[0]);
            const expectedMessage = "esbuild process failed. Check the error above for details.";
            assert.ok(
                errorMessages.some((msg) => msg === expectedMessage),
                `Expected error message "${expectedMessage}" but got: ${errorMessages.join(", ")}`,
            );
            assert.equal(process.exitCode, 1);
        });

        it("logs missing routes.json error when routes file not created", async () => {
            // Arrange: mock esbuild success but routes.json missing
            const inject = {
                resolveConfig: createMockResolveConfig(),
                validatePagesFolder: async () => {},
                runRuntime: async () => ({ success: true }),
                pathExists: async () => false, // routes.json missing
                printBuildSummary: async () => {},
            };

            // Act
            await handleBuildCommand({}, inject);

            // Assert
            const errorCalls = logMocks.error.mock.calls;
            assert.ok(errorCalls.length >= 1, "Expected at least one error log call");

            const errorMessages = errorCalls.map((c) => c.arguments[0]);
            assert.ok(
                errorMessages.some((msg) => msg.includes("Missing") && msg.includes(ROUTES_PATH)),
                `Expected error message about missing ${ROUTES_PATH} but got: ${errorMessages.join(", ")}`,
            );
            assert.equal(process.exitCode, 1);
        });
    });

    describe("dev command error messages", () => {
        it('logs "Couldn\'t generate routes with esbuild" message on prebuild failure', async () => {
            // Arrange: mock prebuild failure
            const inject = {
                resolveConfig: createMockResolveConfig(),
                validatePagesFolder: async () => {},
                runRuntime: async () => ({ success: false, code: 1 }),
                spawnRuntime: () => ({
                    child: { once: () => {} },
                    wait: Promise.resolve({ success: true }),
                }),
                ensureDir: async () => {},
                openWhenReady: async () => ({ opened: false, timedOut: false }),
            };

            // Act
            await handleDevCommand({}, inject);

            // Assert
            const errorCalls = logMocks.error.mock.calls;
            assert.ok(errorCalls.length >= 1, "Expected at least one error log call");

            const errorMessages = errorCalls.map((c) => c.arguments[0]);
            const expectedMessage = "Couldn't generate routes with esbuild. Check the error above for details.";
            assert.ok(
                errorMessages.some((msg) => msg === expectedMessage),
                `Expected error message "${expectedMessage}" but got: ${errorMessages.join(", ")}`,
            );
            assert.equal(process.exitCode, 1);
        });

        it("logs PAGES_DIR hint when prebuild fails", async () => {
            // Arrange: mock prebuild failure
            const pagesDir = "src/pages";
            const inject = {
                resolveConfig: createMockResolveConfig({ pagesDir }),
                validatePagesFolder: async () => {},
                runRuntime: async () => ({ success: false, code: 1 }),
                spawnRuntime: () => ({
                    child: { once: () => {} },
                    wait: Promise.resolve({ success: true }),
                }),
                ensureDir: async () => {},
                openWhenReady: async () => ({ opened: false, timedOut: false }),
            };

            // Act
            await handleDevCommand({}, inject);

            // Assert
            const infoCalls = logMocks.info.mock.calls;
            const infoMessages = infoCalls.map((c) => c.arguments[0]);

            assert.ok(
                infoMessages.some((msg) => msg.includes("PAGES_DIR")),
                `Expected info message about PAGES_DIR but got: ${infoMessages.join(", ")}`,
            );
            assert.ok(
                infoMessages.some((msg) => msg.includes("--pages-dir") && msg.includes("Hint")),
                `Expected hint about --pages-dir but got: ${infoMessages.join(", ")}`,
            );
        });
    });

    describe("start command error messages", () => {
        it('logs "Missing routes.json" and build hint', async () => {
            // Arrange: mock missing routes.json
            const inject = {
                resolveConfig: createMockResolveConfig(),
                spawnRuntime: () => ({
                    wait: Promise.resolve({ success: true }),
                }),
                pathExists: async () => false, // routes.json missing
            };

            // Act
            await handleStartCommand({}, inject);

            // Assert
            const errorCalls = logMocks.error.mock.calls;
            assert.ok(errorCalls.length >= 1, "Expected at least one error log call");

            const errorMessages = errorCalls.map((c) => c.arguments[0]);
            assert.ok(
                errorMessages.some((msg) => msg.includes("Missing") && msg.includes(ROUTES_PATH)),
                `Expected error message about missing ${ROUTES_PATH} but got: ${errorMessages.join(", ")}`,
            );

            const infoCalls = logMocks.info.mock.calls;
            const infoMessages = infoCalls.map((c) => c.arguments[0]);
            assert.ok(
                infoMessages.some((msg) => msg.includes("sxo build")),
                `Expected info message about running "sxo build" but got: ${infoMessages.join(", ")}`,
            );
            assert.equal(process.exitCode, 1);
        });
    });

    describe("clean command error messages", () => {
        it('logs "Nothing to clean" when output dir does not exist', async () => {
            // Arrange: mock output dir doesn't exist
            const targetPath = "dist";
            const inject = {
                resolveConfig: createMockResolveConfig({ outDir: targetPath }),
                pathExists: async () => false, // output dir doesn't exist
                askYesNo: async () => true,
                rm: async () => {},
            };

            // Act
            await handleCleanCommand({}, inject);

            // Assert
            const infoCalls = logMocks.info.mock.calls;
            const infoMessages = infoCalls.map((c) => c.arguments[0]);
            assert.ok(
                infoMessages.some((msg) => msg.includes("Nothing to clean")),
                `Expected info message about "Nothing to clean" but got: ${infoMessages.join(", ")}`,
            );
        });

        it('logs "Cancelled" when user declines cleanup', async () => {
            // Arrange: mock output dir exists but user declines
            const inject = {
                resolveConfig: createMockResolveConfig({ outDir: "dist" }),
                pathExists: async () => true, // output dir exists
                askYesNo: async () => false, // user declines
                rm: async () => {},
            };

            // Act
            await handleCleanCommand({}, inject);

            // Assert
            const warnCalls = logMocks.warn.mock.calls;
            const warnMessages = warnCalls.map((c) => c.arguments[0]);
            assert.ok(
                warnMessages.some((msg) => msg === "Cancelled"),
                `Expected warning "Cancelled" but got: ${warnMessages.join(", ")}`,
            );
        });
    });

    describe("generate command error messages", () => {
        it("logs missing routes.json error with build hint", async () => {
            // Arrange: mock missing routes.json
            const inject = {
                resolveConfig: createMockResolveConfig(),
                pathExists: async () => false, // routes.json missing
                importGenerate: async () => ({ generate: async () => ({ ok: true }) }),
            };

            // Act
            await handleGenerateCommand({}, inject);

            // Assert
            const errorCalls = logMocks.error.mock.calls;
            assert.ok(errorCalls.length >= 1, "Expected at least one error log call");

            const errorMessages = errorCalls.map((c) => c.arguments[0]);
            assert.ok(
                errorMessages.some((msg) => msg.includes(ROUTES_PATH)),
                `Expected error message about ${ROUTES_PATH} but got: ${errorMessages.join(", ")}`,
            );

            const infoCalls = logMocks.info.mock.calls;
            const infoMessages = infoCalls.map((c) => c.arguments[0]);
            assert.ok(
                infoMessages.some((msg) => msg.includes("sxo build") && msg.includes("first")),
                `Expected info message about running "sxo build first" but got: ${infoMessages.join(", ")}`,
            );
            assert.equal(process.exitCode, 1);
        });
    });
});
