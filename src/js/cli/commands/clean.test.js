/**
 * @fileoverview Tests for clean command handler.
 *
 * @module cli/commands/clean.test
 */

import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it, mock } from "node:test";
import { log } from "../ui.js";
import { handleCleanCommand } from "./clean.js";

const originalExitCode = process.exitCode;

describe("cli/commands/clean", () => {
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
            ...overrides,
        });
    }

    it("does nothing when output directory does not exist", async () => {
        let rmWasCalled = false;
        const inject = {
            resolveConfig: createMockResolveConfig(),
            pathExists: async () => false, // directory doesn't exist
            askYesNo: async () => true,
            rm: async () => {
                rmWasCalled = true;
            },
        };

        await handleCleanCommand({}, inject);

        const infoCalls = logMocks.info.mock.calls;
        const infoMessages = infoCalls.map((c) => c.arguments[0]);

        assert.ok(
            infoMessages.some((msg) => msg.includes("Nothing to clean")),
            "Should log 'Nothing to clean' message",
        );
        assert.ok(!rmWasCalled, "Should not call rm when directory doesn't exist");
    });

    it("removes directory when user confirms", async () => {
        let rmWasCalled = false;
        let removedPath = null;
        const inject = {
            resolveConfig: createMockResolveConfig({ outDir: "dist" }),
            pathExists: async () => true,
            askYesNo: async () => true, // user confirms
            rm: async (path) => {
                rmWasCalled = true;
                removedPath = path;
            },
        };

        await handleCleanCommand({}, inject);

        assert.ok(rmWasCalled, "Should call rm when user confirms");
        assert.equal(removedPath, "dist", "Should remove correct directory");
    });

    it("cancels when user declines", async () => {
        let rmWasCalled = false;
        const inject = {
            resolveConfig: createMockResolveConfig(),
            pathExists: async () => true,
            askYesNo: async () => false, // user declines
            rm: async () => {
                rmWasCalled = true;
            },
        };

        await handleCleanCommand({}, inject);

        const warnCalls = logMocks.warn.mock.calls;
        const warnMessages = warnCalls.map((c) => c.arguments[0]);

        assert.ok(
            warnMessages.some((msg) => msg === "Cancelled"),
            "Should log 'Cancelled' message",
        );
        assert.ok(!rmWasCalled, "Should not call rm when user declines");
    });

    it("skips confirmation with --yes flag", async () => {
        let askWasCalled = false;
        let rmWasCalled = false;
        const inject = {
            resolveConfig: createMockResolveConfig(),
            pathExists: async () => true,
            askYesNo: async () => {
                askWasCalled = true;
                return true;
            },
            rm: async () => {
                rmWasCalled = true;
            },
        };

        await handleCleanCommand({ yes: true }, inject);

        assert.ok(!askWasCalled, "Should not ask for confirmation with --yes flag");
        assert.ok(rmWasCalled, "Should proceed to remove directory");
    });

    it("skips confirmation with -y flag (alias)", async () => {
        let askWasCalled = false;
        let rmWasCalled = false;
        const inject = {
            resolveConfig: createMockResolveConfig(),
            pathExists: async () => true,
            askYesNo: async () => {
                askWasCalled = true;
                return true;
            },
            rm: async () => {
                rmWasCalled = true;
            },
        };

        await handleCleanCommand({ y: true }, inject);

        assert.ok(!askWasCalled, "Should not ask for confirmation with -y flag");
        assert.ok(rmWasCalled, "Should proceed to remove directory");
    });

    it("uses custom output directory from config", async () => {
        let checkedPath = null;
        const inject = {
            resolveConfig: createMockResolveConfig({ outDir: "custom-output" }),
            pathExists: async (path) => {
                checkedPath = path;
                return false;
            },
            askYesNo: async () => true,
            rm: async () => {},
        };

        await handleCleanCommand({}, inject);

        assert.equal(checkedPath, "custom-output", "Should check custom output directory");
    });

    it("passes correct options to rm", async () => {
        let rmOptions = null;
        const inject = {
            resolveConfig: createMockResolveConfig(),
            pathExists: async () => true,
            askYesNo: async () => true,
            rm: async (_path, opts) => {
                rmOptions = opts;
            },
        };

        await handleCleanCommand({}, inject);

        assert.deepEqual(rmOptions, { recursive: true, force: true, maxRetries: 2 }, "Should pass correct rm options");
    });
});
