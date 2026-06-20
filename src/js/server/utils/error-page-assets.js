/**
 * @fileoverview Shared error page asset extraction for route manifests.
 *
 * Extracts CSS/JS assets for custom error pages (404/500) from the route manifest.
 * Error pages with an `isErrorPage` flag and matching name have their own
 * assets computed by the metafile plugin. Falls back to the first regular
 * route's assets if no error-page-specific assets are found.
 *
 * @module server/utils/error-page-assets
 */

/**
 * Extract CSS/JS assets for a specific error page from the route manifest.
 *
 * @param {() => Route[]} getRoutes - Routes getter function
 * @param {"404" | "500"} pageName - Error page name to look up
 * @returns {{ css?: string[], js?: string[] } | null} Assets or null if none found
 */
export function getErrorPageAssets(getRoutes, pageName) {
    try {
        const routes = getRoutes();
        // Try error-page-specific assets first (folder-based error pages with client entries)
        for (const route of routes) {
            if (
                route.isErrorPage &&
                new RegExp(`/${pageName}/`, "i").test(route.jsx) &&
                route.assets &&
                ((Array.isArray(route.assets.css) && route.assets.css.length > 0) ||
                    (Array.isArray(route.assets.js) && route.assets.js.length > 0))
            ) {
                return {
                    css: [...route.assets.css],
                    js: route.assets.js ? [...route.assets.js] : [],
                };
            }
        }
        // Fall back to first regular route's assets (backward compat for flat file error pages)
        for (const route of routes) {
            if (
                !route.isErrorPage &&
                route.assets &&
                ((Array.isArray(route.assets.css) && route.assets.css.length > 0) ||
                    (Array.isArray(route.assets.js) && route.assets.js.length > 0))
            ) {
                return {
                    css: [...route.assets.css],
                    js: route.assets.js ? [...route.assets.js] : [],
                };
            }
        }
    } catch {
        // Routes not yet available (early startup) — skip asset injection
    }
    return null;
}
