import {
    HTTP_HEADER_CACHE_CONTROL,
    HTTP_HEADER_CONTENT_TYPE,
    HTTP_METHOD_HEAD,
    MIME_TYPE_HTML_UTF8,
} from "../server/shared/http-constants.js";
import { htmlErrorPage } from "../server/utils/html-utils.js";
import { injectAssets, normalizePublicPath } from "../server/utils/inject-assets.js";
import { routeMatch } from "../server/utils/route-match.js";
import { executeMiddleware } from "../shared/middleware-executor.js";

/**
 * Route manifest entry.
 * @typedef {object} Route
 * @property {string} filename - Output filename (e.g., "index.html")
 * @property {string[]} entryPoints - Client entry points
 * @property {string} jsx - Source JSX path
 * @property {string} [path] - Route path pattern
 * @property {boolean} [generated] - Whether route is pre-rendered
 * @property {{ css: string[], js: string[] }} assets - Built assets
 * @property {boolean} hash - Whether assets are hashed
 */

/**
 * Route match result type.
 * @typedef {{route: Route, params: Record<string, string>} | {invalid: true}} RouteMatch
 */

/**
 * JSX module type (page exports).
 * @typedef {object} JsxModule
 * @property {Function} [default] - Default export function
 * @property {Function} [jsx] - Named jsx export function
 */

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
 * Configuration for createCoreHandler.
 * @typedef {object} HandlerConfig
 * @property {Route[]} routes - Route manifest entries
 * @property {Record<string, JsxModule>} modules - Map of jsx paths to module objects
 * @property {string} [publicPath="/"] - Public path prefix for assets
 * @property {Middleware[]} [middleware=[]] - Middleware chain to execute before routing
 */

/**
 * Render SSR page from route.
 *
 * Loads the SSR module from the provided modules map, extracts the page function
 * (preferring default export, falling back to named jsx export), calls it with
 * route params extracted from the request URL, and returns the rendered HTML string
 * with doctype prepended.
 *
 * This function handles both static and dynamic routes. For dynamic routes, it extracts
 * parameter values from the request pathname using the route pattern. The result is
 * normalized to a string and checked for HTML structure to determine if doctype
 * should be prepended.
 *
 * @param {Route} route - Route manifest entry containing jsx path and route pattern.
 *                         Used to locate the SSR module and extract route parameters.
 * @param {Request} request - Web Standard Request object containing the URL to
 *                           parse for route parameters (e.g., `/blog/[slug]` → `{ slug: "post" }`).
 * @param {Record<string, JsxModule>} modules - Map of jsx paths to module objects,
 *                                             keyed by the jsx property from route entries.
 * @param {Record<string, string>} [params] - Pre-matched route params (optional).
 *                                           When provided, skips internal routeMatch call.
 * @returns {Promise<string>} Rendered HTML string with doctype prepended if the
 *                            response is an HTML document (detected by `<html` tag).
 * @throws {Error} If the route's jsx path does not exist in the modules map.
 * @throws {Error} If the module has neither a default export nor a named jsx export,
 *                 or the export is not a function.
 * @throws {Error} If the render function throws or rejects during execution.
 * @example
 * ```js
 * const modules = {
 *   "/pages/home.jsx": {
 *     default: (params) => `<html><body>Home</body></html>`
 *   }
 * };
 * const route = {
 *   filename: "home.jsx",
 *   jsx: "/pages/home.jsx",
 *   path: "/",
 *   entryPoints: []
 * };
 * const request = new Request("http://example.com/");
 * const html = await renderSSR(route, request, modules);
 * // Returns: "<!doctype html>\n<html><body>Home</body></html>"
 * ```
 */
export async function renderSSR(route, request, modules, params) {
    // Load module from map
    const mod = modules[route.jsx];
    if (!mod) {
        throw new Error(`Module not found: ${route.jsx}`);
    }

    // Get render function (default export or named jsx)
    const jsxModule = /** @type {JsxModule} */ (mod);
    const renderFn = jsxModule.default || jsxModule.jsx;
    if (typeof renderFn !== "function") {
        throw new Error(`No valid export found in ${route.jsx}`);
    }

    // Use pre-matched params if provided, otherwise extract from request URL
    if (!params) {
        const url = new URL(request.url);
        const pathname = url.pathname;
        const match = routeMatch(pathname, [route]);

        // Get route params (empty object if static route)
        params = match && !("invalid" in match) ? match.params : {};
    }

    // Call render function with params
    let html = await renderFn(params);

    // Ensure html is a string
    if (typeof html !== "string") {
        html = String(html ?? "");
    }

    // Check if response is HTML
    const isHtml = /^<html[\s>]/i.test(html);

    // Prepend doctype for HTML responses
    if (isHtml) {
        html = `<!doctype html>\n${html}`;
    }

    return html;
}

/**
 * Create a platform-agnostic HTTP handler.
 *
 * @param {HandlerConfig} config - Handler configuration
 * @returns {(request: Request, env?: object) => Promise<Response | null>} Handler function
 */
export function createCoreHandler(/** @type {HandlerConfig} */ config) {
    const { routes, modules, publicPath = "/", middleware = [] } = config;

    // Normalize public path once at creation time
    const normalizedPublicPath = normalizePublicPath(publicPath);

    // Static error pages for the SSR-only runtime. Bodies are kept here rather
    // than pulled from the shared module so this handler stays free of the
    // security-header/logger dependencies the full server adds on top.

    const INTERNAL_ERROR_HTML = htmlErrorPage("Internal Server Error", "500 — Internal Server Error");
    const BAD_REQUEST_HTML = htmlErrorPage("Bad Request", "Bad Request");

    /**
     * Build a no-store HTML error response, stripping the body for HEAD.
     *
     * @param {string} html - Response body for non-HEAD requests
     * @param {number} status - HTTP status code
     * @param {Request} [request] - Original request (for HEAD detection)
     * @returns {Response} Error response
     */
    function errorResponse(html, status, request) {
        return new Response(request?.method === HTTP_METHOD_HEAD ? null : html, {
            status,
            headers: {
                [HTTP_HEADER_CONTENT_TYPE]: MIME_TYPE_HTML_UTF8,
                [HTTP_HEADER_CACHE_CONTROL]: "no-store",
            },
        });
    }

    /**
     * Handle an incoming HTTP request.
     *
     * @param {Request} request - Web Standard Request object
     * @param {object} [env={}] - Platform-specific environment bindings
     * @returns {Promise<Response | null>} Response or null if no route matched
     */
    return async function handler(request, env = {}) {
        // Build middleware context with render function
        const middlewareContext = {
            /**
             * Render any page module by source JSX path.
             * @param {string} jsxPath - Source path to the page module (e.g., "src/pages/custom.jsx")
             * @param {Record<string, string>} [params={}] - Route parameters
             * @returns {Promise<string>} Rendered HTML string
             */
            render: async (jsxPath, params = {}) => {
                const mod = modules[jsxPath];
                if (!mod) {
                    throw new Error(`Module not found: ${jsxPath}`);
                }
                const renderFn = mod.default || mod.jsx;
                if (typeof renderFn !== "function") {
                    throw new Error(`No valid export found in ${jsxPath}`);
                }
                let html = await renderFn(params);
                if (typeof html !== "string") {
                    html = String(html ?? "");
                }
                if (/^<html[\s>]/i.test(html)) {
                    const route = routes.find((r) => r.jsx === jsxPath);
                    if (route?.assets) {
                        html = injectAssets(html, route.assets, normalizedPublicPath);
                    }
                    html = `<!doctype html>\n${html}`;
                }
                return html;
            },
        };

        // Execute middleware chain first
        if (middleware.length > 0) {
            try {
                const middlewareResult = await executeMiddleware(request, middleware, env, {}, middlewareContext);
                if (middlewareResult instanceof Response) {
                    return middlewareResult;
                }
            } catch (err) {
                console.error("Middleware execution failed", err);
                return errorResponse(INTERNAL_ERROR_HTML, 500, request);
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
        if (Object.hasOwn(match, "invalid")) {
            return errorResponse(BAD_REQUEST_HTML, 400, request);
        }

        const { route, params } = /** @type {{route: Route, params: Record<string, string>}} */ (match);

        // Generated routes -> return null (adapter serves pre-rendered HTML)
        if (route.generated === true) {
            return null;
        }

        // SSR rendering
        try {
            let html = await renderSSR(route, request, modules, params);

            // Check if response is HTML (renderSSR already added doctype)
            const isHtml = /^<!doctype html>\s*<html[\s>]/i.test(html);

            // Inject assets for HTML responses (after doctype is prepended)
            if (isHtml && route.assets && typeof route.assets === "object") {
                html = injectAssets(html, route.assets, normalizedPublicPath);
            }

            // Return response
            return new Response(html, {
                status: 200,
                headers: {
                    [HTTP_HEADER_CONTENT_TYPE]: MIME_TYPE_HTML_UTF8,
                    [HTTP_HEADER_CACHE_CONTROL]: "public, max-age=0, must-revalidate",
                },
            });
        } catch (err) {
            // SSR error -> 500
            console.error("SSR rendering error", err);
            return errorResponse(INTERNAL_ERROR_HTML, 500, request);
        }
    };
}
