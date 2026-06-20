/**
 * @fileoverview Middleware executor utility for Web Standard APIs.
 *
 * Provides a shared middleware execution pattern used across dev/prod servers
 * and runtime handlers. Middleware follows Web Standard Request/Response pattern:
 * - Return Response to short-circuit and stop the chain
 * - Return void/undefined to continue to the next middleware
 * - Errors propagate to the caller
 *
 * @module shared/middleware-executor
 */

import { applyMiddlewareHeaders } from "../server/shared/protected-headers.js";
import { withSecurityHeaders } from "../server/shared/security-headers.js";

/**
 * Executes middleware chain and returns first Response or null.
 *
 * This utility consolidates middleware execution logic across:
 * - Production server (src/js/server/prod/core-handler.js)
 * - Development server (src/js/server/dev/core-handler.js)
 * - Runtime handler (src/js/runtime/handler.js)
 *
 * Behavior:
 * - Return Response to short-circuit and stop the chain
 * - Return void/undefined to continue to next middleware
 * - Errors propagate to the caller
 * - Security headers are applied to the Response when provided
 * - Protected security headers are enforced by default
 * - HEAD requests automatically strip the response body
 *
 * @param {Request} request - Web Standard Request object
 * @param {Array<Function>} middlewares - Array of middleware functions
 * @param {object} [env={}] - Platform-specific environment bindings
 * @param {object} [options={}] - Options object
 * @param {Record<string, string> | null} [options.securityHeaders=null] - Custom security headers
 * @param {boolean} [options.allowOverride=false] - Allow middleware to override protected headers
 * @param {object} [context={}] - Middleware context
 * @param {Function} [context.render] - Render a page module by JSX path returning HTML string
 * @returns {Promise<Response|null>} First Response from middleware or null
 * @public
 */
export async function executeMiddleware(
    request,
    middlewares,
    env = {},
    { securityHeaders = null, allowOverride = false } = {},
    context = {},
) {
    if (!middlewares?.length) return null;

    for (const mw of middlewares) {
        if (typeof mw !== "function") continue;

        const result = await mw(request, env, context);

        // If middleware returns a Response, short-circuit
        if (result instanceof Response) {
            // Apply security headers
            const finalHeaders = new Headers(withSecurityHeaders({}, securityHeaders ?? undefined));
            applyMiddlewareHeaders(finalHeaders, result.headers, allowOverride);

            // Strip body for HEAD requests
            const body = request.method === "HEAD" ? null : result.body;

            return new Response(body, {
                status: result.status,
                statusText: result.statusText,
                headers: finalHeaders,
            });
        }

        // Otherwise continue to next middleware
    }

    // All middleware passed without returning a Response
    return null;
}
