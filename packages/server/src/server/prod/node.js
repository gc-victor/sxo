/**
 * @fileoverview Node.js production server adapter.
 *
 * Executes immediately at module load to start the production server.
 * This module serves as the Node.js runtime's `sxo start` entry point.
 * Provides:
 * - HTTP request/response logging
 * - Custom 404/500 error pages
 * - Server timeouts and error handling
 * - URL length limits and CORS preflight handling
 * - Static file serving with precompression support
 * - SSR with route manifest
 *
 * @module server/prod/node
 */

import fsp from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";

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
import { fromWebResponse, toWebRequest } from "../shared/http-adapters.js";
import { loadModulesWithFallback } from "../shared/module-loader.js";
import { loadRoutesManifest } from "../shared/routes-loader.js";
import { createStaticHandler } from "../shared/static-handler.js";
import { resolve404Page, resolve500Page } from "../utils/error-pages.js";
import { jsxBundlePath } from "../utils/jsx-bundle-path.js";
import { httpLogger, logger } from "../utils/logger.js";
import { createFetchHandler, createGeneratedRouteHandler, createProdHandler } from "./core-handler.js";
import { handleClientError, handleUncaughtException, handleUnhandledRejection } from "./node-handlers.js";

// Server timeout defaults (milliseconds)
const DEFAULT_REQUEST_TIMEOUT_MS = 120 * 1000; // 2 minutes in milliseconds

const HEADER_TIMEOUT_MS_RAW = process.env.HEADER_TIMEOUT_MS;
const HEADER_TIMEOUT_MS = HEADER_TIMEOUT_MS_RAW?.trim() ? parseInt(HEADER_TIMEOUT_MS_RAW, 10) : null;
const REQUEST_TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS || String(DEFAULT_REQUEST_TIMEOUT_MS), 10);

const YELLOW = "\x1b[33m";

// Platform-specific importer (Node.js dynamic import)
/** @type {(url: string) => Promise<any>} */
const nodeImporter = (url) => import(url);

// Load and validate routes at startup
let routes;
try {
    routes = await loadRoutesManifest(ROUTES_FILE, {
        retries: 1,
        readFile: async (path) => await fsp.readFile(path, "utf-8"),
        source: ROUTES_RELATIVE_PATH,
    });
} catch (e) {
    // DEFENSIVE CODE: loadRoutesManifest validates routes.json structure and references.
    // Malformed manifest indicates corrupted build that should be fixed before running server.
    // This path is tested via CI/CD build pipeline validation.
    logger.error({ err: e }, `Failed to load or validate ${ROUTES_RELATIVE_PATH}`);
    process.exit(1);
}

// Load modules from generated modules.js (falls back to loading JSX modules individually)
const modulesPath = path.join(OUTPUT_DIR_SERVER, "modules.js");
const modules = await loadModulesWithFallback({
    modulesPath: pathToFileURL(modulesPath).href,
    routes,
    importer: nodeImporter,
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
    // DEFENSIVE CODE: loadUserDefinedMiddlewares validates middleware module structure.
    // Server continues without middleware on error, falling back to default behavior.
    // This path is tested via dev/prod server smoke tests with invalid middleware.
    logger.error({ err: e }, "Failed to load user-defined middleware");
}

// Load custom error pages if they exist
const { render404, render500 } = await loadErrorPages({
    resolve404Page,
    resolve500Page,
    loadJsxModule: async (jsxPath) => {
        const fn = await nodeImporter(pathToFileURL(jsxBundlePath(jsxPath)).href);
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
    getRoutes: () => routes,
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

// Create static file handler with Node.js file reader
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

// Create unified fetch handler (Web Standard)
const handleFetch = createFetchHandler({
    handleStaticRequest,
    handleRequest,
    serveGeneratedRoute,
    send404,
    send500,
});

const server = http.createServer(async (req, res) => {
    // pinoHttp augments req/res with additional properties (id, log, allLogs, [startTime])
    httpLogger(req, res);

    // Convert to Web Standard Request
    // pinoHttp augments IncomingMessage with id, log, allLogs
    const webRequest = toWebRequest(req, PORT);

    // Use unified handler
    const response = await handleFetch(webRequest);
    // pinoHttp augments res with log, allLogs, [startTime] but we need base ServerResponse type
    await fromWebResponse(response, req, res);
});

// Timeouts and error handling
server.requestTimeout = REQUEST_TIMEOUT_MS;
if (typeof HEADER_TIMEOUT_MS === "number" && HEADER_TIMEOUT_MS >= 0) {
    server.headersTimeout = HEADER_TIMEOUT_MS;
}

server.on("clientError", (err, socket) => handleClientError(err, socket));

server.listen(PORT, () => {
    logger.info(`${YELLOW}http://localhost:${PORT}/`);
});

process.on("unhandledRejection", (reason) => handleUnhandledRejection(reason));

process.on("uncaughtException", (err) => handleUncaughtException(err));
