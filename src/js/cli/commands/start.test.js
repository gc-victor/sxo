/**
 * @fileoverview Tests for start command handler.
 *
 * @module cli/commands/start.test
 */

import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it, mock } from "node:test";
import { log } from "../ui.js";
import { handleStartCommand } from "./start.js";

const originalExitCode = process.exitCode;
const ROUTES_PATH = "dist/server/routes.json";

describe("cli/commands/start", () => {
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

    it("successfully starts production server", async () => {
        const inject = {
            resolveConfig: createMockResolveConfig(),
            spawnRuntime: () => ({
                wait: Promise.resolve({ success: true }),
            }),
            pathExists: async () => true,
        };

        await handleStartCommand({}, inject);

        assert.equal(process.exitCode, undefined, "Should not set exit code on success");
    });

    it("fails when routes.json is missing", async () => {
        const inject = {
            resolveConfig: createMockResolveConfig(),
            spawnRuntime: () => ({
                wait: Promise.resolve({ success: true }),
            }),
            pathExists: async () => false, // routes.json missing
        };

        await handleStartCommand({}, inject);

        const errorCalls = logMocks.error.mock.calls;
        const errorMessages = errorCalls.map((c) => c.arguments[0]);

        assert.ok(
            errorMessages.some((msg) => msg.includes("Missing") && msg.includes(ROUTES_PATH)),
            "Should log missing routes.json error",
        );

        const infoCalls = logMocks.info.mock.calls;
        const infoMessages = infoCalls.map((c) => c.arguments[0]);

        assert.ok(
            infoMessages.some((msg) => msg.includes("sxo build")),
            "Should suggest running sxo build",
        );

        assert.equal(process.exitCode, 1);
    });

    it("sets NODE_ENV=production in environment", async () => {
        let capturedEnv = null;
        const inject = {
            resolveConfig: createMockResolveConfig({ env: { CUSTOM: "value" } }),
            spawnRuntime: (_script, opts) => {
                capturedEnv = opts.env;
                return {
                    wait: Promise.resolve({ success: true }),
                };
            },
            pathExists: async () => true,
        };

        await handleStartCommand({}, inject);

        assert.equal(capturedEnv.NODE_ENV, "production", "Should set NODE_ENV to production");
        assert.equal(capturedEnv.CUSTOM, "value", "Should preserve other env vars");
    });

    it("handles server exit with error code", async () => {
        const inject = {
            resolveConfig: createMockResolveConfig(),
            spawnRuntime: () => ({
                wait: Promise.resolve({ success: false, code: 1 }),
            }),
            pathExists: async () => true,
        };

        await handleStartCommand({}, inject);

        assert.equal(process.exitCode, 1, "Should set exit code from server process");
    });

    it("uses custom output directory from config", async () => {
        let routesPathChecked = null;
        const inject = {
            resolveConfig: createMockResolveConfig({ outDir: "custom-dist" }),
            spawnRuntime: () => ({
                wait: Promise.resolve({ success: true }),
            }),
            pathExists: async (path) => {
                routesPathChecked = path;
                return true;
            },
        };

        await handleStartCommand({}, inject);

        assert.ok(routesPathChecked.includes("custom-dist"), "Should check routes.json in custom output directory");
    });
});
