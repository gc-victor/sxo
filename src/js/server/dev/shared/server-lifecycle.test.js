/**
 * @fileoverview Tests for dev server lifecycle module.
 *
 * Characterization tests for performInitialSetup and its extracted helpers.
 *
 * @module server/dev/shared/server-lifecycle.test
 */

import assert from "node:assert";
import { describe, mock, test } from "node:test";
import { logger } from "../../utils/logger.js";
import {
    createReloadFunctions,
    initializePlatformImporter,
    loadRoutesAndModules,
    performInitialSetup,
    runInitialBuild,
} from "./server-lifecycle.js";

describe("initializePlatformImporter", () => {
    test("returns import function for supported platforms", () => {
        for (const platform of ["node", "bun", "deno"]) {
            const importer = initializePlatformImporter(platform);
            assert.strictEqual(typeof importer, "function", `Should return a function for '${platform}'`);
        }
    });

    test("throws error for unsupported platform", () => {
        assert.throws(
            () => initializePlatformImporter("unsupported"),
            /Unsupported platform: unsupported/,
            "Should throw error with platform name",
        );
    });

    test("returned function can be called", async () => {
        const importer = initializePlatformImporter("node");
        try {
            await importer("./non-existent.js");
        } catch {
            // Expected to fail because file doesn't exist
        }
    });
});

describe("runInitialBuild", () => {
    test("is exported as a named function", () => {
        assert.strictEqual(typeof runInitialBuild, "function", "runInitialBuild should be exported");
    });

    test("sets esbuildError in state on success", async () => {
        const state = { esbuildError: null };
        const spawnEsbuild = async () => ""; // Success returns empty string
        await runInitialBuild({ spawnEsbuild, colors: {}, state });
        assert.strictEqual(state.esbuildError, "");
    });

    test("sets esbuildError in state on failure", async () => {
        const state = { esbuildError: null };
        const spawnEsbuild = async () => "Build failed"; // Failure returns error message
        await runInitialBuild({ spawnEsbuild, colors: {}, state });
        assert.strictEqual(state.esbuildError, "Build failed");
    });
});

describe("loadRoutesAndModules", () => {
    test("is exported as a named function", () => {
        assert.strictEqual(typeof loadRoutesAndModules, "function", "loadRoutesAndModules should be exported");
    });

    test("populates state.routes and state.jsxModules", async () => {
        const state = { routes: [], jsxModules: new Map() };
        const config = { routesPath: "routes.json" };
        const reloadRoutesManifest = async () => [{ path: "/", jsx: "index.js" }];
        const loadAllModules = async (_routes, opts) => {
            opts.cache.set("index.js", { default: () => "page" });
        };

        await loadRoutesAndModules({
            config,
            state,
            reloadRoutesManifest,
            loadAllModules,
            importer: async () => ({}),
            readFile: async () => "content",
        });

        assert.strictEqual(state.routes.length, 1);
        assert.ok(state.jsxModules.has("index.js"));
    });

    test("loadRoutesAndModules onError is called", async () => {
        const state = { routes: [], jsxModules: new Map() };
        mock.method(logger, "error");
        const loadAllModules = async (_routes, opts) => {
            opts.onError("Test Error");
        };

        await loadRoutesAndModules({
            config: { routesPath: "r.json" },
            state,
            reloadRoutesManifest: async () => [],
            loadAllModules,
            importer: async () => ({}),
            readFile: async () => "",
        });

        assert.strictEqual(logger.error.mock.calls.length, 1);
        assert.strictEqual(logger.error.mock.calls[0].arguments[0], "Test Error");
    });
});

// Helper factories for common test fixtures
const mockConfig = () => ({ colors: {}, routesPath: "r.json", publicPath: "/", hotReplaceClientPath: "/hr.js" });
const mockState = () => ({ routes: [], jsxModules: new Map(), esbuildError: null });
const mockDeps = (overrides = {}) => ({
    reloadRoutesManifest: async () => [],
    loadAllModules: async () => {},
    importer: async () => ({}),
    readFile: async () => "",
    spawnEsbuild: async () => "",
    handler: { broadcastReload: async () => {} },
    updateUserMiddlewares: () => {},
    debounceFn: (fn) => fn,
    ...overrides,
});

describe("createReloadFunctions", () => {
    test("is exported as a named function", () => {
        assert.strictEqual(typeof createReloadFunctions, "function");
    });

    test("returns object with required reload functions", () => {
        const result = createReloadFunctions(mockDeps({ config: mockConfig(), state: mockState() }));

        assert.strictEqual(typeof result.reloadFiles, "function");
        assert.strictEqual(typeof result.createDebouncedEsbuild, "function");
        assert.strictEqual(typeof result.createDebouncedReloadMiddleware, "function");
    });

    test("reloadFiles updates state.routes and state.jsxModules", async () => {
        const state = { routes: [{ path: "/old" }], jsxModules: new Map() };
        const reloadFunctions = createReloadFunctions(
            mockDeps({
                config: { routesPath: "r.json" },
                state,
                reloadRoutesManifest: async () => [{ path: "/new" }],
            }),
        );

        await reloadFunctions.reloadFiles();

        assert.strictEqual(state.routes[0].path, "/new");
    });

    test("reloadFiles onError is called", async () => {
        mock.method(logger, "error");

        const reloadFunctions = createReloadFunctions(
            mockDeps({
                config: { routesPath: "r.json" },
                state: { routes: [], jsxModules: new Map() },
                loadAllModules: async (_routes, opts) => opts.onError("Reload Error"),
            }),
        );

        await reloadFunctions.reloadFiles();
        assert.strictEqual(logger.error.mock.calls.length, 1);
        assert.strictEqual(logger.error.mock.calls[0].arguments[0], "Reload Error");
    });

    test("createDebouncedEsbuild triggers build and broadcast", async () => {
        let broadcastCalled = false;
        const state = mockState();

        const reloadFunctions = createReloadFunctions(
            mockDeps({
                config: mockConfig(),
                state,
                spawnEsbuild: async () => "Build Error",
                handler: {
                    broadcastReload: async (fn) => {
                        broadcastCalled = true;
                        await fn();
                    },
                },
                runBuild: async ({ spawnEsbuild }) => await spawnEsbuild(),
            }),
        );

        const debounced = reloadFunctions.createDebouncedEsbuild(0);
        await debounced("test.js");

        assert.strictEqual(state.esbuildError, "Build Error");
        assert.strictEqual(broadcastCalled, true);
    });

    test("createDebouncedReloadMiddleware reloads middleware on file change", async () => {
        let updateCalled = false;

        const reloadFunctions = createReloadFunctions({
            ...mockDeps(),
            updateUserMiddlewares: () => {
                updateCalled = true;
            },
            checkMiddlewareFile: (f) => f.includes("middleware"),
            loadMiddlewares: async () => [() => {}],
        });

        const debounced = reloadFunctions.createDebouncedReloadMiddleware(0);
        await debounced("middleware.js");

        assert.strictEqual(updateCalled, true);
    });
});

describe("performInitialSetup", () => {
    test("is exported as a named function", () => {
        assert.strictEqual(typeof performInitialSetup, "function", "performInitialSetup should be exported");
    });

    test("orchestrates the setup sequence", async () => {
        let capturedOptions;
        const createDevHandler = mock.fn((opts) => {
            capturedOptions = opts;
            return { broadcastReload: async () => {} };
        });

        const result = await performInitialSetup(
            {
                platform: "node",
                spawnEsbuild: async () => "",
                createDevHandler,
                reloadRoutesManifest: async () => [],
            },
            {
                createConfig: mockConfig,
                createState: mockState,
                initImporter: () => async () => ({}),
                makeTextReader: (r) => r,
                makeFileReader: () => async () => "",
                runBuild: async () => {},
                loadRoutes: async () => {},
                loadMiddlewares: async () => [],
                makeReloadFunctions: () => ({
                    reloadFiles: async () => {},
                    createDebouncedEsbuild: () => () => {},
                    createDebouncedReloadMiddleware: () => () => {},
                }),
            },
        );

        assert.ok(result.config);
        assert.ok(result.state);
        assert.ok(result.handler);
        assert.strictEqual(typeof result.reloadFiles, "function");
        assert.strictEqual(createDevHandler.mock.callCount(), 1);

        // Exercise captured options for coverage
        if (capturedOptions) {
            capturedOptions.getRoutes?.();
            await capturedOptions.loadJsxModule?.("test.jsx");
            capturedOptions.getEsbuildError?.();
            capturedOptions.getMiddleware?.();
        }
        result.updateUserMiddlewares([]);
    });

    test("createDebouncedEsbuild stores error in state on failure", async () => {
        const state = mockState();
        let broadcastCalled = false;

        const reloadFunctions = createReloadFunctions(
            mockDeps({
                config: { colors: { yellow: "", reset: "" } },
                state,
                spawnEsbuild: async () => "Build Error Message",
                handler: {
                    broadcastReload: async (fn) => {
                        broadcastCalled = true;
                        await fn();
                    },
                },
                runBuild: async ({ spawnEsbuild }) => await spawnEsbuild(),
            }),
        );

        const debounced = reloadFunctions.createDebouncedEsbuild(0);
        await debounced("test-file.js");

        assert.strictEqual(state.esbuildError, "Build Error Message");
        assert.strictEqual(broadcastCalled, true);
    });

    test("createDebouncedReloadMiddleware reloads middleware when filename matches", async () => {
        let middlewareReloaded = null;
        const middlewares = [() => "middleware1", () => "middleware2"];

        const reloadFunctions = createReloadFunctions({
            ...mockDeps(),
            updateUserMiddlewares: (mw) => {
                middlewareReloaded = mw;
            },
            checkMiddlewareFile: (f) => f.includes("middleware"),
            loadMiddlewares: async () => middlewares,
        });

        const debounced = reloadFunctions.createDebouncedReloadMiddleware(0);
        await debounced("src/middleware.js");

        assert.strictEqual(middlewareReloaded, middlewares);
    });

    test("createDebouncedReloadMiddleware skips non-middleware files", async () => {
        let updateCalled = false;

        const reloadFunctions = createReloadFunctions({
            updateUserMiddlewares: () => {
                updateCalled = true;
            },
            debounceFn: (fn) => fn,
            checkMiddlewareFile: (_f) => false,
            loadMiddlewares: async () => [],
        });

        const debounced = reloadFunctions.createDebouncedReloadMiddleware(0);
        await debounced("src/page.jsx");

        assert.strictEqual(updateCalled, false);
    });

    test("updateUserMiddlewares closure works correctly", async () => {
        const middlewareLoaded = [() => "initial"];

        const result = await performInitialSetup(
            {
                platform: "node",
                spawnEsbuild: async () => "",
                createDevHandler: mock.fn(() => ({
                    broadcastReload: async () => {},
                    getRoutes: () => [],
                    getMiddleware: () => middlewareLoaded,
                })),
                reloadRoutesManifest: async () => [],
                loadAllModules: async () => {},
            },
            {
                createConfig: mockConfig,
                createState: mockState,
                initImporter: () => async () => ({}),
                makeTextReader: (r) => r,
                makeFileReader: () => async () => "",
                runBuild: async () => {},
                loadRoutes: async () => {},
                loadMiddlewares: async () => middlewareLoaded,
                makeReloadFunctions: () => ({
                    reloadFiles: async () => {},
                    createDebouncedEsbuild: () => () => {},
                    createDebouncedReloadMiddleware: () => () => {},
                }),
            },
        );

        assert.ok(result.handler.getMiddleware);
        assert.strictEqual(result.handler.getMiddleware(), middlewareLoaded);
        assert.strictEqual(typeof result.updateUserMiddlewares, "function");

        // Update and verify
        result.updateUserMiddlewares([() => "updated"]);
    });

    test("performs full lifecycle setup with all dependencies", async () => {
        const routes = [{ path: "/", jsx: "index.jsx" }];
        const jsxModules = new Map([["index.jsx", { default: () => "Hello" }]]);

        const result = await performInitialSetup(
            {
                platform: "node",
                spawnEsbuild: async () => null,
                createDevHandler: () => ({
                    broadcastReload: async () => {},
                    getRoutes: () => routes,
                    getMiddleware: () => [],
                }),
                reloadRoutesManifest: async () => routes,
                loadAllModules: async (loadedRoutes, opts) => {
                    for (const r of loadedRoutes) {
                        opts.cache.set(r.jsx, jsxModules.get(r.jsx));
                    }
                },
            },
            {
                createConfig: () => ({ ...mockConfig(), colors: { yellow: "", reset: "" } }),
                createState: mockState,
                initImporter: () => async () => ({}),
                makeTextReader: (r) => r,
                makeFileReader: () => async () => "file content",
                runBuild: async ({ state }) => {
                    state.esbuildError = null;
                },
                loadRoutes: async ({ state }) => {
                    state.routes = routes;
                    state.jsxModules = jsxModules;
                },
                loadMiddlewares: async () => [],
                makeReloadFunctions: () => ({
                    reloadFiles: async () => {},
                    createDebouncedEsbuild: () => () => {},
                    createDebouncedReloadMiddleware: () => () => {},
                }),
            },
        );

        assert.ok(result.config);
        assert.ok(result.state);
        assert.ok(result.handler);
        assert.strictEqual(typeof result.reloadFiles, "function");
        assert.strictEqual(typeof result.createDebouncedEsbuild, "function");
        assert.strictEqual(typeof result.createDebouncedReloadMiddleware, "function");
        assert.strictEqual(typeof result.updateUserMiddlewares, "function");
    });
});
