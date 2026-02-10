/**
 * @fileoverview Tests for platform-config module.
 *
 * @module server/dev/shared/platform-config.test
 */

import assert from "node:assert";
import { describe, test } from "node:test";
import { createDevConfig, createDevState } from "./platform-config.js";

describe("platform-config", () => {
    test("createDevConfig returns a valid configuration object", () => {
        const config = createDevConfig();
        assert.ok(config.staticDir, "staticDir should be defined");
        assert.ok(config.srcDir, "srcDir should be defined");
        assert.ok(config.routesPath, "routesPath should be defined");
        assert.ok(config.hotReplaceClientPath, "hotReplaceClientPath should be defined");
        assert.strictEqual(typeof config.port, "number", "port should be a number");
        assert.strictEqual(typeof config.publicPath, "string", "publicPath should be a string");
        assert.ok(config.colors, "colors should be defined");
        assert.strictEqual(typeof config.colors.yellow, "string", "colors.yellow should be a string");
        assert.strictEqual(typeof config.colors.reset, "string", "colors.reset should be a string");
    });

    test("createDevConfig respects PUBLIC_PATH environment variable", () => {
        const originalPublicPath = process.env.PUBLIC_PATH;
        process.env.PUBLIC_PATH = "/custom/";
        try {
            const config = createDevConfig();
            assert.strictEqual(config.publicPath, "/custom/");
        } finally {
            if (originalPublicPath === undefined) {
                delete process.env.PUBLIC_PATH;
            } else {
                process.env.PUBLIC_PATH = originalPublicPath;
            }
        }
    });

    test("createDevConfig uses default values when constants are missing", () => {
        const config = createDevConfig({
            outputDir: "",
            srcDir: "",
            port: 0,
            publicPath: undefined,
            routesFile: "routes.json",
        });

        assert.ok(config.staticDir.endsWith("dist/client"));
        assert.ok(config.srcDir.endsWith("src"));
        assert.strictEqual(config.port, 3000);
        assert.strictEqual(config.publicPath, "/");
    });

    test("createDevState returns an initial state object", () => {
        const state = createDevState();
        assert.strictEqual(state.esbuildError, "", "esbuildError should be empty string");
        assert.deepStrictEqual(state.routes, [], "routes should be an empty array");
        assert.ok(state.jsxModules instanceof Map, "jsxModules should be a Map");
    });
});
