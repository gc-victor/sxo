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

import { Buffer } from "node:buffer";
import { Readable } from "node:stream";
import {
    HTTP_HEADER_CONTENT_TYPE,
    HTTP_METHOD_GET,
    HTTP_METHOD_HEAD,
    HTTP_METHOD_OPTIONS,
    HTTP_STATUS_NO_CONTENT,
    HTTP_STATUS_NOT_FOUND,
    MIME_TYPE_PLAIN,
} from "./http-constants.js";

/**
 * HTTP methods that should not have a request body.
 * @type {Set<string>}
 */
const BODYLESS_METHODS = new Set([HTTP_METHOD_GET, HTTP_METHOD_HEAD, HTTP_METHOD_OPTIONS]);

/**
 * Convert a Node.js IncomingMessage to a Web Standard Request.
 *
 * @public
 * @param {import("node:http").IncomingMessage} req - Node.js request object
 * @param {number} port - Server port (used for URL construction when host header is missing)
 * @returns {Request} Web Standard Request object
 */
export function toWebRequest(req, port) {
    // Check if socket is encrypted (TLS) by checking if it's a TLSSocket
    const isEncrypted = req.socket && "encrypted" in req.socket && req.socket.encrypted;
    const protocol = isEncrypted ? "https" : "http";
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
        // @ts-expect-error Readable.toWeb returns a compatible stream for Request body
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
        res.writeHead(HTTP_STATUS_NOT_FOUND, { [HTTP_HEADER_CONTENT_TYPE]: MIME_TYPE_PLAIN });
        res.end("Not found");
        return;
    }

    // Convert headers from Web Standard to plain object
    // Use getSetCookie() for Set-Cookie to preserve multiple values;
    // Headers.forEach() incorrectly joins them with commas.
    const setCookieValues = webResponse.headers.getSetCookie();
    /** @type {{[key: string]: string|string[]}} */
    const headers = {};
    webResponse.headers.forEach((value, key) => {
        if (key.toLowerCase() === "set-cookie") return;
        headers[key] = value;
    });
    if (setCookieValues.length > 0) {
        headers["set-cookie"] = setCookieValues.length === 1 ? setCookieValues[0] : setCookieValues;
    }

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
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // `value` is a Uint8Array; write bytes directly.
            // Using TextDecoder here corrupts binary assets (e.g. .woff2).
            res.write(Buffer.from(value));
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
 * Returns to original response for non-HEAD requests, or a HEAD-stripped
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
    return new Response(null, { status: HTTP_STATUS_NO_CONTENT });
}
