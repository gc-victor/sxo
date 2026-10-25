/**
 * @fileoverview Bun dev server adapter (immediate shutdown).
 *
 * Thin wrapper that provides Bun-specific functionality:
 * - HTTP server via Bun.serve()
 * - File watching via fs.watch()
 * - esbuild integration via Bun.spawn()
 * - Static file serving via Bun.file()
 * - Module loading via shared module-loader with standard dynamic imports
 *
 * All request handling logic is delegated to shared core-handler.
 *
 * @module server/dev/bun
 */

import { PAGES_DIR } from "../../constants.js";
import { createFileReader, createTextReader } from "../shared/file-readers.js";
import { hasFileExtension } from "../shared/path.js";
import { logger } from "../utils/logger.js";
import { reloadRoutesManifest } from "./core.js";
import { createDevHandler } from "./core-handler.js";
import { createDevAdapter, logDevRequest } from "./shared/dev-adapter.js";
import { createEsbuildSpawner } from "./shared/process-spawner.js";
import { performInitialSetup } from "./shared/server-lifecycle.js";

// Platform-specific text reader
const bunTextReader = createTextReader(createFileReader());

const { config, handler, createDebouncedEsbuild, createDebouncedReloadMiddleware } = await performInitialSetup({
    platform: "bun",
    spawnEsbuild: createEsbuildSpawner("bun", process.execPath, process.env.SXO_ESBUILD_CONFIG_FILE ?? "", PAGES_DIR),
    createDevHandler,
    reloadRoutesManifest: async (/** @type {string} */ path, /** @type {any} */ options) => {
        return reloadRoutesManifest(path, { ...options, readFile: bunTextReader });
    },
});

const handleStaticRequest = createDevAdapter({ config, createDebouncedEsbuild, createDebouncedReloadMiddleware });

// Register signal handlers for immediate shutdown
process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

async function handleBunRequest(request, pathname) {
    const staticResponse = hasFileExtension(pathname) ? await handleStaticRequest(request) : null;
    return staticResponse || handler(request);
}

Bun.serve({
    port: config.port,
    async fetch(request) {
        const pathname = new URL(request.url).pathname;
        const response = await handleBunRequest(request, pathname);
        logDevRequest(request.method, pathname, response.status);
        return response;
    },
    idleTimeout: 0, // Disable idle timeout for SSE connections
});

logger.info(`Dev server listening on http://localhost:${config.port}`);
