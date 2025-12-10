/**
 * @fileoverview Example middleware for SXO Deno example.
 *
 * Middleware uses Web Standard signature: (request, env) => Response | void
 * - Return a Response to short-circuit and handle the request
 * - Return void/undefined to continue to the next middleware or route handler
 */

/**
 * Health check endpoint at GET /api/health
 * Returns 200 OK with JSON status.
 */
function healthCheck(request: Request): Response | undefined {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/api/health") {
        return new Response(JSON.stringify({ status: "ok", runtime: "deno" }), {
            status: 200,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
            },
        });
    }
}

export default [healthCheck];
