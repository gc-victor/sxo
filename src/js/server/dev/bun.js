/**
 * @fileoverview Bun dev server adapter.
 *
 * Thin wrapper that provides Bun-specific functionality:
 * - HTTP server via Bun.serve()
 * - File watching via fs.watch()
 * - esbuild integration via Bun.spawn()
 * - Static file serving via Bun.file()
 * - Module loading via shared module-loader with standard dynamic imports
 *
 * All request handling logic is delegated to the shared core-handler.
 *
 * @module server/dev/bun
 */

import fs from "node:fs";
import path from "node:path";
import { DANGER_OUTPUT_DIR, ESBUILD_CONFIG_FILE, PAGES_DIR, PORT, ROUTES_FILE, SRC_DIR } from "../../constants.js";
import { loadUserDefinedMiddlewares } from "../middleware.js";
import { CACHE_NO_CACHE } from "../shared/cache.js";
import { bunFileReader } from "../shared/file-readers.js";
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

// Platform-specific esbuild spawner
const spawnEsbuild = async () => {
    return new Promise((resolve) => {
        let stderr = "";

        const proc = Bun.spawn([process.execPath, ESBUILD_CONFIG_FILE, PAGES_DIR], {
            env: { ...process.env, DEV: "true" },
            cwd: process.cwd(),
            stdout: "inherit",
            stderr: "pipe",
        });

        const stderrChunks = [];
        const reader = proc.stderr.getReader();
        reader
            .read()
            .then(function readChunk({ done, value }) {
                if (done) return;
                stderrChunks.push(value);
                return reader.read().then(readChunk);
            })
            .catch(() => {});

        proc.exited.then(() => {
            if (stderrChunks.length > 0) {
                const decoder = new TextDecoder();
                for (const chunk of stderrChunks) {
                    stderr += decoder.decode(chunk);
                }
            }
            resolve(stderr);
        });
    });
};

// --- Reload routes and modules helper ---
const reloadFilesJson = async () => {
    routes = await reloadRoutesManifest(resolvedRoutesPath, {
        readFile: async (p) => await Bun.file(p).text(),
        logger,
        retries: 3,
    });
    await loadAllModules(routes, {
        importer: (url) => import(url),
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
        loadJsxModuleShared(jsxPath, {
            importer: (url) => import(url),
            bustCache: true,
            cache: jsxModules,
            returnErrorStub: true,
        }),
    publicPath,
    getEsbuildError: () => esbuildError,
    hotReplaceClientPath,
    readFile: (filePath) => Bun.file(filePath).text(),
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
    fileReader: bunFileReader(),
    cacheControl: CACHE_NO_CACHE,
    skipCompression: true,
});

// --- Start Bun server ---

Bun.serve({
    port,
    async fetch(request) {
        const url = new URL(request.url);
        const pathname = url.pathname;

        // Log request (skip SSE and hot-replace.js to reduce noise)
        if (pathname !== "/hot-replace" && pathname !== "/hot-replace.js") {
            logger.info(`${request.method} ${pathname}`);
        }

        // --- Static file serving ---
        if (hasFileExtension(pathname)) {
            const staticResponse = await handleStaticRequest(request);
            if (staticResponse) {
                return staticResponse;
            }
        }

        // Use shared handler for all other requests
        return handler(request);
    },
    idleTimeout: 0, // Disable idle timeout for SSE connections
});

logger.info(`Dev server listening on http://localhost:${port}`);
