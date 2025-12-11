/**
 * @fileoverview Tests for shared module-loader.
 * @module server/shared/module-loader.test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clearModuleCache, loadAllModules, loadJsxModule, loadModulesWithFallback } from "./module-loader.js";

describe("loadJsxModule", () => {
    it("loads and caches a module successfully", async () => {
        const cache = new Map();
        const importer = async (_url) => ({
            default: () => "<html><body>Hello</body></html>",
        });

        const fn = await loadJsxModule("src/pages/index.jsx", {
            importer,
            cache,
        });

        assert.equal(typeof fn, "function");
        assert.equal(fn(), "<html><body>Hello</body></html>");
        assert.equal(cache.size, 1);
        assert.ok(cache.has("src/pages/index.jsx"));
    });

    it("returns cached module on second call", async () => {
        const cache = new Map();
        let callCount = 0;
        const importer = async (_url) => {
            callCount++;
            return {
                default: () => "<html><body>Hello</body></html>",
            };
        };

        const fn1 = await loadJsxModule("src/pages/index.jsx", {
            importer,
            cache,
        });

        const fn2 = await loadJsxModule("src/pages/index.jsx", {
            importer,
            cache,
        });

        assert.equal(fn1, fn2);
        assert.equal(callCount, 1); // Importer called only once
    });

    it("busts cache when bustCache=true", async () => {
        const cache = new Map();
        let callCount = 0;
        const importer = async (_url) => {
            callCount++;
            return {
                default: () => `<html><body>Call ${callCount}</body></html>`,
            };
        };

        const fn1 = await loadJsxModule("src/pages/index.jsx", {
            importer,
            cache,
        });

        const fn2 = await loadJsxModule("src/pages/index.jsx", {
            importer,
            cache,
            bustCache: true,
        });

        assert.notEqual(fn1, fn2);
        assert.equal(callCount, 2);
    });

    it("appends timestamp query param when bustCache=true", async () => {
        const cache = new Map();
        let capturedUrl = "";
        const importer = async (url) => {
            capturedUrl = url;
            return {
                default: () => "<html></html>",
            };
        };

        await loadJsxModule("src/pages/index.jsx", {
            importer,
            cache,
            bustCache: true,
        });

        assert.ok(capturedUrl.includes("?t="));
    });

    it("uses named jsx export if no default export", async () => {
        const cache = new Map();
        const importer = async (_url) => ({
            jsx: () => "<html><body>Named</body></html>",
        });

        const fn = await loadJsxModule("src/pages/about.jsx", {
            importer,
            cache,
        });

        assert.equal(typeof fn, "function");
        assert.equal(fn(), "<html><body>Named</body></html>");
    });

    it("throws when no valid export found", async () => {
        const cache = new Map();
        const importer = async (_url) => ({});

        await assert.rejects(
            async () => {
                await loadJsxModule("src/pages/bad.jsx", {
                    importer,
                    cache,
                });
            },
            { message: /No valid export found/ },
        );
    });

    it("calls onError callback on failure", async () => {
        const cache = new Map();
        const importer = async (_url) => {
            throw new Error("Import failed");
        };

        let errorMsg = "";
        const onError = (msg) => {
            errorMsg = msg;
        };

        await assert.rejects(
            async () => {
                await loadJsxModule("src/pages/error.jsx", {
                    importer,
                    cache,
                    onError,
                });
            },
            { message: /Import failed/ },
        );

        assert.ok(errorMsg.includes("Failed to load module"));
        assert.ok(errorMsg.includes("Import failed"));
    });

    it("returns error stub when returnErrorStub=true", async () => {
        const cache = new Map();
        const importer = async (_url) => {
            throw new Error("Import failed");
        };

        const fn = await loadJsxModule("src/pages/error.jsx", {
            importer,
            cache,
            returnErrorStub: true,
        });

        assert.equal(typeof fn, "function");
        const html = fn();
        assert.ok(html.includes("<pre"));
        assert.ok(html.includes("color:red"));
        assert.ok(html.includes("Import failed"));
    });

    it("caches error stub when returnErrorStub=true", async () => {
        const cache = new Map();
        let callCount = 0;
        const importer = async (_url) => {
            callCount++;
            throw new Error("Import failed");
        };

        const fn1 = await loadJsxModule("src/pages/error.jsx", {
            importer,
            cache,
            returnErrorStub: true,
        });

        const fn2 = await loadJsxModule("src/pages/error.jsx", {
            importer,
            cache,
            returnErrorStub: true,
        });

        assert.equal(fn1, fn2);
        assert.equal(callCount, 1); // Only called once, then cached
    });

    it("throws when importer is missing", async () => {
        const cache = new Map();

        await assert.rejects(
            async () => {
                await loadJsxModule("src/pages/index.jsx", {
                    cache,
                });
            },
            { message: /importer function is required/ },
        );
    });

    it("throws when cache is missing", async () => {
        const importer = async (_url) => ({
            default: () => "<html></html>",
        });

        await assert.rejects(
            async () => {
                await loadJsxModule("src/pages/index.jsx", {
                    importer,
                });
            },
            { message: /cache Map is required/ },
        );
    });
});

describe("loadAllModules", () => {
    it("loads all route modules in parallel", async () => {
        const cache = new Map();
        const importer = async (url) => ({
            default: () => `<html><body>${url}</body></html>`,
        });

        const routes = [{ jsx: "src/pages/index.jsx" }, { jsx: "src/pages/about.jsx" }, { jsx: "src/pages/contact.jsx" }];

        await loadAllModules(routes, {
            importer,
            cache,
        });

        assert.equal(cache.size, 3);
        assert.ok(cache.has("src/pages/index.jsx"));
        assert.ok(cache.has("src/pages/about.jsx"));
        assert.ok(cache.has("src/pages/contact.jsx"));
    });

    it("skips routes without jsx property", async () => {
        const cache = new Map();
        const importer = async (_url) => ({
            default: () => "<html></html>",
        });

        const routes = [{ jsx: "src/pages/index.jsx" }, { path: "/about" }, { jsx: "src/pages/contact.jsx" }];

        await loadAllModules(routes, {
            importer,
            cache,
        });

        assert.equal(cache.size, 2);
    });

    it("clears cache when bustCache=true", async () => {
        const cache = new Map();
        cache.set("old-module", () => "old");

        const importer = async (_url) => ({
            default: () => "<html></html>",
        });

        const routes = [{ jsx: "src/pages/index.jsx" }];

        await loadAllModules(routes, {
            importer,
            cache,
            bustCache: true,
        });

        assert.equal(cache.size, 1);
        assert.ok(!cache.has("old-module"));
        assert.ok(cache.has("src/pages/index.jsx"));
    });

    it("continues loading other modules when one fails with returnErrorStub=true", async () => {
        const cache = new Map();
        const importer = async (url) => {
            if (url.includes("bad")) {
                throw new Error("Bad module");
            }
            return {
                default: () => `<html><body>${url}</body></html>`,
            };
        };

        const routes = [{ jsx: "src/pages/index.jsx" }, { jsx: "src/pages/bad.jsx" }, { jsx: "src/pages/about.jsx" }];

        await loadAllModules(routes, {
            importer,
            cache,
            returnErrorStub: true,
        });

        assert.equal(cache.size, 3);
        assert.ok(cache.has("src/pages/index.jsx"));
        assert.ok(cache.has("src/pages/bad.jsx")); // Error stub cached
        assert.ok(cache.has("src/pages/about.jsx"));

        const badFn = cache.get("src/pages/bad.jsx");
        const html = badFn();
        assert.ok(html.includes("Bad module"));
    });

    it("calls onError for each failed module", async () => {
        const cache = new Map();
        const importer = async (url) => {
            throw new Error(`Failed: ${url}`);
        };

        const errors = [];
        const onError = (msg) => {
            errors.push(msg);
        };

        const routes = [{ jsx: "src/pages/index.jsx" }, { jsx: "src/pages/about.jsx" }];

        await loadAllModules(routes, {
            importer,
            cache,
            returnErrorStub: true,
            onError,
        });

        assert.equal(errors.length, 2);
        assert.ok(errors[0].includes("src/pages/index.jsx"));
        assert.ok(errors[1].includes("src/pages/about.jsx"));
    });

    it("throws when cache is missing", async () => {
        const importer = async (_url) => ({
            default: () => "<html></html>",
        });

        const routes = [{ jsx: "src/pages/index.jsx" }];

        await assert.rejects(
            async () => {
                await loadAllModules(routes, {
                    importer,
                });
            },
            { message: /cache Map is required/ },
        );
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

        const routes = [{ jsx: "src/pages/index.jsx" }, { jsx: "src/pages/about.jsx" }];

        const modules = await loadModulesWithFallback({
            modulesPath: "./dist/server/modules.js",
            routes,
            importer,
        });

        assert.ok(modules["src/pages/index.jsx"]);
        assert.ok(modules["src/pages/about.jsx"]);
        assert.equal(typeof modules["src/pages/index.jsx"].default, "function");
    });

    it("falls back to individual loading when modules.js not found", async () => {
        let warnMsg = "";
        const onWarn = (msg) => {
            warnMsg = msg;
        };

        const importer = async (url) => {
            if (url.includes("modules.js")) {
                throw new Error("Module not found");
            }
            // Individual module loading
            return {
                default: () => `<html>${url}</html>`,
            };
        };

        const routes = [{ jsx: "src/pages/index.jsx" }, { jsx: "src/pages/about.jsx" }];

        const modules = await loadModulesWithFallback({
            modulesPath: "./dist/server/modules.js",
            routes,
            importer,
            onWarn,
        });

        assert.ok(warnMsg.includes("modules.js not found"));
        assert.ok(modules["src/pages/index.jsx"]);
        assert.ok(modules["src/pages/about.jsx"]);
        assert.equal(typeof modules["src/pages/index.jsx"].default, "function");
    });

    it("calls onError for failed individual module loads during fallback", async () => {
        const errors = [];
        const onError = (msg) => {
            errors.push(msg);
        };

        const importer = async (url) => {
            if (url.includes("modules.js")) {
                throw new Error("Bundle not found");
            }
            // Match the transformed dist/server path (after jsxBundlePath transformation)
            if (url.includes("dist") && url.includes("server") && url.includes("error-test")) {
                throw new Error("Bad module");
            }
            return {
                default: () => "<html></html>",
            };
        };

        const routes = [{ jsx: "src/pages/index.jsx" }, { jsx: "src/pages/error-test.jsx" }, { jsx: "src/pages/about.jsx" }];

        const modules = await loadModulesWithFallback({
            modulesPath: "./dist/server/modules.js",
            routes,
            importer,
            onError,
        });

        assert.equal(errors.length, 1);
        assert.ok(errors[0].includes("src/pages/error-test.jsx"));
        assert.ok(errors[0].includes("Bad module"));

        // Successfully loaded modules should be present
        assert.ok(modules["src/pages/index.jsx"]);
        assert.ok(modules["src/pages/about.jsx"]);
        assert.ok(!modules["src/pages/error-test.jsx"]); // Failed module not in modules
    });

    it("throws when importer is missing", async () => {
        const routes = [{ jsx: "src/pages/index.jsx" }];

        await assert.rejects(
            async () => {
                await loadModulesWithFallback({
                    modulesPath: "./dist/server/modules.js",
                    routes,
                });
            },
            { message: /importer function is required/ },
        );
    });

    it("throws when routes is missing", async () => {
        const importer = async (_url) => ({});

        await assert.rejects(
            async () => {
                await loadModulesWithFallback({
                    modulesPath: "./dist/server/modules.js",
                    importer,
                });
            },
            { message: /routes array is required/ },
        );
    });
});

describe("clearModuleCache", () => {
    it("clears the cache", () => {
        const cache = new Map();
        cache.set("module1", () => "fn1");
        cache.set("module2", () => "fn2");

        assert.equal(cache.size, 2);

        clearModuleCache(cache);

        assert.equal(cache.size, 0);
    });

    it("handles undefined cache gracefully", () => {
        assert.doesNotThrow(() => {
            clearModuleCache(undefined);
        });
    });

    it("handles null cache gracefully", () => {
        assert.doesNotThrow(() => {
            clearModuleCache(null);
        });
    });

    it("handles non-map objects gracefully", () => {
        assert.doesNotThrow(() => {
            clearModuleCache({});
        });
    });
});
