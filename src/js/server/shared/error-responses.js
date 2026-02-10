/**
 * @fileoverview Error response utilities for production handlers.
 *
 * @module server/shared/error-responses
 */

import { injectAssets, normalizePublicPath } from "../utils/inject-assets.js";
import { logger } from "../utils/logger.js";
import { maybeHeadResponse } from "./http-adapters.js";
import {
    HTTP_HEADER_CACHE_CONTROL,
    HTTP_HEADER_CONTENT_TYPE,
    HTTP_METHOD_HEAD,
    HTTP_STATUS_BAD_REQUEST,
    HTTP_STATUS_NOT_FOUND,
    HTTP_STATUS_SERVER_ERROR,
    HTTP_STATUS_URI_TOO_LONG,
    MIME_TYPE_HTML_UTF8,
    MIME_TYPE_PLAIN_UTF8,
} from "./http-constants.js";
import { withSecurityHeaders } from "./security-headers.js";

/**
 * Build standardized error response.
 *
 * @param {Request | import("node:http").IncomingMessage | {method: string} | null | undefined} request - Optional request for HEAD handling
 * @param {object} options
 * @param {number} options.status - HTTP status code
 * @param {string} options.fallbackBody - Plain text fallback body
 * @param {string} options.cacheControl - Cache-Control header value
 * @param {string} options.contentType - Content-Type header value
 * @param {boolean} [options.renderCustom=false] - Whether to render custom page
 * @param {Function | null} [options.renderFn=null] - Custom render function
 * @param {Record<string, string> | null} [options.securityHeaders=null] - Custom security headers
 * @param {{ css?: string[], js?: string[] } | null} [options.assets=null] - Built assets to inject (client-relative paths)
 * @param {string} [options.publicPath="/"] - Public path prefix for assets
 * @returns {Promise<Response>} Error response
 * @internal
 */
async function buildErrorResponse(
    request,
    {
        status,
        fallbackBody,
        cacheControl,
        contentType,
        renderCustom = false,
        renderFn = null,
        securityHeaders = null,
        assets = null,
        publicPath = "/",
    },
) {
    const isHead = request?.method === HTTP_METHOD_HEAD;

    if (renderCustom && renderFn) {
        try {
            let page = await renderFn({});
            const isHtml = /^<html[\s>]/i.test(page);
            if (isHtml && assets) {
                const normalized = normalizePublicPath(publicPath);
                page = injectAssets(page, assets, normalized);
            }
            const headers = withSecurityHeaders(
                {
                    [HTTP_HEADER_CONTENT_TYPE]: MIME_TYPE_HTML_UTF8,
                    [HTTP_HEADER_CACHE_CONTROL]: cacheControl,
                },
                securityHeaders ?? undefined,
            );
            return new Response(isHead ? null : isHtml ? `<!doctype html>\n${page}` : page, {
                status,
                headers,
            });
        } catch (err) {
            if (logger?.error) {
                logger.error({ err }, `Failed to render custom ${status} page`);
            }
        }
    }

    const headers = withSecurityHeaders(
        {
            [HTTP_HEADER_CONTENT_TYPE]: contentType,
            [HTTP_HEADER_CACHE_CONTROL]: cacheControl,
        },
        securityHeaders ?? undefined,
    );
    return new Response(isHead ? null : fallbackBody, {
        status,
        headers,
    });
}

/**
 * Send 404 Not Found response with appropriate headers.
 *
 * Returns a plain text "Not Found" response with:
 * - Status: 404
 * - Content-Type: text/plain; charset=utf-8
 * - Cache-Control: public, max-age=0, must-revalidate
 *
 * If a request is provided, automatically handles HEAD requests by stripping body.
 *
 * @param {Request | import("node:http").IncomingMessage | {method: string}} [request] - Optional request for HEAD handling
 * @param {object} [options] - Options object
 * @param {boolean} [options.renderCustom404=false] - Whether to render custom 404 page
 * @param {Function | null} [options.render404Fn=null] - Custom 404 render function
 * @param {Record<string, string> | null} [options.securityHeaders=null] - Custom security headers (overrides defaults)
 * @param {{ css?: string[], js?: string[] } | null} [options.assets=null] - Built assets to inject (client-relative paths)
 * @param {string} [options.publicPath="/"] - Public path prefix for assets
 * @returns {Promise<Response>} 404 response
 */
export async function send404(
    request,
    { renderCustom404 = false, render404Fn = null, securityHeaders = null, assets = null, publicPath = "/" } = {},
) {
    return await buildErrorResponse(request, {
        status: HTTP_STATUS_NOT_FOUND,
        fallbackBody: "Not found",
        cacheControl: "public, max-age=0, must-revalidate",
        contentType: MIME_TYPE_PLAIN_UTF8,
        renderCustom: renderCustom404,
        renderFn: render404Fn,
        securityHeaders,
        assets,
        publicPath,
    });
}

/**
 * Send 500 Internal Server Error response with appropriate headers.
 *
 * Returns a plain text "Internal Server Error" response with:
 * - Status: 500
 * - Content-Type: text/html; charset=utf-8
 * - Cache-Control: no-store
 *
 * If a request is provided, automatically handles HEAD requests by stripping body.
 *
 * @param {Request | import("node:http").IncomingMessage | {method: string}} [request] - Optional request for HEAD handling
 * @param {object} [options] - Options object
 * @param {boolean} [options.renderCustom500=false] - Whether to render custom 500 page
 * @param {Function | null} [options.render500Fn=null] - Custom 500 render function
 * @param {Record<string, string> | null} [options.securityHeaders=null] - Custom security headers (overrides defaults)
 * @param {{ css?: string[], js?: string[] } | null} [options.assets=null] - Built assets to inject (client-relative paths)
 * @param {string} [options.publicPath="/"] - Public path prefix for assets
 * @returns {Promise<Response>} 500 response
 */
export async function send500(
    request,
    { renderCustom500 = false, render500Fn = null, securityHeaders = null, assets = null, publicPath = "/" } = {},
) {
    return await buildErrorResponse(request, {
        status: HTTP_STATUS_SERVER_ERROR,
        fallbackBody: "Internal Server Error",
        cacheControl: "no-store",
        contentType: MIME_TYPE_HTML_UTF8,
        renderCustom: renderCustom500,
        renderFn: render500Fn,
        securityHeaders,
        assets,
        publicPath,
    });
}

/**
 * Send 400 Bad Request response with appropriate headers.
 *
 * Returns a plain text "Bad Request" response with:
 * - Status: 400
 * - Content-Type: text/plain; charset=utf-8
 *
 * If a request is provided, automatically handles HEAD requests by stripping body.
 *
 * @param {Request | import("node:http").IncomingMessage | {method: string}} [request] - Optional request for HEAD handling
 * @param {object} [options] - Options object
 * @param {string} [options.message="Bad Request"] - Custom error message
 * @param {Record<string, string> | null} [options.securityHeaders=null] - Custom security headers
 * @returns {Response} 400 response
 */
export function badRequestResponse(request, { message = "Bad Request", securityHeaders = null } = {}) {
    const headers = withSecurityHeaders(
        {
            [HTTP_HEADER_CONTENT_TYPE]: MIME_TYPE_PLAIN_UTF8,
        },
        securityHeaders ?? undefined,
    );

    const response = new Response(message, {
        status: HTTP_STATUS_BAD_REQUEST,
        headers,
    });

    return request ? maybeHeadResponse(response, request) : response;
}

/**
 * Send 414 URI Too Long response with appropriate headers.
 *
 * Returns a plain text "URI Too Long" response with:
 * - Status: 414
 * - Content-Type: text/plain; charset=utf-8
 *
 * If a request is provided, automatically handles HEAD requests by stripping body.
 *
 * @param {Request | import("node:http").IncomingMessage | {method: string}} [request] - Optional request for HEAD handling
 * @param {object} [options] - Options object
 * @param {Record<string, string> | null} [options.securityHeaders=null] - Custom security headers
 * @returns {Response} 414 response
 */
export function uriTooLongResponse(request, { securityHeaders = null } = {}) {
    const headers = withSecurityHeaders(
        {
            [HTTP_HEADER_CONTENT_TYPE]: MIME_TYPE_PLAIN_UTF8,
        },
        securityHeaders ?? undefined,
    );

    const response = new Response("URI Too Long", {
        status: HTTP_STATUS_URI_TOO_LONG,
        headers,
    });

    return request ? maybeHeadResponse(response, request) : response;
}
