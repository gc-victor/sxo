/**
 * @fileoverview Platform-agnostic dev server core utilities.
 *
 * Provides shared functionality for hot-reload, error handling,
 * and debouncing used by all platform-specific dev adapters (Node.js, Bun, Deno).
 *
 * @module server/dev/core
 * @since 1.0.0
 */

import { normalizePublicPath } from "../utils/inject-assets.js";

/**
 * Creates a debounced version of a function that delays execution.
 *
 * The debounced function will delay invoking `fn` until `delay` milliseconds
 * have elapsed since the last time the debounced function was called.
 * Useful for batching rapid file change events.
 *
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function that accepts any arguments
 * @public
 * @since 1.0.0
 * @example
 * const debouncedSave = debounce(saveFile, 250);
 * debouncedSave(); // Will only execute once after 250ms of inactivity
 */
export function debounce(fn, delay) {
    let timer = null;
    return (...args) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

/**
 * Extract body innerHTML from HTML string.
 *
 * Matches content between `<body>` and `</body>` tags, case-insensitive.
 * Handles body tags with attributes (e.g., `<body class="dark">`).
 *
 * @param {string} html - Full HTML document string
 * @returns {string} Body content or empty string if no body tags found
 * @public
 * @since 1.0.0
 * @example
 * const body = extractBodyFromHtml('<html><body><div>Hello</div></body></html>');
 * // Returns: '<div>Hello</div>'
 */
export function extractBodyFromHtml(html) {
    // Use dotAll flag (s) to match across newlines
    const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    return match ? match[1] : "";
}

/**
 * Build hot-replace SSE payload.
 *
 * Renders the JSX module, extracts the body content, and builds a JSON payload
 * suitable for sending via Server-Sent Events to connected clients.
 *
 * @param {object} options - Payload options
 * @param {object} options.route - Route object with assets property
 * @param {object} options.params - Route parameters (e.g., slug values)
 * @param {Function} options.jsxFn - JSX render function (async, returns HTML string)
 * @param {string} options.publicPath - Public base path for assets
 * @returns {Promise<string>} JSON stringified payload with body, assets, publicPath
 * @public
 * @since 1.0.0
 */
export async function buildHotReplacePayload({ route, params, jsxFn, publicPath }) {
    const html = await jsxFn(params);
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
 * @param {object} logger - Logger instance with warn method
 * @returns {(err: Error) => void} Error handler function
 * @public
 * @since 1.0.0
 * @example
 * const handler = getWatcherErrorHandler("src", logger);
 * watcher.on("error", handler);
 */
export function getWatcherErrorHandler(context, logger) {
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
 * @since 1.0.0
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
 * Run esbuild and return the cleaned error string.
 *
 * Executes esbuild using a provided platform-specific spawn callback.
 * Handles stderr cleaning and logging. Caller is responsible for managing
 * the returned error state.
 *
 * @param {object} options - Runner options
 * @param {Function} options.spawnEsbuild - Platform-specific spawn function that returns Promise<string> (stderr)
 * @param {object} options.logger - Logger instance with info/error methods
 * @param {object} [options.colors] - Optional color codes { yellow, reset } for filename logging
 * @param {string} [options.filename] - Optional filename to log (for hot-reload feedback)
 * @returns {Promise<string>} Cleaned error string (empty string if no errors)
 * @public
 * @since 1.0.0
 * @example
 * // Node.js example
 * const errorString = await runEsbuild({
 *     spawnEsbuild: async () => {
 *         const child = spawn(process.execPath, [ESBUILD_CONFIG_FILE, PAGES_DIR], {...});
 *         return capturedStderr; // Platform-specific stderr capture
 *     },
 *     logger,
 *     colors: { yellow: "\x1b[33m", reset: "\x1b[0m" },
 *     filename: "src/pages/index.jsx",
 * });
 * esbuildError = errorString; // Caller manages state
 */
export async function runEsbuild({ spawnEsbuild, logger, colors = {}, filename }) {
    try {
        // Call platform-specific spawn function
        const stderr = await spawnEsbuild();

        // Clean error message (remove common prefixes)
        const cleaned = stderr.replace("✘ [ERROR] ", "").replace("[plugin jsx-transform]", "").trim();

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
        logger.error(`esbuild execution failed: ${err.message}`);
        return "";
    }
}

/**
 * Reload routes manifest from disk.
 *
 * Loads and parses the routes.json manifest file with retry logic.
 * Returns the parsed routes array. Caller is responsible for managing
 * state updates and module reloading.
 *
 * @param {string} routesPath - Absolute path to routes.json
 * @param {object} [options] - Reload options
 * @param {Function} [options.readFile] - Platform-specific file reader (async, returns string)
 * @param {object} [options.logger] - Logger instance
 * @param {number} [options.retries=3] - Number of retry attempts for manifest loading
 * @returns {Promise<Array>} Parsed routes array
 * @public
 * @since 1.0.0
 * @example
 * // Node.js example
 * const routes = await reloadRoutesManifest(routesPath, {
 *     readFile: (path) => fs.promises.readFile(path, "utf-8"),
 *     logger,
 *     retries: 3,
 * });
 * // Caller manages state and module loading separately
 */
export async function reloadRoutesManifest(routesPath, options = {}) {
    const { readFile, logger, retries = 3 } = options;

    // Import here to avoid circular dependency at module load time
    const { loadRoutesManifest } = await import("../shared/routes-loader.js");

    return loadRoutesManifest(routesPath, {
        retries,
        readFile,
        logger,
    });
}
