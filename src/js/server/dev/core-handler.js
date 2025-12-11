/**
 * @fileoverview Platform-agnostic dev server request handler.
 *
 * Extracts shared dev server request handling logic used by Node.js, Bun, and Deno adapters.
 * Uses Web Standard Request/Response APIs for portability.
 *
 * Features:
 * - SSE hot-reload endpoint (/hot-replace?href=<path>)
 * - Hot-replace client script serving (/hot-replace.js)
 * - Middleware execution (Web Standard)
 * - Route matching and SSR rendering
 * - CSS asset injection
 * - Hot-reload script injection
 * - Custom 404/500 error pages
 *
 * @module server/dev/core-handler
 */

import { optionsResponse } from "../shared/http-adapters.js";
import { injectCss, normalizePublicPath, renderErrorHtml, routeMatch } from "../utils/index.js";
import { buildHotReplacePayload } from "./core.js";

/**
 * @typedef {object} DevHandlerConfig
 * @property {() => Array<object>} getRoutes - Function returning current routes array
 * @property {(jsxPath: string, options?: object) => Promise<Function>} loadJsxModule - Module loader function
 * @property {string} publicPath - Public base path for assets
 * @property {() => string} getEsbuildError - Function returning current esbuild error (if any)
 * @property {string} hotReplaceClientPath - Path to hot-replace.client.js file
 * @property {(path: string) => Promise<string>} readFile - Platform-specific file reader
 * @property {() => Array<Function>} getMiddleware - Function returning current middleware array
 * @property {() => string | null} resolve404Page - Function returning 404 page path or null
 * @property {() => string | null} resolve500Page - Function returning 500 page path or null
 * @property {object} logger - Logger instance with info, error, warn methods
 */

/**
 * @typedef {object} SSEClient
 * @property {ReadableStreamDefaultController} controller - Stream controller for sending messages
 * @property {object} route - Route object
 * @property {object} params - Route parameters
 * @property {boolean} closed - Whether client connection is closed
 */

/**
 * Encode a string to base64 with Unicode support.
 *
 * Standard btoa() only accepts Latin1 (ISO-8859-1) strings and throws InvalidCharacterError
 * for any Unicode characters outside that range. This function properly handles Unicode by:
 * 1. Converting the string to UTF-8 bytes using TextEncoder
 * 2. Converting bytes to a binary string
 * 3. Encoding the binary string with btoa()
 *
 * @param {string} str - String to encode (supports full Unicode range)
 * @returns {string} Base64-encoded string
 * @throws {TypeError} If str is not a string
 * @example
 * base64EncodeUnicode('Hello 世界 🌍'); // Works correctly
 * @example
 * base64EncodeUnicode('Simple ASCII'); // Also works
 */
function base64EncodeUnicode(str) {
    const bytes = new TextEncoder().encode(str);
    const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join("");
    return btoa(binString);
}

/**
 * Create a platform-agnostic dev server request handler.
 *
 * @param {DevHandlerConfig} config - Handler configuration
 * @returns {(request: Request) => Promise<Response>} Request handler function
 * @throws {Error} If required config properties are missing
 * @public
 */
export function createDevHandler(config) {
    const {
        getRoutes,
        loadJsxModule,
        publicPath,
        getEsbuildError,
        hotReplaceClientPath,
        readFile,
        getMiddleware = () => [],
        resolve404Page,
        resolve500Page,
        logger,
    } = config;

    // Validate required config
    if (typeof getRoutes !== "function") {
        throw new Error("getRoutes function is required");
    }
    if (typeof loadJsxModule !== "function") {
        throw new Error("loadJsxModule function is required");
    }

    /** @type {SSEClient[]} */
    let sseClients = [];

    // Shared TextEncoder for SSE messages
    const sseEncoder = new TextEncoder();

    /**
     * Handle incoming HTTP request.
     *
     * @param {Request} request - Web Standard Request
     * @returns {Promise<Response>} Web Standard Response
     */
    async function handleRequest(request) {
        const url = new URL(request.url);
        const pathname = url.pathname;
        const href = url.searchParams.get("href");
        const isHead = request.method === "HEAD";

        // --- Hot-replace client script serving ---
        if (pathname === "/hot-replace.js") {
            try {
                const js = await readFile(hotReplaceClientPath);
                return new Response(js, {
                    status: 200,
                    headers: { "Content-Type": "application/javascript; charset=utf-8" },
                });
            } catch {
                return new Response("Not found", {
                    status: 404,
                    headers: { "Content-Type": "text/plain" },
                });
            }
        }

        // --- SSE hot-reload endpoint ---
        if (pathname === "/hot-replace" && href) {
            return handleSSE(request, href);
        }

        // --- SSE without href parameter ---
        if (pathname === "/hot-replace") {
            return new Response("Missing href parameter", {
                status: 400,
                headers: { "Content-Type": "text/plain" },
            });
        }

        // --- OPTIONS requests ---
        if (request.method === "OPTIONS") {
            return optionsResponse();
        }

        // --- Middleware execution ---
        const middleware = getMiddleware();
        if (middleware.length > 0) {
            try {
                for (const mw of middleware) {
                    const result = await mw(request);
                    if (result instanceof Response) {
                        if (isHead) {
                            return new Response(null, {
                                status: result.status,
                                headers: result.headers,
                            });
                        }
                        return result;
                    }
                }
            } catch (err) {
                logger?.error?.({ err }, "Middleware error");
                // Continue to normal handling
            }
        }

        // --- Route matching and SSR ---
        let decodedPathname;
        try {
            decodedPathname = decodeURIComponent(pathname);
        } catch {
            return new Response("Bad Request", {
                status: 400,
                headers: { "Content-Type": "text/plain" },
            });
        }

        const routes = getRoutes();
        const found = routeMatch(decodedPathname, routes);

        // --- 404 handling ---
        if (!found) {
            return await handle404(isHead);
        }

        // --- Invalid slug ---
        if (found.invalid) {
            return new Response("Invalid parameters", {
                status: 400,
                headers: { "Content-Type": "text/plain" },
            });
        }

        const { route, params } = found;

        // --- SSR rendering ---
        try {
            const jsxFn = await loadJsxModule(route.jsx);
            let page = await jsxFn(params);

            const isHtml = /^<html[\s>]/i.test(page);
            if (!isHtml) {
                const headers = { "Content-Type": "text/html; charset=utf-8" };
                if (isHead) {
                    return new Response(null, { status: 200, headers });
                }
                return new Response(page, { status: 200, headers });
            }

            // Inject built CSS assets
            const normalizedPublicPath = normalizePublicPath(publicPath);
            if (route?.assets?.css && isHtml) {
                page = injectCss(page, route.assets.css, normalizedPublicPath);
            }

            // Inject hot-reload script before </head>
            const hotReplaceScript = `
            <script type="module">
                import { hotReplace } from "/hot-replace.js";
                hotReplace('${decodedPathname}');
            </script>
        `;
            page = page.replace(/<\/head>/i, `${hotReplaceScript}\n</head>`);

            const headers = { "Content-Type": "text/html; charset=utf-8" };
            if (isHead) {
                return new Response(null, { status: 200, headers });
            }
            return new Response(`<!doctype html>\n${page}`, { status: 200, headers });
        } catch (err) {
            logger?.error?.({ err }, "SSR error");
            return await handle500(err, isHead);
        }
    }

    /**
     * Handle SSE hot-reload endpoint.
     *
     * @param {Request} request
     * @param {string} href
     * @returns {Response}
     */
    function handleSSE(request, href) {
        const routes = getRoutes();
        const found = routeMatch(href, routes);

        const sseHeaders = {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        };

        // Add CORS header for same origin (dev SSE convenience)
        const origin = request.headers.get("origin");
        const host = request.headers.get("host");
        if (origin?.endsWith(`://${host}`)) {
            sseHeaders["Access-Control-Allow-Origin"] = origin;
        }

        if (!found || found.invalid) {
            return new Response(null, { status: 200, headers: sseHeaders });
        }

        // Create ReadableStream for SSE
        /** @type {SSEClient | undefined} */
        let clientRef;
        const stream = new ReadableStream({
            async start(controller) {
                clientRef = {
                    controller,
                    route: found.route,
                    params: found.params || {},
                    closed: false,
                };
                sseClients.push(clientRef);

                // Send initial payload
                try {
                    const esbuildError = getEsbuildError();
                    let data;
                    if (esbuildError) {
                        data = JSON.stringify({ body: renderErrorHtml(esbuildError) });
                    } else {
                        const jsxFn = await loadJsxModule(clientRef.route.jsx);
                        data = await buildHotReplacePayload({
                            route: clientRef.route,
                            params: clientRef.params,
                            jsxFn,
                            publicPath,
                        });
                    }
                    controller.enqueue(sseEncoder.encode(`id: hot-replace\ndata: ${base64EncodeUnicode(data)}\nretry: 250\n\n`));
                } catch (err) {
                    const data = JSON.stringify({ body: renderErrorHtml(err) });
                    controller.enqueue(sseEncoder.encode(`id: hot-replace\ndata: ${base64EncodeUnicode(data)}\nretry: 250\n\n`));
                }
            },
            cancel() {
                // Mark client as closed on disconnect
                if (clientRef) {
                    clientRef.closed = true;
                }
                sseClients = sseClients.filter((c) => c !== clientRef);
            },
        });

        return new Response(stream, { status: 200, headers: sseHeaders });
    }

    /**
     * Handle 404 response with optional custom page.
     *
     * @param {boolean} isHead
     * @returns {Promise<Response>}
     */
    async function handle404(isHead) {
        try {
            const special404 = resolve404Page?.();
            if (special404) {
                const jsx404 = await loadJsxModule(special404);
                const page404 = await jsx404({});
                const isHtml404 = /^<html[\s>]/i.test(page404);
                if (isHtml404) {
                    const headers = { "Content-Type": "text/html; charset=utf-8" };
                    if (isHead) {
                        return new Response(null, { status: 404, headers });
                    }
                    return new Response(`<!doctype html>\n${page404}`, { status: 404, headers });
                }
            }
        } catch (e) {
            logger?.error?.({ err: e }, "Failed to render custom 404 page");
        }

        const headers = { "Content-Type": "text/plain" };
        if (isHead) {
            return new Response(null, { status: 404, headers });
        }
        return new Response("Not found", { status: 404, headers });
    }

    /**
     * Handle 500 response with optional custom page.
     *
     * @param {Error} err
     * @param {boolean} isHead
     * @returns {Promise<Response>}
     */
    async function handle500(err, isHead) {
        try {
            const special500 = resolve500Page?.();
            if (special500) {
                const jsx500 = await loadJsxModule(special500);
                const page500 = await jsx500({ error: err });
                const isHtml500 = /^<html[\s>]/i.test(page500);
                if (isHtml500) {
                    const headers = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" };
                    if (isHead) {
                        return new Response(null, { status: 500, headers });
                    }
                    return new Response(`<!doctype html>\n${page500}`, { status: 500, headers });
                }
            }
        } catch (err500) {
            logger?.error?.({ err: err500 }, "Failed to render custom 500 page");
        }

        const headers = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" };
        if (isHead) {
            return new Response(null, { status: 500, headers });
        }
        return new Response(renderErrorHtml(err), { status: 500, headers });
    }

    /**
     * Broadcast hot reload to all connected SSE clients.
     *
     * @param {() => Promise<void>} [reloadModules] - Optional function to reload modules before broadcast
     * @returns {Promise<void>}
     */
    async function broadcastReload(reloadModules) {
        if (reloadModules) {
            await reloadModules();
        }

        // Clean up closed clients before broadcasting
        sseClients = sseClients.filter((c) => !c.closed);

        const esbuildError = getEsbuildError();

        // Broadcast to all connected clients
        for (const client of sseClients) {
            if (client.closed) continue;
            try {
                let data;
                if (esbuildError) {
                    data = JSON.stringify({ body: renderErrorHtml(esbuildError) });
                } else {
                    const jsxFn = await loadJsxModule(client.route.jsx);
                    data = await buildHotReplacePayload({
                        route: client.route,
                        params: client.params,
                        jsxFn,
                        publicPath,
                    });
                }
                client.controller.enqueue(sseEncoder.encode(`id: hot-replace\ndata: ${base64EncodeUnicode(data)}\nretry: 250\n\n`));
            } catch {
                // Mark client as closed if enqueue fails
                client.closed = true;
            }
        }

        logger?.info?.("page::reloaded");
    }

    /**
     * Get the number of connected SSE clients.
     *
     * @returns {number}
     */
    function getClientCount() {
        return sseClients.filter((c) => !c.closed).length;
    }

    // Attach utility methods to handler for adapter use
    handleRequest.broadcastReload = broadcastReload;
    handleRequest.getClientCount = getClientCount;

    return handleRequest;
}
