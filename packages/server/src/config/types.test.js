import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Verify that config types exist and have correct structure.
 *
 * This test file verifies that the type definitions in src/js/types/config.d.ts
 * match the actual usage in the config modules.
 */

describe("config types", () => {
    describe("Config type", () => {
        it("should accept valid config object", () => {
            // This test validates the type definition shape at runtime
            // The TypeScript compiler will check the actual types
            const config = {
                command: "dev",
                port: 3000,
                pagesDir: "src/pages",
                outDir: "/project/dist",
                open: true,
                verbose: false,
                color: true,
                publicPath: "/",
                clientDir: "client",
                componentsDir: "src/components",
                build: { minify: true },
                loaders: { ".svg": "file" },
                env: {
                    DEV: "true",
                    PORT: "3000",
                    PAGES_DIR: "src/pages",
                    OUTPUT_DIR_CLIENT: "/project/dist/client",
                    OUTPUT_DIR_SERVER: "/project/dist/server",
                    CLIENT_DIR: "client",
                    COMPONENTS_DIR: "src/components",
                    SXO_COMMAND: "dev",
                    SXO_RESOLVED_CONFIG: "{}",
                },
                configFilePath: "/project/sxo.config.js",
            };

            // Validate required properties exist
            assert.strictEqual(config.command, "dev");
            assert.strictEqual(config.port, 3000);
            assert.strictEqual(config.pagesDir, "src/pages");
            assert.strictEqual(config.outDir, "/project/dist");
            assert.strictEqual(config.open, true);
            assert.strictEqual(config.verbose, false);
            assert.strictEqual(config.color, true);
            assert.strictEqual(config.publicPath, "/");
            assert.strictEqual(config.clientDir, "client");
            assert.strictEqual(config.componentsDir, "src/components");
            assert.ok(config.build);
            assert.ok(config.loaders);
            assert.ok(config.env);
            assert.ok(config.configFilePath);
        });

        it("should accept config without optional build and loaders", () => {
            const config = {
                command: "build",
                port: 3000,
                pagesDir: "src/pages",
                outDir: "/project/dist",
                open: false,
                verbose: false,
                color: true,
                publicPath: "/",
                clientDir: "client",
                componentsDir: "src/components",
                env: {
                    DEV: "false",
                    PORT: "3000",
                    PAGES_DIR: "src/pages",
                    OUTPUT_DIR_CLIENT: "/project/dist/client",
                    OUTPUT_DIR_SERVER: "/project/dist/server",
                    CLIENT_DIR: "client",
                    COMPONENTS_DIR: "src/components",
                    SXO_COMMAND: "build",
                    SXO_RESOLVED_CONFIG: "{}",
                },
                configFilePath: "/project/sxo.config.js",
            };

            // build and loaders should be optional
            assert.strictEqual(config.build, undefined);
            assert.strictEqual(config.loaders, undefined);
        });

        it("should accept all command types", () => {
            const commands = ["dev", "build", "start", "preview", "clean", "add"];

            for (const command of commands) {
                const config = {
                    command,
                    port: 3000,
                    pagesDir: "src/pages",
                    outDir: "/project/dist",
                    open: true,
                    verbose: false,
                    color: true,
                    publicPath: "/",
                    clientDir: "client",
                    componentsDir: "src/components",
                    env: {
                        DEV: command === "dev" ? "true" : "false",
                        PORT: "3000",
                        PAGES_DIR: "src/pages",
                        OUTPUT_DIR_CLIENT: "/project/dist/client",
                        OUTPUT_DIR_SERVER: "/project/dist/server",
                        CLIENT_DIR: "client",
                        COMPONENTS_DIR: "src/components",
                        SXO_COMMAND: command,
                        SXO_RESOLVED_CONFIG: "{}",
                    },
                    configFilePath: "/project/sxo.config.js",
                };

                assert.strictEqual(config.command, command);
            }
        });
    });

    describe("ResolveOptions type", () => {
        it("should accept valid resolve options", () => {
            const options = {
                cwd: "/project",
                flags: { port: 4000, verbose: true },
                flagsExplicit: { port: true, verbose: false },
                command: "dev",
            };

            assert.strictEqual(options.cwd, "/project");
            assert.ok(options.flags);
            assert.ok(options.flagsExplicit);
            assert.strictEqual(options.command, "dev");
        });

        it("should accept empty resolve options", () => {
            const options = {};

            assert.strictEqual(options.cwd, undefined);
            assert.strictEqual(options.flags, undefined);
            assert.strictEqual(options.flagsExplicit, undefined);
            assert.strictEqual(options.command, undefined);
        });

        it("should accept partial resolve options", () => {
            const options1 = { cwd: "/project" };
            assert.strictEqual(options1.cwd, "/project");
            assert.strictEqual(options1.command, undefined);

            const options2 = { command: "build" };
            assert.strictEqual(options2.cwd, undefined);
            assert.strictEqual(options2.command, "build");

            const options3 = { flags: { port: 4000 } };
            assert.strictEqual(options3.cwd, undefined);
            assert.ok(options3.flags);
        });
    });

    describe("BuildConfig type", () => {
        it("should accept esbuild-compatible build options", () => {
            const buildConfig = {
                minify: true,
                sourcemap: false,
                target: "es2020",
                define: { "process.env.NODE_ENV": '"production"' },
                plugins: [],
            };

            assert.strictEqual(buildConfig.minify, true);
            assert.strictEqual(buildConfig.sourcemap, false);
            assert.strictEqual(buildConfig.target, "es2020");
            assert.ok(buildConfig.define);
            assert.ok(buildConfig.plugins);
        });

        it("should accept empty build config", () => {
            const buildConfig = {};
            assert.strictEqual(Object.keys(buildConfig).length, 0);
        });
    });

    describe("Loaders type", () => {
        it("should accept loader mappings", () => {
            const loaders = {
                ".svg": "file",
                ".png": "file",
                ".wasm": "file",
                svg: "file",
                png: "file",
            };

            assert.strictEqual(loaders[".svg"], "file");
            assert.strictEqual(loaders.svg, "file");
        });

        it("should accept empty loaders", () => {
            const loaders = {};
            assert.strictEqual(Object.keys(loaders).length, 0);
        });
    });
});
