/**
 * @fileoverview Production core handler for SXO SSR runtime.
 *
 * This module provides shared request handling logic for production servers.
 * It handles:
 * - Route matching and SSR rendering
 * - Asset injection (CSS/JS)
 * - Custom 404/500 error pages
 * - URL validation and decoding
 * - Generated route detection
 * - Web Standard middleware execution
 *
 * Platform-specific adapters handle:
 * - HTTP server creation
 * - Static file serving
 * - Module/route loading
 * - Logging
 *
 * @module server/prod/core-handler
 */

import { executeMiddleware } from "../../shared/middleware-executor.js";
import { decodeURIComponentSafe } from "../../shared/url-validator.js";
import { badRequestResponse, send400, send404, send500, uriTooLongResponse } from "../shared/error-responses.js";
import { optionsResponse } from "../shared/http-adapters.js";
import {
    HTTP_HEADER_CACHE_CONTROL,
    HTTP_HEADER_CONTENT_TYPE,
    HTTP_METHOD_HEAD,
    HTTP_METHOD_OPTIONS,
    MIME_TYPE_HTML_UTF8,
} from "../shared/http-constants.js";
import { createMiddlewareContext } from "../shared/middleware-context.js";
import { resolveSafePath } from "../shared/path.js";
import { withSecurityHeaders } from "../shared/security-headers.js";
import { getErrorPageAssets } from "../utils/error-page-assets.js";
import { normalizePublicPath } from "../utils/inject-assets.js";
import { logger } from "../utils/logger.js";
import { routeMatch } from "../utils/route-match.js";
import { executeSSR, handleSSRError } from "./ssr-executor.js";

/** Maximum URL length to accept */
const MAX_URL_LEN = 2048;

/**
 * Middleware context providing access to SSR rendering.
 * @typedef {object} MiddlewareContext
 * @property {(jsxPath: string, params?: Record<string, string>) => Promise<string>} render
 * Render a page module by source JSX path and return HTML string.
 */

/**
 * Middleware function signature for Web Standard APIs.
 * @typedef {(request: Request, env?: object, context?: MiddlewareContext) => Response | void | Promise<Response | void>} Middleware
 */

/**
 * Configuration for createProdHandler.
 * @typedef {object} ProdHandlerConfig
 * @property {() => Route[]} getRoutes - Function returning route manifest
 * @property {Record<string, { default?: Function, jsx?: Function }>} modules - Map of jsx paths to module objects
 * @property {string} [publicPath="/"] - Public path prefix for assets
 * @property {() => Middleware[]} [getMiddleware] - Function returning middleware array
 * @property {Function | null} [render404=null] - Custom 404 render function
 * @property {Function | null} [render500=null] - Custom 500 render function
 * @property {Record<string, string> | null} [securityHeaders=null] - Custom security headers (overrides defaults)
 * @property {boolean} [allowMiddlewareSecurityOverride=false] - Allow middleware to override protected security headers
 */

/**
 * Result types for handleRequest - discriminated union.
 * @typedef {{ type: "response", response: Response } | { type: "generated", route: Route, params: Record<string, string> }} HandlerResult
 */

/**
 * Validate URL length and return error response if too long.
 * @param {Request} request
 * @param {Record<string, string> | null} securityHeaders
 * @returns {Response | null} Error response or null if valid
 */
function validateUrlLength(request, securityHeaders) {
    if (!request.url || request.url.length > MAX_URL_LEN) {
        return uriTooLongResponse(request, { securityHeaders });
    }
    return null;
}

/**
 * Execute middleware and return response if middleware handles request.
 * @param {Request} request
 * @param {object} env
 * @param {() => Middleware[]} getMiddleware
 * @param {Record<string, string> | null} securityHeaders
 * @param {boolean} allowMiddlewareSecurityOverride
 * @returns {Promise<Response | null>}
 */
async function runMiddleware(request, env, getMiddleware, securityHeaders, allowMiddlewareSecurityOverride, context = {}) {
    const middlewares = getMiddleware();
    return await executeMiddleware(
        request,
        middlewares,
        env,
        {
            securityHeaders,
            allowOverride: allowMiddlewareSecurityOverride,
        },
        context,
    );
}

/**
 * Handle middleware errors with 500 response.
 * @param {Error} error
 * @param {Request} request
 * @param {Record<string, string> | null} securityHeaders
 * @returns {Promise<Response>}
 */
async function handleMiddlewareError(error, request, securityHeaders) {
    logger.error({ err: error, url: request.url }, "Middleware execution failed");
    return send500(request, { securityHeaders });
}

/**
 * Decode pathname safely and return error response on failure.
 * @param {string} pathname
 * @param {Request} request
 * @param {Record<string, string> | null} securityHeaders
 * @returns {{ success: true, pathname: string } | { success: false, response: Response }}
 */
function decodePathnameSafe(pathname, request, securityHeaders) {
    try {
        const decoded = decodeURIComponentSafe(pathname);
        return { success: true, pathname: decoded };
    } catch (error) {
        logger.warn({ err: error }, "Bad Request: failed to parse URL");
        const response = badRequestResponse(request, { message: "Failed to parse URL", securityHeaders });
        return { success: false, response };
    }
}

/**
 * Handle route not found (404).
 * @param {Request} request
 * @param {Function | null} render404
 * @param {Record<string, string> | null} securityHeaders
 * @param {{ css?: string[], js?: string[] } | null} assets
 * @param {string} publicPath
 * @returns {Promise<Response>}
 */
async function handleRouteNotFound(request, render404, securityHeaders, assets, publicPath) {
    return send404(request, {
        renderCustom404: render404 !== null,
        render404Fn: render404,
        securityHeaders,
        assets,
        publicPath,
    });
}

/**
 * Render error page for invalid route parameters.
 *
 * Delegates to the shared `send400` builder: when a custom 500 renderer is
 * available it is rendered with status 400, otherwise a static HTML 400 page
 * is returned.
 *
 * @param {Request} request
 * @param {Function | null} render500
 * @param {Record<string, string> | null} securityHeaders
 * @param {{ css?: string[], js?: string[] } | null} assets
 * @param {string} publicPath
 * @returns {Promise<Response>}
 */
async function renderInvalidParamsPage(request, render500, securityHeaders, assets, publicPath) {
    logger.warn(
        { method: request.method, url: request.url, pathname: new URL(request.url).pathname },
        "Bad Request: invalid route parameters",
    );
    return send400(request, {
        renderFn: render500,
        securityHeaders,
        assets,
        publicPath,
    });
}

/**
 * Handle SSR with error handling.
 * @param {Route} route
 * @param {Record<string, string>} params
 * @param {Record<string, { default?: Function, jsx?: Function }>} modules
 * @param {string} normalizedPublicPath
 * @param {boolean} isHead
 * @param {Record<string, string> | null} securityHeaders
 * @param {Function | null} render500
 * @param {Request} request
 * @param {{ css?: string[], js?: string[] } | null} errorPageAssets
 * @param {string} publicPath
 * @returns {Promise<HandlerResult>}
 */
async function handleSSRWithErrorHandling(
    route,
    params,
    modules,
    normalizedPublicPath,
    isHead,
    securityHeaders,
    render500,
    request,
    errorPageAssets,
    publicPath,
) {
    try {
        const result = await executeSSR(route, params, modules, normalizedPublicPath, isHead, securityHeaders, request);
        return { type: "response", response: result.response };
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        return handleSSRError(err, request, {
            renderCustom500: render500 !== null,
            render500Fn: render500,
            send500,
            securityHeaders,
            assets: errorPageAssets,
            publicPath,
        });
    }
}

/**
 * Options for handleRequest.
 * @typedef {object} HandleRequestOptions
 * @property {string} [decodedPathname] - Pre-decoded pathname
 * @property {boolean} [skipMiddleware] - Skip middleware execution
 */

/**
 * Create a production request handler.
 *
 * Returns a handler function that processes requests and returns either:
 * - A Response object for SSR/error responses
 * - A signal indicating the route is generated (adapter serves pre-rendered HTML)
 *
 * @param {ProdHandlerConfig} config - Handler configuration
 * @returns {{ handleRequest: (request: Request, env?: object, options?: HandleRequestOptions) => Promise<HandlerResult>, send404: (request: Request) => Promise<Response>, send500: (request: Request) => Promise<Response> }}
 */
export function createProdHandler(config) {
    const {
        getRoutes,
        modules,
        publicPath = "/",
        getMiddleware = () => [],
        render404 = null,
        render500 = null,
        securityHeaders = null,
        allowMiddlewareSecurityOverride = false,
    } = config;

    const normalizedPublicPath = normalizePublicPath(publicPath);
    const errorPageAssets404 = getErrorPageAssets(getRoutes, "404");
    const errorPageAssets500 = getErrorPageAssets(getRoutes, "500");

    const middlewareContext = createMiddlewareContext({
        modules,
        getRoutes,
        getPublicPath: () => normalizedPublicPath,
    });

    /**
     * Handle an incoming HTTP request.
     * @param {Request} request - Incoming request
     * @param {object} [env={}] - Platform-specific environment bindings
     * @param {HandleRequestOptions} [options={}] - Additional options
     * @returns {Promise<HandlerResult>} Result object
     */
    async function handleRequest(request, env = {}, options = {}) {
        const url = new URL(request.url);
        const pathname = options.decodedPathname || url.pathname;
        const isHead = request.method === HTTP_METHOD_HEAD;

        // Validate URL length
        const urlError = validateUrlLength(request, securityHeaders);
        if (urlError) {
            return { type: "response", response: urlError };
        }

        // Execute middleware
        if (!options.skipMiddleware) {
            try {
                const middlewareResponse = await runMiddleware(
                    request,
                    env,
                    getMiddleware,
                    securityHeaders,
                    allowMiddlewareSecurityOverride,
                    middlewareContext,
                );
                if (middlewareResponse) {
                    return { type: "response", response: middlewareResponse };
                }
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                const response = await handleMiddlewareError(err, request, securityHeaders);
                return { type: "response", response };
            }
        }

        // Handle OPTIONS preflight
        if (request.method === HTTP_METHOD_OPTIONS) {
            return { type: "response", response: optionsResponse() };
        }

        // Decode pathname
        const decodeResult = decodePathnameSafe(pathname, request, securityHeaders);
        if (!decodeResult.success) {
            return { type: "response", response: decodeResult.response };
        }

        const decodedPathname = decodeResult.pathname;

        // Match route
        const routes = getRoutes();
        const match = routeMatch(decodedPathname, routes);

        // No match -> 404
        if (!match) {
            const response = await handleRouteNotFound(request, render404, securityHeaders, errorPageAssets404, publicPath);
            return { type: "response", response };
        }

        // Invalid slug -> 400
        if ("invalid" in match) {
            const response = await renderInvalidParamsPage(request, render500, securityHeaders, errorPageAssets500, publicPath);
            return { type: "response", response };
        }

        const { route, params } = /** @type {{ route: any, params: Record<string, string> }} */ (match);

        // Generated routes -> return for adapter to serve
        if (route.generated) {
            return { type: "generated", route, params };
        }

        // SSR rendering
        return handleSSRWithErrorHandling(
            route,
            params,
            modules,
            normalizedPublicPath,
            isHead,
            securityHeaders,
            render500,
            request,
            errorPageAssets500,
            publicPath,
        );
    }

    return {
        handleRequest,
        send404: (request, opts) =>
            send404(request, {
                renderCustom404: render404 !== null,
                render404Fn: render404,
                securityHeaders,
                assets: errorPageAssets404,
                publicPath,
                ...opts,
            }),
        send500: (request, opts) =>
            send500(request, {
                renderCustom500: render500 !== null,
                render500Fn: render500,
                securityHeaders,
                assets: errorPageAssets500,
                publicPath,
                ...opts,
            }),
    };
}

/**
 * Create a handler for serving pre-rendered (generated) routes.
 *
 * @param {object} options
 * @param {string} options.staticDir - Base directory for generated HTML files
 * @param {{ readText: (path: string) => Promise<string | null> }} options.fileReader - File reader with readText method
 * @param {Record<string, string> | null} [options.securityHeaders] - Custom security headers (overrides defaults)
 * @returns {(route: Route, request: Request) => Promise<Response | null>} Handler function
 *
 * @example
 * ```javascript
 * const serveGenerated = createGeneratedRouteHandler({
 *     staticDir: OUTPUT_DIR_CLIENT,
 *     fileReader: createFileReader(),
 *     securityHeaders: null,
 * });
 *
 * const result = await handleRequest(request);
 * if (result.type === "generated") {
 *     const response = await serveGenerated(result.route, request);
 *     if (response) return response;
 * }
 * ```
 */
export function createGeneratedRouteHandler({ staticDir, fileReader, securityHeaders = null }) {
    return async function serveGeneratedRoute(route, request) {
        const htmlPath = resolveSafePath(staticDir, route.filename);
        if (htmlPath === null) {
            return null;
        }
        const html = await fileReader.readText(htmlPath);

        if (html === null) {
            return null;
        }

        const headers = withSecurityHeaders(
            {
                [HTTP_HEADER_CONTENT_TYPE]: MIME_TYPE_HTML_UTF8,
                [HTTP_HEADER_CACHE_CONTROL]: "public, max-age=300",
            },
            securityHeaders ?? undefined,
        );

        if (request.method === "HEAD") {
            return new Response(null, { status: 200, headers });
        }

        return new Response(html, { status: 200, headers });
    };
}

/**
 * Configuration for createFetchHandler.
 * @typedef {object} FetchHandlerConfig
 * @property {(request: Request) => Promise<Response | null>} handleStaticRequest
 * @property {(request: Request, env?: object, options?: object) => Promise<HandlerResult>} handleRequest
 * @property {(route: Route, request: Request) => Promise<Response | null>} serveGeneratedRoute
 * @property {(request: Request, options?: object) => Promise<Response>} send404
 * @property {(request: Request, options?: object) => Promise<Response>} send500
 */

/**
 * Create a unified fetch handler for Web Standard APIs (Bun/Deno).
 *
 * @param {FetchHandlerConfig} config - Handler configuration
 * @returns {(request: Request) => Promise<Response>} Unified fetch handler
 *
 * @example
 * ```javascript
 * const handleFetch = createFetchHandler({
 *     handleStaticRequest,
 *     handleRequest,
 *     serveGeneratedRoute,
 *     send404,
 *     send500,
 * });
 *
 * Bun.serve({ port: PORT, fetch: handleFetch });
 * ```
 */
export function createFetchHandler(config) {
    const { handleStaticRequest, handleRequest, serveGeneratedRoute, send404, send500 } = config;

    return async function handleFetch(request) {
        try {
            // Try static files first
            const staticResponse = await handleStaticRequest(request);
            if (staticResponse) {
                return staticResponse;
            }

            // Handle dynamic routes
            const result = await handleRequest(request);

            if (result.type === "response") {
                return result.response;
            }

            // Handle generated routes
            if (result.type === "generated") {
                const generatedResponse = await serveGeneratedRoute(result.route, request);
                if (generatedResponse) {
                    return generatedResponse;
                }

                logger.warn({ route: result.route?.filename }, "Generated route file missing on disk, returning 404");
                return await send404(request);
            }
        } catch (error) {
            logger.error({ err: error }, "Request handling failed");
        }

        return await send500(request);
    };
}
