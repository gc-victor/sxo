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
    const render404 = await loadErrorPage("404", resolve404Page, loadJsxModule, onError, redactErrors);
    const render500 = await loadErrorPage("500", resolve500Page, loadJsxModule, onError, redactErrors);
    return { render404, render500 };
}

async function loadErrorPage(page, resolvePage, loadJsxModule, onError, redactErrors) {
    const pagePath = resolvePage();
    if (!pagePath) return null;

    try {
        return await loadJsxModule(pagePath);
    } catch (error) {
        const genericMessage = `Failed to load custom ${page} page`;
        const message = redactErrors ? genericMessage : `${genericMessage}: ${error instanceof Error ? error.message : String(error)}`;
        logger.error({ err: error }, message);

        if (onError) {
            onError(toCallbackError(error, genericMessage, redactErrors), page);
        }
        return null;
    }
}

function toCallbackError(error, genericMessage, redactErrors) {
    if (redactErrors) return new Error(genericMessage);
    if (error instanceof Error) return error;
    return new Error(String(error));
}
