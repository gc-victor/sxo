/**
 * @fileoverview Platform-agnostic static file handler.
 *
 * This module provides a static file handler that works with Web Standard APIs
 * and accepts a platform-specific file reader. This enables code reuse across
 * Node.js, Bun, Deno, and Cloudflare Workers.
 *
 * @example
 * // Production usage:
 * const handler = createStaticHandler({
 *   staticDir: "/dist/client",
 *   fileReader: nodeFileReader,
 * });
 *
 * // Development usage (no caching, skip compression):
 * const handler = createStaticHandler({
 *   staticDir: "/dist/client",
 *   fileReader: nodeFileReader,
 *   cacheControl: "no-cache",
 *   skipCompression: true,
 * });
 *
 * @module server/shared/static-handler
 */

import { CACHE_IMMUTABLE, CACHE_SHORT, weakEtagFromStat } from "./cache.js";
import { HTTP_METHOD_HEAD, HTTP_STATUS_FORBIDDEN, HTTP_STATUS_NOT_MODIFIED, HTTP_STATUS_OK } from "./http-constants.js";
import { getMimeType, isCompressible } from "./mime-types.js";
import { getBasename, getExtension, isHashedAsset, normalizePath, resolveSafePath } from "./path.js";

/**
 * @typedef {object} FileReader
 * @property {(path: string) => Promise<boolean>} exists - Check if file exists
 * @property {(path: string) => Promise<{ size: number, mtime: Date } | null>} stat - Get file stats
 * @property {(path: string) => Promise<Uint8Array | null>} read - Read file content
 */

/**
 * @typedef {object} StaticHandlerOptions
 * @property {string} staticDir - Root directory for static files (absolute path)
 * @property {FileReader} fileReader - Platform-specific file reader implementation
 * @property {string} [cacheControl] - Override Cache-Control header (e.g., "no-cache" for dev)
 * @property {boolean} [skipCompression] - Skip precompressed variant negotiation (for dev)
 */

/**
 * Create a static file handler.
 *
 * The handler returns:
 * - `Response` for static file requests (success, 403, etc.)
 * - `null` if the request should not be handled as a static file
 *
 * @public
 * @param {StaticHandlerOptions} options - Handler configuration
 * @returns {(request: Request) => Promise<Response | null>} Request handler function
 */
export function createStaticHandler({ staticDir, fileReader, cacheControl, skipCompression = false }) {
    /**
     * Handle a request for a static file.
     *
     * @param {Request} request - Web Standard Request
     * @returns {Promise<Response | null>} Response or null if not a static file request
     */
    return async function handleStaticRequest(request) {
        const url = new URL(request.url);
        const pathname = url.pathname;

        // Normalize path and check for security issues
        const normalizedPath = normalizePath(pathname);
        if (normalizedPath === null) {
            // Path contains traversal or invalid characters
            // Check if it's a traversal attempt (has ..) vs just invalid encoding
            if (pathname.includes("..")) {
                return new Response("Forbidden", {
                    status: HTTP_STATUS_FORBIDDEN,
                    headers: { "Content-Type": "text/plain; charset=utf-8" },
                });
            }
            return null;
        }

        const { rel } = normalizedPath;

        // Get extension and MIME type
        const ext = getExtension(pathname);
        const mimeType = getMimeType(ext);

        // Only handle requests with known extensions
        if (!ext || !mimeType) {
            return null;
        }

        // Resolve safe path under static directory
        const absPath = resolveSafePath(staticDir, rel);
        if (absPath === null) {
            return new Response("Forbidden", {
                status: HTTP_STATUS_FORBIDDEN,
                headers: { "Content-Type": "text/plain; charset=utf-8" },
            });
        }

        // Check for precompressed variants (skip in dev mode)
        let sendPath = absPath;
        let contentEncoding = null;

        if (!skipCompression) {
            const acceptEncoding = request.headers.get("Accept-Encoding") || "";
            const canBr = /\bbr\b/.test(acceptEncoding);
            const canGzip = /\bgzip\b/.test(acceptEncoding);
            const compressible = isCompressible(ext);

            if (compressible) {
                if (canBr && (await fileReader.exists(`${absPath}.br`))) {
                    sendPath = `${absPath}.br`;
                    contentEncoding = "br";
                } else if (canGzip && (await fileReader.exists(`${absPath}.gz`))) {
                    sendPath = `${absPath}.gz`;
                    contentEncoding = "gzip";
                }
            }
        }

        // Check if file exists and get stats (for ETag)
        const stat = await fileReader.stat(sendPath);
        if (stat === null) {
            return null;
        }

        // Compute cache control (inline getCacheControl logic)
        const basename = getBasename(absPath);
        const effectiveCacheControl = cacheControl ?? (isHashedAsset(basename) ? CACHE_IMMUTABLE : CACHE_SHORT);

        // Generate ETag from file stats (skip for compressed variants)
        const etag = contentEncoding ? null : weakEtagFromStat(stat);

        // Check If-None-Match for cache validation
        if (etag) {
            const ifNoneMatch = request.headers.get("If-None-Match");
            if (ifNoneMatch === etag) {
                // Client has current version, return 304
                return new Response(null, {
                    status: HTTP_STATUS_NOT_MODIFIED,
                    headers: {
                        "Cache-Control": effectiveCacheControl,
                        ETag: etag,
                    },
                });
            }
        }

        // Build response headers
        const headers = new Headers({
            "Content-Type": mimeType,
            "Cache-Control": effectiveCacheControl,
        });

        // Add ETag header if available
        if (etag) {
            headers.set("ETag", etag);
        }

        // Only add Vary header if compression is enabled
        if (!skipCompression) {
            headers.set("Vary", "Accept-Encoding");
        }

        if (contentEncoding) {
            headers.set("Content-Encoding", contentEncoding);
        }

        // Handle HEAD requests
        if (request.method === HTTP_METHOD_HEAD) {
            return new Response(null, {
                status: HTTP_STATUS_OK,
                headers,
            });
        }

        // Read file content
        const content = await fileReader.read(sendPath);
        if (content === null) {
            return null;
        }

        return new Response(content, {
            status: HTTP_STATUS_OK,
            headers,
        });
    };
}
