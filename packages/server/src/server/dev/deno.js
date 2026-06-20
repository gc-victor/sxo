/**
 * @fileoverview Deno dev server adapter (immediate shutdown).
 *
 * Thin wrapper that provides Deno-specific functionality:
 * - HTTP server via Deno.serve()
 * - File watching via fs.watch() (Node.js compat)
 * - esbuild integration via Deno.Command()
 * - Static file serving via Deno.open()
 *
 * All request handling logic is delegated to shared core-handler.
 *
 * @module server/dev/deno
 */

import { PAGES_DIR } from "../../constants.js";
import { createFileReader } from "../shared/file-readers.js";
import { hasFileExtension } from "../shared/path.js";
import { createStaticHandler } from "../shared/static-handler.js";
import { logger } from "../utils/logger.js";
import { reloadRoutesManifest } from "./core.js";
import { createDevHandler } from "./core-handler.js";
import { createFileWatcher } from "./shared/file-watcher.js";
import { createEsbuildSpawner } from "./shared/process-spawner.js";
import { performInitialSetup } from "./shared/server-lifecycle.js";

const { config, handler, createDebouncedEsbuild, createDebouncedReloadMiddleware } = await performInitialSetup({
    platform: "deno",
    spawnEsbuild: createEsbuildSpawner(
        "deno",
        /** @type {string} */ (Deno.execPath?.() ?? "deno"),
        process.env.SXO_ESBUILD_CONFIG_FILE ?? "",
        PAGES_DIR,
    ),
    createDevHandler,
    reloadRoutesManifest: async (/** @type {string} */ path, /** @type {object} */ options) => {
        const readFile = async (/** @type {string} */ p) => {
            return await Deno.readTextFile(p);
        };
        return reloadRoutesManifest(path, { ...options, readFile });
    },
});

const debouncedEsbuild = createDebouncedEsbuild(250);
const debouncedReloadMiddleware = createDebouncedReloadMiddleware(500);

createFileWatcher({
    watchDir: config.srcDir,
    onChange: (/** @type {string} */ filename) => {
        debouncedReloadMiddleware(filename);
        debouncedEsbuild(filename);
    },
});

const handleStaticRequest = createStaticHandler({
    staticDir: config.staticDir,
    fileReader: createFileReader(),
    cacheControl: "no-cache",
    skipCompression: true,
});

// Register signal handlers: immediate exit only
Deno.addSignalListener("SIGINT", () => Deno.exit(0));
Deno.addSignalListener("SIGTERM", () => Deno.exit(0));

Deno.serve({
    port: config.port,
    handler: async (/** @type {Request} */ request) => {
        const url = new URL(request.url);
        const pathname = url.pathname;

        let response;
        if (hasFileExtension(pathname)) {
            const staticResponse = await handleStaticRequest(request);
            if (staticResponse) {
                response = staticResponse;
            }
        }

        if (!response) {
            response = await handler(request);
        }

        // Log request (skip SSE and hot-replace.js to reduce noise)
        if (pathname !== "/hot-replace" && pathname !== "/hot-replace.js") {
            const status = response.status;
            if (status >= 500) {
                logger.error(`${request.method} ${pathname} ${status}`);
            } else if (status >= 400) {
                logger.warn(`${request.method} ${pathname} ${status}`);
            } else {
                logger.info(`${request.method} ${pathname} ${status}`);
            }
        }

        return response;
    },
});

logger.info(`Dev server listening on http://localhost:${config.port}`);
