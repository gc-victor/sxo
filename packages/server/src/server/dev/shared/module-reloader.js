/**
 * @fileoverview Platform-agnostic module reloading for dev server.
 *
 * Provides helper functions for reloading routes and JSX modules
 * used by all platform-specific dev adapters.
 *
 * @module server/dev/shared/module-reloader
 */

import { logger } from "../../utils/logger.js";

/**
 * Create routes and modules reloader.
 *
 * Returns a function that reloads the routes manifest and loads
 * all JSX modules into the provided cache using platform-specific
 * import functions.
 *
 * @param {object} options - Reloader configuration
 * @param {string} options.routesPath - Path to routes.json manifest
 * @param {Function} options.readFile - Platform-specific file reader
 * @param {Function} options.importer - Platform-specific dynamic import function
 * @param {object} options.jsxModules - Cache Map for loaded JSX modules
 * @param {Function} options.reloadRoutesManifest - Routes manifest loader function
 * @param {Function} options.loadAllModules - Module loader function
 * @returns {() => Promise<void>} Function that performs reload
 * @public
 * @example
 * const reloadFiles = createModuleReloader({
 *     routesPath: './dist/server/routes.json',
 *     readFile: (path) => fs.readFile(path, 'utf-8'),
 *     importer: (url) => import(url),
 *     jsxModules: new Map(),
 *     reloadRoutesManifest: (path, opts) => loadRoutes(path, opts),
 *     loadAllModules: (routes, opts) => loadModules(routes, opts),
 * });
 *
 * // Perform reload
 * await reloadFiles();
 */
export function createModuleReloader({ routesPath, readFile, importer, jsxModules, reloadRoutesManifest, loadAllModules }) {
    return async () => {
        // Reload routes manifest from disk
        const routes = await reloadRoutesManifest(routesPath, {
            readFile,
            retries: 3,
        });

        // Load all JSX modules into cache
        await loadAllModules(routes, {
            importer,
            bustCache: true,
            cache: jsxModules,
            returnErrorStub: true,
            onError: (/** @type {string} */ msg) => logger.error(msg),
            isDev: true,
        });
    };
}
