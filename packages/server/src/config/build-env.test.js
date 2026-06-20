import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { buildSpawnEnv } from "./build-env.js";

describe("config/build-env.js", () => {
    describe("buildSpawnEnv()", () => {
        it("should include allowMiddlewareSecurityOverride in SXO_RESOLVED_CONFIG when set to true", () => {
            /** @type {ResolvedConfig} */
            const merged = {
                command: "dev",
                port: 3000,
                pagesDir: "src/pages",
                outDir: "/project/dist",
                publicPath: "/",
                clientDir: "client",
                componentsDir: "src/components",
                open: false,
                verbose: false,
                color: true,
                allowMiddlewareSecurityOverride: true,
                env: {},
                configFilePath: null,
            };

            const spawnEnv = buildSpawnEnv(merged, "dev");
            const resolvedConfig = JSON.parse(spawnEnv.SXO_RESOLVED_CONFIG);

            strictEqual(
                resolvedConfig.allowMiddlewareSecurityOverride,
                true,
                "allowMiddlewareSecurityOverride should be true in SXO_RESOLVED_CONFIG",
            );
        });

        it("should include allowMiddlewareSecurityOverride in SXO_RESOLVED_CONFIG when set to false", () => {
            /** @type {ResolvedConfig} */
            const merged = {
                command: "build",
                port: 3000,
                pagesDir: "src/pages",
                outDir: "/project/dist",
                publicPath: "/",
                clientDir: "client",
                componentsDir: "src/components",
                open: false,
                verbose: false,
                color: true,
                allowMiddlewareSecurityOverride: false,
                env: {},
                configFilePath: null,
            };

            const spawnEnv = buildSpawnEnv(merged, "build");
            const resolvedConfig = JSON.parse(spawnEnv.SXO_RESOLVED_CONFIG);

            strictEqual(
                resolvedConfig.allowMiddlewareSecurityOverride,
                false,
                "allowMiddlewareSecurityOverride should be false in SXO_RESOLVED_CONFIG",
            );
        });

        it("should include allowMiddlewareSecurityOverride in SXO_RESOLVED_CONFIG with default value", () => {
            /** @type {ResolvedConfig} */
            const merged = {
                command: "start",
                port: 3000,
                pagesDir: "src/pages",
                outDir: "/project/dist",
                publicPath: "/",
                clientDir: "client",
                componentsDir: "src/components",
                open: false,
                verbose: false,
                color: true,
                allowMiddlewareSecurityOverride: false,
                env: {},
                configFilePath: null,
            };

            const spawnEnv = buildSpawnEnv(merged, "start");
            const resolvedConfig = JSON.parse(spawnEnv.SXO_RESOLVED_CONFIG);

            ok(
                "allowMiddlewareSecurityOverride" in resolvedConfig,
                "allowMiddlewareSecurityOverride field should be present in SXO_RESOLVED_CONFIG",
            );
            strictEqual(
                resolvedConfig.allowMiddlewareSecurityOverride,
                false,
                "allowMiddlewareSecurityOverride should have correct default value",
            );
        });

        it("should include all expected fields in SXO_RESOLVED_CONFIG", () => {
            /** @type {ResolvedConfig} */
            const merged = {
                command: "dev",
                port: 4000,
                pagesDir: "app/pages",
                outDir: "/project/output",
                publicPath: "/static",
                clientDir: "browser",
                componentsDir: "ui/components",
                open: true,
                verbose: true,
                color: false,
                allowMiddlewareSecurityOverride: true,
                securityHeaders: { "X-Frame-Options": "SAMEORIGIN" },
                build: { minify: true },
                loaders: { ".svg": "file" },
                env: {},
                configFilePath: null,
            };

            const spawnEnv = buildSpawnEnv(merged, "dev");
            const resolvedConfig = JSON.parse(spawnEnv.SXO_RESOLVED_CONFIG);

            const expectedFields = [
                "command",
                "port",
                "pagesDir",
                "outDir",
                "publicPath",
                "clientDir",
                "componentsDir",
                "build",
                "loaders",
                "open",
                "allowMiddlewareSecurityOverride",
                "securityHeaders",
            ];

            for (const field of expectedFields) {
                ok(field in resolvedConfig, `Field '${field}' should be present in SXO_RESOLVED_CONFIG`);
            }

            strictEqual(resolvedConfig.command, "dev");
            strictEqual(resolvedConfig.port, 4000);
            strictEqual(resolvedConfig.pagesDir, "app/pages");
            strictEqual(resolvedConfig.outDir, "/project/output");
            strictEqual(resolvedConfig.publicPath, "/static");
            strictEqual(resolvedConfig.clientDir, "browser");
            strictEqual(resolvedConfig.componentsDir, "ui/components");
            strictEqual(resolvedConfig.open, true);
            strictEqual(resolvedConfig.allowMiddlewareSecurityOverride, true);
            deepStrictEqual(resolvedConfig.build, { minify: true });
            deepStrictEqual(resolvedConfig.loaders, { ".svg": "file" });
        });

        it("should set basic environment variables correctly", () => {
            /** @type {ResolvedConfig} */
            const merged = {
                command: "dev",
                port: 3000,
                pagesDir: "src/pages",
                outDir: "/project/dist",
                publicPath: "/",
                clientDir: "client",
                componentsDir: "src/components",
                open: false,
                verbose: false,
                color: true,
                allowMiddlewareSecurityOverride: false,
                env: {},
                configFilePath: null,
            };

            const spawnEnv = buildSpawnEnv(merged, "dev");

            strictEqual(spawnEnv.DEV, "true");
            strictEqual(spawnEnv.PORT, "3000");
            strictEqual(spawnEnv.PAGES_DIR, "src/pages");
            strictEqual(spawnEnv.OUTPUT_DIR_CLIENT, path.join("/project/dist", "client"));
            strictEqual(spawnEnv.OUTPUT_DIR_SERVER, path.join("/project/dist", "server"));
            strictEqual(spawnEnv.CLIENT_DIR, "client");
            strictEqual(spawnEnv.COMPONENTS_DIR, "src/components");
            strictEqual(spawnEnv.SXO_COMMAND, "dev");
        });

        it("should set DEV to false for non-dev commands", () => {
            /** @type {ResolvedConfig} */
            const merged = {
                command: "build",
                port: 3000,
                pagesDir: "src/pages",
                outDir: "/project/dist",
                publicPath: "/",
                clientDir: "client",
                componentsDir: "src/components",
                open: false,
                verbose: false,
                color: true,
                allowMiddlewareSecurityOverride: false,
                env: {},
                configFilePath: null,
            };

            const spawnEnv = buildSpawnEnv(merged, "build");

            strictEqual(spawnEnv.DEV, "false");
            strictEqual(spawnEnv.SXO_COMMAND, "build");
        });

        it("should include BUILD and LOADERS env for dev command", () => {
            /** @type {ResolvedConfig} */
            const merged = {
                command: "dev",
                port: 3000,
                pagesDir: "src/pages",
                outDir: "/project/dist",
                publicPath: "/static",
                clientDir: "client",
                componentsDir: "src/components",
                open: false,
                verbose: false,
                color: true,
                allowMiddlewareSecurityOverride: false,
                build: { minify: true },
                loaders: { ".svg": "file" },
                env: {},
                configFilePath: null,
            };

            const spawnEnv = buildSpawnEnv(merged, "dev");

            ok(spawnEnv.BUILD, "BUILD env should be set for dev command");
            ok(spawnEnv.LOADERS, "LOADERS env should be set for dev command");
            ok(spawnEnv.PUBLIC_PATH, "PUBLIC_PATH env should be set for dev command");
            strictEqual(spawnEnv.PUBLIC_PATH, "/static");
            deepStrictEqual(JSON.parse(spawnEnv.BUILD), { minify: true });
            deepStrictEqual(JSON.parse(spawnEnv.LOADERS), { ".svg": "file" });
        });

        it("should include PUBLIC_PATH env for generate command", () => {
            /** @type {ResolvedConfig} */
            const merged = {
                command: "generate",
                port: 3000,
                pagesDir: "src/pages",
                outDir: "/project/dist",
                publicPath: "/static",
                clientDir: "client",
                componentsDir: "src/components",
                open: false,
                verbose: false,
                color: true,
                allowMiddlewareSecurityOverride: false,
                build: { minify: true },
                loaders: { ".svg": "file" },
                env: {},
                configFilePath: null,
            };

            const spawnEnv = buildSpawnEnv(merged, "generate");

            ok(spawnEnv.PUBLIC_PATH, "PUBLIC_PATH env should be set for generate command");
            strictEqual(spawnEnv.PUBLIC_PATH, "/static");
        });

        it("should preserve empty string publicPath for generate command", () => {
            /** @type {ResolvedConfig} */
            const merged = {
                command: "generate",
                port: 3000,
                pagesDir: "src/pages",
                outDir: "/project/dist",
                publicPath: "",
                clientDir: "client",
                componentsDir: "src/components",
                open: false,
                verbose: false,
                color: true,
                allowMiddlewareSecurityOverride: false,
                env: {},
                configFilePath: null,
            };

            const spawnEnv = buildSpawnEnv(merged, "generate");

            strictEqual(spawnEnv.PUBLIC_PATH, "", "empty string publicPath should be preserved for generate");
        });

        it("should include BUILD and LOADERS env for generate command", () => {
            /** @type {ResolvedConfig} */
            const merged = {
                command: "generate",
                port: 3000,
                pagesDir: "src/pages",
                outDir: "/project/dist",
                publicPath: "/static",
                clientDir: "client",
                componentsDir: "src/components",
                open: false,
                verbose: false,
                color: true,
                allowMiddlewareSecurityOverride: false,
                build: { minify: true },
                loaders: { ".svg": "file" },
                env: {},
                configFilePath: null,
            };

            const spawnEnv = buildSpawnEnv(merged, "generate");

            ok(spawnEnv.BUILD, "BUILD env should be set for generate command");
            ok(spawnEnv.LOADERS, "LOADERS env should be set for generate command");
            ok(spawnEnv.PUBLIC_PATH, "PUBLIC_PATH env should be set for generate command");
            strictEqual(spawnEnv.PUBLIC_PATH, "/static");
            deepStrictEqual(JSON.parse(spawnEnv.BUILD), { minify: true });
            deepStrictEqual(JSON.parse(spawnEnv.LOADERS), { ".svg": "file" });
        });

        it("should include BUILD and LOADERS env for build command", () => {
            /** @type {ResolvedConfig} */
            const merged = {
                command: "build",
                port: 3000,
                pagesDir: "src/pages",
                outDir: "/project/dist",
                publicPath: "/",
                clientDir: "client",
                componentsDir: "src/components",
                open: false,
                verbose: false,
                color: true,
                allowMiddlewareSecurityOverride: false,
                build: { sourcemap: true },
                loaders: { ".png": "dataurl" },
                env: {},
                configFilePath: null,
            };

            const spawnEnv = buildSpawnEnv(merged, "build");

            ok(spawnEnv.BUILD, "BUILD env should be set for build command");
            ok(spawnEnv.LOADERS, "LOADERS env should be set for build command");
            ok(spawnEnv.PUBLIC_PATH, "PUBLIC_PATH env should be set for build command");
            deepStrictEqual(JSON.parse(spawnEnv.BUILD), { sourcemap: true });
            deepStrictEqual(JSON.parse(spawnEnv.LOADERS), { ".png": "dataurl" });
        });

        it("should not include BUILD and LOADERS env for start command", () => {
            /** @type {ResolvedConfig} */
            const merged = {
                command: "start",
                port: 3000,
                pagesDir: "src/pages",
                outDir: "/project/dist",
                publicPath: "/",
                clientDir: "client",
                componentsDir: "src/components",
                open: false,
                verbose: false,
                color: true,
                allowMiddlewareSecurityOverride: false,
                build: { minify: true },
                loaders: { ".svg": "file" },
                env: {},
                configFilePath: null,
            };

            const spawnEnv = buildSpawnEnv(merged, "start");

            ok(!spawnEnv.BUILD, "BUILD env should not be set for start command");
            ok(!spawnEnv.LOADERS, "LOADERS env should not be set for start command");
        });

        it("should include securityHeaders in SXO_RESOLVED_CONFIG", () => {
            /** @type {ResolvedConfig} */
            const merged = {
                command: "start",
                port: 3000,
                pagesDir: "src/pages",
                outDir: "/project/dist",
                publicPath: "/",
                clientDir: "client",
                componentsDir: "src/components",
                open: false,
                verbose: false,
                color: true,
                allowMiddlewareSecurityOverride: false,
                securityHeaders: { "X-Frame-Options": "SAMEORIGIN" },
                env: {},
                configFilePath: null,
            };

            const spawnEnv = buildSpawnEnv(merged, "start");
            const resolvedConfig = JSON.parse(spawnEnv.SXO_RESOLVED_CONFIG);

            deepStrictEqual(
                resolvedConfig.securityHeaders,
                { "X-Frame-Options": "SAMEORIGIN" },
                "securityHeaders should be present in SXO_RESOLVED_CONFIG",
            );
        });

        it("should include open field in SXO_RESOLVED_CONFIG when set to true", () => {
            /** @type {ResolvedConfig} */
            const merged = {
                command: "dev",
                port: 3000,
                pagesDir: "src/pages",
                outDir: "/project/dist",
                publicPath: "/",
                clientDir: "client",
                componentsDir: "src/components",
                open: true,
                verbose: false,
                color: true,
                allowMiddlewareSecurityOverride: false,
                env: {},
                configFilePath: null,
            };

            const spawnEnv = buildSpawnEnv(merged, "dev");
            const resolvedConfig = JSON.parse(spawnEnv.SXO_RESOLVED_CONFIG);

            strictEqual(resolvedConfig.open, true, "open should be true in SXO_RESOLVED_CONFIG");
        });

        it("should include open field in SXO_RESOLVED_CONFIG when set to false", () => {
            /** @type {ResolvedConfig} */
            const merged = {
                command: "build",
                port: 3000,
                pagesDir: "src/pages",
                outDir: "/project/dist",
                publicPath: "/",
                clientDir: "client",
                componentsDir: "src/components",
                open: false,
                verbose: false,
                color: true,
                allowMiddlewareSecurityOverride: false,
                env: {},
                configFilePath: null,
            };

            const spawnEnv = buildSpawnEnv(merged, "build");
            const resolvedConfig = JSON.parse(spawnEnv.SXO_RESOLVED_CONFIG);

            strictEqual(resolvedConfig.open, false, "open should be false in SXO_RESOLVED_CONFIG");
        });

        it("should include open field with correct precedence in SXO_RESOLVED_CONFIG", () => {
            /** @type {ResolvedConfig} */
            const mergedWithTrue = {
                command: "dev",
                port: 3000,
                pagesDir: "src/pages",
                outDir: "/project/dist",
                publicPath: "/",
                clientDir: "client",
                componentsDir: "src/components",
                open: true,
                verbose: false,
                color: true,
                allowMiddlewareSecurityOverride: false,
                env: {},
                configFilePath: null,
            };

            /** @type {ResolvedConfig} */
            const mergedWithFalse = {
                ...mergedWithTrue,
                open: false,
            };

            const spawnEnvTrue = buildSpawnEnv(mergedWithTrue, "dev");
            const spawnEnvFalse = buildSpawnEnv(mergedWithFalse, "dev");

            const resolvedConfigTrue = JSON.parse(spawnEnvTrue.SXO_RESOLVED_CONFIG);
            const resolvedConfigFalse = JSON.parse(spawnEnvFalse.SXO_RESOLVED_CONFIG);

            ok("open" in resolvedConfigTrue, "open field should be present in SXO_RESOLVED_CONFIG");
            ok("open" in resolvedConfigFalse, "open field should be present in SXO_RESOLVED_CONFIG");
            strictEqual(resolvedConfigTrue.open, true, "open should preserve true value from merged config");
            strictEqual(resolvedConfigFalse.open, false, "open should preserve false value from merged config");
        });
    });
});
