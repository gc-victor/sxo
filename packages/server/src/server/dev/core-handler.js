/**
 * @fileoverview Platform-agnostic dev server request handler.
 *
 * Orchestrates specialized handlers for SSR, static serving,
 * hot-reload, and error handling. Delegates to
 * focused handler modules for better testability and maintainability.
 *
 * @module server/dev/core-handler
 */

import { executeMiddleware } from "../../shared/middleware-executor.js";
import { decodeURIComponentSafe } from "../../shared/url-validator.js";
import { badRequestResponse, uriTooLongResponse } from "../shared/error-responses.js";
import { optionsResponse } from "../shared/http-adapters.js";
import { HTTP_HEADER_CONTENT_TYPE, HTTP_METHOD_HEAD, HTTP_METHOD_OPTIONS, MIME_TYPE_PLAIN } from "../shared/http-constants.js";
import { injectAssets, normalizePublicPath } from "../utils/inject-assets.js";
import { logger } from "../utils/logger.js";
import { routeMatch } from "../utils/route-match.js";
import { createHotReloadHandler } from "./handlers/hot-reload-handler.js";
import { createSSRHandler } from "./handlers/ssr-handler.js";

/** Maximum URL length to accept */
const MAX_URL_LEN = 2048;

/**
 * @typedef {object} DevHandlerConfig
 * @property {() => Route[]} getRoutes - Routes getter
 * @property {(jsxPath: string, options?: object) => Promise<Function>} loadJsxModule - Module loader
 * @property {string} publicPath - Public path for assets
 * @property {() => string} getEsbuildError - Error message getter
 * @property {string} hotReplaceClientPath - Path to hot-replace client script
 * @property {(path: string) => Promise<string>} readFile - File reader for hot-replace client script
 * @property {() => Function[]} [getMiddleware] - Middleware getter (defaults to empty array)
 * @property {(() => string | null) | null} [resolve404Page] - 404 page resolver (defaults to null)
 * @property {(() => string | null) | null} [resolve500Page] - 500 page resolver (defaults to null)
 */

/**
 * Create a platform-agnostic dev server request handler.
 *
 * Orchestrates specialized handlers for different request types:
 * - Hot-reload SSE endpoint (/hot-replace)
 * - Hot-replace client script (/hot-replace.js)
 * - OPTIONS requests
 * - Middleware execution
 * - Route matching and SSR rendering
 * - Custom 404/500 error pages
 *
 * @param {DevHandlerConfig} config - Handler configuration
 * @returns {(request: Request) => Promise<Response>} Request handler function
 * @throws {Error} If required config properties are missing
 * @public
 */
export function createDevHandler(config) {
    const {
        getRoutes,
        loadJsxModule,
        publicPath,
        getEsbuildError,
        hotReplaceClientPath,
        readFile,
        getMiddleware = () => [],
        resolve404Page = null,
        resolve500Page = null,
    } = config;

    // Validate required config
    if (typeof getRoutes !== "function") {
        throw new Error("getRoutes function is required");
    }
    if (typeof loadJsxModule !== "function") {
        throw new Error("loadJsxModule function is required");
    }

    /** @type {ReturnType<typeof createSSRHandler>} */
    const ssrHandler = createSSRHandler({
        getRoutes,
        loadJsxModule,
        publicPath,
        resolve404Page,
        resolve500Page,
    });

    const hotReloadHandler = createHotReloadHandler({
        getRoutes,
        loadJsxModule,
        getEsbuildError,
        hotReplaceClientPath,
        readFile,
        getMiddleware,
        resolve404Page: resolve404Page || (() => null),
        resolve500Page: resolve500Page || (() => null),
    });

    /**
     * Handle incoming HTTP request.
     *
     * @param {Request} request - Web Standard Request
     * @returns {Promise<Response>} Web Standard Response
     */
    async function handleRequest(request) {
        // Validate URL length
        if (!request.url || request.url.length > MAX_URL_LEN) {
            return uriTooLongResponse(request);
        }

        const url = new URL(request.url);
        const pathname = url.pathname;
        const isHead = request.method === HTTP_METHOD_HEAD;

        if (pathname === "/hot-replace.js" || pathname === "/hot-replace") {
            return await hotReloadHandler.handler(request);
        }

        if (request.method === HTTP_METHOD_OPTIONS) {
            return optionsResponse();
        }

        // Build middleware context with render function
        const middlewareContext = {
            /**
             * Render any page module by source JSX path.
             * @param {string} jsxPath - Source path to the page module
             * @param {Record<string, string>} [params={}] - Route parameters
             * @returns {Promise<string>} Rendered HTML string
             */
            render: async (jsxPath, params = {}) => {
                const fn = await loadJsxModule(jsxPath);
                let html = await fn(params);
                if (typeof html !== "string") {
                    html = String(html ?? "");
                }
                if (/^<html[\s>]/i.test(html)) {
                    const routes = getRoutes();
                    const route = routes.find((r) => r.jsx === jsxPath);
                    if (route?.assets) {
                        html = injectAssets(html, route.assets, normalizePublicPath(publicPath));
                    }
                    html = `<!doctype html>\n${html}`;
                }
                return html;
            },
        };

        try {
            const middlewares = getMiddleware();
            const middlewareResponse = await executeMiddleware(request, middlewares, {}, {}, middlewareContext);
            if (middlewareResponse) {
                if (isHead) {
                    return new Response(null, {
                        status: middlewareResponse.status,
                        headers: middlewareResponse.headers,
                    });
                }
                return middlewareResponse;
            }
        } catch (err) {
            logger.error({ err: /** @type {Error} */ (err), url: request.url }, "Middleware execution failed");
            return new Response("Internal Server Error", {
                status: 500,
                headers: { [HTTP_HEADER_CONTENT_TYPE]: MIME_TYPE_PLAIN },
            });
        }

        let decodedPathname;
        try {
            decodedPathname = decodeURIComponentSafe(pathname);
        } catch {
            return badRequestResponse(request, { message: "Failed to parse URL" });
        }

        const routes = getRoutes();
        const found = routeMatch(decodedPathname, routes);

        if (!found) {
            return await ssrHandler.handle404(isHead);
        }

        if ("invalid" in found && found.invalid) {
            return new Response("Invalid parameters", {
                status: 400,
                headers: { [HTTP_HEADER_CONTENT_TYPE]: MIME_TYPE_PLAIN },
            });
        }

        const { route, params } = /** @type {{route: Route, params: Record<string, string>}} */ (found);
        return await ssrHandler.handleSSR(request, isHead, route, params);
    }

    // Attach utility methods to handler for adapter use
    handleRequest.broadcastReload = hotReloadHandler.broadcastReload;
    handleRequest.getClientCount = hotReloadHandler.getClientCount;

    return handleRequest;
}
