/**
 * @fileoverview Tests for generate command handler.
 *
 * @module cli/commands/generate.test
 */

import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it, mock } from "node:test";
import { log } from "../ui.js";
import { handleGenerateCommand } from "./generate.js";

const originalExitCode = process.exitCode;
const originalEnv = { ...process.env };
const ROUTES_PATH = "dist/server/routes.json";

describe("cli/commands/generate", () => {
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
        // Restore original env by restoring individual keys
        for (const key of Object.keys(process.env)) {
            if (!(key in originalEnv)) {
                delete process.env[key];
            }
        }
        for (const [key, value] of Object.entries(originalEnv)) {
            process.env[key] = value;
        }
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
            env: {},
            ...overrides,
        });
    }

    it("successfully generates static routes", async () => {
        const inject = {
            resolveConfig: createMockResolveConfig(),
            pathExists: async () => true,
            importGenerate: async () => ({
                generate: async () => ({ ok: true }),
            }),
        };

        await handleGenerateCommand({}, inject);

        assert.equal(process.exitCode, undefined, "Should not set exit code on success");
    });

    it("fails when routes.json is missing", async () => {
        const inject = {
            resolveConfig: createMockResolveConfig(),
            pathExists: async () => false, // routes.json missing
            importGenerate: async () => ({
                generate: async () => ({ ok: true }),
            }),
        };

        await handleGenerateCommand({}, inject);

        const errorCalls = logMocks.error.mock.calls;
        const errorMessages = errorCalls.map((c) => c.arguments[0]);

        assert.ok(
            errorMessages.some((msg) => msg.includes("Missing") && msg.includes(ROUTES_PATH)),
            "Should log missing routes.json error",
        );

        const infoCalls = logMocks.info.mock.calls;
        const infoMessages = infoCalls.map((c) => c.arguments[0]);

        assert.ok(
            infoMessages.some((msg) => msg.includes("sxo build") && msg.includes("first")),
            "Should suggest running sxo build first",
        );

        assert.equal(process.exitCode, 1);
    });

    it("fails when generate returns ok:false", async () => {
        const inject = {
            resolveConfig: createMockResolveConfig(),
            pathExists: async () => true,
            importGenerate: async () => ({
                generate: async () => ({ ok: false }),
            }),
        };

        await handleGenerateCommand({}, inject);

        assert.equal(process.exitCode, 1, "Should set exit code when generation fails");
    });

    it("fails when generate returns null", async () => {
        const inject = {
            resolveConfig: createMockResolveConfig(),
            pathExists: async () => true,
            importGenerate: async () => ({
                generate: async () => null,
            }),
        };

        await handleGenerateCommand({}, inject);

        assert.equal(process.exitCode, 1, "Should set exit code when generation returns null");
    });

    it("injects environment variables before generation", async () => {
        const customEnv = {
            OUTPUT_DIR_CLIENT: "dist/client",
            OUTPUT_DIR_SERVER: "dist/server",
            PUBLIC_PATH: "/",
        };
        let generateWasCalled = false;

        const inject = {
            resolveConfig: createMockResolveConfig({ env: customEnv }),
            pathExists: async () => true,
            importGenerate: async () => ({
                generate: async () => {
                    generateWasCalled = true;
                    // Verify env vars are set in process.env when generate is called
                    assert.equal(process.env.OUTPUT_DIR_CLIENT, "dist/client", "OUTPUT_DIR_CLIENT should be set");
                    assert.equal(process.env.OUTPUT_DIR_SERVER, "dist/server", "OUTPUT_DIR_SERVER should be set");
                    assert.equal(process.env.PUBLIC_PATH, "/", "PUBLIC_PATH should be set");
                    return { ok: true };
                },
            }),
        };

        await handleGenerateCommand({}, inject);

        assert.ok(generateWasCalled, "Generate function should be called");
    });

    it("uses generate command context", async () => {
        let resolveConfigWasCalled = false;
        let capturedCommand = null;

        const inject = {
            resolveConfig: async (opts) => {
                resolveConfigWasCalled = true;
                capturedCommand = opts.command;
                return {
                    pagesDir: "src/pages",
                    outDir: "dist",
                    env: {},
                };
            },
            pathExists: async () => true,
            importGenerate: async () => ({
                generate: async () => ({ ok: true }),
            }),
        };

        await handleGenerateCommand({}, inject);

        assert.ok(resolveConfigWasCalled, "Should call resolveConfig");
        assert.equal(capturedCommand, "generate", "Should use 'generate' command for config resolution");
    });

    it("handles custom output directory", async () => {
        let routesPathChecked = null;
        const inject = {
            resolveConfig: createMockResolveConfig({ outDir: "custom-dist" }),
            pathExists: async (path) => {
                routesPathChecked = path;
                return true;
            },
            importGenerate: async () => ({
                generate: async () => ({ ok: true }),
            }),
        };

        await handleGenerateCommand({}, inject);

        assert.ok(routesPathChecked.includes("custom-dist"), "Should check routes.json in custom output directory");
    });
});
