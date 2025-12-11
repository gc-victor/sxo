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
 * - Works with any JSX module loader
 *
 * @module server/shared/error-pages-loader
 */

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
 * @param {object} [options.logger] - Logger instance with error method
 * @param {(err: Error, page: "404" | "500") => void} [options.onError] - Error callback
 * @returns {Promise<{render404: Function | null, render500: Function | null}>}
 * @public
 *
 * @example
 * ```javascript
 * // Basic usage (prod mode)
 * const { render404, render500 } = await loadErrorPages({
 *   resolve404Page,
 *   resolve500Page,
 *   loadJsxModule,
 *   logger,
 * });
 *
 * // With custom error handling (dev mode)
 * const { render404, render500 } = await loadErrorPages({
 *   resolve404Page,
 *   resolve500Page,
 *   loadJsxModule,
 *   logger,
 *   onError: (err, page) => {
 *     console.error(`Failed to load ${page} page:`, err.message);
 *   },
 * });
 * ```
 */
export async function loadErrorPages(options) {
    const { resolve404Page, resolve500Page, loadJsxModule, logger, onError } = options;

    let render404 = null;
    let render500 = null;

    // Load 404 page
    const error404Path = resolve404Page();
    if (error404Path) {
        try {
            render404 = await loadJsxModule(error404Path);
        } catch (e) {
            const msg = `Failed to load custom 404 page: ${e.message}`;
            if (logger?.error) {
                logger.error({ err: e }, msg);
            }
            if (onError) {
                onError(e, "404");
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
            const msg = `Failed to load custom 500 page: ${e.message}`;
            if (logger?.error) {
                logger.error({ err: e }, msg);
            }
            if (onError) {
                onError(e, "500");
            }
            // Continue with null (fallback to default 500)
        }
    }

    return { render404, render500 };
}
