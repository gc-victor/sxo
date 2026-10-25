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
            const err = new Error(`Invalid route parameters: ${decodedPathname}`);
            return await handle500(err, isHead, 400);
        }

        const { route: matchedRoute, params: matchedParams } = /** @type {RouteMatchSuccess} */ (found);

        return renderMatchedRoute(request, isHead, decodedPathname, matchedRoute, matchedParams);
    }

    async function renderMatchedRoute(request, isHead, decodedPathname, route, params) {
        try {
            const jsxFn = await loadJsxModule(route.jsx);
            const result = await jsxFn(params, request);
            return await renderPageResult(result, isHead, decodedPathname, route);
        } catch (err) {
            const error = /** @type {Error} */ (err);
            logger.error({ err: error }, "SSR error");
            return handle500(error, isHead);
        }
    }

    function renderPageResult(result, isHead, decodedPathname, route) {
        if (result instanceof Response) {
            return renderResponseResult(result, isHead, decodedPathname, route);
        }

        let page = /** @type {string} */ (result);
        if (typeof page !== "string") {
            page = String(page ?? "");
        }
        return renderMarkupResult(page, isHead, decodedPathname, route);
    }

    function enhanceHtmlPage(page, decodedPathname, route, quote) {
        const normalizedPublicPath = publicPath === "/" ? publicPath : publicPath.replace(/\/$/, "");
        if (route?.assets) {
            page = injectAssets(page, route.assets, normalizedPublicPath);
        }
        const hotReplaceScript = `
            <script type="module">
                import { hotReplace } from "/hot-replace.js";
                hotReplace(${quote}${decodedPathname}${quote});
            </script>
        `;
        return page.replace(/<\/head>/i, `${hotReplaceScript}\n</head>`);
    }

    async function renderResponseResult(result, isHead, decodedPathname, route) {
        const contentType = result.headers.get(HTTP_HEADER_CONTENT_TYPE) || "";
        if (!contentType.includes("text/html")) {
            return result;
        }

        let page = await result.text();
        if (/^<html[\s>]/i.test(page)) {
            page = enhanceHtmlPage(page, decodedPathname, route, '"');
        }

        if (isHead) {
            return new Response(null, { status: result.status, headers: result.headers });
        }
        return new Response(page, { status: result.status, headers: result.headers });
    }

    function renderMarkupResult(page, isHead, decodedPathname, route) {
        const isHtml = /^<html[\s>]/i.test(page);
        if (!isHtml) {
            const headers = { [HTTP_HEADER_CONTENT_TYPE]: MIME_TYPE_HTML_UTF8 };
            return new Response(isHead ? null : page, { status: 200, headers });
        }

        page = enhanceHtmlPage(page, decodedPathname, route, "'");

        const headers = { [HTTP_HEADER_CONTENT_TYPE]: MIME_TYPE_HTML_UTF8 };
        return new Response(isHead ? null : `<!doctype html>\n${page}`, { status: 200, headers });
    }

    function createDefault404Response(isHead) {
        const headers = {
            [HTTP_HEADER_CONTENT_TYPE]: MIME_TYPE_HTML_UTF8,
            [HTTP_HEADER_CACHE_CONTROL]: "public, max-age=0, must-revalidate",
        };
        const body = isHead
            ? null
            : '<html lang="en"><head><meta charset="utf-8"><title>Not Found</title></head><body><h1>Not Found</h1><p>The requested resource was not found.</p></body></html>';
        return new Response(body, { status: 404, headers });
    }

    function createDefault500Response(error, isHead, status) {
        const headers = {
            [HTTP_HEADER_CONTENT_TYPE]: MIME_TYPE_HTML_UTF8,
            [HTTP_HEADER_CACHE_CONTROL]: "no-store",
        };
        return new Response(isHead ? null : renderErrorHtml(error), { status, headers });
    }

    /**
     * Handle 404 response with optional custom page.
     *
     * @param {boolean} isHead - Whether this is a HEAD request
     * @returns {Promise<Response>} 404 response
     */
    async function handle404(isHead) {
        if (!resolve404Page) return createDefault404Response(isHead);

        try {
            const customPath = resolve404Page();
            if (!customPath) return createDefault404Response(isHead);

            const jsxFn = await loadJsxModule(customPath);
            let page = await jsxFn({});
            if (/^<html[\s>]/i.test(page)) {
                const assets = getErrorPageAssets(getRoutes, "404");
                if (assets) page = injectAssets(page, assets, normalizePublicPath(publicPath));
            }

            const headers = {
                [HTTP_HEADER_CONTENT_TYPE]: MIME_TYPE_HTML_UTF8,
                [HTTP_HEADER_CACHE_CONTROL]: "public, max-age=0, must-revalidate",
            };
            return new Response(isHead ? null : `<!doctype html>\n${page}`, { status: 404, headers });
        } catch (err) {
            logger.error({ err: /** @type {Error} */ (err) }, "Failed to render custom 404 page");
        }

        return createDefault404Response(isHead);
    }

    /**
     * Handle error response with optional custom page.
     *
     * @param {Error} err - Error object
     * @param {boolean} isHead - Whether this is a HEAD request
     * @param {number} [status=500] - HTTP status code for the response
     * @returns {Promise<Response>} Error response
     */
    async function handle500(err, isHead, status = 500) {
        if (!resolve500Page) return createDefault500Response(err, isHead, status);

        try {
            const customPath = resolve500Page();
            if (!customPath) return createDefault500Response(err, isHead, status);

            const jsxFn = await loadJsxModule(customPath);
            let page = await jsxFn({});
            if (/^<html[\s>]/i.test(page)) {
                const assets = getErrorPageAssets(getRoutes, "500");
                if (assets) page = injectAssets(page, assets, normalizePublicPath(publicPath));
            }

            const headers = {
                [HTTP_HEADER_CONTENT_TYPE]: MIME_TYPE_HTML_UTF8,
                [HTTP_HEADER_CACHE_CONTROL]: "no-store",
            };
            return new Response(isHead ? null : `<!doctype html>\n${page}`, { status, headers });
        } catch (renderError) {
            logger.error({ err: /** @type {Error} */ (renderError) }, "Failed to render custom 500 page");
        }

        return createDefault500Response(err, isHead, status);
    }

    return {
        handleSSR,
        handle404,
        handle500,
    };
}
