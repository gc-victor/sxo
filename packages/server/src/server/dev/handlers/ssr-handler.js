/**
 * @fileoverview Dev server SSR request handler.
 *
 * Handles server-side rendering for dev server including
 * route matching, module loading, CSS injection, hot-reload
 * script injection, and error handling (404/500).
 *
 * @module server/dev/handlers/ssr-handler
 */

import { decodeURIComponentSafe } from "../../../shared/url-validator.js";
import { badRequestResponse } from "../../shared/error-responses.js";
import { HTTP_HEADER_CACHE_CONTROL, HTTP_HEADER_CONTENT_TYPE, MIME_TYPE_HTML_UTF8 } from "../../shared/http-constants.js";
import { getErrorPageAssets } from "../../utils/error-page-assets.js";
import { renderErrorHtml } from "../../utils/html-utils.js";
import { injectAssets, normalizePublicPath } from "../../utils/inject-assets.js";
import { logger } from "../../utils/logger.js";
import { routeMatch } from "../../utils/route-match.js";

/**
 * @typedef {{route: Route, params: Record<string, string>} | {invalid: true}} RouteMatch
 */

/**
 * @typedef {object} RouteMatchSuccess
 * @property {Route} route - Matched route
 * @property {Record<string, string>} params - Route parameters
 */

/**
 * @typedef {object} SSRHandlerConfig
 * @property {() => Route[]} getRoutes - Routes getter
 * @property {(jsxPath: string, options?: object) => Promise<Function>} loadJsxModule - Module loader
 * @property {string} publicPath - Public path for assets
 * @property {(() => string | null) | null} [resolve404Page] - 404 page resolver (returns source path or null)
 * @property {(() => string | null) | null} [resolve500Page] - 500 page resolver (returns source path or null)
 */

/**
 * Create an SSR handler for dev server.
 *
 * @param {SSRHandlerConfig} config - Handler configuration
 * @returns {{ handleSSR: (request: Request, isHead: boolean, route?: Route, params?: Record<string, string>) => Promise<Response>, handle404: (isHead: boolean) => Promise<Response>, handle500: (err: Error, isHead: boolean) => Promise<Response> }} SSR request handler
 * @throws {Error} If required config properties are missing
 * @public
 */
export function createSSRHandler(config) {
    const { getRoutes, loadJsxModule, publicPath, resolve404Page, resolve500Page } = config;

    /**
     * Handle SSR request with optional HEAD method.
     *
     * @param {Request} request - Incoming request
     * @param {boolean} isHead - Whether this is a HEAD request
     * @param {Route} [route] - Pre-matched route (optional, skips internal routeMatch if provided)
     * @param {Record<string, string>} [params] - Pre-matched route params (optional, defaults to empty object if route provided)
     * @returns {Promise<Response>} SSR response or error response
     */
    async function handleSSR(request, isHead, route, params) {
        const url = new URL(request.url);
        let decodedPathname;
        try {
            decodedPathname = decodeURIComponentSafe(url.pathname);
        } catch {
            return badRequestResponse(request, { message: "Failed to parse URL" });
        }

        // Use pre-matched route if provided, otherwise match route internally
        let found;
        if (route) {
            found = { route, params: params || {} };
        } else {
            const routes = getRoutes();
            found = routeMatch(decodedPathname, routes);
        }

        // --- 404 handling ---
        if (!found) {
            return await handle404(isHead);
        }

        // --- Invalid slug ---
        if ("invalid" in found && found.invalid) {
            return new Response("Invalid parameters", {
                status: 400,
                headers: { [HTTP_HEADER_CONTENT_TYPE]: "text/plain" },
            });
        }

        const { route: matchedRoute, params: matchedParams } = /** @type {RouteMatchSuccess} */ (found);

        // --- SSR rendering ---
        try {
            const jsxFn = await loadJsxModule(matchedRoute.jsx);
            const result = await jsxFn(matchedParams, request);

            // If the page function returns a Response, handle it
            if (result instanceof Response) {
                // For HTML responses, inject CSS and hot-reload script
                const contentType = result.headers.get(HTTP_HEADER_CONTENT_TYPE) || "";
                if (contentType.includes("text/html")) {
                    let page = await result.text();
                    if (/^<html[\s>]/i.test(page)) {
                        const normalizedPublicPath = (() => {
                            if (publicPath === "/") return publicPath;
                            return publicPath.replace(/\/$/, "");
                        })();
                        if (matchedRoute?.assets) {
                            page = injectAssets(page, matchedRoute.assets, normalizedPublicPath);
                        }
                        const hotReplaceScript = `
            <script type="module">
                import { hotReplace } from "/hot-replace.js";
                hotReplace("${decodedPathname}");
            </script>
        `;
                        page = page.replace(/<\/head>/i, `${hotReplaceScript}\n</head>`);
                    }
                    if (isHead) {
                        return new Response(null, { status: result.status, headers: result.headers });
                    }
                    return new Response(page, { status: result.status, headers: result.headers });
                }
                return result;
            }

            let page = /** @type {string} */ (result);
            // Coerce to string in case render function returns non-string (number, null, etc.)
            if (typeof page !== "string") {
                page = String(page ?? "");
            }

            const isHtml = /^<html[\s>]/i.test(page);
            if (!isHtml) {
                const headers = { [HTTP_HEADER_CONTENT_TYPE]: MIME_TYPE_HTML_UTF8 };
                if (isHead) {
                    return new Response(null, { status: 200, headers });
                }
                return new Response(page, { status: 200, headers });
            }

            // Inject built CSS assets
            const normalizedPublicPath = (() => {
                if (publicPath === "/") return publicPath;
                return publicPath.replace(/\/$/, "");
            })();

            if (matchedRoute?.assets && isHtml) {
                page = injectAssets(page, matchedRoute.assets, normalizedPublicPath);
            }

            // Inject hot-reload script before </head>
            const hotReplaceScript = `
            <script type="module">
                import { hotReplace } from "/hot-replace.js";
                hotReplace('${decodedPathname}');
            </script>
        `;
            page = page.replace(/<\/head>/i, `${hotReplaceScript}\n</head>`);

            const headers = { [HTTP_HEADER_CONTENT_TYPE]: MIME_TYPE_HTML_UTF8 };
            if (isHead) {
                return new Response(null, { status: 200, headers });
            }
            return new Response(`<!doctype html>\n${page}`, { status: 200, headers });
        } catch (err) {
            const error = /** @type {Error} */ (err);
            logger.error({ err: error }, "SSR error");
            return await handle500(error, isHead);
        }
    }

    /**
     * Handle 404 response with optional custom page.
     *
     * @param {boolean} isHead - Whether this is a HEAD request
     * @returns {Promise<Response>} 404 response
     */
    async function handle404(isHead) {
        // Try to resolve and render custom 404 page
        if (resolve404Page) {
            try {
                const customPath = resolve404Page();
                if (customPath) {
                    const jsxFn = await loadJsxModule(customPath);
                    let page = await jsxFn({});
                    const isHtml = /^<html[\s>]/i.test(page);
                    if (isHtml) {
                        const assets = getErrorPageAssets(getRoutes, "404");
                        if (assets) {
                            page = injectAssets(page, assets, normalizePublicPath(publicPath));
                        }
                    }
                    const headers = {
                        [HTTP_HEADER_CONTENT_TYPE]: MIME_TYPE_HTML_UTF8,
                        [HTTP_HEADER_CACHE_CONTROL]: "public, max-age=0, must-revalidate",
                    };
                    if (isHead) {
                        return new Response(null, { status: 404, headers });
                    }
                    return new Response(`<!doctype html>\n${page}`, { status: 404, headers });
                }
            } catch (err) {
                logger.error({ err: /** @type {Error} */ (err) }, "Failed to render custom 404 page");
                // Fall back to plain text 404 on error
            }
        }

        // Default plain text 404
        const headers = { [HTTP_HEADER_CONTENT_TYPE]: "text/plain" };
        if (isHead) {
            return new Response(null, { status: 404, headers });
        }
        return new Response("Not found", { status: 404, headers });
    }

    /**
     * Handle 500 response with optional custom page.
     *
     * @param {Error} err - Error object
     * @param {boolean} isHead - Whether this is a HEAD request
     * @returns {Promise<Response>} 500 response
     */
    async function handle500(err, isHead) {
        // Try to resolve and render custom 500 page
        if (resolve500Page) {
            try {
                const customPath = resolve500Page();
                if (customPath) {
                    const jsxFn = await loadJsxModule(customPath);
                    let page = await jsxFn({});
                    const isHtml = /^<html[\s>]/i.test(page);
                    if (isHtml) {
                        const assets = getErrorPageAssets(getRoutes, "500");
                        if (assets) {
                            page = injectAssets(page, assets, normalizePublicPath(publicPath));
                        }
                    }
                    const headers = {
                        [HTTP_HEADER_CONTENT_TYPE]: MIME_TYPE_HTML_UTF8,
                        [HTTP_HEADER_CACHE_CONTROL]: "no-store",
                    };
                    if (isHead) {
                        return new Response(null, { status: 500, headers });
                    }
                    return new Response(`<!doctype html>\n${page}`, { status: 500, headers });
                }
            } catch (renderErr) {
                logger.error({ err: /** @type {Error} */ (renderErr) }, "Failed to render custom 500 page");
                // Fall back to error HTML on error
            }
        }

        // Default error HTML 500
        const headers = {
            [HTTP_HEADER_CONTENT_TYPE]: MIME_TYPE_HTML_UTF8,
            [HTTP_HEADER_CACHE_CONTROL]: "no-store",
        };
        if (isHead) {
            return new Response(null, { status: 500, headers });
        }
        return new Response(renderErrorHtml(err), { status: 500, headers });
    }

    return {
        handleSSR,
        handle404,
        handle500,
    };
}
