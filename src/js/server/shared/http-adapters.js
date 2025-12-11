/**
 * @fileoverview HTTP adapter utilities for converting between Node.js and Web Standard APIs.
 *
 * This module provides bidirectional conversion between Node.js HTTP primitives
 * (IncomingMessage, ServerResponse) and Web Standard APIs (Request, Response).
 * Used to enable a unified Web Standard middleware interface across all adapters.
 *
 * @example
 * // In a Node.js HTTP handler:
 * const webRequest = toWebRequest(req, 3000);
 * const webResponse = await middleware(webRequest);
 * await fromWebResponse(webResponse, req, res);
 *
 * @module server/shared/http-adapters
 */

import { Readable } from "node:stream";
import { CACHE_404, CACHE_500 } from "./cache.js";
import {
    HTTP_METHOD_GET,
    HTTP_METHOD_HEAD,
    HTTP_STATUS_BAD_REQUEST,
    HTTP_STATUS_NOT_FOUND,
    HTTP_STATUS_SERVER_ERROR,
    HTTP_STATUS_URI_TOO_LONG,
} from "./http-constants.js";

/**
 * HTTP methods that should not have a request body.
 * @type {Set<string>}
 */
const BODYLESS_METHODS = new Set([HTTP_METHOD_GET, HTTP_METHOD_HEAD, "OPTIONS"]);

/**
 * Convert a Node.js IncomingMessage to a Web Standard Request.
 *
 * @public
 * @param {import("node:http").IncomingMessage} req - Node.js request object
 * @param {number} port - Server port (used for URL construction when host header is missing)
 * @returns {Request} Web Standard Request object
 */
export function toWebRequest(req, port) {
    const protocol = req.socket?.encrypted ? "https" : "http";
    const host = req.headers.host || `localhost:${port}`;
    const url = `${protocol}://${host}${req.url}`;

    const method = req.method || HTTP_METHOD_GET;
    const headers = new Headers();

    // Convert Node.js headers to Web Standard Headers
    for (const [key, value] of Object.entries(req.headers)) {
        if (value === undefined) continue;
        if (Array.isArray(value)) {
            // Handle array values (e.g., set-cookie)
            for (const v of value) {
                headers.append(key, v);
            }
        } else {
            headers.set(key, value);
        }
    }

    /** @type {RequestInit} */
    const init = {
        method,
        headers,
    };

    // Only include body for methods that can have a body
    if (!BODYLESS_METHODS.has(method.toUpperCase())) {
        // Convert Node.js Readable stream to Web ReadableStream
        init.body = Readable.toWeb(req);
        // Required for streaming body
        // @ts-expect-error duplex is a valid option for streaming requests
        init.duplex = "half";
    }

    return new Request(url, init);
}

/**
 * Convert a Web Standard Response to Node.js response.
 *
 * Handles:
 * - Status code and headers
 * - Text and streaming bodies
 * - HEAD requests (no body written)
 * - Null responses (returns 404)
 *
 * @public
 * @param {Response | null} webResponse - Web Standard Response object (null returns 404)
 * @param {import("node:http").IncomingMessage | {method: string}} req - Node.js request (for HEAD detection)
 * @param {import("node:http").ServerResponse} res - Node.js response object
 * @returns {Promise<void>}
 */
export async function fromWebResponse(webResponse, req, res) {
    // Handle null response as 404
    if (webResponse === null) {
        res.writeHead(HTTP_STATUS_NOT_FOUND, { "Content-Type": "text/plain" });
        res.end("Not found");
        return;
    }

    // Convert headers from Web Standard to plain object
    const headers = {};
    webResponse.headers.forEach((value, key) => {
        headers[key] = value;
    });

    // Write status and headers
    res.writeHead(webResponse.status, headers);

    // HEAD requests should not have a body
    if (isHeadRequest(req)) {
        res.end();
        return;
    }

    // Handle null/empty body
    if (!webResponse.body) {
        res.end();
        return;
    }

    // Stream the response body
    const reader = webResponse.body.getReader();
    const decoder = new TextDecoder();
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            // Decode Uint8Array chunks to string for Node.js response
            res.write(decoder.decode(value, { stream: true }));
        }
        // Flush any remaining bytes in the decoder
        const remaining = decoder.decode();
        if (remaining) {
            res.write(remaining);
        }
    } finally {
        reader.releaseLock();
    }
    res.end();
}

/**
 * Check if a request is a HEAD request.
 *
 * Works with both Web Standard Request and Node.js IncomingMessage.
 *
 * @public
 * @param {Request | import("node:http").IncomingMessage | {method: string}} requestOrReq - Request object
 * @returns {boolean} True if the request method is HEAD
 */
export function isHeadRequest(requestOrReq) {
    const method = requestOrReq.method || "";
    return method.toUpperCase() === HTTP_METHOD_HEAD;
}

/**
 * Convert a Response to HEAD-compatible Response (strip body, keep headers).
 *
 * Creates a new Response with null body but preserves status code and headers.
 * Used to efficiently handle HEAD requests without transmitting response bodies.
 *
 * @public
 * @param {Response} response - Original response
 * @returns {Response} Response with null body but same status/headers
 *
 * @example
 * ```javascript
 * const response = new Response("Hello", { status: 200 });
 * const headResponse = toHeadResponse(response);
 * // Response with status 200, original headers, but null body
 * ```
 */
export function toHeadResponse(response) {
    return new Response(null, {
        status: response.status,
        headers: response.headers,
    });
}

/**
 * Conditionally strip body for HEAD requests.
 *
 * Returns the original response for non-HEAD requests, or a HEAD-stripped
 * response (null body, same headers/status) for HEAD requests.
 *
 * @public
 * @param {Response} response - Original response
 * @param {Request | import("node:http").IncomingMessage | {method: string}} request - Request object
 * @returns {Response} Original response or HEAD-stripped response
 *
 * @example
 * ```javascript
 * const response = new Response("Hello", { status: 200 });
 * const headRequest = new Request("http://example.com", { method: "HEAD" });
 * const result = maybeHeadResponse(response, headRequest);
 * // Returns Response with null body for HEAD request
 *
 * const getRequest = new Request("http://example.com", { method: "GET" });
 * const result2 = maybeHeadResponse(response, getRequest);
 * // Returns original response with body for GET request
 * ```
 */
export function maybeHeadResponse(response, request) {
    return isHeadRequest(request) ? toHeadResponse(response) : response;
}

/**
 * Create a 404 Not Found response with appropriate headers.
 *
 * Returns a plain text "Not Found" response with:
 * - Status: 404
 * - Content-Type: text/plain; charset=utf-8
 * - Cache-Control: public, max-age=0, must-revalidate
 *
 * If a request is provided, automatically handles HEAD requests by stripping the body.
 *
 * @public
 * @param {Request | import("node:http").IncomingMessage | {method: string}} [request] - Optional request for HEAD handling
 * @returns {Response} 404 response
 *
 * @example
 * ```javascript
 * // Simple 404
 * return notFoundResponse();
 *
 * // 404 with HEAD request handling
 * return notFoundResponse(request);
 * ```
 */
export function notFoundResponse(request = null) {
    const response = new Response("Not Found", {
        status: HTTP_STATUS_NOT_FOUND,
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": CACHE_404,
        },
    });
    return request ? maybeHeadResponse(response, request) : response;
}

/**
 * Create a 500 Internal Server Error response with appropriate headers.
 *
 * Returns a plain text "Internal Server Error" response with:
 * - Status: 500
 * - Content-Type: text/plain; charset=utf-8
 * - Cache-Control: no-store
 *
 * If a request is provided, automatically handles HEAD requests by stripping the body.
 *
 * @public
 * @param {Request | import("node:http").IncomingMessage | {method: string}} [request] - Optional request for HEAD handling
 * @returns {Response} 500 response
 *
 * @example
 * ```javascript
 * // Simple 500
 * return serverErrorResponse();
 *
 * // 500 with HEAD request handling
 * return serverErrorResponse(request);
 * ```
 */
export function serverErrorResponse(request = null) {
    const response = new Response("Internal Server Error", {
        status: HTTP_STATUS_SERVER_ERROR,
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": CACHE_500,
        },
    });
    return request ? maybeHeadResponse(response, request) : response;
}

/**
 * Create a 400 Bad Request response with appropriate headers.
 *
 * Returns a plain text "Bad Request" response with:
 * - Status: 400
 * - Content-Type: text/plain; charset=utf-8
 *
 * If a request is provided, automatically handles HEAD requests by stripping the body.
 *
 * @public
 * @param {Request | import("node:http").IncomingMessage | {method: string}} [request] - Optional request for HEAD handling
 * @param {string} [message="Bad Request"] - Custom error message
 * @returns {Response} 400 response
 *
 * @example
 * ```javascript
 * // Simple 400
 * return badRequestResponse();
 *
 * // 400 with custom message
 * return badRequestResponse(request, "Invalid parameters");
 * ```
 */
export function badRequestResponse(request = null, message = "Bad Request") {
    const response = new Response(message, {
        status: HTTP_STATUS_BAD_REQUEST,
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
        },
    });
    return request ? maybeHeadResponse(response, request) : response;
}

/**
 * Create a 414 URI Too Long response with appropriate headers.
 *
 * Returns a plain text "URI Too Long" response with:
 * - Status: 414
 * - Content-Type: text/plain; charset=utf-8
 *
 * If a request is provided, automatically handles HEAD requests by stripping the body.
 *
 * @public
 * @param {Request | import("node:http").IncomingMessage | {method: string}} [request] - Optional request for HEAD handling
 * @returns {Response} 414 response
 *
 * @example
 * ```javascript
 * // Simple 414
 * return uriTooLongResponse();
 *
 * // 414 with HEAD request handling
 * return uriTooLongResponse(request);
 * ```
 */
export function uriTooLongResponse(request = null) {
    const response = new Response("URI Too Long", {
        status: HTTP_STATUS_URI_TOO_LONG,
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
        },
    });
    return request ? maybeHeadResponse(response, request) : response;
}

/**
 * Create a 204 No Content response for OPTIONS preflight requests.
 *
 * Returns an empty response with:
 * - Status: 204 No Content
 *
 * @public
 * @returns {Response} 204 response
 *
 * @example
 * ```javascript
 * // Handle OPTIONS preflight
 * if (request.method === "OPTIONS") {
 *   return optionsResponse();
 * }
 * ```
 */
export function optionsResponse() {
    return new Response(null, { status: 204 });
}
