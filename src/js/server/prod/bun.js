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

import {
    ALLOW_MIDDLEWARE_SECURITY_OVERRIDE,
    OUTPUT_DIR_CLIENT,
    OUTPUT_DIR_SERVER,
    PORT,
    ROUTES_FILE,
    ROUTES_RELATIVE_PATH,
    SECURITY_HEADERS,
} from "../../constants.js";
import { loadUserDefinedMiddlewares } from "../middleware.js";
import { loadErrorPages } from "../shared/error-pages-loader.js";
import { createFileReader } from "../shared/file-readers.js";
import { loadModulesWithFallback } from "../shared/module-loader.js";
import { loadRoutesManifest } from "../shared/routes-loader.js";
import { createStaticHandler } from "../shared/static-handler.js";
import { resolve404Page, resolve500Page } from "../utils/error-pages.js";
import { jsxBundlePath } from "../utils/jsx-bundle-path.js";
import { logger } from "../utils/logger.js";
import { createFetchHandler, createGeneratedRouteHandler, createProdHandler } from "./core-handler.js";

/** Check if running in test mode */
function isTestMode() {
    return process.env.NODE_ENV === "test";
}

const YELLOW = "\x1b[33m";

// Platform-specific importer (Bun dynamic import)
const bunImporter = (/** @type {string} */ url) => import(url);

// Load and validate routes at startup
/** @type {Route[]} */ let routes = [];
try {
    // Skip routes loading in test mode or if Bun is not available
    if (!isTestMode() && typeof globalThis.Bun !== "undefined") {
        routes = await loadRoutesManifest(ROUTES_FILE, {
            retries: 1,
            readFile: async (path) => await Bun.file(path).text(),
            source: ROUTES_RELATIVE_PATH,
        });
    }
} catch (e) {
    logger.error({ err: e }, `Failed to load or validate ${ROUTES_RELATIVE_PATH}`);
    // Don't exit in test mode to allow importing for testing
    if (process.env.NODE_ENV !== "test") {
        process.exit(1);
    }
}

// Load modules from generated modules.js (falls back to loading JSX modules individually)
const modulesPath = path.join(OUTPUT_DIR_SERVER, "modules.js");
const modules = await loadModulesWithFallback({
    modulesPath,
    routes: routes ?? [],
    importer: bunImporter,
    onWarn: (msg) => logger.warn(msg),
    onError: (msg) => logger.error(msg),
    isDev: false,
});

// Load user-defined middleware
/** @type {Function[]} */
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
        const fn = await bunImporter(jsxBundlePath(jsxPath));
        return fn.default || fn.jsx;
    },
    redactErrors: true,
});

// Normalize public path once at startup
const publicPath = process.env.PUBLIC_PATH ?? "/";

// Create file reader once
const fileReader = createFileReader();

// Create prod handler with core logic
const { handleRequest, send404, send500 } = createProdHandler({
    getRoutes: () => routes ?? [],
    modules,
    publicPath,
    getMiddleware: /** @type {() => Array<(request: Request, env?: object) => Response | void | Promise<Response | void>>} */ (
        () => userMiddlewares
    ),
    render404,
    render500,
    securityHeaders: SECURITY_HEADERS,
    allowMiddlewareSecurityOverride: ALLOW_MIDDLEWARE_SECURITY_OVERRIDE,
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
    securityHeaders: SECURITY_HEADERS,
});

// Create unified fetch handler
const handleFetch = createFetchHandler({
    handleStaticRequest,
    handleRequest,
    serveGeneratedRoute,
    send404,
    send500,
});

/**
 * Handle incoming HTTP request (Bun.serve fetch API).
 *
 * @param {Request} request - Web Standard Request
 * @returns {Promise<Response>} Web Standard Response
 */
async function fetch(request) {
    const response = await handleFetch(request);
    return response;
}

// Start server in production mode
if (process.env.NODE_ENV !== "test") {
    Bun.serve({
        port: PORT,
        fetch,
    });
    logger.info(`${YELLOW}http://localhost:${PORT}/`);
}

process.on("unhandledRejection", (reason) => {
    logger.error({ reason }, "Unhandled Rejection");
});
process.on("uncaughtException", (err) => {
    logger.error({ err }, "Uncaught Exception");
});
