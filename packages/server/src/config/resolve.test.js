import * as assert from "node:assert";
import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { resolveConfig, resolveRuntimeConfig } from "../config/resolve.js";
import { mockConsoleError, mockConsoleWarn, withTempProject, writeFile } from "../test-utils.js";

/** @type {string[]} Environment keys managed by tests */
const ENV_KEYS = [
    "PORT",
    "PAGES_DIR",
    "OUTPUT_DIR",
    "OPEN",
    "VERBOSE",
    "NO_COLOR",
    "MINIFY",
    "SOURCEMAP",
    "PUBLIC_PATH",
    "LOADERS",
    "CLIENT_DIR",
    "COMPONENTS_DIR",
    "BUILD",
    "SXO_COMMAND",
    "SXO_RESOLVED_CONFIG",
    "DEV",
    "SECURITY_HEADERS",
    "ALLOW_MIDDLEWARE_SECURITY_OVERRIDE",
];

/** Reset environment to clean state */
function resetEnv() {
    for (const key of ENV_KEYS) {
        if (Object.hasOwn(process.env, key)) delete process.env[key];
    }
}

/**
 * Resolve config with minimal boilerplate
 * @param {object} opts
 * @param {string} [opts.cwd]
 * @param {string} [opts.command]
 * @param {object} [opts.flags]
 * @param {object} [opts.flagsExplicit]
 * @returns {Promise<ResolvedConfig>}
 */
function resolve(opts = {}) {
    return resolveConfig({
        cwd: opts.cwd || "/project",
        command: opts.command || "dev",
        flags: opts.flags || {},
        flagsExplicit: opts.flagsExplicit,
    });
}

/**
 * Resolve config within a temporary project
 * @param {string} configContent - Config file content
 * @param {object} opts - Options passed to resolveConfig
 * @returns {Promise<ResolvedConfig>}
 */
async function resolveWithConfig(configContent, opts = {}) {
    return withTempProject(async (dir) => {
        if (configContent) await writeFile(dir, "sxo.config.js", configContent);
        return resolve({ ...opts, cwd: dir });
    });
}

/**
 * Assert config property equals expected value
 * @param {ResolvedConfig} cfg
 * @param {string} prop
 * @param {any} expected
 * @param {string} description
 */
function assertEquals(cfg, prop, expected, description) {
    strictEqual(cfg[prop], expected, `${description}: ${prop}`);
}

/**
 * Assert config property deeply equals expected value
 * @param {ResolvedConfig} cfg
 * @param {string} prop
 * @param {any} expected
 * @param {string} description
 */
function assertDeepEquals(cfg, prop, expected, description) {
    deepStrictEqual(cfg[prop], expected, `${description}: ${prop}`);
}

/**
 * Assert env variable is set/unset
 * @param {ResolvedConfig} cfg
 * @param {string} envVar
 * @param {boolean} shouldExist
 * @param {string} description
 */
function assertEnv(cfg, envVar, shouldExist, description) {
    const condition = shouldExist ? cfg.env[envVar] : !cfg.env[envVar];
    ok(condition, `${description}: ${envVar} env should ${shouldExist ? "" : "not "}be set`);
}

describe("config/resolve.js", () => {
    beforeEach(resetEnv);
    afterEach(resetEnv);

    describe("resolveRuntimeConfig", () => {
        it("should load from SXO_RESOLVED_CONFIG env var", async () => {
            process.env.SXO_RESOLVED_CONFIG = JSON.stringify({
                command: "build",
                port: 8080,
                pagesDir: "app/pages",
                outDir: "/project/dist",
                publicPath: "/static",
                clientDir: "browser",
                componentsDir: "ui/components",
                build: { minify: true },
                loaders: { ".svg": "file" },
                allowMiddlewareSecurityOverride: true,
            });

            const cfg = await resolveRuntimeConfig();

            assertEquals(cfg, "command", "build", "runtime config");
            assertEquals(cfg, "port", 8080, "runtime config");
            assertEquals(cfg, "pagesDir", "app/pages", "runtime config");
            assertEquals(cfg, "publicPath", "/static", "runtime config");
            assertEquals(cfg, "clientDir", "browser", "runtime config");
            assertEquals(cfg, "componentsDir", "ui/components", "runtime config");
            assertDeepEquals(cfg, "build", { minify: true }, "runtime config");
            assertDeepEquals(cfg, "loaders", { ".svg": "file" }, "runtime config");
            assertEquals(cfg, "allowMiddlewareSecurityOverride", true, "runtime config");
        });

        it("should use command from SXO_COMMAND env var when SXO_RESOLVED_CONFIG fails", async () => {
            process.env.SXO_COMMAND = "preview";
            process.env.DEV = "true";

            const cfg = await resolveRuntimeConfig();

            assertEquals(cfg, "command", "preview", "SXO_COMMAND should be used when no resolved config");
        });

        it("should log error for invalid JSON in SXO_RESOLVED_CONFIG", async (t) => {
            const errorMock = mockConsoleError(t);
            process.env.SXO_RESOLVED_CONFIG = "{ invalid json }";

            const result = await resolveRuntimeConfig();

            ok(errorMock.getErrors().length > 0, "Error should be logged");
            ok(result, "Should return config from fallback");
        });

        it("should log error for missing required fields in SXO_RESOLVED_CONFIG", async (t) => {
            const errorMock = mockConsoleError(t);
            process.env.SXO_RESOLVED_CONFIG = JSON.stringify({ unexpected: "structure" });

            const result = await resolveRuntimeConfig();

            const errors = errorMock.getErrors();
            ok(errors.length > 0, "Error should be logged");
            ok(
                errors.some((e) => e.toLowerCase().includes("missing")),
                "Error should mention missing fields",
            );
            ok(result, "Should return config from fallback");
        });
    });

    describe("Config precedence and flag filtering", () => {
        it("should apply precedence: env > defaults", async () => {
            process.env.PORT = "4000";
            process.env.PAGES_DIR = "app/pages";

            const cfg = await resolve();

            assertEquals(cfg, "port", 4000, "env overrides defaults");
            assertEquals(cfg, "pagesDir", "app/pages", "env overrides defaults");
        });

        it("should apply precedence: file > env", async () => {
            process.env.PORT = "4000";

            const cfg = await resolveWithConfig("export default { port: 5000 }");

            assertEquals(cfg, "port", 5000, "file overrides env");
        });

        it("should apply precedence: flags > file", async () => {
            const cfg = await resolveWithConfig("export default { port: 5000 }", { flags: { port: 6000 } });

            assertEquals(cfg, "port", 6000, "flags override file");
        });

        describe("flagsExplicit filtering", () => {
            it("should apply only explicitly provided flags", async () => {
                const cfg = await resolve({
                    flagsExplicit: { port: true },
                    flags: { port: 5000, verbose: true },
                });

                assertEquals(cfg, "port", 5000, "explicit flag applied");
                assertEquals(cfg, "verbose", false, "non-explicit flag filtered");
            });

            it("should apply all flags when flagsExplicit is empty", async () => {
                const cfg = await resolve({ flagsExplicit: {}, flags: { port: 5000, verbose: true } });

                assertEquals(cfg, "port", 5000, "all flags applied");
                assertEquals(cfg, "verbose", true, "all flags applied");
            });

            it("should not filter when flagsExplicit is null", async () => {
                const cfg = await resolve({ flagsExplicit: null, flags: { port: 5000, verbose: true } });

                assertEquals(cfg, "port", 5000, "no filtering");
                assertEquals(cfg, "verbose", true, "no filtering");
            });

            it("should handle kebab-case flag names", async () => {
                const cfg = await resolve({
                    flagsExplicit: { "client-dir": true },
                    flags: { clientDir: "custom-client" },
                });

                assertEquals(cfg, "clientDir", "custom-client", "kebab-case handled");
            });
        });

        describe("BUILD merging", () => {
            it("should accept BUILD from flags", async () => {
                const cfg = await resolve({ flags: { build: { minify: true, sourcemap: true } } });

                assertDeepEquals(cfg, "build", { minify: true, sourcemap: true }, "BUILD from flags");
            });

            it("should merge BUILD from env", async () => {
                process.env.BUILD = JSON.stringify({ minify: true });

                const cfg = await resolve({ flags: {} });

                assertDeepEquals(cfg, "build", { minify: true }, "BUILD from env");
            });

            it("should override env BUILD with flags", async () => {
                process.env.BUILD = JSON.stringify({ minify: true });

                const cfg = await resolve({ flags: { build: { minify: false } } });

                assertDeepEquals(cfg, "build", { minify: false }, "flags override env BUILD");
            });

            it("should not set BUILD env for non-dev/build commands", async () => {
                const cfg = await resolve({ command: "start", flags: { build: { minify: true } } });

                assertEnv(cfg, "BUILD", false, "start command");
            });
        });

        describe("Conditional BUILD/LOADERS env", () => {
            const testCases = [
                { command: "dev", shouldInclude: true },
                { command: "build", shouldInclude: true },
                { command: "start", shouldInclude: false },
            ];

            for (const { command, shouldInclude } of testCases) {
                it(`should ${shouldInclude ? "" : "not "}include BUILD/LOADERS for ${command} command`, async () => {
                    const cfg = await resolve({
                        command,
                        flags: { build: { minify: true }, loaders: { svg: "file" } },
                    });

                    assertEnv(cfg, "BUILD", shouldInclude, `${command} command`);
                    assertEnv(cfg, "LOADERS", shouldInclude, `${command} command`);
                });
            }
        });
    });

    describe("Directory and environment validation", () => {
        describe("Path normalization", () => {
            it("should resolve OUTPUT_DIR_CLIENT from outDir", async () => {
                const cfg = await resolve({ flags: { outDir: "/project/output" } });
                ok(cfg.env.OUTPUT_DIR_CLIENT.endsWith("output/client"));
            });

            it("should resolve OUTPUT_DIR_SERVER from outDir", async () => {
                const cfg = await resolve({ flags: { outDir: "/project/output" } });
                ok(cfg.env.OUTPUT_DIR_SERVER.endsWith("output/server"));
            });

            it("should normalize pagesDir backslashes to POSIX", async () => {
                const cfg = await resolve({ flags: { pagesDir: "src\\pages" } });
                assertEquals(cfg, "pagesDir", "src/pages", "backslash normalization");
            });

            it("should normalize componentsDir backslashes to POSIX", async () => {
                const cfg = await resolve({ flags: { componentsDir: "components\\ui" } });
                assertEquals(cfg, "componentsDir", "components/ui", "backslash normalization");
            });

            it("should resolve outDir to absolute path", async () => {
                const cfg = await resolve({ flags: { outDir: "output" } });
                ok(cfg.outDir.endsWith("output"));
                ok(path.isAbsolute(cfg.outDir));
            });
        });

        describe("Directory defaults and validation", () => {
            const testCases = [
                { dir: "clientDir", value: undefined, expected: "client", desc: "default" },
                { dir: "clientDir", value: "browser", expected: "browser", desc: "custom value" },
                { dir: "componentsDir", value: undefined, expected: "src/components", desc: "default" },
                { dir: "componentsDir", value: "ui/components", expected: "ui/components", desc: "custom value" },
                { dir: "componentsDir", value: "ui\\components", expected: "ui/components", desc: "backslash normalization" },
            ];

            for (const { dir, value, expected, desc } of testCases) {
                it(`should handle ${dir} ${desc}`, async () => {
                    const cfg = value === undefined ? await resolve() : await resolve({ flags: { [dir]: value } });
                    assertEquals(cfg, dir, expected, `${dir} validation`);
                });
            }

            it("should reject clientDir with backslash", async () => {
                await withTempProject(async (tempDir) => {
                    await writeFile(tempDir, "sxo.config.js", `export default { clientDir: "client\\\\js" }`);
                    await assert.rejects(() => resolve({ cwd: tempDir }), /Invalid/);
                });
            });

            it("should reject componentsDir escaping root", async () => {
                await withTempProject(async (tempDir) => {
                    await writeFile(tempDir, "sxo.config.js", `export default { componentsDir: "../outside" }`);
                    await assert.rejects(() => resolve({ cwd: tempDir }), /Invalid|escape|attempts/);
                });
            });
        });

        describe("Boolean validation", () => {
            it("should fallback to default for invalid boolean value", async () => {
                const cfg = await resolve({ flags: { verbose: "invalid" } });
                assertEquals(cfg, "verbose", false, "invalid boolean fallback");
            });

            it("should not warn for invalid boolean value", async (t) => {
                const mock = mockConsoleWarn(t);
                await resolve({ flags: { verbose: "invalid" } });
                strictEqual(mock.getWarnings().length, 0, "no warnings for invalid boolean");
            });
        });
    });

    describe("Edge cases", () => {
        it("should preserve empty string publicPath", async () => {
            const cfg = await resolve({ flags: { publicPath: "" } });
            assertEquals(cfg, "publicPath", "", "empty publicPath preserved");
        });

        it("should silently ignore malformed JSON in BUILD env", async () => {
            process.env.BUILD = "{ invalid json }";
            const cfg = await resolve();
            strictEqual(cfg.build, undefined);
        });

        it("should silently ignore malformed JSON in LOADERS env", async () => {
            process.env.LOADERS = '{"invalid json}';
            const cfg = await resolve();
            strictEqual(cfg.loaders, undefined);
        });

        it("should handle empty loaders string", async () => {
            process.env.LOADERS = "";
            const cfg = await resolve();
            strictEqual(cfg.loaders, undefined);
        });

        it("should silently ignore malformed JSON in SECURITY_HEADERS env", async () => {
            process.env.SECURITY_HEADERS = "{ invalid json }";
            const cfg = await resolve();
            strictEqual(cfg.securityHeaders, null);
        });

        it("should parse valid JSON in SECURITY_HEADERS env", async () => {
            process.env.SECURITY_HEADERS = '{"X-Test": "Value"}';
            const cfg = await resolve();
            deepStrictEqual(cfg.securityHeaders, { "X-Test": "Value" });
        });

        const boolTestCases = [
            { value: "true", expected: true },
            { value: "false", expected: false },
        ];

        for (const { value, expected } of boolTestCases) {
            it(`should parse ALLOW_MIDDLEWARE_SECURITY_OVERRIDE=${value}`, async () => {
                process.env.ALLOW_MIDDLEWARE_SECURITY_OVERRIDE = value;
                const cfg = await resolve();
                assertEquals(cfg, "allowMiddlewareSecurityOverride", expected, `parse ${value}`);
            });
        }

        const colorTestCases = [
            { value: "true", expected: false },
            { value: "false", expected: true },
        ];

        for (const { value, expected } of colorTestCases) {
            it(`should parse NO_COLOR=${value}`, async () => {
                process.env.NO_COLOR = value;
                const cfg = await resolve();
                assertEquals(cfg, "color", expected, `NO_COLOR=${value}`);
            });
        }

        it("should fallback to default port when port is 0", async () => {
            const cfg = await resolve({ flags: { port: 0 } });
            assertEquals(cfg, "port", 3000, "port 0 falls back to default");
        });
    });
});
