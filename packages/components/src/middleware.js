/**
 * Middleware for documentation pages.
 *
 * Provides:
 * - Redirect `/` → `/installation` (302)
 *
 * Extended in task 3.5 with Markdown (.md) endpoint conversion.
 *
 * @param {Request} request - The incoming request
 * @param {object} [_env] - Environment object (unused)
 * @returns {Response|undefined} Redirect response or undefined to pass through
 */
export default function middleware(request, _env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Redirect root to installation page
    if (pathname === "/" || pathname === "") {
        return new Response(null, {
            status: 302,
            headers: { location: "/installation" },
        });
    }

    // Pass through for all other requests
    return undefined;
}
