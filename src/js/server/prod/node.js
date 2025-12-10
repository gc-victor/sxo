/**
 * @fileoverview Node.js production server adapter.
 *
 * Executes immediately at module load to start the production server.
 * This module serves as the Node.js runtime's `sxo start` entry point.
 * Provides:
 * - HTTP request/response logging
 * - Custom 404/500 error pages
 * - Server timeouts and error handling
 * - Graceful shutdown
 * - URL length limits and CORS preflight handling
 * - Static file serving with precompression support
 * - SSR with route manifest
 *
 * @module server/prod/node
 * @since 1.0.0
 */

import fsp from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { OUTPUT_DIR_CLIENT, OUTPUT_DIR_SERVER, PORT, ROUTES_FILE, ROUTES_RELATIVE_PATH } from "../../constants.js";
import { loadUserDefinedMiddlewares } from "../middleware.js";
import { loadErrorPages } from "../shared/error-pages-loader.js";
import { nodeFileReader } from "../shared/file-readers.js";
import { fromWebResponse, toWebRequest } from "../shared/http-adapters.js";
import { loadModulesWithFallback } from "../shared/module-loader.js";
import { loadRoutesManifest } from "../shared/routes-loader.js";
import { createStaticHandler } from "../shared/static-handler.js";
import { httpLogger, logger, resolve404Page, resolve500Page } from "../utils/index.js";
import { createFetchHandler, createGeneratedRouteHandler, createProdHandler } from "./core-handler.js";

const HEADER_TIMEOUT_MS_RAW = process.env.HEADER_TIMEOUT_MS;
const HEADER_TIMEOUT_MS = HEADER_TIMEOUT_MS_RAW != null && HEADER_TIMEOUT_MS_RAW !== "" ? parseInt(HEADER_TIMEOUT_MS_RAW, 10) : null;
const REQUEST_TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS || "120000", 10);

const YELLOW = "\x1b[33m";

// --- Startup: Load routes, modules, middleware, and error pages ---

// Platform-specific importer (Node.js dynamic import)
const nodeImporter = (url) => import(url);

// Load and validate routes at startup
let routes;
try {
    routes = await loadRoutesManifest(ROUTES_FILE, {
        retries: 1,
        readFile: async (path) => await fsp.readFile(path, "utf-8"),
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
    modulesPath: pathToFileURL(modulesPath).href,
    routes,
    importer: nodeImporter,
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
        const fn = await nodeImporter(pathToFileURL(path.join(OUTPUT_DIR_SERVER, jsxPath)).href);
        return fn.default || fn.jsx;
    },
    logger,
});

// Normalize public path once at startup
const publicPath = process.env.PUBLIC_PATH ?? "/";

// --- Create platform-agnostic handlers ---

// Create file reader once
const fileReader = nodeFileReader(fsp);

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

// Create static file handler with Node.js file reader
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

// Create unified fetch handler (Web Standard)
const handleFetch = createFetchHandler({
    handleStaticRequest,
    handleRequest,
    serveGeneratedRoute,
    send500,
    logger,
});

// --- HTTP Server ---

const server = http.createServer(async (req, res) => {
    httpLogger(req, res);

    // Convert to Web Standard Request
    const webRequest = toWebRequest(req, PORT);

    // Use unified handler
    const response = await handleFetch(webRequest);
    await fromWebResponse(response, req, res);
});

// Timeouts and error handling
server.requestTimeout = REQUEST_TIMEOUT_MS;
if (typeof HEADER_TIMEOUT_MS === "number" && HEADER_TIMEOUT_MS >= 0) {
    server.headersTimeout = HEADER_TIMEOUT_MS;
}

server.on("clientError", (err, socket) => {
    try {
        const isTimeout = err?.code === "ERR_HTTP_REQUEST_TIMEOUT" || (typeof err?.message === "string" && /timeout/i.test(err.message));

        if (isTimeout) {
            socket.end("HTTP/1.1 408 Request Timeout\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
        } else {
            logger.debug(
                {
                    err,
                    remoteAddress: socket.remoteAddress,
                    remotePort: socket.remotePort,
                    bytesRead: socket.bytesRead,
                    bytesWritten: socket.bytesWritten,
                },
                "clientError: bad request, sending 400 and closing connection",
            );
            socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
        }
    } catch (e) {
        logger.warn({ err: e }, "clientError: failed to end socket cleanly");
    }
});

server.listen(PORT, () => {
    logger.info(`${YELLOW}http://localhost:${PORT}/`);
});

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
