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

function hasAssets(assets) {
    return assets && ((Array.isArray(assets.css) && assets.css.length > 0) || (Array.isArray(assets.js) && assets.js.length > 0));
}

function copyAssets(assets) {
    return {
        css: [...assets.css],
        js: assets.js ? [...assets.js] : [],
    };
}

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
        const errorPage = routes.find(
            (route) => route.isErrorPage && new RegExp(`/${pageName}/`, "i").test(route.jsx) && hasAssets(route.assets),
        );
        if (errorPage) return copyAssets(errorPage.assets);

        // Fall back to first regular route's assets (backward compat for flat file error pages)
        const fallbackRoute = routes.find((route) => !route.isErrorPage && hasAssets(route.assets));
        return fallbackRoute ? copyAssets(fallbackRoute.assets) : null;
    } catch {
        // Routes not yet available (early startup) — skip asset injection
        return null;
    }
}
