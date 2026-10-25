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
import { hasFileExtension } from "../shared/path.js";
import { logger } from "../utils/logger.js";
import { reloadRoutesManifest } from "./core.js";
import { createDevHandler } from "./core-handler.js";
import { createDevAdapter, logDevRequest } from "./shared/dev-adapter.js";
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

const handleStaticRequest = createDevAdapter({ config, createDebouncedEsbuild, createDebouncedReloadMiddleware });

// Register signal handlers: immediate exit only
Deno.addSignalListener("SIGINT", () => Deno.exit(0));
Deno.addSignalListener("SIGTERM", () => Deno.exit(0));

async function handleDenoRequest(request, pathname) {
    const staticResponse = hasFileExtension(pathname) ? await handleStaticRequest(request) : null;
    return staticResponse || handler(request);
}

Deno.serve({
    port: config.port,
    handler: async (/** @type {Request} */ request) => {
        const pathname = new URL(request.url).pathname;
        const response = await handleDenoRequest(request, pathname);
        logDevRequest(request.method, pathname, response.status);
        return response;
    },
});

logger.info(`Dev server listening on http://localhost:${config.port}`);
