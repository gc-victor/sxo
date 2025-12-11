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
 * - Static file serving (precompression, ETag, caching)
 * - Module/route loading
 * - Logging
 * - Graceful shutdown
 *
 * @module server/prod/core-handler
 */

import { CACHE_404, CACHE_500, CACHE_GENERATED, CACHE_SSR } from "../shared/cache.js";
import { optionsResponse } from "../shared/http-adapters.js";
import { HTTP_METHOD_HEAD, HTTP_STATUS_NOT_FOUND, HTTP_STATUS_OK, HTTP_STATUS_SERVER_ERROR } from "../shared/http-constants.js";
import { withSecurityHeaders } from "../shared/security-headers.js";
import { injectAssets, normalizePublicPath } from "../utils/inject-assets.js";
import { routeMatch } from "../utils/route-match.js";

/** Maximum URL length to accept */
const MAX_URL_LEN = 2048;

/**
 * Middleware function signature for Web Standard APIs.
 * @typedef {(request: Request, env?: object) => Response | void | Promise<Response | void>} Middleware
 */

/**
 * Route entry from manifest.
 * @typedef {object} Route
 * @property {string} filename - Output filename (e.g., "index.html")
 * @property {string} jsx - Source JSX path
 * @property {string} [path] - Route path pattern
 * @property {boolean} [generated] - Whether route is pre-rendered
 * @property {{ css?: string[], js?: string[] }} [assets] - Built assets
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
 * @property {object} [logger=console] - Logger instance
 * @property {Record<string, string>} [securityHeaders=null] - Custom security headers (overrides defaults)
 */

/**
 * Result type for handleRequest.
 * @typedef {object} HandlerResult
 * @property {"response" | "generated" | "static"} type - Result type
 * @property {Response} [response] - Response for "response" type
 * @property {Route} [route] - Route for "generated" type
 * @property {object} [params] - Route params for "generated" type
 */

/**
 * Create a production request handler.
 *
 * Returns a handler function that processes requests and returns either:
 * - A Response object for SSR/error responses
 * - A signal indicating the route is generated (adapter serves pre-rendered HTML)
 *
 * @param {ProdHandlerConfig} config - Handler configuration
 * @returns {{ handleRequest: (request: Request, env?: object) => Promise<Response>, send404: (request: Request) => Promise<Response>, send500: (request: Request) => Promise<Response> }}
 */
export function createProdHandler(config) {
    const {
        getRoutes,
        modules,
        publicPath = "/",
        getMiddleware = () => [],
        render404 = null,
        render500 = null,
        logger = console,
        securityHeaders = null,
    } = config;

    // Normalize public path once at creation time
    const normalizedPublicPath = normalizePublicPath(publicPath);

    /**
     * Execute Web Standard middleware chain.
     *
     * @param {Request} request
     * @param {object} env
     * @returns {Promise<Response | null>}
     */
    async function executeMiddleware(request, env = {}) {
        const middlewares = getMiddleware();
        if (!middlewares.length) return null;

        for (const mw of middlewares) {
            if (typeof mw !== "function") continue;

            try {
                const result = await mw(request, env);
                if (result instanceof Response) {
                    return result;
                }
            } catch (err) {
                logger.error?.({ err }, "Middleware error") ?? logger.error?.("Middleware error:", err);
                // Continue to next middleware on error
            }
        }

        return null;
    }

    /**
     * Send 404 response with custom error page if available.
     *
     * @param {Request} request
     * @returns {Promise<Response>}
     */
    async function send404(request) {
        const isHead = request.method === HTTP_METHOD_HEAD;

        if (render404) {
            try {
                const page404 = await render404({});
                const isHtml = /^<html[\s>]/i.test(page404);
                const headers = withSecurityHeaders(
                    {
                        "Content-Type": "text/html; charset=utf-8",
                        "Cache-Control": CACHE_404,
                    },
                    securityHeaders,
                );
                return new Response(isHead ? null : isHtml ? `<!doctype html>\n${page404}` : page404, {
                    status: HTTP_STATUS_NOT_FOUND,
                    headers,
                });
            } catch (err) {
                logger.error?.({ err }, "Failed to render custom 404 page") ?? logger.error?.("Failed to render custom 404 page:", err);
            }
        }

        // Fallback to plain text 404
        const headers = withSecurityHeaders(
            {
                "Content-Type": "text/plain; charset=utf-8",
                "Cache-Control": CACHE_404,
            },
            securityHeaders,
        );
        return new Response(isHead ? null : "Not found", {
            status: HTTP_STATUS_NOT_FOUND,
            headers,
        });
    }

    /**
     * Send 500 response with custom error page if available.
     *
     * @param {Request} request
     * @returns {Promise<Response>}
     */
    async function send500(request) {
        const isHead = request.method === HTTP_METHOD_HEAD;

        if (render500) {
            try {
                const page500 = await render500({});
                const isHtml = /^<html[\s>]/i.test(page500);
                const headers = withSecurityHeaders(
                    {
                        "Content-Type": "text/html; charset=utf-8",
                        "Cache-Control": CACHE_500,
                    },
                    securityHeaders,
                );
                return new Response(isHead ? null : isHtml ? `<!doctype html>\n${page500}` : page500, {
                    status: HTTP_STATUS_SERVER_ERROR,
                    headers,
                });
            } catch (err) {
                logger.error?.({ err }, "Failed to render custom 500 page") ?? logger.error?.("Failed to render custom 500 page:", err);
            }
        }

        // Fallback to plain text 500
        const headers = withSecurityHeaders(
            {
                "Content-Type": "text/html; charset=utf-8",
                "Cache-Control": CACHE_500,
            },
            securityHeaders,
        );
        return new Response(isHead ? null : "Internal Server Error", {
            status: HTTP_STATUS_SERVER_ERROR,
            headers,
        });
    }

    /**
     * Handle an incoming HTTP request.
     *
     * This handles:
     * - URL validation
     * - Middleware execution
     * - OPTIONS preflight
     * - Route matching
     * - SSR rendering
     * - Error responses
     *
     * Does NOT handle:
     * - Static file serving (adapter responsibility)
     * - Generated route serving (adapter responsibility)
     * - Logging (adapter responsibility)
     *
     * @param {Request} request - Web Standard Request object
     * @param {object} [env={}] - Platform-specific environment bindings
     * @param {object} [options={}] - Additional options
     * @param {boolean} [options.skipMiddleware=false] - Skip middleware execution (if adapter already ran it)
     * @param {string} [options.decodedPathname] - Pre-decoded pathname (skip URL parsing)
     * @returns {Promise<Response>} Response
     */
    async function handleRequest(request, env = {}, options = {}) {
        const url = new URL(request.url);
        const pathname = url.pathname;
        const isHead = request.method === HTTP_METHOD_HEAD;

        // Enforce URL length limit
        if (!request.url || request.url.length > MAX_URL_LEN) {
            return new Response(isHead ? null : "URI Too Long", {
                status: 414,
                headers: { "Content-Type": "text/plain; charset=utf-8" },
            });
        }

        // Execute middleware (unless skipped by adapter)
        if (!options.skipMiddleware) {
            const middlewareResponse = await executeMiddleware(request, env);
            if (middlewareResponse) {
                if (isHead) {
                    return new Response(null, {
                        status: middlewareResponse.status,
                        headers: middlewareResponse.headers,
                    });
                }
                return middlewareResponse;
            }
        }

        // Handle OPTIONS preflight
        if (request.method === "OPTIONS") {
            return optionsResponse();
        }

        // Decode pathname
        let decodedPathname = options.decodedPathname;
        if (!decodedPathname) {
            try {
                decodedPathname = decodeURIComponent(pathname);
            } catch (err) {
                logger.warn?.({ err, method: request.method, url: request.url }, "Bad Request: failed to parse URL");
                return new Response(isHead ? null : "Bad Request", {
                    status: 400,
                    headers: { "Content-Type": "text/plain; charset=utf-8" },
                });
            }
        }

        // Match route
        const routes = getRoutes();
        const match = routeMatch(decodedPathname, routes);

        // No match -> 404
        if (!match) {
            return await send404(request);
        }

        // Invalid slug -> 400
        if (match.invalid) {
            logger.warn?.({ method: request.method, url: request.url, pathname: decodedPathname }, "Bad Request: invalid route parameters");
            return new Response(isHead ? null : "Invalid parameters", {
                status: 400,
                headers: { "Content-Type": "text/plain; charset=utf-8" },
            });
        }

        const { route, params } = match;

        // Generated routes -> return special response that adapter should intercept
        // The adapter is responsible for serving the pre-rendered HTML file
        if (route.generated === true) {
            // Return a marker response that adapter should NOT serve
            // Instead, adapter should serve the generated HTML file
            const headers = withSecurityHeaders(
                {
                    "X-SXO-Generated": "true",
                    "X-SXO-Filename": route.filename,
                    "Content-Type": "text/html; charset=utf-8",
                    "Cache-Control": CACHE_GENERATED,
                },
                securityHeaders,
            );
            const response = new Response(null, {
                status: HTTP_STATUS_OK,
                headers,
            });
            // Attach route info for adapter
            // @ts-expect-error - custom property for internal use
            response._sxoGenerated = { route, params };
            return response;
        }

        // SSR rendering
        try {
            const mod = modules[route.jsx];
            if (!mod) {
                throw new Error(`Module not found: ${route.jsx}`);
            }

            const renderFn = mod.default || mod.jsx;
            if (typeof renderFn !== "function") {
                throw new Error(`No valid export found in ${route.jsx}`);
            }

            let page = await renderFn(params);
            const isHtml = /^<html[\s>]/i.test(page);

            // Inject built assets for non-generated routes
            if (route.assets && typeof route.assets === "object" && isHtml) {
                page = injectAssets(page, route.assets, normalizedPublicPath);
            }

            // Response headers
            const headers = withSecurityHeaders(
                {
                    "Content-Type": "text/html; charset=utf-8",
                    "Cache-Control": CACHE_SSR,
                },
                securityHeaders,
            );

            if (isHead) {
                return new Response(null, { status: 200, headers });
            }

            return new Response(isHtml ? `<!doctype html>\n${page}` : page, { status: 200, headers });
        } catch (err) {
            logger.error?.({ err }, "SSR error") ?? logger.error?.("SSR error:", err);
            return await send500(request);
        }
    }

    return {
        handleRequest,
        send404,
        send500,
    };
}

/**
 * Check if a response is a generated route marker.
 *
 * @param {Response} response
 * @returns {{ route: Route, params: object } | null}
 */
export function getGeneratedRouteInfo(response) {
    // @ts-expect-error - custom property for internal use
    return response._sxoGenerated ?? null;
}

/**
 * Create a handler for serving pre-rendered (generated) routes.
 *
 * This utility handles the common pattern of:
 * 1. Checking if a response is a generated route marker
 * 2. Reading the pre-rendered HTML file
 * 3. Returning a properly-formatted response with caching headers
 *
 * @param {object} options
 * @param {string} options.staticDir - Base directory for generated HTML files
 * @param {{ readText: (path: string) => Promise<string | null> }} options.fileReader - File reader with readText method
 * @param {(base: string, relative: string) => string} options.joinPath - Path joining function
 * @returns {(response: Response, request: Request) => Promise<Response | null>} Handler function
 *
 * @example
 * ```javascript
 * const serveGenerated = createGeneratedRouteHandler({
 *     staticDir: OUTPUT_DIR_CLIENT,
 *     fileReader: createNodeFileReader(fsp),
 *     joinPath: path.resolve,
 * });
 *
 * // In request handler:
 * const generatedResponse = await serveGenerated(response, request);
 * if (generatedResponse) return generatedResponse;
 * ```
 */
export function createGeneratedRouteHandler({ staticDir, fileReader, joinPath }) {
    return async function serveGeneratedRoute(response, request) {
        const generatedInfo = getGeneratedRouteInfo(response);
        if (!generatedInfo) {
            return null;
        }

        const htmlPath = joinPath(staticDir, generatedInfo.route.filename);
        const html = await fileReader.readText(htmlPath);

        if (html === null) {
            // File not found - let caller handle the error
            return null;
        }

        const headers = {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": CACHE_GENERATED,
        };

        if (request.method === "HEAD") {
            return new Response(null, { status: 200, headers });
        }

        return new Response(html, { status: 200, headers });
    };
}

/**
 * Configuration for createFetchHandler.
 * @typedef {object} UnifiedFetchHandlerConfig
 * @property {(request: Request) => Promise<Response | null>} handleStaticRequest - Static file handler
 * @property {(request: Request, env?: object) => Promise<Response>} handleRequest - Core SSR handler
 * @property {(response: Response, request: Request) => Promise<Response | null>} serveGeneratedRoute - Generated route handler
 * @property {(request: Request) => Promise<Response>} send500 - Error response sender
 * @property {object} [logger=console] - Logger instance
 */

/**
 * Create a unified fetch handler for Web Standard APIs (Bun/Deno).
 *
 * This consolidates the common request handling pattern:
 * 1. Try static files first
 * 2. Handle dynamic routes with core handler
 * 3. Check for generated routes (serve pre-rendered HTML)
 * 4. Handle errors gracefully
 *
 * @param {UnifiedFetchHandlerConfig} config - Handler configuration
 * @returns {(request: Request) => Promise<Response>} Unified fetch handler
 *
 * @example
 * ```javascript
 * const handleFetch = createFetchHandler({
 *     handleStaticRequest,
 *     handleRequest,
 *     serveGeneratedRoute,
 *     send500,
 *     logger,
 * });
 *
 * // In Bun:
 * Bun.serve({ port: PORT, fetch: handleFetch });
 *
 * // In Deno:
 * Deno.serve({ port: PORT, handler: handleFetch });
 * ```
 */
export function createFetchHandler(config) {
    const { handleStaticRequest, handleRequest, serveGeneratedRoute, send500, logger = console } = config;

    return async function handleFetch(request) {
        try {
            // Try static files first
            const staticResponse = await handleStaticRequest(request);
            if (staticResponse) {
                return staticResponse;
            }

            // Handle dynamic routes with core handler
            const response = await handleRequest(request);

            // Check if this is a generated route (serve pre-rendered HTML)
            const generatedResponse = await serveGeneratedRoute(response, request);
            if (generatedResponse) {
                return generatedResponse;
            }
            if (generatedResponse === null && response.headers.get("X-SXO-Generated") === "true") {
                // Generated route but file not found
                logger.error?.({ route: response.headers.get("X-SXO-Filename") }, "Failed to serve generated route") ??
                    logger.error?.("Failed to serve generated route:", response.headers.get("X-SXO-Filename"));
                return await send500(request);
            }

            // Standard response
            return response;
        } catch (e) {
            logger.error?.({ err: e }, "Request handling failed") ?? logger.error?.("Request handling failed:", e);
            return await send500(request);
        }
    };
}
