/**
 * @fileoverview Bun production server adapter.
 *
 * Executes immediately at module load to start the production server.
 * This module serves as the Bun runtime's `sxo start` entry point.
 * Provides:
 * - HTTP request/response logging
 * - Custom 404/500 error pages
 * - URL length limits and CORS preflight handling
 * - Static file serving using Bun.file() for efficient file I/O
 * - Precompressed file variants (.br, .gz)
 * - SSR with route manifest
 *
 * @module server/prod/bun
 */

import path from "node:path";
import { OUTPUT_DIR_CLIENT, OUTPUT_DIR_SERVER, PORT, ROUTES_FILE, ROUTES_RELATIVE_PATH } from "../../constants.js";
import { loadUserDefinedMiddlewares } from "../middleware.js";
import { loadErrorPages } from "../shared/error-pages-loader.js";
import { bunFileReader } from "../shared/file-readers.js";
import { loadModulesWithFallback } from "../shared/module-loader.js";
import { loadRoutesManifest } from "../shared/routes-loader.js";
import { createStaticHandler } from "../shared/static-handler.js";
import { httpBunLogger, logger, resolve404Page, resolve500Page } from "../utils/index.js";
import { createFetchHandler, createGeneratedRouteHandler, createProdHandler } from "./core-handler.js";

const YELLOW = "\x1b[33m";

// --- Startup: Load routes, modules, middleware, and error pages ---

// Platform-specific importer (Bun dynamic import)
const bunImporter = (url) => import(url);

// Load and validate routes at startup
let routes;
try {
    routes = await loadRoutesManifest(ROUTES_FILE, {
        retries: 1,
        readFile: async (path) => await Bun.file(path).text(),
        logger,
        source: ROUTES_RELATIVE_PATH,
    });
} catch (e) {
    logger.error({ err: e }, `Failed to load or validate ${ROUTES_RELATIVE_PATH}`);
    process.exit(1);
}

// Load modules from generated modules.js (falls back to loading JSX modules individually)
const modulesPath = path.join(OUTPUT_DIR_SERVER, "modules.js");
const modules = await loadModulesWithFallback({
    modulesPath,
    routes,
    importer: bunImporter,
    onWarn: (msg) => logger.warn(msg),
    onError: (msg) => logger.error(msg),
});

// Load user-defined middleware
let userMiddlewares = [];
try {
    userMiddlewares = await loadUserDefinedMiddlewares();
} catch (e) {
    logger.error({ err: e }, "Failed to load user-defined middleware");
}

// Load custom error pages if they exist
const { render404, render500 } = await loadErrorPages({
    resolve404Page,
    resolve500Page,
    loadJsxModule: async (jsxPath) => {
        const fn = await bunImporter(path.join(OUTPUT_DIR_SERVER, jsxPath));
        return fn.default || fn.jsx;
    },
    logger,
});

// Normalize public path once at startup
const publicPath = process.env.PUBLIC_PATH ?? "/";

// --- Create platform-agnostic handlers ---

// Create file reader once
const fileReader = bunFileReader();

// Create prod handler with core logic
const { handleRequest, send500 } = createProdHandler({
    getRoutes: () => routes,
    modules,
    publicPath,
    getMiddleware: () => userMiddlewares,
    render404,
    render500,
    logger,
});

// Create static file handler with Bun file reader
const handleStaticRequest = createStaticHandler({
    staticDir: OUTPUT_DIR_CLIENT,
    fileReader,
});

// Create generated route handler
const serveGeneratedRoute = createGeneratedRouteHandler({
    staticDir: OUTPUT_DIR_CLIENT,
    fileReader,
    joinPath: path.resolve,
});

// Create unified fetch handler
const handleFetch = createFetchHandler({
    handleStaticRequest,
    handleRequest,
    serveGeneratedRoute,
    send500,
    logger,
});

// --- Bun.serve fetch handler ---

/**
 * Handle incoming HTTP request (Bun.serve fetch API).
 *
 * @param {Request} request - Web Standard Request
 * @param {import("bun").Server} server - Bun server instance
 * @returns {Promise<Response>} Web Standard Response
 */
async function fetch(request, server) {
    const log = httpBunLogger(request, server);
    const response = await handleFetch(request);
    log.finish(response);
    return response;
}

// --- Start Bun server ---

Bun.serve({
    port: PORT,
    fetch,
});

logger.info(`${YELLOW}http://localhost:${PORT}/`);

// Graceful shutdown
process.on("SIGINT", () => {
    logger.info("Shutting down...");
    process.exit(0);
});
process.on("unhandledRejection", (reason) => {
    logger.error({ reason }, "Unhandled Rejection");
});
process.on("uncaughtException", (err) => {
    logger.error({ err }, "Uncaught Exception");
});
