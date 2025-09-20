/**
 * Shared utility to import SSR JSX modules from built server bundles.
 *
 * Features:
 * - Maps a page source path (under PAGES_DIR) to its built server bundle via `jsxBundlePath`.
 * - Optional cache busting (adds a time query to the file URL) for dev hot reload semantics.
 * - Simple in-memory cache of resolved render functions (default Map), overridable per call.
 * - Optional error fallback that returns an HTML <pre> block instead of throwing (useful in dev).
 *
 * Notes:
 * - On success, returns the render function (default export or named `jsx`).
 * - On failure:
 *   - If `returnErrorStub` is true, caches and returns a stub function that renders an error <pre>.
 *   - Otherwise, the error is thrown to the caller.
 *
 * Node >= 20, ESM only.
 */

import { pathToFileURL } from "node:url";
import { jsxBundlePath } from "./jsx-bundle-path.js";

/**
 * Default in-memory cache for loaded JSX render functions.
 * Keyed by the original `jsxPath` value.
 */
export const jsxModuleCache = new Map();

/**
 * Load (and optionally cache-bust) a JSX SSR module and return its render function.
 *
 * @param {string} jsxPath - Source path to the page module (under PAGES_DIR).
 * @param {object} [options]
 * @param {boolean} [options.bustCache=false] - If true, force a fresh ESM import by appending a time query param.
 * @param {Map<string, Function>} [options.cache=jsxModuleCache] - Cache map to use for memoizing render functions.
 * @param {boolean} [options.returnErrorStub=false] - If true, return a stub render function on import/validation error instead of throwing.
 * @returns {Promise<Function>} - The resolved SSR render function.
 */
export async function loadJsxModule(jsxPath, { bustCache = false, cache = jsxModuleCache, returnErrorStub = false } = {}) {
    const modulePath = jsxBundlePath(jsxPath);

    // When busting, drop existing cache entry so a fresh import result will be stored.
    if (bustCache) {
        cache.delete(jsxPath);
    }

    if (cache.has(jsxPath)) {
        return cache.get(jsxPath);
    }

    try {
        const moduleUrl = pathToFileURL(modulePath).href + (bustCache ? `?t=${Date.now()}` : "");
        const mod = await import(moduleUrl);
        const fn = mod.default || mod.jsx;
        if (typeof fn !== "function") {
            throw new Error(`No valid export found in ${modulePath}`);
        }
        cache.set(jsxPath, fn);
        return fn;
    } catch (err) {
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
 * Clear the provided cache (or the default cache).
 * Useful for dev hot reload scenarios.
 *
 * @param {Map<string, Function>} [cache=jsxModuleCache]
 */
export function clearJsxModuleCache(cache = jsxModuleCache) {
    cache.clear();
}

/**
 * Minimal HTML escaper for error stub output.
 * This is intentionally tiny (not a full HTML sanitizer).
 * @param {string} s
 * @returns {string}
 */
function escapeHtmlLite(s) {
    return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
