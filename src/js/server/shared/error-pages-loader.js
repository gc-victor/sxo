/**
 * @fileoverview Error page (404/500) loading utilities.
 *
 * Provides shared functionality for loading custom 404 and 500 error pages
 * used by both dev and prod servers across all runtime adapters.
 *
 * Features:
 * - Load custom error page JSX modules
 * - Graceful fallback when pages don't exist
 * - Error handling with logging (no crashes)
 * - Optional error redaction for production (prevents leaking paths/stack traces)
 * - Works with any JSX module loader
 *
 * @module server/shared/error-pages-loader
 */

import { logger } from "../utils/logger.js";

/**
 * Load custom 404 and 500 error page modules.
 *
 * Attempts to load custom error pages if they exist, with graceful fallback
 * on loading errors. Designed to never crash the server - errors are logged
 * and null is returned for failed loads.
 *
 * @param {object} options - Load options
 * @param {() => string | null} options.resolve404Page - Function returning 404 page path or null
 * @param {() => string | null} options.resolve500Page - Function returning 500 page path or null
 * @param {(path: string) => Promise<Function>} options.loadJsxModule - JSX module loader
 * @param {(err: Error, page: "404" | "500") => void} [options.onError] - Error callback (receives redacted error in prod mode)
 * @param {boolean} [options.redactErrors] - When true, redacts error details from log messages (prod mode)
 * @returns {Promise<{render404: Function | null, render500: Function | null}>}
 * @public
 *
 * @example
 * ```javascript
 * // Basic usage with error redaction (prod mode)
 * const { render404, render500 } = await loadErrorPages({
 *   resolve404Page,
 *   resolve500Page,
 *   loadJsxModule,
 *   redactErrors: true,
 * });
 *
 * // With custom error handling (dev mode)
 * const { render404, render500 } = await loadErrorPages({
 *   resolve404Page,
 *   resolve500Page,
 *   loadJsxModule,
 *   onError: (err, page) => {
 *     console.error(`Failed to load ${page} page:`, err.message);
 *   },
 * });
 * ```
 */
export async function loadErrorPages(options) {
    const { resolve404Page, resolve500Page, loadJsxModule, onError, redactErrors = false } = options;

    let render404 = null;
    let render500 = null;

    // Generic error message for production mode (no sensitive details)
    const generic404Msg = "Failed to load custom 404 page";
    const generic500Msg = "Failed to load custom 500 page";

    // Load 404 page
    const error404Path = resolve404Page();
    if (error404Path) {
        try {
            render404 = await loadJsxModule(error404Path);
        } catch (e) {
            const isRedacted = redactErrors;
            const msg = isRedacted ? generic404Msg : `Failed to load custom 404 page: ${e instanceof Error ? e.message : String(e)}`;
            // Always log full error object for internal debugging (structured logging)
            logger.error({ err: e }, msg);
            if (onError) {
                // In prod mode, pass a redacted error to prevent leakage via onError callback
                const redactedErr = isRedacted ? new Error(generic404Msg) : e instanceof Error ? e : new Error(String(e));
                onError(redactedErr, "404");
            }
            // Continue with null (fallback to default 404)
        }
    }

    // Load 500 page
    const error500Path = resolve500Page();
    if (error500Path) {
        try {
            render500 = await loadJsxModule(error500Path);
        } catch (e) {
            const isRedacted = redactErrors;
            const msg = isRedacted ? generic500Msg : `Failed to load custom 500 page: ${e instanceof Error ? e.message : String(e)}`;
            // Always log full error object for internal debugging (structured logging)
            logger.error({ err: e }, msg);
            if (onError) {
                // In prod mode, pass a redacted error to prevent leakage via onError callback
                const redactedErr = isRedacted ? new Error(generic500Msg) : e instanceof Error ? e : new Error(String(e));
                onError(redactedErr, "500");
            }
            // Continue with null (fallback to default 500)
        }
    }

    return { render404, render500 };
}
