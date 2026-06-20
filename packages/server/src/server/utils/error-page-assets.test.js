/**
 * @fileoverview Tests for shared error page asset extraction utility.
 *
 * @module server/utils/error-page-assets.test
 */

import { deepStrictEqual, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { getErrorPageAssets } from "./error-page-assets.js";

/**
 * Helper to create a minimal route fixture.
 * @param {object} overrides
 * @returns {Route}
 */
function createRoute(overrides = {}) {
    return {
        filename: "index.html",
        entryPoints: [],
        jsx: "pages/index.jsx",
        scriptLoading: "module",
        hash: false,
        ...overrides,
    };
}

describe("getErrorPageAssets", () => {
    it("returns null when getRoutes throws", () => {
        const result = getErrorPageAssets(() => {
            throw new Error("routes not ready");
        }, "404");
        strictEqual(result, null);
    });

    it("returns null when routes array is empty", () => {
        const result = getErrorPageAssets(() => [], "404");
        strictEqual(result, null);
    });

    it("returns null when no route has any assets", () => {
        const routes = [createRoute({ jsx: "pages/index.jsx" }), createRoute({ jsx: "pages/about.jsx" })];
        const result = getErrorPageAssets(() => routes, "404");
        strictEqual(result, null);
    });

    it("returns error-page-specific CSS/JS when isErrorPage matches", () => {
        const routes = [
            createRoute({
                jsx: "pages/404/index.tsx",
                isErrorPage: true,
                assets: { css: ["404/style.css"], js: ["404/script.js"] },
            }),
        ];
        const result = getErrorPageAssets(() => routes, "404");
        deepStrictEqual(result, {
            css: ["404/style.css"],
            js: ["404/script.js"],
        });
    });

    it("returns error-page-specific js when page has js only and no css", () => {
        const routes = [
            createRoute({
                jsx: "pages/500/index.tsx",
                isErrorPage: true,
                assets: { css: [], js: ["500/script.js"] },
            }),
        ];
        const result = getErrorPageAssets(() => routes, "500");
        deepStrictEqual(result, {
            css: [],
            js: ["500/script.js"],
        });
    });

    it("prefers error-page-specific assets over fallback", () => {
        const routes = [
            // Error page with its own assets
            createRoute({
                filename: "404/index.html",
                jsx: "pages/404/index.tsx",
                isErrorPage: true,
                assets: { css: ["404/style.css"], js: ["404/script.js"] },
            }),
            // Regular route with different assets
            createRoute({
                jsx: "pages/index.jsx",
                assets: { css: ["style.css"], js: ["main.js"] },
            }),
        ];
        const result = getErrorPageAssets(() => routes, "404");
        deepStrictEqual(result, {
            css: ["404/style.css"],
            js: ["404/script.js"],
        });
    });

    it("falls back to first regular route's assets when no error page match", () => {
        const routes = [
            // A generated route with no assets
            createRoute({
                jsx: "pages/generated.jsx",
                generated: true,
            }),
            // First regular route with assets
            createRoute({
                jsx: "pages/index.jsx",
                assets: { css: ["style.css"], js: ["main.js"] },
            }),
            // Another regular route
            createRoute({
                jsx: "pages/about.jsx",
                assets: { css: ["about.css"] },
            }),
        ];
        const result = getErrorPageAssets(() => routes, "500");
        deepStrictEqual(result, {
            css: ["style.css"],
            js: ["main.js"],
        });
    });

    it("skips error page that has empty css and empty js arrays", () => {
        const routes = [
            createRoute({
                jsx: "pages/404/index.tsx",
                isErrorPage: true,
                assets: { css: [], js: [] },
            }),
            createRoute({
                jsx: "pages/index.jsx",
                assets: { css: ["style.css"], js: ["main.js"] },
            }),
        ];
        const result = getErrorPageAssets(() => routes, "404");
        // Should have skipped error page (empty css) and fallen back
        deepStrictEqual(result, {
            css: ["style.css"],
            js: ["main.js"],
        });
    });

    it("uses case-insensitive jsx path matching", () => {
        const routes = [
            createRoute({
                jsx: "PAGES/404/Index.TSX",
                isErrorPage: true,
                assets: { css: ["404/style.css"] },
            }),
        ];
        const result = getErrorPageAssets(() => routes, "404");
        deepStrictEqual(result, {
            css: ["404/style.css"],
            js: [],
        });
    });
});
