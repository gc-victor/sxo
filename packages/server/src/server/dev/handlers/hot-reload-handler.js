/**
 * @fileoverview Dev server hot-reload SSE handler.
 *
 * Handles Server-Sent Events (SSE) endpoint for hot-reload.
 *
 * @module server/dev/handlers/hot-reload-handler
 */

import {
    HTTP_HEADER_ACCESS_CONTROL_ALLOW_ORIGIN,
    HTTP_HEADER_CACHE_CONTROL,
    HTTP_HEADER_CONTENT_TYPE,
    MIME_TYPE_EVENT_STREAM,
    MIME_TYPE_JS_UTF8,
    MIME_TYPE_PLAIN,
} from "../../shared/http-constants.js";
import { renderErrorHtml } from "../../utils/html-utils.js";
import { normalizePublicPath } from "../../utils/inject-assets.js";
import { logger } from "../../utils/logger.js";
import { routeMatch } from "../../utils/route-match.js";

/**
 * Create a hot-reload SSE handler.
 *
 * @param {object} config - Handler configuration
 * @param {() => Route[]} config.getRoutes - Routes getter
 * @param {(jsxPath: string, options?: object) => Promise<Function>} config.loadJsxModule - Module loader
 * @param {() => string} config.getEsbuildError - Error message getter
 * @param {string} config.hotReplaceClientPath - Path to hot-replace client script
 * @param {Function} config.readFile - File reader for hot-replace client script
 * @param {() => Function[]} [config.getMiddleware] - Middleware getter
 * @param {() => string | null} [config.resolve404Page] - 404 page resolver
 * @param {() => string | null} [config.resolve500Page] - 500 page resolver
 * @param {number} [config.maxSseClients=10] - Maximum concurrent SSE clients
 * @returns {{
 *   handler: (request: Request) => Promise<Response>,
 *   handleSSE: (request: Request, href: string) => Response,
 *   broadcastReload: (reloadFiles?: () => Promise<void>) => Promise<void>,
 *   getClientCount: () => number,
 *   getNormalizedPublicPath: () => string,
 *   buildPayloadForClient: (client: any, esbuildError: string | null) => Promise<string>,
 *   broadcastToClient: (client: any, payload: string) => void
 * }} Hot-reload utilities
 * @public
 */
export function createHotReloadHandler(config) {
    const { getRoutes, loadJsxModule, getEsbuildError, hotReplaceClientPath, readFile, maxSseClients } = config;

    if (typeof getRoutes !== "function") {
        throw new Error("getRoutes function is required");
    }
    if (typeof loadJsxModule !== "function") {
        throw new Error("loadJsxModule function is required");
    }

    const MAX_SSE_CLIENTS = maxSseClients ?? 10;
    const sseEncoder = new TextEncoder();

    /** @type {Array<{ controller: ReadableStreamDefaultController, route: any, params: Record<string, string>, closed: boolean }>} */
    let sseClients = [];

    /**
     * Get normalized public path for hot-reload.
     * @returns {string} Normalized public path with trailing slash for non-empty paths
     */
    function getNormalizedPublicPath() {
        const rawPath = process.env.PUBLIC_PATH ?? "/";
        return normalizePublicPath(rawPath);
    }

    /**
     * Build hot-reload payload for a client.
     * @param {{ route: Route, params: Record<string, string>, request?: Request }} client - Client with route, params, and optional request (preserves cookies/headers)
     * @param {string | null} esbuildError - Error from esbuild, or null
     * @returns {Promise<string>} JSON payload
     */
    async function buildPayload(client, esbuildError) {
        try {
            if (esbuildError) {
                return JSON.stringify({ body: renderErrorHtml(esbuildError) });
            }

            const jsxFn = await loadJsxModule(client.route.jsx);
            const { buildHotReplacePayload } = await import("../core.js");
            return await buildHotReplacePayload({
                route: client.route,
                params: client.params,
                jsxFn,
                publicPath: getNormalizedPublicPath(),
                request: client.request,
            });
        } catch (err) {
            return JSON.stringify({ body: renderErrorHtml(err) });
        }
    }

    /**
     * Encode string to base64.
     * @param {string} str - String to encode
     * @returns {string} Base64-encoded string
     */
    function base64Encode(str) {
        const bytes = sseEncoder.encode(str);
        const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join("");
        return btoa(binString);
    }

    /**
     * Send SSE message to a client.
     * @param {{ controller: ReadableStreamDefaultController, closed: boolean }} client - Client with controller
     * @param {string} payload - JSON payload
     */
    function sendToClient(client, payload) {
        try {
            const message = `id: hot-replace\ndata: ${base64Encode(payload)}\nretry: 250\n\n`;
            client.controller.enqueue(sseEncoder.encode(message));
        } catch {
            client.closed = true;
        }
    }

    /**
     * Handle incoming HTTP request.
     * @param {Request} request - Incoming request
     * @returns {Promise<Response>} SSE response or 404
     */
    async function handler(request) {
        const url = new URL(request.url);
        const href = url.searchParams.get("href");

        if (url.pathname === "/hot-replace.js") {
            try {
                const js = await readFile(hotReplaceClientPath);
                return new Response(js, {
                    status: 200,
                    headers: { [HTTP_HEADER_CONTENT_TYPE]: MIME_TYPE_JS_UTF8 },
                });
            } catch {
                return new Response("Not found", {
                    status: 404,
                    headers: { [HTTP_HEADER_CONTENT_TYPE]: MIME_TYPE_PLAIN },
                });
            }
        }

        if (url.pathname === "/hot-replace") {
            if (!href) {
                return new Response("Missing href parameter", {
                    status: 400,
                    headers: { [HTTP_HEADER_CONTENT_TYPE]: MIME_TYPE_PLAIN },
                });
            }
            return handleSSE(request, href);
        }

        return new Response("Not found", {
            status: 404,
            headers: { [HTTP_HEADER_CONTENT_TYPE]: MIME_TYPE_PLAIN },
        });
    }

    /**
     * Handle SSE hot-reload endpoint.
     * @param {Request} request - Incoming request
     * @param {string} href - Route path parameter
     * @returns {Response} SSE response
     */
    function handleSSE(request, href) {
        const routes = getRoutes();
        const match = routeMatch(href, /** @type {Array<{ path?: string; filename: string; jsx: string }>} */ (routes));

        const sseHeaders = {
            [HTTP_HEADER_CONTENT_TYPE]: MIME_TYPE_EVENT_STREAM,
            [HTTP_HEADER_CACHE_CONTROL]: "no-cache",
            Connection: "keep-alive",
        };

        const origin = request.headers.get("origin");
        const host = request.headers.get("host");
        if (origin?.endsWith(`://${host}`)) {
            sseHeaders[HTTP_HEADER_ACCESS_CONTROL_ALLOW_ORIGIN] = origin;
        }

        if (!match || ("invalid" in match && match.invalid)) {
            return new Response(null, { status: 200, headers: sseHeaders });
        }

        // Construct a page request preserving the SSE request's headers (cookies, auth, etc.)
        const pageUrl = new URL(href, request.url);
        const pageRequest = new Request(pageUrl, { headers: request.headers });

        /** @type {{ controller: ReadableStreamDefaultController, route: Route, params: Record<string, string>, request: Request, closed: boolean } | undefined} */
        let clientRef;

        const stream = new ReadableStream({
            async start(controller) {
                const matchResult = /** @type {{ route: Route, params: Record<string, string> }} */ (match);
                clientRef = {
                    controller,
                    route: matchResult.route,
                    params: matchResult.params || {},
                    request: pageRequest,
                    closed: false,
                };

                if (sseClients.length >= MAX_SSE_CLIENTS) {
                    const oldest = sseClients.shift();
                    if (oldest && !oldest.closed) {
                        oldest.closed = true;
                        logger.info("SSE client dropped due to cap");
                    }
                }

                sseClients.push(clientRef);

                const payload = await buildPayload(clientRef, getEsbuildError());
                sendToClient(clientRef, payload);
            },
            cancel() {
                if (clientRef) {
                    clientRef.closed = true;
                    sseClients = sseClients.filter((c) => c !== clientRef);
                }
            },
        });

        return new Response(stream, { status: 200, headers: sseHeaders });
    }

    /**
     * Broadcast hot reload to all connected clients.
     * @param {(() => Promise<void>) | undefined} [reloadFiles] - Optional reload function
     * @returns {Promise<void>}
     */
    async function broadcastReload(reloadFiles) {
        if (reloadFiles) {
            await reloadFiles();
        }

        sseClients = sseClients.filter((c) => !c.closed);
        const esbuildError = getEsbuildError();

        for (const client of sseClients) {
            const payload = await buildPayload(client, esbuildError);
            sendToClient(client, payload);
        }

        logger.info("page::reloaded");
    }

    /**
     * Get number of connected SSE clients.
     * @returns {number} Active client count
     */
    function getClientCount() {
        return sseClients.filter((c) => !c.closed).length;
    }

    return {
        handler,
        handleSSE,
        broadcastReload,
        getClientCount,
        getNormalizedPublicPath,
        buildPayloadForClient: buildPayload,
        broadcastToClient: sendToClient,
    };
}
