/**
 * @fileoverview Cloudflare Workers adapter for SXO SSR runtime.
 * @module sxo/cloudflare
 */

import { createCoreHandler } from "../../runtime/handler.js";
import { executeMiddleware } from "../../shared/middleware-executor.js";
import { badRequestResponse, send404, send500, uriTooLongResponse } from "../shared/error-responses.js";
import { maybeHeadResponse } from "../shared/http-adapters.js";
import {
    HTTP_HEADER_CACHE_CONTROL,
    HTTP_HEADER_CONTENT_TYPE,
    HTTP_METHOD_GET,
    HTTP_METHOD_OPTIONS,
    HTTP_STATUS_NOT_FOUND,
    HTTP_STATUS_OK,
    MIME_TYPE_HTML_UTF8,
} from "../shared/http-constants.js";
import { hasFileExtension } from "../shared/path.js";
import { withSecurityHeaders } from "../shared/security-headers.js";

const MAX_URL_LEN = 2048;

/**
 * @typedef {(request: Request, env?: object) => Response | void | Promise<Response | void>} Middleware
 * @typedef {Headers & { entries(): Iterable<[string, string]> }} IterableHeaders
 * @typedef {object} CloudflareConfig
 * @property {string} [publicPath="/"] - Public path prefix for assets
 * @property {Array<Middleware>} [middleware=[]] - Middleware chain
 * @property {Record<string, string> | null} [securityHeaders] - Custom security headers
 * @property {boolean} [allowMiddlewareSecurityOverride=false] - Allow middleware to override protected security headers
 * @property {Function | null} [render404=null] - Custom 404 render function
 * @property {Function | null} [render500=null] - Custom 500 render function
 * @property {Route[]} [routes] - Route manifest (testing only)
 * @property {Record<string, object>} [modules] - SSR modules (testing only)
 * @typedef {object} Env
 * @property {{ fetch: (request: Request) => Promise<Response> }} ASSETS - Static assets binding
 */

/**
 * Create a Cloudflare Workers handler.
 * @param {CloudflareConfig} [config={}] - Handler configuration
 * @returns {Promise<{ fetch: (request: Request, env: Env) => Promise<Response> }>} Handler object
 * @example
 * ```javascript
 * import { createHandler } from "sxo/cloudflare";
 * export default await createHandler();
 * ```
 */
export async function createHandler(config = {}) {
    const {
        publicPath = "/",
        middleware = [],
        securityHeaders = null,
        allowMiddlewareSecurityOverride = false,
        render404 = null,
        render500 = null,
    } = config;

    const routes = /** @type {Route[]} */ (config.routes || (await loadVirtualModule("sxo:routes", "./dist/server/routes.json")));
    const modules = /** @type {Record<string, object>} */ (
        config.modules || (await loadVirtualModule("sxo:modules", "./dist/server/modules.js"))
    );

    const coreHandler = createCoreHandler({ routes, modules, publicPath, middleware: [] });

    return {
        async fetch(request, env) {
            try {
                const urlOrError = getRequestUrl(request, securityHeaders);
                if (urlOrError instanceof Response) return urlOrError;
                if (request.method === HTTP_METHOD_OPTIONS) return new Response(null, { status: 204 });

                const decodedPathname = getDecodedPathname(urlOrError.pathname);
                if (decodedPathname === null) return badRequestResponse(request, { securityHeaders });

                if (middleware.length > 0) {
                    const res = await executeMiddleware(request, middleware, env, {
                        securityHeaders,
                        allowOverride: allowMiddlewareSecurityOverride,
                    });
                    if (res) return maybeHeadResponse(res, request);
                }

                const assetRes = await tryServeStaticAsset(request, decodedPathname, env);
                if (assetRes) return maybeHeadResponse(assetRes, request);

                const genRes = await tryServeGeneratedRoute(request, decodedPathname, routes, env, securityHeaders);
                if (genRes) return maybeHeadResponse(genRes, request);

                const coreRes = await coreHandler(request, env);
                if (coreRes) {
                    const headers = withSecurityHeaders(
                        Object.fromEntries(/** @type {IterableHeaders} */ (coreRes.headers).entries()),
                        securityHeaders,
                    );
                    return maybeHeadResponse(
                        new Response(coreRes.body, { status: coreRes.status, statusText: coreRes.statusText, headers }),
                        request,
                    );
                }

                return await send404(request, { renderCustom404: !!render404, render404Fn: render404, securityHeaders });
            } catch {
                return await send500(request, { renderCustom500: !!render500, render500Fn: render500, securityHeaders });
            }
        },
    };
}

/**
 * Load a virtual module from the environment.
 * @param {string} id - Module ID
 * @param {string} hint - Hint for error message
 * @returns {Promise<unknown>} Module content
 */
async function loadVirtualModule(id, hint) {
    try {
        const mod = /** @type {Record<string, unknown>} */ (await import(id));
        return mod.default || mod;
    } catch {
        throw new Error(`Failed to load from "${id}". Alias "${id}" in wrangler.jsonc should point to "${hint}".`);
    }
}

/**
 * Get the request URL and validate its length.
 * @param {Request} request - Web Standard Request object
 * @param {Record<string, string> | null} securityHeaders - Security headers
 * @returns {URL | Response} URL object or Error response
 */
function getRequestUrl(request, securityHeaders) {
    if (!request.url || request.url.length > MAX_URL_LEN) return uriTooLongResponse(request, { securityHeaders });
    try {
        return new URL(request.url);
    } catch {
        return badRequestResponse(request, { securityHeaders });
    }
}

/**
 * Decode a pathname.
 * @param {string} pathname - Pathname to decode
 * @returns {string | null} Decoded pathname or null if invalid
 */
function getDecodedPathname(pathname) {
    try {
        return decodeURIComponent(pathname);
    } catch {
        return null;
    }
}

/**
 * Try to fetch an asset from the environment.
 * @param {Env} env - Cloudflare environment
 * @param {Request} request - Web Standard Request object
 * @returns {Promise<Response | null>} Asset response or null
 */
async function tryFetchAsset(env, request) {
    try {
        return await env.ASSETS.fetch(request);
    } catch {
        return null;
    }
}

/**
 * Try to serve a static asset.
 * @param {Request} request - Web Standard Request object
 * @param {string} decodedPathname - Decoded pathname
 * @param {Env} env - Cloudflare environment
 * @returns {Promise<Response | null>} Asset response or null
 */
async function tryServeStaticAsset(request, decodedPathname, env) {
    if (hasFileExtension(decodedPathname) && env.ASSETS) {
        const res = await tryFetchAsset(env, request);
        if (res && res.status !== HTTP_STATUS_NOT_FOUND) return res;
    }
    return null;
}

/**
 * Try to serve a pre-rendered (generated) route.
 * @param {Request} request - Web Standard Request object
 * @param {string} decodedPathname - Decoded pathname
 * @param {Route[]} routes - Route manifest entries
 * @param {Env} env - Cloudflare environment
 * @param {Record<string, string> | null} securityHeaders - Security headers
 * @returns {Promise<Response | null>} Generated route response or null
 */
async function tryServeGeneratedRoute(request, decodedPathname, routes, env, securityHeaders) {
    const route = findGeneratedRoute(routes, decodedPathname);
    if (!route || !env.ASSETS) return null;

    const url = new URL(`/${route.filename || route.jsx}`, request.url);
    const res = await tryFetchAsset(env, new Request(url, { method: HTTP_METHOD_GET, headers: request.headers }));

    if (res?.status === HTTP_STATUS_OK) {
        const headers = withSecurityHeaders(
            {
                ...Object.fromEntries(/** @type {IterableHeaders} */ (res.headers).entries()),
                [HTTP_HEADER_CONTENT_TYPE]: MIME_TYPE_HTML_UTF8,
                [HTTP_HEADER_CACHE_CONTROL]: "public, max-age=300",
            },
            securityHeaders,
        );
        return new Response(res.body, { status: HTTP_STATUS_OK, headers });
    }
    return null;
}

/**
 * Find a generated route in the manifest.
 * @param {Route[]} routes - Route manifest entries
 * @param {string} pathname - Pathname to match
 * @returns {Route | null} Matched route or null
 */
function findGeneratedRoute(routes, pathname) {
    const norm = pathname.replace(/^\/+/, "").replace(/\/+$/, "");
    const isRoot = norm === "" || norm === "index.html";
    return (
        routes?.find(
            (r) => r.generated && ((r.path?.replace(/^\/+/, "") || "") === norm || (isRoot && (r.path?.replace(/^\/+/, "") || "") === "")),
        ) || null
    );
}
