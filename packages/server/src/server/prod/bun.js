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

import { OUTPUT_DIR_SERVER, PORT, ROUTES_FILE, ROUTES_RELATIVE_PATH } from "../../constants.js";
import { loadRoutesManifest } from "../shared/routes-loader.js";
import { jsxBundlePath } from "../utils/jsx-bundle-path.js";
import { logger } from "../utils/logger.js";
import { createProductionFetchHandler } from "./adapter-handler.js";

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

// Build the shared production request handler with Bun module paths/imports.
const { handleFetch } = await createProductionFetchHandler({
    routes: routes ?? [],
    modulesPath: path.join(OUTPUT_DIR_SERVER, "modules.js"),
    importer: bunImporter,
    loadJsxModule: async (jsxPath) => {
        const fn = await bunImporter(jsxBundlePath(jsxPath));
        return fn.default || fn.jsx;
    },
    publicPath: process.env.PUBLIC_PATH ?? "/",
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
