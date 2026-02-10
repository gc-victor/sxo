/**
 * @fileoverview Tests for platform-agnostic dev server core utilities.
 *
 * Covers:
 * - debounce() timing and cancellation behavior
 * - reloadRoutesManifest() with retry logic
 * - isMiddlewareFile() identification logic
 * - extractBodyFromHtml() body content extraction
 * - buildHotReplacePayload() SSE payload building
 * - getWatcherErrorHandler() graceful error handling
 * - runEsbuild() esbuild execution and error cleaning
 */

import { deepStrictEqual, ok, rejects, strictEqual } from "node:assert";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";

import { buildHotReplacePayload, debounce, getWatcherErrorHandler, isMiddlewareFile, reloadRoutesManifest, runEsbuild } from "./core.js";
import { extractBodyFromHtml } from "./html-utils.js";

/**
 * Helper to run scenario-based tests with common pattern.
 * @param {object} t - Test context
 * @param {Array} scenarios - Test scenarios
 * @param {Function} runner - Async function to execute each scenario
 */
async function _runScenarios(t, scenarios, runner) {
    for (const scenario of scenarios) {
        await t.test(scenario.name, () => runner(scenario));
    }
}

// --- debounce() tests ---

describe("debounce", () => {
    test("handles various debounce scenarios", async (t) => {
        const scenarios = [
            {
                name: "delays function execution by specified milliseconds",
                delay: 50,
                setup: () => {
                    let calls = 0;
                    return { fn: () => calls++, get: () => calls };
                },
                act: (fn) => fn(),
                check: (val) => strictEqual(val, 1),
                wait: 60,
                immediate: true,
            },
            {
                name: "cancels previous timer when called multiple times within delay",
                delay: 50,
                setup: () => {
                    let calls = 0;
                    return { fn: () => calls++, get: () => calls };
                },
                act: (fn) => {
                    fn();
                    fn();
                    fn();
                },
                check: (val) => strictEqual(val, 1),
                wait: 60,
            },
            {
                name: "passes all arguments to debounced function",
                delay: 20,
                setup: () => {
                    let args = null;
                    return {
                        fn: (...a) => {
                            args = a;
                        },
                        get: () => args,
                    };
                },
                act: (fn) => fn("arg1", "arg2", 123),
                check: (val) => deepStrictEqual(val, ["arg1", "arg2", 123]),
                wait: 30,
            },
            {
                name: "handles async functions correctly",
                delay: 20,
                setup: () => {
                    let done = false;
                    const fn = async () => {
                        await new Promise((r) => setTimeout(r, 10));
                        done = true;
                    };
                    return { fn, get: () => done };
                },
                act: (fn) => fn(),
                check: (val) => strictEqual(val, true),
                wait: 50,
            },
        ];

        for (const s of scenarios) {
            await t.test(s.name, async () => {
                const { fn, get } = s.setup();
                const debounced = debounce(fn, s.delay);

                s.act(debounced);
                if (s.immediate) strictEqual(get(), 0);

                await new Promise((r) => setTimeout(r, s.wait));
                s.check(get());
            });
        }
    });
});

// --- reloadRoutesManifest() tests ---

describe("reloadRoutesManifest", () => {
    let tempDir;
    let routesPath;

    beforeEach(async () => {
        tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "core-test-"));
        routesPath = path.join(tempDir, "routes.json");
    });

    afterEach(async () => {
        await fsp.rm(tempDir, { recursive: true, force: true });
    });

    test("handles manifest loading scenarios", async (t) => {
        const scenarios = [
            {
                name: "parses valid routes.json on first attempt with multiple routes",
                setup: async () => {
                    const routes = [
                        { path: "", jsx: "dist/server/index.js", filename: "index.html" },
                        { path: "about", jsx: "dist/server/about.js", filename: "about.html" },
                    ];
                    await fsp.writeFile(routesPath, JSON.stringify(routes), "utf-8");
                    return routes;
                },
                act: () => reloadRoutesManifest(routesPath),
                check: (result, expected) => deepStrictEqual(result, expected),
            },
            {
                name: "parses valid routes.json with assets and custom reader",
                setup: async () => {
                    const routes = [{ path: "test", jsx: "test.js", filename: "test.html", assets: { css: [], js: [] } }];
                    await fsp.writeFile(routesPath, JSON.stringify(routes), "utf-8");
                    return routes;
                },
                act: () => reloadRoutesManifest(routesPath, { readFile: (p) => fsp.readFile(p, "utf-8") }),
                check: (result, expected) => {
                    ok(Array.isArray(result));
                    strictEqual(result.length, 1);
                    deepStrictEqual(result, expected);
                },
            },
            {
                name: "handles retry logic on temporary parse errors",
                setup: async () => {
                    await fsp.writeFile(routesPath, "not valid json", "utf-8");
                    const routes = [{ path: "", jsx: "index.js", filename: "index.html" }];
                    setTimeout(async () => {
                        await fsp.writeFile(routesPath, JSON.stringify(routes), "utf-8");
                    }, 150);
                    return routes;
                },
                act: () => reloadRoutesManifest(routesPath, { retries: 3 }),
                check: (result, expected) => deepStrictEqual(result, expected),
            },
        ];

        for (const s of scenarios) {
            await t.test(s.name, async () => {
                const expected = await s.setup();
                const result = await s.act();
                s.check(result, expected);
            });
        }
    });

    test("throws after exhausting retries on persistent parse errors", async () => {
        await fsp.writeFile(routesPath, "{ invalid json }", "utf-8");
        await rejects(async () => reloadRoutesManifest(routesPath, { retries: 2 }), /Failed to load routes after 2 attempts/);
    });
});

// --- isMiddlewareFile() tests ---

describe("isMiddlewareFile", () => {
    test("correctly identifies middleware files", (t) => {
        const scenarios = [
            { file: "middleware.js", expected: true },
            { file: "middleware.ts", expected: true },
            { file: "middleware.mjs", expected: true },
            { file: "src/middleware.js", expected: true },
            { file: "src/middleware/auth.js", expected: true },
            { file: "components/button.jsx", expected: false },
            { file: "app.js", expected: false },
            { file: "", expected: false },
            { file: null, expected: false },
        ];

        for (const { file, expected } of scenarios) {
            t.test(`returns ${expected} for "${file}"`, () => {
                strictEqual(isMiddlewareFile(file), expected);
            });
        }
    });
});

// --- extractBodyFromHtml() tests ---

describe("extractBodyFromHtml", () => {
    test("extracts body content across various scenarios", (t) => {
        const scenarios = [
            { html: "<html><body><div>Hello</div></body></html>", expected: "<div>Hello</div>" },
            { html: "<HTML><BODY><p>Content</p></BODY></HTML>", expected: "<p>Content</p>" },
            { html: "<html><Body><span>Mixed</span></Body></html>", expected: "<span>Mixed</span>" },
            { html: '<body class="dark"><main>Content</main></body>', expected: "<main>Content</main>" },
            {
                html: "<html><body>\n    <div>\n        <h1>Title</h1>\n    </div>\n</body></html>",
                expected: "\n    <div>\n        <h1>Title</h1>\n    </div>\n",
            },
            { html: "<html><head><title>No Body</title></head></html>", expected: "" },
        ];

        for (const { html, expected } of scenarios) {
            t.test(`extracts from ${html.slice(0, 30)}...`, () => {
                strictEqual(extractBodyFromHtml(html), expected);
            });
        }
    });
});

// --- buildHotReplacePayload() tests ---

describe("buildHotReplacePayload", () => {
    test("builds correct SSE payloads", async (t) => {
        const scenarios = [
            {
                name: "standard route with assets",
                opts: {
                    route: { jsx: "t.js", assets: { css: ["s.css"], js: ["m.js"] } },
                    jsxFn: async () => "<body><p>Test</p></body>",
                    publicPath: "/",
                },
                check: (p) => {
                    strictEqual(p.body, "<p>Test</p>");
                    deepStrictEqual(p.assets.css, ["s.css"]);
                    strictEqual(p.publicPath, "/");
                },
            },
            {
                name: "route without assets property",
                opts: {
                    route: { jsx: "t.js" },
                    jsxFn: async () => "<body>Content</body>",
                    publicPath: "/static",
                },
                check: (p) => {
                    deepStrictEqual(p.assets.css, []);
                    strictEqual(p.publicPath, "/static/");
                },
            },
            {
                name: "empty publicPath",
                opts: {
                    route: { jsx: "t.js" },
                    jsxFn: async () => "<body></body>",
                    publicPath: "",
                },
                check: (p) => strictEqual(p.publicPath, ""),
            },
        ];

        for (const s of scenarios) {
            await t.test(s.name, async () => {
                const result = await buildHotReplacePayload({ ...s.opts, params: {} });
                s.check(JSON.parse(result));
            });
        }
    });
});

// --- getWatcherErrorHandler() tests ---

describe("getWatcherErrorHandler", () => {
    test("handles watcher errors gracefully", (t) => {
        const scenarios = [
            { context: "src", error: new Error("ENOSPC: limit reached") },
            { context: "dist", error: new Error("EMFILE: too many files") },
            { context: "src", error: new Error("Watch failed") },
        ];

        for (const { context, error } of scenarios) {
            t.test(`handles ${error.message.slice(0, 20)}...`, () => {
                const handler = getWatcherErrorHandler(context);
                strictEqual(typeof handler, "function");
                handler(error);
                ok(true);
            });
        }
    });

    test("returns a function and does not throw", () => {
        const handler = getWatcherErrorHandler("test");
        strictEqual(typeof handler, "function");
        handler(new Error("silent"));
        ok(true);
    });
});

// --- runEsbuild() tests ---

describe("runEsbuild", () => {
    test("handles esbuild execution scenarios", async (t) => {
        const scenarios = [
            { name: "successful build returns empty string", spawn: async () => "", expected: "" },
            {
                name: "cleans error messages from stderr",
                spawn: async () => "✘ [ERROR] [plugin jsx-transform] syntax error",
                expected: "syntax error",
            },
            { name: "trims whitespace from errors", spawn: async () => "  ✘ [ERROR]   spacing   ", expected: "spacing" },
            { name: "returns empty string when filename provided without errors", spawn: async () => "", filename: "app.js", expected: "" },
            {
                name: "returns empty string when filename with colors provided without errors",
                spawn: async () => "",
                filename: "app.js",
                colors: { yellow: "Y", reset: "R" },
                expected: "",
            },
        ];

        for (const s of scenarios) {
            await t.test(s.name, async () => {
                const result = await runEsbuild({ spawnEsbuild: s.spawn, filename: s.filename, colors: s.colors });
                strictEqual(result, s.expected);
            });
        }
    });

    test("propagates unexpected execution failures", async (t) => {
        const scenarios = [
            { name: "with Error instance", error: new Error("Spawn failed") },
            { name: "with string error", error: "Non-error failure" },
        ];

        for (const { name, error } of scenarios) {
            await t.test(name, async () => {
                await rejects(
                    async () =>
                        runEsbuild({
                            spawnEsbuild: async () => {
                                throw error;
                            },
                        }),
                    (e) => {
                        const expected = error instanceof Error ? error.message : String(error);
                        return e === error || (e instanceof Error && e.message === expected);
                    },
                );
            });
        }
    });
});
