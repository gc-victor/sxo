/**
 * @fileoverview Tests for dev command handler.
 *
 * @module cli/commands/dev.test
 */

import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it, mock } from "node:test";
import { log } from "../ui.js";
import { handleDevCommand } from "./dev.js";

const originalExitCode = process.exitCode;

describe("cli/commands/dev", () => {
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
            open: false,
            env: {},
            ...overrides,
        });
    }

    it("successfully starts dev server with prebuild", async () => {
        const inject = {
            resolveConfig: createMockResolveConfig(),
            validatePagesFolder: async () => {},
            runRuntime: async () => ({ success: true }),
            spawnRuntime: () => ({
                child: { once: () => {} },
                wait: Promise.resolve({ success: true }),
            }),
            ensureDir: async () => {},
            openWhenReady: async () => ({ opened: false, timedOut: false }),
        };

        await handleDevCommand({}, inject);

        assert.equal(process.exitCode, undefined, "Should not set exit code on success");
    });

    it("fails when prebuild fails", async () => {
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

        await handleDevCommand({}, inject);

        const errorCalls = logMocks.error.mock.calls;
        assert.ok(errorCalls.length >= 1, "Expected error log");

        const errorMessages = errorCalls.map((c) => c.arguments[0]);
        assert.ok(
            errorMessages.some((msg) => msg.includes("Couldn't generate routes")),
            "Should log prebuild error message",
        );
        assert.equal(process.exitCode, 1);
    });

    it("opens browser when configured", async () => {
        let openWasCalledWithPort = null;
        const inject = {
            resolveConfig: createMockResolveConfig({ open: true, port: 3001 }),
            validatePagesFolder: async () => {},
            runRuntime: async () => ({ success: true }),
            spawnRuntime: () => ({
                child: { once: () => {} },
                wait: Promise.resolve({ success: true }),
            }),
            ensureDir: async () => {},
            openWhenReady: async (opts) => {
                openWasCalledWithPort = opts.port;
                return { opened: true, timedOut: false };
            },
        };

        await handleDevCommand({}, inject);

        assert.equal(openWasCalledWithPort, 3001, "Should call openWhenReady with correct port");
    });

    it("warns on timeout when opening browser", async () => {
        const inject = {
            resolveConfig: createMockResolveConfig({ open: true, port: 3000 }),
            validatePagesFolder: async () => {},
            runRuntime: async () => ({ success: true }),
            spawnRuntime: () => ({
                child: { once: () => {} },
                wait: Promise.resolve({ success: true }),
            }),
            ensureDir: async () => {},
            openWhenReady: async () => ({ opened: false, timedOut: true }),
        };

        await handleDevCommand({}, inject);

        const warnCalls = logMocks.warn.mock.calls;
        const warnMessages = warnCalls.map((c) => c.arguments[0]);
        assert.ok(
            warnMessages.some((msg) => msg.includes("Timed out waiting")),
            "Should log timeout warning",
        );
    });

    it("sets DEV=true in environment", async () => {
        let capturedEnv = null;
        const inject = {
            resolveConfig: createMockResolveConfig({ env: {} }),
            validatePagesFolder: async () => {},
            runRuntime: async (_script, opts) => {
                capturedEnv = opts.env;
                return { success: true };
            },
            spawnRuntime: () => ({
                child: { once: () => {} },
                wait: Promise.resolve({ success: true }),
            }),
            ensureDir: async () => {},
            openWhenReady: async () => ({ opened: false, timedOut: false }),
        };

        await handleDevCommand({}, inject);

        assert.equal(capturedEnv.DEV, "true", "Should set DEV environment variable");
    });

    it("logs PAGES_DIR hint on prebuild failure", async () => {
        const inject = {
            resolveConfig: createMockResolveConfig({ pagesDir: "custom/pages" }),
            validatePagesFolder: async () => {},
            runRuntime: async () => ({ success: false, code: 1 }),
            spawnRuntime: () => ({
                child: { once: () => {} },
                wait: Promise.resolve({ success: true }),
            }),
            ensureDir: async () => {},
            openWhenReady: async () => ({ opened: false, timedOut: false }),
        };

        await handleDevCommand({}, inject);

        const infoCalls = logMocks.info.mock.calls;
        const infoMessages = infoCalls.map((c) => c.arguments[0]);

        assert.ok(
            infoMessages.some((msg) => msg.includes("PAGES_DIR") && msg.includes("custom/pages")),
            "Should log PAGES_DIR path",
        );
        assert.ok(
            infoMessages.some((msg) => msg.includes("--pages-dir")),
            "Should log hint about --pages-dir flag",
        );
    });

    it("handles dev server exit with error code", async () => {
        const inject = {
            resolveConfig: createMockResolveConfig(),
            validatePagesFolder: async () => {},
            runRuntime: async () => ({ success: true }),
            spawnRuntime: () => ({
                child: { once: () => {} },
                wait: Promise.resolve({ success: false, code: 143 }),
            }),
            ensureDir: async () => {},
            openWhenReady: async () => ({ opened: false, timedOut: false }),
        };

        await handleDevCommand({}, inject);

        assert.equal(process.exitCode, 143, "Should set exit code from server process");
    });
});
