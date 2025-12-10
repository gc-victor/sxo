/**
 * @fileoverview Example middleware for SXO Cloudflare Workers example.
 *
 * Middleware uses Web Standard signature: (request, env) => Response | void
 * - Return a Response to short-circuit and handle the request
 * - Return void/undefined to continue to the next middleware or route handler
 */

/**
 * Health check endpoint at GET /api/health
 * Returns 200 OK with JSON status.
 *
 * @param {Request} request - Web Standard Request
 * @returns {Response | undefined} Response if handled, undefined to continue
 */
function healthCheck(request) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/api/health") {
        return new Response(JSON.stringify({ status: "ok", runtime: "cloudflare-workers" }), {
            status: 200,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
            },
        });
    }
}

export default [healthCheck];
