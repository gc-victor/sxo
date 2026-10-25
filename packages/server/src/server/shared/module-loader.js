/**
 * @fileoverview Shared module loader for JSX SSR modules.
 *
 * Consolidates module loading logic used across dev and prod server adapters.
 * Supports both bundled modules.js and individual JSX module loading as fallback.
 *
 * Key features:
 * - Platform-agnostic (uses passed importer function; defaults to Node `import()`)
 * - Cache management (bust cache in dev, static cache in prod)
 * - Fallback from modules.js bundle to individual JSX loading
 * - Optional error stubbing (returns HTML error message instead of throwing)
 * - Batch loading for multiple routes
 *
 * @module server/shared/module-loader
 */

import { createRequire } from "node:module";
import { jsxBundlePath } from "../utils/jsx-bundle-path.js";

// Make require available in ESM context so esbuild's __require shim works
// for CJS dependencies bundled into the server output. Bun and Deno also
// expose process.versions.node, so the typeof guard keeps this safe on
// runtimes without a global process. First-wins guard ensures it runs once
// regardless of which module triggers the first import.
if (typeof process !== "undefined" && process.versions?.node && typeof globalThis.require !== "function") {
    globalThis.require = createRequire(import.meta.url);
}

/**
 * Default ESM importer used when no platform-specific importer is provided.
 * Uses Node's dynamic import() directly.
 * @param {string} url
 * @returns {Promise<any>}
 */
const defaultImporter = (url) => import(url);

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
 * @param {(url: string) => Promise<any>} [options.importer] - Platform-specific import function (defaults to Node `import()`)
 * @param {boolean} [options.bustCache=false] - Force fresh import
 * @param {Map<string, Function>} [options.cache] - Cache map (defaults to new Map())
 * @param {boolean} [options.returnErrorStub=false] - Return error HTML stub instead of throwing
 * @param {(msg: string) => void} [options.onError] - Optional error callback
 * @param {boolean} [options.isDev=false] - Show detailed error messages when true (safer generic message when false)
 * @returns {Promise<Function>} The resolved SSR render function
 */
export async function loadJsxModule(
    jsxPath,
    { importer = defaultImporter, bustCache = false, cache = new Map(), returnErrorStub = false, onError, isDev = false } = {},
) {
    const modulePath = jsxBundlePath(jsxPath);

    // When busting, drop existing cache entry so a fresh import result will be stored
    if (bustCache) {
        cache.delete(jsxPath);
    }

    const cached = cache.get(jsxPath);
    if (cached) return cached;

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
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (onError) {
            onError(`Failed to load module ${jsxPath}: ${errorMessage}`);
        }
        if (returnErrorStub) {
            const displayMessage = isDev
                ? `Error loading ${escapeHtmlLite(String(jsxPath))}: ${escapeHtmlLite(errorMessage)}`
                : "Failed to load page";
            const stub = () => `<pre style="color:red;">${displayMessage}</pre>`;
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
 * @param {(url: string) => Promise<any>} [options.importer] - Platform-specific import function (defaults to Node `import()`)
 * @param {boolean} [options.bustCache=false] - Force fresh imports
 * @param {Map<string, Function>} options.cache - Shared cache map (required; batch callers must share one across routes)
 * @param {boolean} [options.returnErrorStub=false] - Return error HTML stubs instead of throwing
 * @param {(msg: string) => void} [options.onError] - Optional error callback
 * @param {boolean} [options.isDev=false] - Passed through to loadJsxModule() for error message verbosity
 * @returns {Promise<void>}
 */
export async function loadAllModules(routes, { importer, bustCache = false, cache, returnErrorStub = false, onError, isDev = false }) {
    if (!cache) {
        throw new Error("loadAllModules: cache Map is required");
    }

    // Clear cache if busting
    if (bustCache) {
        cache.clear();
    }

    // Load all modules in parallel
    await Promise.all(
        routes
            .filter((route) => route.jsx)
            .map((route) => loadJsxModule(route.jsx, { importer, bustCache, cache, returnErrorStub, onError, isDev })),
    );
}

async function loadIndividualModules(routes, importer, onError, isDev) {
    /** @type {Record<string, {default?: Function, jsx?: Function}>} */
    const modules = {};
    const cache = new Map();

    for (const route of routes) {
        if (!route.jsx) continue;
        try {
            const fn = await loadJsxModule(route.jsx, {
                importer,
                cache,
                returnErrorStub: false,
                isDev,
            });
            modules[route.jsx] = { default: fn };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (onError) {
                onError(`Failed to load SSR module ${route.jsx}: ${errorMessage}`);
            }
        }
    }

    return modules;
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
 * @param {boolean} [options.isDev=false] - Passed through to loadJsxModule() for error message verbosity
 * @returns {Promise<Record<string, {default?: Function, jsx?: Function}>>} Modules object keyed by jsx path
 */
export async function loadModulesWithFallback({ modulesPath, routes, importer, onWarn, onError, isDev = false }) {
    if (!importer) {
        throw new Error("loadModulesWithFallback: importer function is required");
    }
    if (!routes) {
        throw new Error("loadModulesWithFallback: routes array is required");
    }

    // Try to load from modules.js bundle first
    try {
        const modulesModule = await importer(modulesPath);
        return modulesModule.default || modulesModule;
    } catch {
        // Fall back to loading JSX modules individually
        if (onWarn) {
            onWarn("modules.js not found, falling back to individual module loading");
        }
    }

    return loadIndividualModules(routes, importer, onError, isDev);
}
