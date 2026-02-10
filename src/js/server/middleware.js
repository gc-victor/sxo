/**
 * Middleware loader for user-defined middleware files.
 *
 * Loads middleware from `SRC_DIR/middleware.{js,ts,mjs}` and returns an array
 * of Web Standard middleware functions with the signature:
 *   `(request: Request, env?: object) => Response | void | Promise<Response | void>`
 *
 * Middleware execution is handled by the dev/prod adapters and runtime core.
 * This module only discovers and loads user-defined middleware functions.
 *
 * Supports:
 * - default export: function or array of functions
 * - named exports: `middlewares`, `middleware`, or `mw`
 *
 * See AGENTS.md Section 7 and Section 19.1 for execution semantics.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { SRC_DIR } from "../constants.js";
import { logger } from "./utils/logger.js";

/**
 * Load user-defined middlewares from the source directory middleware file.
 * Accepts:
 *   - default export: function or array
 *   - named export: middlewares / middleware / mw
 * Returns an array of middleware functions. Errors are logged (if logger provided) and result in [].
 * Centralized loader used by dev and prod servers to avoid duplication.
 *
 * Supports multiple file extensions (checked in priority order):
 *   - .js (most common, backwards compatible)
 *   - .ts (TypeScript)
 *   - .mjs (ES modules)
 *
 * @param {object} [options] - Options
 * @param {boolean} [options.isDev] - Force dev mode (defaults to process.env.DEV === "true")
 * @param {string} [options.srcDir] - Source directory to search (defaults to global SRC_DIR)
 * @returns {Promise<Function[]>}
 */
export async function loadUserDefinedMiddlewares({ isDev = process.env.DEV === "true", srcDir = SRC_DIR } = {}) {
    if (!srcDir) return [];

    // Try multiple extensions in priority order
    const extensions = [".js", ".ts", ".mjs"];
    let userMwPath = null;

    for (const ext of extensions) {
        const candidatePath = path.resolve(srcDir, `middleware${ext}`);
        if (fs.existsSync(candidatePath)) {
            userMwPath = candidatePath;
            break; // Use first match
        }
    }

    if (!userMwPath) return [];

    try {
        // Cache-bust in dev to enable hot-reload; stable URL in prod (single load at startup)
        const baseUrl = pathToFileURL(userMwPath).href;
        const url = isDev ? `${baseUrl}?t=${Date.now()}-${Math.random()}` : baseUrl;
        const mod = await import(url);
        const exported = mod.default ?? mod.middlewares ?? mod.middleware ?? mod.mw;
        if (Array.isArray(exported)) {
            return exported.filter((f) => typeof f === "function");
        }
        if (typeof exported === "function") {
            return [exported];
        }
        return [];
    } catch (e) {
        logger.error({ err: e }, "Failed to load user middleware");
        return [];
    }
}
