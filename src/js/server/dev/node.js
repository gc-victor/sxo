/**
 * @fileoverview Node.js dev server adapter.
 *
 * Thin wrapper that provides Node.js-specific functionality:
 * - HTTP server via http.createServer()
 * - File watching via fs.watch()
 * - esbuild integration via child_process.spawn()
 * - Static file serving via fs.promises
 *
 * All request handling logic is delegated to the shared core-handler.
 *
 * @module server/dev/node
 * @since 1.0.0
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { DANGER_OUTPUT_DIR, ESBUILD_CONFIG_FILE, PAGES_DIR, PORT, ROUTES_FILE, SRC_DIR } from "../../constants.js";
import { loadUserDefinedMiddlewares } from "../middleware.js";
import { CACHE_NO_CACHE } from "../shared/cache.js";
import { nodeFileReader } from "../shared/file-readers.js";
import { fromWebResponse, toWebRequest } from "../shared/http-adapters.js";
import { loadAllModules, loadJsxModule as loadJsxModuleShared } from "../shared/module-loader.js";
import { hasFileExtension } from "../shared/path.js";
import { createStaticHandler } from "../shared/static-handler.js";
import { logger, resolve404Page, resolve500Page } from "../utils/index.js";
import { debounce, getWatcherErrorHandler, isMiddlewareFile, reloadRoutesManifest, runEsbuild } from "./core.js";
import { createDevHandler } from "./core-handler.js";

const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

// --- Configuration from environment/constants ---
const staticDir = DANGER_OUTPUT_DIR ? path.join(DANGER_OUTPUT_DIR, "client") : "./dist/client";
const srcDir = SRC_DIR || "./src";
const port = PORT || 3000;
const publicPath = process.env.PUBLIC_PATH ?? "/";
const routesPath = ROUTES_FILE;

// Resolve paths
const resolvedStaticDir = path.resolve(staticDir);
const resolvedSrcDir = path.resolve(srcDir);
const resolvedRoutesPath = path.resolve(routesPath);
const hotReplaceClientPath = path.resolve(import.meta.dirname, "../hot-replace.client.js");

// --- Error state and routes ---
let esbuildError = "";
let routes = [];

// Cache for loaded JSX modules
const jsxModules = new Map();

// Platform-specific importer (Node.js dynamic import)
const nodeImporter = (url) => import(url);

// Platform-specific esbuild spawner
const spawnEsbuild = async () => {
    return new Promise((resolve) => {
        let stderr = "";

        const child = spawn(process.execPath, [ESBUILD_CONFIG_FILE, PAGES_DIR], {
            env: { ...process.env, DEV: "true" },
            stdio: ["inherit", "inherit", "pipe"],
            cwd: process.cwd(),
        });

        child.stderr.on("data", (data) => {
            stderr += data.toString();
        });

        child.on("close", () => {
            resolve(stderr);
        });
    });
};

// --- Reload routes and modules helper ---
const reloadFilesJson = async () => {
    routes = await reloadRoutesManifest(resolvedRoutesPath, {
        readFile: async (p) => fs.promises.readFile(p, "utf-8"),
        logger,
        retries: 3,
    });
    await loadAllModules(routes, {
        importer: nodeImporter,
        bustCache: true,
        cache: jsxModules,
        returnErrorStub: true,
        onError: (msg) => logger.error(msg),
    });
};

// --- Initial esbuild run and module load ---
esbuildError = await runEsbuild({ spawnEsbuild, logger, colors: { yellow: YELLOW, reset: RESET } });
await reloadFilesJson();

// User-defined middleware (auto-load from srcDir/middleware.js)
let userMiddlewares = await loadUserDefinedMiddlewares();

// --- Create the shared request handler ---

const handler = createDevHandler({
    getRoutes: () => routes,
    loadJsxModule: (jsxPath) =>
        loadJsxModuleShared(jsxPath, { importer: nodeImporter, bustCache: true, returnErrorStub: true, cache: jsxModules }),
    publicPath,
    getEsbuildError: () => esbuildError,
    hotReplaceClientPath,
    readFile: (filePath) => fs.promises.readFile(filePath, "utf-8"),
    getMiddleware: () => userMiddlewares,
    resolve404Page,
    resolve500Page,
    logger,
});

// --- Debounced functions ---

const debouncedEsbuild = debounce(async (filename) => {
    if (filename) {
        esbuildError = await runEsbuild({
            spawnEsbuild,
            logger,
            colors: { yellow: YELLOW, reset: RESET },
            filename,
        });
        await handler.broadcastReload(reloadFilesJson);
    }
}, 250);

const debouncedReloadMiddleware = debounce(async (filename) => {
    if (isMiddlewareFile(filename)) {
        const mw = await loadUserDefinedMiddlewares();
        if (Array.isArray(mw)) {
            userMiddlewares = mw;
            logger.info("Middleware reloaded");
        }
    }
}, 500);

// --- Set up file watcher ---

try {
    const srcWatcher = fs.watch(resolvedSrcDir, { recursive: true }, (_, filename) => {
        debouncedReloadMiddleware(filename);
        debouncedEsbuild(filename);
    });
    srcWatcher.on("error", getWatcherErrorHandler("src", logger));
} catch (err) {
    logger.warn(`Failed to watch src directory: ${err.message}. Hot-reload disabled.`);
}

// --- Static file handler ---
const handleStaticRequest = createStaticHandler({
    staticDir: resolvedStaticDir,
    fileReader: nodeFileReader(fs.promises),
    cacheControl: CACHE_NO_CACHE,
    skipCompression: true,
});

// --- Create HTTP server ---

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://localhost:${port}`);
    const pathname = url.pathname;

    // Log request (skip SSE and hot-replace.js to reduce noise)
    if (pathname !== "/hot-replace" && pathname !== "/hot-replace.js") {
        logger.info(`${req.method} ${pathname}`);
    }

    // Convert Node.js request to Web Standard Request (needed for static and dynamic handlers)
    const webRequest = toWebRequest(req, port);

    // --- Static file serving ---
    if (hasFileExtension(pathname)) {
        const staticResponse = await handleStaticRequest(webRequest);
        if (staticResponse) {
            await fromWebResponse(staticResponse, req, res);
            return;
        }
    }

    // Use shared handler for all other requests
    const webResponse = await handler(webRequest);
    await fromWebResponse(webResponse, req, res);
});

// --- Start listening ---
server.listen(port, () => {
    logger.info(`Dev server listening on http://localhost:${port}`);
});
