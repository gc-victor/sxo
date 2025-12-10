/**
 * @fileoverview Cloudflare Workers adapter for SXO SSR runtime.
 *
 * This module provides a Cloudflare Workers-specific handler that wraps the
 * platform-agnostic core handler. It handles:
 * - Static file serving via env.ASSETS binding
 * - Execution of middleware chain before static file check
 * - Pre-rendered HTML serving for generated routes
 * - SSR rendering for dynamic routes
 * - Custom 404/500 error pages
 *
 * ## Usage
 *
 * Configure wrangler.jsonc with aliases:
 *
 * ```jsonc
 * {
 *   "alias": {
 *     "sxo:routes": "./dist/server/routes.json",
 *     "sxo:modules": "./dist/server/modules.js"
 *   }
 * }
 * ```
 *
 * Then in your worker entry (src/index.js):
 *
 * ```javascript
 * import { createHandler } from "sxo/cloudflare";
 *
 * export default await createHandler();
 * ```
 *
 * @module sxo/cloudflare
 */

import { createCoreHandler, executeMiddleware } from "../../runtime/handler.js";
import { CACHE_404, CACHE_500, CACHE_GENERATED } from "../shared/cache.js";
import {
    badRequestResponse,
    maybeHeadResponse,
    notFoundResponse,
    serverErrorResponse,
    uriTooLongResponse,
} from "../shared/http-adapters.js";
import {
    HTTP_METHOD_GET,
    HTTP_METHOD_HEAD,
    HTTP_METHOD_OPTIONS,
    HTTP_STATUS_NOT_FOUND,
    HTTP_STATUS_OK,
    HTTP_STATUS_SERVER_ERROR,
} from "../shared/http-constants.js";
import { hasFileExtension } from "../shared/path.js";
import { withSecurityHeaders } from "../shared/security-headers.js";

/** Maximum URL length to accept */
const MAX_URL_LEN = 2048;

/**
 * Configuration for createHandler.
 *
 * Routes and modules are auto-loaded from sxo:routes and sxo:modules aliases.
 * Configure these aliases in wrangler.jsonc to point to your dist/server files.
 *
 * @typedef {object} CloudflareConfig
 * @property {string} [publicPath="/"] - Public path prefix for assets
 * @property {Array<Function>} [middleware=[]] - Middleware chain
 * @property {Record<string, string>} [securityHeaders] - Custom security headers (overrides defaults)
 * @property {Function | null} [render404=null] - Custom 404 render function (params) => string
 * @property {Function | null} [render500=null] - Custom 500 render function (params) => string
 * @property {Array<object>} [routes] - Route manifest (for testing only)
 * @property {Record<string, object>} [modules] - SSR modules (for testing only)
 */

/**
 * Cloudflare Workers environment bindings.
 * @typedef {object} Env
 * @property {{ fetch: (request: Request) => Promise<Response> }} ASSETS - Static assets binding
 */

/**
 * Cloudflare Workers execution context.
 * @typedef {object} ExecutionContext
 * @property {(promise: Promise<unknown>) => void} waitUntil - Extend request lifetime
 * @property {() => void} passThroughOnException - Pass through on exception
 */

/**
 * Create a Cloudflare Workers handler.
 *
 * Routes and modules are auto-loaded from sxo:routes and sxo:modules aliases.
 * Configure these in your wrangler.jsonc:
 *
 * ```jsonc
 * {
 *   "alias": {
 *     "sxo:routes": "./dist/server/routes.json",
 *     "sxo:modules": "./dist/server/modules.js"
 *   }
 * }
 * ```
 *
 * @param {CloudflareConfig} [config={}] - Handler configuration
 * @returns {Promise<{ fetch: (request: Request, env: Env, ctx: ExecutionContext) => Promise<Response> }>} Handler object
 *
 * @example
 * ```javascript
 * import { createHandler } from "sxo/cloudflare";
 *
 * // Basic usage with defaults
 * export default await createHandler();
 *
 * // With custom security headers
 * export default await createHandler({
 *   securityHeaders: {
 *     "X-Frame-Options": "SAMEORIGIN",
 *     "Strict-Transport-Security": "max-age=31536000; includeSubDomains"
 *   }
 * });
 * ```
 */
export async function createHandler(config = {}) {
    const { publicPath = "/", middleware = [], securityHeaders, render404 = null, render500 = null } = config;

    // Load routes and modules from sxo:* aliases (or use provided for testing)
    let routes = config.routes;
    let modules = config.modules;

    if (!routes) {
        try {
            const routesModule = await import("sxo:routes");
            routes = routesModule.default || routesModule;
        } catch {
            throw new Error(
                `Failed to load routes from "sxo:routes". ` +
                    `Configure wrangler.jsonc with alias: { "sxo:routes": "./dist/server/routes.json" }`,
            );
        }
    }

    if (!modules) {
        try {
            const modulesModule = await import("sxo:modules");
            modules = modulesModule.default || modulesModule;
        } catch {
            throw new Error(
                `Failed to load modules from "sxo:modules". ` +
                    `Configure wrangler.jsonc with alias: { "sxo:modules": "./dist/server/modules.js" }`,
            );
        }
    }

    // Create core handler for SSR (without middleware - we run it ourselves before statics)
    const coreHandler = createCoreHandler({ routes, modules, publicPath, middleware: [] });

    /**
     * Wrap a Response with security headers.
     * @param {Response} response - Original response
     * @returns {Response} Response with security headers
     */
    function applySecurityHeaders(response) {
        const headers = withSecurityHeaders(Object.fromEntries(response.headers.entries()), securityHeaders);
        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
        });
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
            } catch {
                // Fall through to default 404
            }
        }

        // Fallback to plain text 404
        return applySecurityHeaders(notFoundResponse(request));
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
            } catch {
                // Fall through to default 500
            }
        }

        // Fallback to plain text 500
        return applySecurityHeaders(serverErrorResponse(request));
    }

    /**
     * Find a generated route matching the pathname.
     *
     * @param {string} pathname - URL pathname
     * @returns {object | null} Matching generated route or null
     */
    function findGeneratedRoute(pathname) {
        // Normalize pathname
        const normalized = pathname === "/" ? "/index.html" : pathname;

        for (const route of routes) {
            if (route.generated !== true) continue;

            // Check if route path matches
            if (route.path === pathname || route.path === normalized) {
                return route;
            }

            // Check for index route
            if ((pathname === "/" || pathname === "/index.html") && route.path === "") {
                return route;
            }
        }

        return null;
    }

    /**
     * Handle an incoming HTTP request.
     *
     * @param {Request} request - Web Standard Request
     * @param {Env} env - Cloudflare environment bindings
     * @param {ExecutionContext} ctx - Execution context
     * @returns {Promise<Response>} Response
     */
    async function fetch(request, env, _ctx) {
        const url = new URL(request.url);
        const pathname = url.pathname;

        try {
            // Enforce URL length limit
            if (!request.url || request.url.length > MAX_URL_LEN) {
                return maybeHeadResponse(applySecurityHeaders(uriTooLongResponse(request)), request);
            }

            // Handle OPTIONS preflight
            if (request.method === HTTP_METHOD_OPTIONS) {
                return new Response(null, { status: 204 });
            }

            // Decode pathname early (fail fast on malformed URLs)
            let decodedPathname;
            try {
                decodedPathname = decodeURIComponent(pathname);
            } catch {
                return maybeHeadResponse(applySecurityHeaders(badRequestResponse(request)), request);
            }

            // Run middleware FIRST (before static files)
            if (middleware.length > 0) {
                try {
                    const middlewareResult = await executeMiddleware(middleware, request, env);
                    if (middlewareResult instanceof Response) {
                        return maybeHeadResponse(middlewareResult, request);
                    }
                } catch {
                    // Middleware error -> 500
                    return maybeHeadResponse(await send500(request), request);
                }
            }

            // Try static file (if path has extension)
            if (hasFileExtension(decodedPathname) && env.ASSETS) {
                try {
                    const assetResponse = await env.ASSETS.fetch(request);
                    if (assetResponse.status !== HTTP_STATUS_NOT_FOUND) {
                        return maybeHeadResponse(assetResponse, request);
                    }
                    // Fall through to SSR if asset not found
                } catch {
                    // Asset fetch failed, fall through to SSR
                }
            }

            // Check for generated route (pre-rendered HTML)
            const generatedRoute = findGeneratedRoute(decodedPathname);
            if (generatedRoute && env.ASSETS) {
                try {
                    // Fetch pre-rendered HTML from ASSETS
                    const htmlRequest = new Request(new URL(`/${generatedRoute.filename}`, request.url), {
                        method: HTTP_METHOD_GET,
                        headers: request.headers,
                    });
                    const assetResponse = await env.ASSETS.fetch(htmlRequest);

                    if (assetResponse.status === HTTP_STATUS_OK) {
                        const headers = new Headers(assetResponse.headers);
                        headers.set("Content-Type", "text/html; charset=utf-8");
                        headers.set("Cache-Control", CACHE_GENERATED);

                        const response = new Response(assetResponse.body, {
                            status: HTTP_STATUS_OK,
                            headers,
                        });
                        return maybeHeadResponse(applySecurityHeaders(response), request);
                    }
                } catch {
                    // Fall through to SSR
                }
            }

            // Try core handler for SSR
            const coreResponse = await coreHandler(request, env);

            if (coreResponse) {
                return maybeHeadResponse(applySecurityHeaders(coreResponse), request);
            }

            // No match - return 404
            return maybeHeadResponse(await send404(request), request);
        } catch {
            // Internal error - return 500
            return maybeHeadResponse(await send500(request), request);
        }
    }

    return { fetch };
}
