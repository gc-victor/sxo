/**
 * @fileoverview Platform-agnostic dev server core utilities.
 *
 * Provides shared functionality for hot-reload, error handling,
 * and debouncing used by all platform-specific dev adapters (Node.js, Bun, Deno).
 *
 * @module server/dev/core
 */

import { normalizePublicPath } from "../utils/inject-assets.js";
import { logger } from "../utils/logger.js";
import { extractBodyFromHtml } from "./html-utils.js";

/**
 * Creates a debounced version of a function that delays execution.
 *
 * The debounced function will delay invoking `fn` until `delay` milliseconds
 * have elapsed since the last time the debounced function was called.
 * Useful for batching rapid file change events.
 *
 * @template {any[]} T
 * @param {(...args: T) => any} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {(...args: T) => void} Debounced function that accepts any arguments
 * @public
 * @example
 * const debouncedSave = debounce(saveFile, 250);
 * debouncedSave(); // Will only execute once after 250ms of inactivity
 */
export function debounce(fn, delay) {
    /** @type {ReturnType<typeof setTimeout> | null} */
    let timer = null;
    return (/** @type {T} */ ...args) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

/**
 * Build hot-replace SSE payload.
 *
 * Renders the JSX module, extracts the body content, and builds a JSON payload
 * suitable for sending via Server-Sent Events to connected clients.
 *
 * @param {object} options - Payload options
 * @param {Route} options.route - Route object with assets property
 * @param {Record<string, string>} options.params - Route parameters (e.g., slug values)
 * @param {Function} options.jsxFn - JSX render function (async, returns HTML string)
 * @param {string} options.publicPath - Public base path for assets
 * @param {Request} [options.request] - Original request (preserves cookies/headers from SSE connection)
 * @returns {Promise<string>} JSON stringified payload with body, assets, publicPath
 * @public
 */
export async function buildHotReplacePayload({ route, params, jsxFn, publicPath, request }) {
    // Use provided request (preserves cookies/headers from SSE connection)
    // or provide a minimal request so page functions that access request.headers don't crash
    const fallbackRequest =
        request ||
        new Request("http://localhost/", {
            headers: { Accept: "text/html" },
        });
    const result = await jsxFn(params, fallbackRequest);
    let html;
    if (result instanceof Response) {
        html = await result.text();
    } else {
        html = String(result ?? "");
    }
    const body = extractBodyFromHtml(html);
    const normalized = normalizePublicPath(publicPath);

    return JSON.stringify({
        body,
        assets: {
            css: route.assets?.css || [],
            js: route.assets?.js || [],
        },
        publicPath: normalized,
    });
}

/**
 * Get a watcher error handler that logs warnings without crashing.
 *
 * Returns a function suitable for attaching to file watcher "error" events.
 * Logs the error as a warning and indicates that hot-reload may be degraded,
 * but does not throw or crash the dev server.
 *
 * Common errors handled:
 * - ENOSPC: System limit for number of file watchers reached (Linux)
 * - EMFILE: Too many open files
 *
 * @param {string} context - Description of what's being watched (e.g., "src", "dist")
 * @returns {(err: Error) => void} Error handler function
 * @public
 * @example
 * const handler = getWatcherErrorHandler("src");
 * watcher.on("error", handler);
 */
export function getWatcherErrorHandler(context) {
    return (err) => {
        logger.warn(`${context} watcher error: ${err.message}. Hot-reload may be degraded.`);
    };
}

/**
 * Check if a filename is a middleware file.
 *
 * Detects files named `middleware.js`, `middleware.ts`, `middleware.mjs`,
 * or files in a directory named `middleware`.
 *
 * @param {string} filename - Filename or path to check
 * @returns {boolean} True if file is middleware-related
 * @public
 * @example
 * isMiddlewareFile("middleware.js"); // true
 * isMiddlewareFile("src/middleware/auth.js"); // true
 * isMiddlewareFile("components/button.jsx"); // false
 */
export function isMiddlewareFile(filename) {
    if (!filename) return false;
    const normalized = filename.replace(/\\/g, "/");
    return (
        normalized.endsWith("middleware.js") ||
        normalized.endsWith("middleware.ts") ||
        normalized.endsWith("middleware.mjs") ||
        normalized.split("/").includes("middleware")
    );
}

/**
 * Run esbuild and return a cleaned error string.
 *
 * Executes esbuild using a provided platform-specific spawn callback.
 * Handles stderr cleaning and logging. Warning lines (▲ [WARNING]) are
 * logged separately and stripped before checking for errors, so they
 * don't block route loading. Caller is responsible for managing the
 * returned error state.
 *
 * @param {object} options - Runner options
 * @param {() => Promise<string>} options.spawnEsbuild - Platform-specific spawn function that returns Promise<string> (stderr)
 * @param {{ yellow?: string, reset?: string }} [options.colors] - Optional color codes { yellow, reset } for filename logging
 * @param {string} [options.filename] - Optional filename to log (for hot-reload feedback)
 * @returns {Promise<string>} Cleaned error string (empty string if no errors)
 * @public
 * @example
 * // Node.js example
 * await runEsbuild({
 *   spawnEsbuild: (args, cwd) => exec("esbuild", args, { cwd }),
 *   filename: "app.js",
 * });
 */
export async function runEsbuild({ spawnEsbuild, colors = {}, filename }) {
    try {
        // Call platform-specific spawn function
        const stderr = await spawnEsbuild();

        // Log warnings, then strip them from the output so they don't
        // masquerade as build errors that block route loading.
        const lines = stderr.split("\n");
        const filteredLines = [];
        let inWarning = false;

        for (const line of lines) {
            if (line.includes("▲ [WARNING]")) {
                inWarning = true;
                logger.warn(line.trim());
            } else if (inWarning) {
                // Continuation lines of a warning block are indented or
                // blank. Stop skipping when we hit a non-indented line.
                if (line.length === 0 || /^\s/.test(line)) {
                    logger.warn(line.trimEnd());
                } else {
                    inWarning = false;
                    filteredLines.push(line);
                }
            } else {
                filteredLines.push(line);
            }
        }

        // Clean error message (remove common prefixes)
        const cleaned = filteredLines
            .join("\n")
            .replace(/✘ \[ERROR\] /g, "")
            .replace(/\[plugin jsx-transform\]/g, "")
            .trim();

        // Log filename with optional colors
        if (filename && colors.yellow && colors.reset) {
            logger.info(`${colors.yellow}${filename}${colors.reset}`);
        } else if (filename) {
            logger.info(filename);
        }

        // Log errors if present
        if (cleaned) {
            const resetCode = colors.reset || "";
            logger.error(`${resetCode}${cleaned}`);
        }

        return cleaned;
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`esbuild execution failed: ${message}`);
        throw err;
    }
}

/**
 * Reload routes manifest from disk.
 *
 * Loads and parses routes.json manifest file with retry logic.
 * Returns parsed routes array. Caller is responsible for managing
 * state updates and module reloading.
 *
 * @param {string} routesPath - Absolute path to routes.json
 * @param {object} [options] - Reload options
 * @param {(path: string) => Promise<string> | string} [options.readFile] - Platform-specific file reader (async, returns string)
 * @param {number} [options.retries=3] - Number of retry attempts for manifest loading
 * @returns {Promise<Route[]>} Parsed routes array
 * @public
 * @example
 * // Node.js example
 * const routes = await reloadRoutesManifest(routesPath, {
 *     readFile: (path) => fs.promises.readFile(path, "utf-8"),
 *     retries: 3,
 * });
 * // Caller manages state and module loading separately
 */
export async function reloadRoutesManifest(routesPath, options = {}) {
    const { readFile, retries = 3 } = options;

    // Import here to avoid circular dependency at module load time
    const { loadRoutesManifest } = await import("../shared/routes-loader.js");

    /** @type {{retries?: number, readFile?: (path: string) => string | Promise<string>}} */
    const loadOptions = { retries };
    if (readFile) loadOptions.readFile = readFile;

    return loadRoutesManifest(routesPath, loadOptions);
}
