/**
 * @typedef {Object} Logger
 * @property {(...args: any[]) => void} error - Log error messages
 * @property {(...args: any[]) => void} warn - Log warning messages
 * @property {(...args: any[]) => void} info - Log info messages
 * @property {(...args: any[]) => void} debug - Log debug messages
 * @property {string} [yellow] - ANSI yellow color code
 * @property {string} [reset] - ANSI reset color code
 */

/// <reference types="../../types/index.d.ts" />

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { DANGER_OUTPUT_DIR, PAGES_DIR, PORT, ROUTES_FILE, SRC_DIR } from "../../constants.js";
import { createFileReader, createTextReader } from "../shared/file-readers.js";
import { fromWebResponse, toWebRequest } from "../shared/http-adapters.js";
import { hasFileExtension } from "../shared/path.js";
import { createStaticHandler } from "../shared/static-handler.js";
import { resolve404Page, resolve500Page } from "../utils/error-pages.js";
import { logger } from "../utils/logger.js";
import { debounce, getWatcherErrorHandler, isMiddlewareFile, reloadRoutesManifest, runEsbuild } from "./core.js";
import { createDevHandler } from "./core-handler.js";
import { createEsbuildSpawner } from "./shared/process-spawner.js";

const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";
const HOT_REPLACE_PATHS = new Set(["/hot-replace", "/hot-replace.js"]);

/** @type {import('fs').FSWatcher | null} */
let fileWatcher = null;
/** @type {import('http').Server | null} */
let httpServer = null;

const port = PORT || 3000;
const publicPath = process.env.PUBLIC_PATH ?? "/";
const resolvedStaticDir = path.resolve(DANGER_OUTPUT_DIR ? path.join(DANGER_OUTPUT_DIR, "client") : "./dist/client");
const resolvedSrcDir = path.resolve(SRC_DIR || "./src");
const resolvedRoutesPath = path.resolve(ROUTES_FILE);
const hotReplaceClientPath = path.resolve(import.meta.dirname, "../hot-replace.client.js");

let esbuildError = "";
/** @type {Route[]} */
let routes = [];

// Cache for loaded JSX modules
const jsxModules = new Map();

// Platform-specific importer (Node.js dynamic import)
const nodeImporter = (/** @type {string} */ url) => import(url);

// Platform-specific esbuild spawner
const esbuildConfigFile = process.env.SXO_ESBUILD_CONFIG_FILE ?? "";
const spawnEsbuild = createEsbuildSpawner("node", process.execPath, esbuildConfigFile, PAGES_DIR);

const nodeTextReader = createTextReader(createFileReader());

const reloadFilesJson = async () => {
    const moduleLoader = await import("../shared/module-loader.js");
    routes = await reloadRoutesManifest(resolvedRoutesPath, {
        readFile: nodeTextReader,
        retries: 3,
    });
    await moduleLoader.loadAllModules(routes, {
        importer: nodeImporter,
        bustCache: true,
        cache: jsxModules,
        returnErrorStub: true,
        onError: (/** @type {string} */ msg) => logger.error(msg),
        isDev: true,
    });
};

esbuildError = await runEsbuild({ spawnEsbuild, colors: { yellow: YELLOW, reset: RESET } });
// Only reload routes if no build errors (preserve last-known-good routes)
if (!esbuildError) {
    await reloadFilesJson();
}

// User-defined middleware (auto-load from srcDir/middleware.js)
/** @type {Array<Function> | undefined} */
let userMiddlewares;
try {
    userMiddlewares = await (await import("../middleware.js")).loadUserDefinedMiddlewares();
} catch (error) {
    userMiddlewares = [];
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to load middleware: ${message}`);
}

const handler = /** @type {any} */ (
    createDevHandler({
        getRoutes: () => routes,
        loadJsxModule: async (/** @type {string} */ jsxPath) => {
            const moduleLoader = await import("../shared/module-loader.js");
            return moduleLoader.loadJsxModule(jsxPath, {
                importer: nodeImporter,
                bustCache: true,
                returnErrorStub: true,
                cache: jsxModules,
                isDev: true,
            });
        },
        publicPath,
        getEsbuildError: () => esbuildError,
        hotReplaceClientPath,
        readFile: nodeTextReader,
        getMiddleware: () => userMiddlewares || [],
        resolve404Page,
        resolve500Page,
    })
);

const debouncedEsbuild = debounce(async (/** @type {string} */ filename) => {
    esbuildError = await runEsbuild({
        spawnEsbuild,
        colors: { yellow: YELLOW, reset: RESET },
        filename,
    });
    // Only reload routes if no build errors (preserve last-known-good routes)
    if (!esbuildError) {
        await handler.broadcastReload(reloadFilesJson);
    }
}, 250);

async function reloadUserMiddleware(/** @type {string} */ filename) {
    if (!isMiddlewareFile(filename)) return;

    try {
        const mw = await (await import("../middleware.js")).loadUserDefinedMiddlewares();
        if (!Array.isArray(mw)) return;
        userMiddlewares = mw;
        logger.info("Middleware reloaded");
    } catch (error) {
        logMiddlewareReloadError(error);
    }
}

function logMiddlewareReloadError(error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to reload middleware: ${message}`);
}

const debouncedReloadMiddleware = debounce(reloadUserMiddleware, 500);

try {
    fileWatcher = fs.watch(resolvedSrcDir, { recursive: true }, (_, /** @type {string | null} */ filename) => {
        // macOS fs.watch() may return null filename; trigger rebuilds unconditionally to handle this platform quirk
        debouncedReloadMiddleware(filename ?? "");
        debouncedEsbuild(filename ?? "");
    });
    fileWatcher.on("error", getWatcherErrorHandler("src"));
} catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`Failed to watch src directory: ${message}. Hot-reload disabled.`);
}

const handleStaticRequest = createStaticHandler({
    staticDir: resolvedStaticDir,
    fileReader: createFileReader(),
    cacheControl: "no-cache",
    skipCompression: true,
});

async function handleNodeRequest(req, res) {
    const url = new URL(req.url || "/", `http://localhost:${port}`);
    const pathname = url.pathname;
    const webRequest = toWebRequest(req, port);

    /** @type {Response | undefined} */
    let response;
    if (hasFileExtension(pathname)) {
        response = await handleStaticRequest(webRequest);
    }
    if (!response) response = await handler(webRequest);

    logNodeRequest(req.method, pathname, response.status);
    await fromWebResponse(response, req, res);
}

function logNodeRequest(method, pathname, status) {
    if (HOT_REPLACE_PATHS.has(pathname)) return;
    if (status >= 500) {
        logger.error(`${method} ${pathname} ${status}`);
    } else if (status >= 400) {
        logger.warn(`${method} ${pathname} ${status}`);
    } else {
        logger.info(`${method} ${pathname} ${status}`);
    }
}

httpServer = http.createServer((req, res) => handleNodeRequest(req, res));

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

httpServer.listen(port, () => {
    logger.info(`Dev server listening on http://localhost:${port}`);
});
