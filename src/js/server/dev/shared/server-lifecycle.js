/**
 * @fileoverview Shared dev server startup lifecycle.
 *
 * Orchestrates common startup sequence used by all
 * platform-specific dev adapters (Node.js, Bun, Deno).
 *
 * @module server/dev/shared/server-lifecycle
 */

import { loadUserDefinedMiddlewares } from "../../middleware.js";
import { createFileReader, createTextReader } from "../../shared/file-readers.js";
import { resolve404Page, resolve500Page } from "../../utils/error-pages.js";
import { logger } from "../../utils/logger.js";
import { debounce, isMiddlewareFile, runEsbuild } from "../core.js";
import { createDevConfig, createDevState } from "./platform-config.js";

/**
 * @typedef {import("./platform-config.js").DevConfig} DevConfig
 * @typedef {import("./platform-config.js").DevState} DevState
 * @typedef {((request: Request) => Promise<Response>) & { broadcastReload: (fn: () => Promise<void>) => Promise<void> }} DevHandler
 * @typedef {{ reloadFiles: () => Promise<void>, createDebouncedEsbuild: (delayMs?: number) => (filename: string) => void, createDebouncedReloadMiddleware: (delayMs?: number) => (filename: string) => void }} ReloadFunctions
 * @typedef {{ config: DevConfig, state: DevState, handler: DevHandler, reloadFiles: () => Promise<void>, createDebouncedEsbuild: (delayMs?: number) => (filename: string) => void, createDebouncedReloadMiddleware: (delayMs?: number) => (filename: string) => void, updateUserMiddlewares: (middlewares: any[]) => void }} SetupResult
 */

/** @type {Array<'node' | 'bun' | 'deno'>} */
const SUPPORTED_PLATFORMS = ["node", "bun", "deno"];

/**
 * Initialize platform-specific dynamic import function.
 *
 * All supported platforms use the standard ESM import().
 *
 * @param {'node' | 'bun' | 'deno'} platform - Target platform identifier
 * @returns {(url: string) => Promise<any>} Dynamic import function
 * @throws {Error} If platform is not supported
 * @public
 */
export function initializePlatformImporter(platform) {
    if (!SUPPORTED_PLATFORMS.includes(platform)) {
        throw new Error(`Unsupported platform: ${platform}`);
    }
    return (url) => import(url);
}

/**
 * Create standard options for routes manifest reloading.
 *
 * @param {(path: string) => Promise<string>} readFile - File reader
 * @returns {{ readFile: (path: string) => Promise<string>, logger: Logger, retries: number }}
 */
function createRoutesLoaderOptions(readFile) {
    return { readFile, logger, retries: 3 };
}

/**
 * Create standard options for loading JSX modules.
 *
 * @param {(url: string) => Promise<any>} importer - Dynamic import function
 * @param {Map<string, any>} cache - Module cache
 * @returns {object}
 */
function createModuleLoaderOptions(importer, cache) {
    return {
        importer,
        bustCache: true,
        cache,
        returnErrorStub: true,
        onError: (/** @type {string} */ msg) => logger.error(msg),
        isDev: true,
    };
}

/**
 * Load routes manifest and SSR modules into state.
 *
 * @param {object} options - Load options
 * @param {DevConfig} options.config - Dev configuration with routesPath
 * @param {DevState} options.state - Dev state to mutate (routes, jsxModules)
 * @param {(path: string, options: any) => Promise<any[]>} options.reloadRoutesManifest - Routes loader
 * @param {(routes: any[], options: any) => Promise<void>} options.loadAllModules - Module loader
 * @param {(path: string) => Promise<string>} options.readFile - File reader
 * @param {(url: string) => Promise<any>} options.importer - Dynamic import function
 * @returns {Promise<void>}
 * @public
 */
export async function loadRoutesAndModules({ config, state, reloadRoutesManifest, loadAllModules, readFile, importer }) {
    state.routes = await reloadRoutesManifest(config.routesPath, createRoutesLoaderOptions(readFile));

    await loadAllModules(state.routes, createModuleLoaderOptions(importer, state.jsxModules));
}

/**
 * Run initial esbuild build and capture any error.
 *
 * @param {object} options - Build options
 * @param {() => Promise<string>} options.spawnEsbuild - Platform-specific esbuild spawner
 * @param {DevState} options.state - State object to mutate with error
 * @returns {Promise<void>}
 * @public
 */
export async function runInitialBuild({ spawnEsbuild, state }) {
    state.esbuildError = await runEsbuild({ spawnEsbuild });
}

/**
 * Create reload functions for hot-reload behavior.
 *
 * @param {object} options - Dependencies
 * @param {DevConfig} options.config - Dev configuration
 * @param {DevState} options.state - Dev state
 * @param {(path: string, options: any) => Promise<any[]>} options.reloadRoutesManifest - Routes manifest loader
 * @param {(routes: any[], options: any) => Promise<void>} options.loadAllModules - Module loader
 * @param {(url: string) => Promise<any>} options.importer - Dynamic import function
 * @param {(path: string) => Promise<string>} options.readFile - File reader
 * @param {() => Promise<string>} options.spawnEsbuild - Esbuild spawner
 * @param {DevHandler} options.handler - Request handler with broadcastReload
 * @param {(middlewares: any[]) => void} options.updateUserMiddlewares - Callback to update middlewares
 * @param {Function} [options.loadMiddlewares] - Override for testing
 * @param {Function} [options.runBuild] - Override for testing
 * @param {Function} [options.debounceFn] - Override for testing
 * @param {Function} [options.checkMiddlewareFile] - Override for testing
 * @returns {ReloadFunctions} Reload functions
 * @public
 */
export function createReloadFunctions({
    config,
    state,
    reloadRoutesManifest,
    loadAllModules,
    importer,
    readFile,
    spawnEsbuild,
    handler,
    updateUserMiddlewares,
    // Injection seams for testing
    loadMiddlewares = loadUserDefinedMiddlewares,
    runBuild = runEsbuild,
    debounceFn = debounce,
    checkMiddlewareFile = isMiddlewareFile,
}) {
    /**
     * Reload routes and modules from disk.
     * @returns {Promise<void>}
     */
    const reloadFiles = async () => {
        await loadRoutesAndModules({
            config,
            state,
            reloadRoutesManifest,
            loadAllModules,
            readFile,
            importer,
        });
    };

    /**
     * Create a debounced function that rebuilds on file changes.
     * @param {number} [delayMs=250] - Debounce delay
     * @returns {(filename: string) => void}
     */
    const createDebouncedEsbuild = (delayMs = 250) =>
        debounceFn(async (/** @type {string} */ filename) => {
            if (!filename) return;
            state.esbuildError = await runBuild({
                spawnEsbuild,
                colors: config.colors,
                filename,
            });
            await handler.broadcastReload(reloadFiles);
        }, delayMs);

    /**
     * Create a debounced function that reloads middleware on changes.
     * @param {number} [delayMs=500] - Debounce delay
     * @returns {(filename: string) => void}
     */
    const createDebouncedReloadMiddleware = (delayMs = 500) =>
        debounceFn(async (/** @type {string} */ filename) => {
            if (!checkMiddlewareFile(filename)) return;
            const middlewares = await loadMiddlewares();
            if (Array.isArray(middlewares)) {
                updateUserMiddlewares(middlewares);
                logger.info("Middleware reloaded");
            }
        }, delayMs);

    return {
        reloadFiles,
        createDebouncedEsbuild,
        createDebouncedReloadMiddleware,
    };
}

/**
 * Perform initial dev server setup.
 *
 * @param {object} options - Startup options
 * @param {'node' | 'bun' | 'deno'} options.platform - Target platform
 * @param {Function} options.spawnEsbuild - Platform-specific esbuild spawner
 * @param {Function} options.createDevHandler - Handler factory
 * @param {Function} options.reloadRoutesManifest - Routes manifest loader
 * @param {Function} [options.loadAllModules] - Module loader
 * @param {Function} [options.loadJsxModule] - JSX module loader
 * @param {object} [inject] - Test dependencies
 * @param {Function} [inject.createConfig]
 * @param {Function} [inject.createState]
 * @param {Function} [inject.initImporter]
 * @param {Function} [inject.makeTextReader]
 * @param {Function} [inject.makeFileReader]
 * @param {Function} [inject.runBuild]
 * @param {Function} [inject.loadRoutes]
 * @param {Function} [inject.loadMiddlewares]
 * @param {Function} [inject.makeReloadFunctions]
 * @returns {Promise<SetupResult>} Setup result
 * @throws {Error} If startup fails
 * @public
 */
export async function performInitialSetup(
    { platform, spawnEsbuild, createDevHandler, reloadRoutesManifest, loadAllModules = async () => {}, loadJsxModule = async () => ({}) },
    inject = {},
) {
    const {
        createConfig = createDevConfig,
        createState = createDevState,
        initImporter = initializePlatformImporter,
        makeTextReader = createTextReader,
        makeFileReader = createFileReader,
        runBuild = runInitialBuild,
        loadRoutes = loadRoutesAndModules,
        loadMiddlewares = loadUserDefinedMiddlewares,
        makeReloadFunctions = createReloadFunctions,
    } = inject;

    // Initialize configuration and state
    const config = createConfig();
    const state = createState();
    const importer = initImporter(platform);
    const readFile = makeTextReader(makeFileReader());

    // Run initial build
    await runBuild({ spawnEsbuild, state });

    // Load routes and modules
    await loadRoutes({
        config,
        state,
        reloadRoutesManifest,
        loadAllModules,
        readFile,
        importer,
    });

    // Load user middleware
    let userMiddlewares = await loadMiddlewares();

    // Create request handler
    const handler = createDevHandler({
        getRoutes: () => state.routes,
        loadJsxModule: (/** @type {string} */ jsxPath) =>
            loadJsxModule(jsxPath, {
                importer,
                bustCache: true,
                returnErrorStub: true,
                cache: state.jsxModules,
                isDev: true,
            }),
        publicPath: config.publicPath,
        getEsbuildError: () => state.esbuildError,
        hotReplaceClientPath: config.hotReplaceClientPath,
        readFile,
        getMiddleware: () => userMiddlewares,
        resolve404Page,
        resolve500Page,
    });

    // Create reload functions with middleware updater
    const updateUserMiddlewares = (/** @type {any[]} */ middlewares) => {
        userMiddlewares = middlewares;
    };

    const { reloadFiles, createDebouncedEsbuild, createDebouncedReloadMiddleware } = makeReloadFunctions({
        config,
        state,
        reloadRoutesManifest,
        loadAllModules,
        importer,
        readFile,
        spawnEsbuild,
        handler,
        updateUserMiddlewares,
    });

    return {
        config,
        state,
        handler,
        reloadFiles,
        createDebouncedEsbuild,
        createDebouncedReloadMiddleware,
        updateUserMiddlewares,
    };
}
