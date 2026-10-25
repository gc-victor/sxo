/**
 * @fileoverview Shared setup for Bun and Deno development adapters.
 *
 * @module server/dev/shared/dev-adapter
 */

import { createFileReader } from "../../shared/file-readers.js";
import { createStaticHandler } from "../../shared/static-handler.js";
import { logger } from "../../utils/logger.js";
import { createFileWatcher } from "./file-watcher.js";

const HOT_REPLACE_PATHS = new Set(["/hot-replace", "/hot-replace.js"]);

/**
 * Set up shared file watching and static-file handling for a dev adapter.
 *
 * @param {object} options - Adapter dependencies
 * @param {{ srcDir: string, staticDir: string }} options.config - Dev server paths
 * @param {(delayMs?: number) => (filename: string) => void} options.createDebouncedEsbuild - Build callback factory
 * @param {(delayMs?: number) => (filename: string) => void} options.createDebouncedReloadMiddleware - Middleware callback factory
 * @returns {(request: Request) => Promise<Response | null>} Static request handler
 */
export function createDevAdapter({ config, createDebouncedEsbuild, createDebouncedReloadMiddleware }) {
    const debouncedEsbuild = createDebouncedEsbuild(250);
    const debouncedReloadMiddleware = createDebouncedReloadMiddleware(500);

    createFileWatcher({
        watchDir: config.srcDir,
        onChange: (/** @type {string} */ filename) => {
            debouncedReloadMiddleware(filename);
            debouncedEsbuild(filename);
        },
    });

    return createStaticHandler({
        staticDir: config.staticDir,
        fileReader: createFileReader(),
        cacheControl: "no-cache",
        skipCompression: true,
    });
}

/**
 * Log a Bun or Deno dev-server request unless it is a hot-reload request.
 *
 * @param {string} method - HTTP method
 * @param {string} pathname - URL pathname
 * @param {number} status - Response status code
 */
export function logDevRequest(method, pathname, status) {
    if (HOT_REPLACE_PATHS.has(pathname)) return;

    const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
    logger[level](`${method} ${pathname} ${status}`);
}
