/**
 * @fileoverview Platform-agnostic core handler for SXO SSR runtime.
 *
 * This module provides the core request handling logic using Web Standard APIs
 * (Request/Response). It is designed to work across Node.js, Cloudflare Workers,
 * Bun, and Deno with platform-specific adapters.
 *
 * The handler:
 * - Matches incoming requests against the route manifest
 * - Executes middleware chain (Web Standard signature)
 * - Renders SSR pages from the module map
 * - Injects assets (CSS/JS) into HTML responses
 * - Returns null for unmatched routes (adapter handles 404)
 * - Returns null for generated routes (adapter serves pre-rendered HTML)
 *
 * @module sxo/runtime
 */

import { injectAssets, normalizePublicPath } from "../server/utils/inject-assets.js";
import { routeMatch, SLUG_REGEX } from "../server/utils/route-match.js";

// Re-export utilities for adapter convenience
export { injectAssets, normalizePublicPath };
export { routeMatch, SLUG_REGEX };

/**
 * Middleware function signature for Web Standard APIs.
 * @typedef {(request: Request, env?: object) => Response | void | Promise<Response | void>} Middleware
 */

/**
 * Configuration for createCoreHandler.
 * @typedef {object} HandlerConfig
 * @property {Array<object>} routes - Route manifest entries
 * @property {Record<string, object>} modules - Map of jsx paths to module objects
 * @property {string} [publicPath="/"] - Public path prefix for assets
 * @property {Middleware[]} [middleware=[]] - Middleware chain to execute before routing
 */

/**
 * Create a platform-agnostic HTTP handler.
 *
 * @param {HandlerConfig} config - Handler configuration
 * @returns {(request: Request, env?: object) => Promise<Response | null>} Handler function
 */
export function createCoreHandler(config) {
    const { routes, modules, publicPath = "/", middleware = [] } = config;

    // Normalize public path once at creation time
    const normalizedPublicPath = normalizePublicPath(publicPath);

    /**
     * Handle an incoming HTTP request.
     *
     * @param {Request} request - Web Standard Request object
     * @param {object} [env={}] - Platform-specific environment bindings
     * @returns {Promise<Response | null>} Response or null if no route matched
     */
    return async function handler(request, env = {}) {
        // Execute middleware chain first
        if (middleware.length > 0) {
            try {
                const middlewareResult = await executeMiddleware(middleware, request, env);
                if (middlewareResult instanceof Response) {
                    return middlewareResult;
                }
            } catch {
                // Middleware error -> 500
                return new Response("Internal Server Error", {
                    status: 500,
                    headers: {
                        "Content-Type": "text/plain; charset=utf-8",
                        "Cache-Control": "no-store",
                    },
                });
            }
        }

        // Parse request URL
        const url = new URL(request.url);
        const pathname = url.pathname;

        // Match route
        const match = routeMatch(pathname, routes);

        // No match -> return null (adapter handles 404)
        if (!match) {
            return null;
        }

        // Invalid slug -> 400
        if (match.invalid) {
            return new Response("Invalid parameters", {
                status: 400,
                headers: {
                    "Content-Type": "text/plain; charset=utf-8",
                },
            });
        }

        const { route, params } = match;

        // Generated routes -> return null (adapter serves pre-rendered HTML)
        if (route.generated === true) {
            return null;
        }

        // SSR rendering
        try {
            // Load module from map
            const mod = modules[route.jsx];
            if (!mod) {
                throw new Error(`Module not found: ${route.jsx}`);
            }

            // Get render function (default export or named jsx)
            const renderFn = mod.default || mod.jsx;
            if (typeof renderFn !== "function") {
                throw new Error(`No valid export found in ${route.jsx}`);
            }

            // Call render function with params
            let html = await renderFn(params);

            // Ensure html is a string
            if (typeof html !== "string") {
                html = String(html ?? "");
            }

            // Check if response is HTML
            const isHtml = /^<html[\s>]/i.test(html);

            // Inject assets for HTML responses
            if (isHtml && route.assets && typeof route.assets === "object") {
                html = injectAssets(html, route.assets, normalizedPublicPath);
            }

            // Prepend doctype for HTML responses
            if (isHtml) {
                html = `<!doctype html>\n${html}`;
            }

            // Return response
            return new Response(html, {
                status: 200,
                headers: {
                    "Content-Type": "text/html; charset=utf-8",
                    "Cache-Control": "public, max-age=0, must-revalidate",
                },
            });
        } catch {
            // SSR error -> 500
            // AIDEV-NOTE: In production, consider adding structured logging here
            return new Response("Internal Server Error", {
                status: 500,
                headers: {
                    "Content-Type": "text/plain; charset=utf-8",
                    "Cache-Control": "no-store",
                },
            });
        }
    };
}

/**
 * Execute middleware chain.
 *
 * Middleware can:
 * - Return a Response to short-circuit and stop the chain
 * - Return void/undefined to continue to the next middleware
 * - Throw an error which will be propagated to the caller
 *
 * @param {Middleware[]} middlewares - Array of middleware functions
 * @param {Request} request - Web Standard Request object
 * @param {object} [env={}] - Platform-specific environment bindings
 * @returns {Promise<Response | void>} Response if middleware short-circuits, void otherwise
 */
export async function executeMiddleware(middlewares, request, env = {}) {
    for (const mw of middlewares) {
        if (typeof mw !== "function") {
            continue;
        }

        const result = await mw(request, env);

        // If middleware returns a Response, short-circuit
        if (result instanceof Response) {
            return result;
        }

        // Otherwise continue to next middleware
    }

    // All middleware passed without returning a Response
    return undefined;
}
