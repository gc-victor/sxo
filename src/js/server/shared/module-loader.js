/**
 * @fileoverview Shared module loader for JSX SSR modules.
 *
 * Consolidates module loading logic used across dev and prod server adapters.
 * Supports both bundled modules.js and individual JSX module loading as fallback.
 *
 * Key features:
 * - Platform-agnostic (uses passed importer function)
 * - Cache management (bust cache in dev, static cache in prod)
 * - Fallback from modules.js bundle to individual JSX loading
 * - Optional error stubbing (returns HTML error message instead of throwing)
 * - Batch loading for multiple routes
 *
 * @module server/shared/module-loader
 * @since 1.0.0
 */

import { jsxBundlePath } from "../utils/jsx-bundle-path.js";

/**
 * Minimal HTML escaper for error stub output.
 * @param {string} s
 * @returns {string}
 */
function escapeHtmlLite(s) {
    return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

/**
 * Load a single JSX module using the provided importer function.
 *
 * @param {string} jsxPath - Source path to the page module (under PAGES_DIR)
 * @param {object} options
 * @param {(url: string) => Promise<any>} options.importer - Platform-specific import function
 * @param {boolean} [options.bustCache=false] - Force fresh import
 * @param {Map<string, Function>} [options.cache] - Cache map (required)
 * @param {boolean} [options.returnErrorStub=false] - Return error HTML stub instead of throwing
 * @param {(msg: string) => void} [options.onError] - Optional error callback
 * @returns {Promise<Function>} The resolved SSR render function
 */
export async function loadJsxModule(jsxPath, { importer, bustCache = false, cache, returnErrorStub = false, onError } = {}) {
    if (!importer) {
        throw new Error("loadJsxModule: importer function is required");
    }
    if (!cache) {
        throw new Error("loadJsxModule: cache Map is required");
    }

    const modulePath = jsxBundlePath(jsxPath);

    // When busting, drop existing cache entry so a fresh import result will be stored
    if (bustCache) {
        cache.delete(jsxPath);
    }

    if (cache.has(jsxPath)) {
        return cache.get(jsxPath);
    }

    try {
        const moduleUrl = bustCache ? `${modulePath}?t=${Date.now()}` : modulePath;
        const mod = await importer(moduleUrl);
        const fn = mod.default || mod.jsx;
        if (typeof fn !== "function") {
            throw new Error(`No valid export found in ${modulePath}`);
        }
        cache.set(jsxPath, fn);
        return fn;
    } catch (err) {
        if (onError) {
            onError(`Failed to load module ${jsxPath}: ${err?.message || String(err)}`);
        }
        if (returnErrorStub) {
            const stub = () =>
                `<pre style="color:red;">Error loading ${escapeHtmlLite(String(jsxPath))}: ${escapeHtmlLite(err?.message || String(err))}</pre>`;
            cache.set(jsxPath, stub);
            return stub;
        }
        throw err;
    }
}

/**
 * Load all JSX modules for the given routes (batch operation).
 *
 * @param {Array<{jsx: string}>} routes - Array of route objects with jsx property
 * @param {object} options
 * @param {(url: string) => Promise<any>} options.importer - Platform-specific import function
 * @param {boolean} [options.bustCache=false] - Force fresh imports
 * @param {Map<string, Function>} [options.cache] - Cache map (required)
 * @param {boolean} [options.returnErrorStub=false] - Return error HTML stubs instead of throwing
 * @param {(msg: string) => void} [options.onError] - Optional error callback
 * @returns {Promise<void>}
 */
export async function loadAllModules(routes, { importer, bustCache = false, cache, returnErrorStub = false, onError } = {}) {
    if (!cache) {
        throw new Error("loadAllModules: cache Map is required");
    }

    // Clear cache if busting
    if (bustCache) {
        cache.clear();
    }

    // Load all modules in parallel
    await Promise.all(
        routes.map((route) => {
            if (route.jsx) {
                return loadJsxModule(route.jsx, {
                    importer,
                    bustCache,
                    cache,
                    returnErrorStub,
                    onError,
                });
            }
            return Promise.resolve();
        }),
    );
}

/**
 * Load modules from bundled modules.js or fall back to individual JSX loading.
 *
 * This is the primary entry point for production servers.
 * Dev servers typically use loadAllModules directly.
 *
 * @param {object} options
 * @param {string} options.modulesPath - Path to modules.js bundle
 * @param {Array<{jsx: string}>} options.routes - Array of route objects
 * @param {(url: string) => Promise<any>} options.importer - Platform-specific import function
 * @param {(msg: string) => void} [options.onWarn] - Optional warning callback
 * @param {(msg: string) => void} [options.onError] - Optional error callback
 * @returns {Promise<Record<string, {default?: Function, jsx?: Function}>>} Modules object keyed by jsx path
 */
export async function loadModulesWithFallback({ modulesPath, routes, importer, onWarn, onError } = {}) {
    if (!importer) {
        throw new Error("loadModulesWithFallback: importer function is required");
    }
    if (!routes) {
        throw new Error("loadModulesWithFallback: routes array is required");
    }

    let modules = {};

    // Try to load from modules.js bundle first
    try {
        const modulesModule = await importer(modulesPath);
        modules = modulesModule.default || modulesModule;
        return modules;
    } catch {
        // Fall back to loading JSX modules individually
        if (onWarn) {
            onWarn("modules.js not found, falling back to individual module loading");
        }

        const cache = new Map();
        for (const route of routes) {
            if (route.jsx) {
                try {
                    const fn = await loadJsxModule(route.jsx, {
                        importer,
                        cache,
                        returnErrorStub: false,
                        // Don't pass onError here since we handle errors in the catch block below
                    });
                    modules[route.jsx] = { default: fn };
                } catch (e) {
                    if (onError) {
                        onError(`Failed to load SSR module ${route.jsx}: ${e?.message || String(e)}`);
                    }
                }
            }
        }
    }

    return modules;
}

/**
 * Clear all cached modules.
 *
 * @param {Map<string, Function>} cache - Cache map to clear
 */
export function clearModuleCache(cache) {
    if (cache && typeof cache.clear === "function") {
        cache.clear();
    }
}
