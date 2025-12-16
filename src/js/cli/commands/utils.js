/**
 * @fileoverview Shared utilities for CLI command handlers.
 *
 * @module cli/commands/utils
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Extracts error message from unknown error value.
 * @param {unknown} e - Error value
 * @returns {string} Error message
 */
export function getErrorMessage(e) {
    if (e && typeof e === "object" && "message" in e) {
        return String(e.message);
    }
    return String(e);
}

/**
 * Computes routes.json path from resolved config.
 * @param {object} cfg - Resolved config with outDir
 * @returns {string} Absolute path to routes.json
 */
export function routesJsonPath(cfg) {
    return path.join(cfg.outDir, "server", "routes.json");
}

/**
 * Computes relative routes.json path for display.
 * @param {string} root - Project root
 * @param {object} cfg - Resolved config
 * @returns {string} Relative path for error messages
 */
export function routesJsonRelative(root, cfg) {
    return path.relative(root, routesJsonPath(cfg));
}

/**
 * Checks if routes.json exists using injected pathExists.
 * @param {object} cfg - Resolved config
 * @param {object} impl - Implementation with pathExists
 * @returns {Promise<boolean>}
 */
export async function routesJsonExists(cfg, impl) {
    return await impl.pathExists(routesJsonPath(cfg));
}

/**
 * Get absolute paths to CLI scripts using import.meta.url.
 * @param {string} fromUrl - import.meta.url from calling module
 * @returns {{ ESBUILD_CONFIG_FILE: string, SERVER_DEV_FILE: string, SERVER_PROD_FILE: string }}
 */
export function getCliScriptPaths(fromUrl) {
    return {
        ESBUILD_CONFIG_FILE: fileURLToPath(new URL("../../esbuild/esbuild.config.js", fromUrl)),
        SERVER_DEV_FILE: fileURLToPath(new URL("../../server/dev.js", fromUrl)),
        SERVER_PROD_FILE: fileURLToPath(new URL("../../server/prod.js", fromUrl)),
    };
}
