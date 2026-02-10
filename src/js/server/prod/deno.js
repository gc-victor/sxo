/**
 * @fileoverview Deno production server adapter.
 *
 * Executes immediately at module load to start the production server.
 * This module serves as the Deno runtime's `sxo start` entry point.
 * Provides:
 * - HTTP request/response logging
 * - Custom 404/500 error pages
 * - URL length limits and CORS preflight handling
 * - Static file serving with native Deno APIs
 * - Precompressed file variants (.br, .gz)
 * - SSR with route manifest
 *
 * @module server/prod/deno
 */

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
import { httpDenoLogger, logger } from "../utils/logger.js";
import { createFetchHandler, createGeneratedRouteHandler, createProdHandler } from "./core-handler.js";

const YELLOW = "\x1b[33m";

/**
 * Platform-specific importer (Deno dynamic import).
 * @param {string} url - Module URL to import
 * @returns {Promise<any>}
 */
const denoImporter = (url) => import(url);

/**
 * Resolve a path relative to a base directory (POSIX-style).
 * @param {string} base - Base directory
 * @param {string} relative - Relative path
 * @returns {string} Resolved path
 */
function _joinPath(base, relative) {
    const normalized = relative.replace(/^\/+/, "");
    if (base.endsWith("/")) {
        return base + normalized;
    }
    return `${base}/${normalized}`;
}

// Load and validate routes at startup
/** @type {any[]} */
let routes;
try {
    routes = await loadRoutesManifest(ROUTES_FILE, {
        retries: 1,
        readFile: async (path) => await Deno.readTextFile(path),
        source: ROUTES_RELATIVE_PATH,
    });
} catch (e) {
    logger.error({ err: e }, `Failed to load or validate ${ROUTES_RELATIVE_PATH}`);
    Deno.exit(1);
}

// Load modules from generated modules.js (falls back to loading JSX modules individually)
const cwd = Deno.cwd();
const modulesPath = `${OUTPUT_DIR_SERVER}/modules.js`;
const modulesUrl = modulesPath.startsWith("file://")
    ? modulesPath
    : `file://${modulesPath.startsWith("/") ? modulesPath : `${cwd}/${modulesPath}`}`;

const modules = await loadModulesWithFallback({
    modulesPath: modulesUrl,
    routes,
    importer: denoImporter,
    onWarn: (msg) => logger.warn(msg),
    onError: (msg) => logger.error(msg),
    isDev: false,
});

// Load user-defined middleware
/** @type {any[]} */
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
        const fn = await denoImporter(`file://${jsxBundlePath(jsxPath)}`);
        return fn.default || fn.jsx;
    },
    redactErrors: true,
});

// Normalize public path once at startup
const publicPath = Deno.env.get("PUBLIC_PATH") ?? "/";

// Create file reader once
const fileReader = createFileReader();

// Create prod handler with core logic
const { handleRequest, send404, send500 } = createProdHandler({
    getRoutes: () => routes,
    modules,
    publicPath,
    getMiddleware: () => userMiddlewares,
    render404,
    render500,
    securityHeaders: SECURITY_HEADERS,
    allowMiddlewareSecurityOverride: ALLOW_MIDDLEWARE_SECURITY_OVERRIDE,
});

// Create static file handler with Deno file reader
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
 * Handle incoming HTTP request (Deno.serve fetch API).
 *
 * @param {Request} request - Web Standard Request
 * @param {Deno.ServeHandlerInfo} [info] - Request info
 * @returns {Promise<Response>} Web Standard Response
 */
async function fetch(request, info) {
    const log = httpDenoLogger(request, /** @type {{ remoteAddr?: { hostname: string } } | undefined} */ (info));
    const response = await handleFetch(request);
    log.finish(response);
    return response;
}

Deno.serve({
    port: PORT,
    handler: fetch,
});

logger.info(`${YELLOW}http://localhost:${PORT}/`);

// Note: Deno doesn't have direct equivalents for unhandledRejection/uncaughtException
// but has similar global error handlers
globalThis.addEventListener("unhandledrejection", (/** @type {PromiseRejectionEvent} */ event) => {
    logger.error({ reason: event.reason }, "Unhandled Rejection");
});

globalThis.addEventListener("error", (/** @type {ErrorEvent} */ event) => {
    logger.error({ err: event.error }, "Uncaught Exception");
});
