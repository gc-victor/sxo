/**
 * @fileoverview Tests for shared module-loader.
 * @module server/shared/module-loader.test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadAllModules, loadJsxModule, loadModulesWithFallback } from "./module-loader.js";

// Helper factories to reduce repetitive setup code

/** @returns {Map} Fresh cache instance */
const createCache = () => new Map();

/**
 * Creates a mock importer that returns a module with default export
 * @param {Function} [factory] - Factory function for default export
 * @returns {Function} Async importer function
 */
const createImporter =
    (factory = () => "<html></html>") =>
    async () => ({ default: factory });

/**
 * Creates a mock importer that returns a module with named jsx export
 * @returns {Function} Async importer function
 */
const createNamedExportImporter = () => async () => ({ jsx: () => "<html><body>Named</body></html>" });

/**
 * Creates an importer that throws an error
 * @param {string} [message] - Error message
 * @returns {Function} Async importer that throws
 */
const createErrorImporter =
    (message = "Import failed") =>
    async () => {
        throw new Error(message);
    };

/**
 * Creates route objects from path strings (auto-prefixes with src/pages/)
 * @param {string[]} paths - Array of JSX file paths (without src/pages/ prefix)
 * @returns {Array<{jsx: string}>} Route objects
 */
const createRoutes = (paths) => paths.map((p) => ({ jsx: `src/pages/${p}` }));

/**
 * Asserts that a function rejects with a message matching the pattern
 * @param {Function} fn - Async function to test
 * @param {RegExp} pattern - Pattern to match in error message
 */
const assertRejectsWith = async (fn, pattern) => {
    await assert.rejects(fn, { message: pattern });
};

describe("loadJsxModule", () => {
    it("loads and caches a module successfully", async () => {
        const cache = createCache();
        const importer = createImporter(() => "<html><body>Hello</body></html>");

        const fn = await loadJsxModule("src/pages/index.jsx", { importer, cache });

        assert.equal(typeof fn, "function");
        assert.equal(fn(), "<html><body>Hello</body></html>");
        assert.equal(cache.size, 1);
        assert.ok(cache.has("src/pages/index.jsx"));
    });

    it("returns cached module on second call", async () => {
        const cache = createCache();
        let callCount = 0;
        const importer = async () => {
            callCount++;
            return { default: () => "<html></html>" };
        };

        const fn1 = await loadJsxModule("src/pages/index.jsx", { importer, cache });
        const fn2 = await loadJsxModule("src/pages/index.jsx", { importer, cache });

        assert.equal(fn1, fn2);
        assert.equal(callCount, 1);
    });

    it("busts cache when bustCache=true", async () => {
        const cache = createCache();
        let callCount = 0;
        const importer = async () => {
            callCount++;
            return { default: () => `<html><body>Call ${callCount}</body></html>` };
        };

        const fn1 = await loadJsxModule("src/pages/index.jsx", { importer, cache });
        const fn2 = await loadJsxModule("src/pages/index.jsx", { importer, cache, bustCache: true });

        assert.notEqual(fn1, fn2);
        assert.equal(callCount, 2);
    });

    it("appends timestamp query param when bustCache=true", async () => {
        const cache = createCache();
        let capturedUrl = "";
        const importer = async (url) => {
            capturedUrl = url;
            return { default: () => "<html></html>" };
        };

        await loadJsxModule("src/pages/index.jsx", { importer, cache, bustCache: true });

        assert.ok(capturedUrl.includes("?t="));
    });

    it("uses named jsx export if no default export", async () => {
        const cache = createCache();
        const importer = createNamedExportImporter();

        const fn = await loadJsxModule("src/pages/about.jsx", { importer, cache });

        assert.equal(typeof fn, "function");
        assert.equal(fn(), "<html><body>Named</body></html>");
    });

    it("throws when no valid export found", async () => {
        const importer = async () => ({});

        await assertRejectsWith(() => loadJsxModule("src/pages/bad.jsx", { importer, cache: createCache() }), /No valid export found/);
    });

    it("calls onError callback on failure", async () => {
        const cache = createCache();
        const importer = createErrorImporter("Import failed");
        let errorMsg = "";

        await assertRejectsWith(
            () =>
                loadJsxModule("src/pages/error.jsx", {
                    importer,
                    cache,
                    onError: (msg) => {
                        errorMsg = msg;
                    },
                }),
            /Import failed/,
        );

        assert.ok(errorMsg.includes("Failed to load module"));
        assert.ok(errorMsg.includes("Import failed"));
    });

    it("returns error stub when returnErrorStub=true", async () => {
        const cache = createCache();
        const importer = createErrorImporter("Import failed");

        const fn = await loadJsxModule("src/pages/error.jsx", {
            importer,
            cache,
            returnErrorStub: true,
            isDev: true,
        });

        assert.equal(typeof fn, "function");
        const html = fn();
        assert.ok(html.includes("<pre"));
        assert.ok(html.includes("color:red"));
        assert.ok(html.includes("Import failed"));
    });

    it("shows detailed error in dev mode (isDev=true)", async () => {
        const importer = createErrorImporter("Import failed");

        const fn = await loadJsxModule("src/pages/error.jsx", {
            importer,
            cache: createCache(),
            returnErrorStub: true,
            isDev: true,
        });

        const html = fn();
        assert.ok(html.includes("src/pages/error.jsx"));
        assert.ok(html.includes("Import failed"));
    });

    it("caches error stub when returnErrorStub=true", async () => {
        const cache = createCache();
        let callCount = 0;
        const importer = async () => {
            callCount++;
            throw new Error("Import failed");
        };

        const fn1 = await loadJsxModule("src/pages/error.jsx", { importer, cache, returnErrorStub: true });
        const fn2 = await loadJsxModule("src/pages/error.jsx", { importer, cache, returnErrorStub: true });

        assert.equal(fn1, fn2);
        assert.equal(callCount, 1);
    });

    it("uses default importer when none provided", async () => {
        const cache = createCache();
        // Without a custom importer, defaults to Node import() which will fail
        // because the resolved path doesn't point to a real module.
        await assert.rejects(() => loadJsxModule("src/pages/index.jsx", { cache }), { code: "ERR_MODULE_NOT_FOUND" });
    });

    it("uses default cache when none provided", async () => {
        const importer = createImporter();
        // Should not throw about missing cache; proceeds with a new Map().
        const fn = await loadJsxModule("src/pages/index.jsx", { importer });
        assert.equal(typeof fn, "function");
    });
});

describe("loadAllModules", () => {
    it("loads all route modules in parallel", async () => {
        const cache = createCache();
        const importer = async (url) => ({ default: () => `<html>${url}</html>` });

        await loadAllModules(createRoutes(["index.jsx", "about.jsx", "contact.jsx"]), { importer, cache });

        assert.equal(cache.size, 3);
        assert.ok(cache.has("src/pages/index.jsx"));
        assert.ok(cache.has("src/pages/about.jsx"));
        assert.ok(cache.has("src/pages/contact.jsx"));
    });

    it("skips routes without jsx property", async () => {
        const cache = createCache();
        const importer = createImporter();

        const routes = [{ jsx: "src/pages/index.jsx" }, { path: "/about" }, { jsx: "src/pages/contact.jsx" }];
        await loadAllModules(routes, { importer, cache });

        assert.equal(cache.size, 2);
    });

    it("clears cache when bustCache=true", async () => {
        const cache = createCache();
        cache.set("old-module", () => "old");

        await loadAllModules(createRoutes(["index.jsx"]), {
            importer: createImporter(),
            cache,
            bustCache: true,
        });

        assert.equal(cache.size, 1);
        assert.ok(!cache.has("old-module"));
        assert.ok(cache.has("src/pages/index.jsx"));
    });

    it("continues loading other modules when one fails with returnErrorStub=true", async () => {
        const cache = createCache();
        const importer = async (url) => {
            if (url.includes("bad")) throw new Error("Bad module");
            return { default: () => `<html>${url}</html>` };
        };

        await loadAllModules(createRoutes(["index.jsx", "bad.jsx", "about.jsx"]), {
            importer,
            cache,
            returnErrorStub: true,
            isDev: true,
        });

        assert.equal(cache.size, 3);
        assert.ok(cache.has("src/pages/index.jsx"));
        assert.ok(cache.has("src/pages/bad.jsx"));
        assert.ok(cache.has("src/pages/about.jsx"));

        const badFn = cache.get("src/pages/bad.jsx");
        assert.ok(badFn().includes("Bad module"));
    });

    it("calls onError for each failed module", async () => {
        const cache = createCache();
        const importer = async (url) => {
            throw new Error(`Failed: ${url}`);
        };
        const errors = [];

        await loadAllModules(createRoutes(["index.jsx", "about.jsx"]), {
            importer,
            cache,
            returnErrorStub: true,
            onError: (msg) => errors.push(msg),
        });

        assert.equal(errors.length, 2);
        assert.ok(errors[0].includes("index.jsx"));
        assert.ok(errors[1].includes("about.jsx"));
    });

    it("throws when cache is missing", async () => {
        const importer = createImporter();

        await assertRejectsWith(() => loadAllModules(createRoutes(["index.jsx"]), { importer }), /cache Map is required/);
    });
});

describe("loadModulesWithFallback", () => {
    it("loads from modules.js bundle successfully", async () => {
        const importer = async (url) => {
            if (url.includes("modules.js")) {
                return {
                    default: {
                        "src/pages/index.jsx": { default: () => "<html>Index</html>" },
                        "src/pages/about.jsx": { default: () => "<html>About</html>" },
                    },
                };
            }
            throw new Error("Should not reach individual loading");
        };

        const modules = await loadModulesWithFallback({
            modulesPath: "./dist/server/modules.js",
            routes: createRoutes(["index.jsx", "about.jsx"]),
            importer,
        });

        assert.ok(modules["src/pages/index.jsx"]);
        assert.ok(modules["src/pages/about.jsx"]);
        assert.equal(typeof modules["src/pages/index.jsx"].default, "function");
    });

    it("falls back to individual loading when modules.js not found", async () => {
        let warnMsg = "";
        const importer = async (url) => {
            if (url.includes("modules.js")) throw new Error("Module not found");
            return { default: () => `<html>${url}</html>` };
        };

        const modules = await loadModulesWithFallback({
            modulesPath: "./dist/server/modules.js",
            routes: createRoutes(["index.jsx", "about.jsx"]),
            importer,
            onWarn: (msg) => {
                warnMsg = msg;
            },
        });

        assert.ok(warnMsg.includes("modules.js not found"));
        assert.ok(modules["src/pages/index.jsx"]);
        assert.equal(typeof modules["src/pages/index.jsx"].default, "function");
    });

    it("calls onError for failed individual module loads during fallback", async () => {
        const errors = [];
        const importer = async (url) => {
            if (url.includes("modules.js")) throw new Error("Bundle not found");
            if (url.includes("dist") && url.includes("server") && url.includes("error-test")) {
                throw new Error("Bad module");
            }
            return { default: () => "<html></html>" };
        };

        const modules = await loadModulesWithFallback({
            modulesPath: "./dist/server/modules.js",
            routes: createRoutes(["index.jsx", "error-test.jsx", "about.jsx"]),
            importer,
            onError: (msg) => errors.push(msg),
        });

        assert.equal(errors.length, 1);
        assert.ok(errors[0].includes("src/pages/error-test.jsx"));

        assert.ok(modules["src/pages/index.jsx"]);
        assert.ok(modules["src/pages/about.jsx"]);
        assert.ok(!modules["src/pages/error-test.jsx"]);
    });

    it("throws when importer is missing", async () => {
        await assertRejectsWith(
            () =>
                loadModulesWithFallback({
                    modulesPath: "./dist/server/modules.js",
                    routes: createRoutes(["index.jsx"]),
                }),
            /importer function is required/,
        );
    });

    it("throws when routes is missing", async () => {
        await assertRejectsWith(
            () =>
                loadModulesWithFallback({
                    modulesPath: "./dist/server/modules.js",
                    importer: async () => ({}),
                }),
            /routes array is required/,
        );
    });
});
