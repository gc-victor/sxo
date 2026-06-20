/**
 * @fileoverview SSR execution logic for production handler.
 *
 * @module server/prod/ssr-executor
 */

/// <reference types="../../types/index.d.ts" />

import { HTTP_HEADER_CACHE_CONTROL, HTTP_HEADER_CONTENT_TYPE, MIME_TYPE_HTML_UTF8 } from "../shared/http-constants.js";
import { withSecurityHeaders } from "../shared/security-headers.js";
import { injectAssets } from "../utils/inject-assets.js";
import { logger } from "../utils/logger.js";

/**
 * Execute SSR rendering for a route.
 *
 * Renders JSX module, extracts body content, and injects assets.
 * Returns appropriate Response object with headers.
 *
 * @param {Route} route - Route object with jsx and assets
 * @param {Record<string, string>} params - Route parameters (e.g., slug values)
 * @param {Record<string, { default?: Function, jsx?: Function }>} modules - Map of jsx paths to module objects
 * @param {string} normalizedPublicPath - Normalized public path for assets
 * @param {boolean} isHead - Whether this is a HEAD request
 * @param {Record<string, string> | null} [securityHeaders=null] - Custom security headers
 * @param {Request} [request] - Incoming request (passed through to page render functions)
 * @returns {Promise<{ type: "response", response: Response }>} Response object { type, response }
 */
export async function executeSSR(route, params, modules, normalizedPublicPath, isHead, securityHeaders = null, request = undefined) {
    const mod = modules[route.jsx];
    if (!mod) {
        throw new Error(`Module not found: ${route.jsx}`);
    }

    const renderFn = mod.default || mod.jsx;
    if (typeof renderFn !== "function") {
        throw new Error(`No valid export found in ${route.jsx}`);
    }

    let page = await renderFn(params, request);
    // If the page renders its own Response (full control), process it
    if (page instanceof Response) {
        const contentType = page.headers.get(HTTP_HEADER_CONTENT_TYPE) || "";
        if (contentType.includes("text/html")) {
            const text = await page.text();
            const isHtml = /^<html[\s>]/i.test(text);
            let output = text;
            if (isHtml && route.assets && typeof route.assets === "object") {
                output = injectAssets(text, route.assets, normalizedPublicPath);
            }
            if (isHead) {
                return { type: "response", response: new Response(null, { status: page.status, headers: page.headers }) };
            }
            return {
                type: "response",
                response: new Response(isHtml ? `<!doctype html>\n${output}` : output, {
                    status: page.status,
                    headers: page.headers,
                }),
            };
        }
        return { type: "response", response: page };
    }
    // Coerce to string in case render function returns non-string (number, null, etc.)
    if (typeof page !== "string") {
        page = String(page ?? "");
    }
    const isHtml = /^<html[\s>]/i.test(page);

    // Inject built assets for non-generated routes
    if (route.assets && typeof route.assets === "object" && isHtml) {
        page = injectAssets(page, route.assets, normalizedPublicPath);
    }

    // Response headers
    const headers = withSecurityHeaders(
        {
            [HTTP_HEADER_CONTENT_TYPE]: MIME_TYPE_HTML_UTF8,
            [HTTP_HEADER_CACHE_CONTROL]: "public, max-age=0, must-revalidate",
        },
        securityHeaders ?? undefined,
    );

    if (isHead) {
        return { type: "response", response: new Response(null, { status: 200, headers }) };
    }

    return { type: "response", response: new Response(isHtml ? `<!doctype html>\n${page}` : page, { status: 200, headers }) };
}

/**
 * Handle SSR errors and return appropriate error response.
 *
 * @param {Error} error - Error object
 * @param {Request} request - Incoming request
 * @param {object} options - Error handling options
 * @param {Function} options.send500 - 500 response sender
 * @param {Function | null} [options.render500Fn=null] - 500 render function
 * @param {boolean} [options.renderCustom500=false] - Whether to render custom 500 page
 * @param {Record<string, string> | null} [options.securityHeaders=null] - Security headers
 * @param {{ css?: string[], js?: string[] } | null} [options.assets=null] - Built assets to inject (client-relative paths)
 * @param {string} [options.publicPath="/"] - Public path prefix for assets
 * @returns {Promise<{type: "response", response: Response}>} Error response object
 */
export async function handleSSRError(
    error,
    request,
    { send500, renderCustom500 = false, render500Fn = null, securityHeaders = null, assets = null, publicPath = "/" },
) {
    logger.error({ err: error }, "SSR error");
    const errorResponse = await send500(request, { renderCustom500, render500Fn, securityHeaders, assets, publicPath });
    return { type: "response", response: errorResponse };
}
