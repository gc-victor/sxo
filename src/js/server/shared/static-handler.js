/**
 * @fileoverview Platform-agnostic static file handler.
 *
 * This module provides a static file handler that works with Web Standard APIs
 * and accepts a platform-specific file reader. This enables code reuse across
 * Node.js, Bun, Deno and Cloudflare Workers.
 *
 * @example
 * // Production usage:
 * const handler = createStaticHandler({
 *   staticDir: "/dist/client",
 *   fileReader: createFileReader,
 * });
 *
 * // Development usage (no caching, skip compression):
 * const handler = createStaticHandler({
 *   staticDir: "/dist/client",
 *   fileReader: createFileReader,
 *   cacheControl: "no-cache",
 *   skipCompression: true,
 * });
 *
 * @module server/shared/static-handler
 */

import { CACHE_IMMUTABLE, CACHE_SHORT, weakEtagFromStat } from "./cache.js";
import {
    HTTP_HEADER_CACHE_CONTROL,
    HTTP_HEADER_CONTENT_ENCODING,
    HTTP_HEADER_CONTENT_TYPE,
    HTTP_HEADER_IF_NONE_MATCH,
    HTTP_METHOD_HEAD,
    HTTP_STATUS_FORBIDDEN,
    HTTP_STATUS_NOT_MODIFIED,
    HTTP_STATUS_OK,
    MIME_TYPE_PLAIN_UTF8,
} from "./http-constants.js";
import { getMimeType, isCompressible } from "./mime-types.js";
import { getBasename, getExtension, isHashedAsset, resolveSafePath, validateAndNormalizePath } from "./path.js";

/**
 * Parse Accept-Encoding header and check if an encoding is acceptable.
 *
 * @param {string} acceptEncoding - Raw Accept-Encoding header value
 * @param {string} encoding - Encoding name to check (e.g., "br", "gzip")
 * @returns {boolean} True if the encoding is acceptable (q > 0)
 */
function acceptsEncoding(acceptEncoding, encoding) {
    if (!acceptEncoding) {
        return false;
    }

    // Parse each encoding directive (e.g., "br", "gzip", "br;q=0.8", "gzip;q=0")
    const directives = acceptEncoding.split(",");
    for (const directive of directives) {
        const parts = directive.trim().split(";");
        const name = parts[0].trim().toLowerCase();
        const qValue = parts.length > 1 ? parseFloat(parts[1].replace(/^q=/i, "").trim()) : 1;

        // Invalid q-value (NaN or out of range) - conservatively treat as not acceptable
        if (Number.isNaN(qValue) || qValue < 0 || qValue > 1) {
            continue;
        }

        if (name === encoding && qValue > 0) {
            return true;
        }
    }

    return false;
}

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
 * @property {(base: string, rel: string) => string | null} [resolveSafePath] - Custom path resolver (for testing)
 */

/**
 * Create a static file handler.
 *
 * The handler returns:
 * - `Response` for static file requests (success, 403, etc.)
 * - `null` if the request should not be handled as a static file
 *
 * @public
 * @param {StaticHandlerOptions} options - Configuration options
 * @returns {(request: Request) => Promise<Response | null>} Static handler function
 */
export function createStaticHandler(options) {
    const { staticDir, fileReader, cacheControl, skipCompression, resolveSafePath: customResolveSafePath } = options;
    const resolver = customResolveSafePath || resolveSafePath;

    /**
     * @param {Request} request
     * @returns {Promise<Response | null>}
     */
    return async (request) => {
        const url = new URL(request.url);
        const pathname = url.pathname;

        // Validate and normalize path
        const normalizedPath = validateAndNormalizePath(pathname);
        if (normalizedPath === null) {
            // Security/traversal attempt
            return new Response("Forbidden", {
                status: HTTP_STATUS_FORBIDDEN,
                headers: { [HTTP_HEADER_CONTENT_TYPE]: MIME_TYPE_PLAIN_UTF8 },
            });
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
        const absPath = resolver(staticDir, rel);
        if (absPath === null) {
            return new Response("Forbidden", {
                status: HTTP_STATUS_FORBIDDEN,
                headers: { [HTTP_HEADER_CONTENT_TYPE]: MIME_TYPE_PLAIN_UTF8 },
            });
        }

        // Check for precompressed variants (skip in dev mode)
        let sendPath = absPath;
        let contentEncoding = null;
        let compressible = false;

        if (!skipCompression) {
            const acceptEncoding = request.headers.get("Accept-Encoding") || "";
            const canBr = acceptsEncoding(acceptEncoding, "br");
            const canGzip = acceptsEncoding(acceptEncoding, "gzip");
            compressible = isCompressible(ext);

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

        // Generate ETag from file stats (for the actual file being served, compressed or uncompressed)
        const etag = weakEtagFromStat(stat);

        // Check If-None-Match for cache validation
        if (etag) {
            const ifNoneMatch = request.headers.get(HTTP_HEADER_IF_NONE_MATCH);
            if (matchesIfNoneMatch(ifNoneMatch, etag, request.method)) {
                // Client has current version, return 304
                const headers304 = new Headers({
                    [HTTP_HEADER_CACHE_CONTROL]: effectiveCacheControl,
                    ETag: etag,
                });

                // Include Vary: Accept-Encoding when compression is enabled and file is compressible
                if (!skipCompression && compressible) {
                    headers304.set("Vary", "Accept-Encoding");
                }

                // For compressed variants, include Content-Encoding to avoid cache key mismatches
                if (contentEncoding) {
                    headers304.set(HTTP_HEADER_CONTENT_ENCODING, contentEncoding);
                }

                return new Response(null, {
                    status: HTTP_STATUS_NOT_MODIFIED,
                    headers: headers304,
                });
            }
        }

        // Build response headers
        const headers = new Headers({
            [HTTP_HEADER_CONTENT_TYPE]: mimeType,
            [HTTP_HEADER_CACHE_CONTROL]: effectiveCacheControl,
        });

        if (etag) {
            headers.set("ETag", etag);
        }

        if (!skipCompression && compressible) {
            headers.set("Vary", "Accept-Encoding");
        }

        if (contentEncoding) {
            headers.set(HTTP_HEADER_CONTENT_ENCODING, contentEncoding);
        }

        // Handle HEAD requests
        if (request.method === HTTP_METHOD_HEAD) {
            return new Response(null, {
                status: HTTP_STATUS_OK,
                headers,
            });
        }

        // Read file content with fallback for compressed variants
        let content = await fileReader.read(sendPath);

        // If compressed variant read fails, fall back to uncompressed version
        if (content === null && contentEncoding !== null) {
            console.error(`Failed to read compressed file: ${sendPath}, falling back to uncompressed: ${absPath}`);

            // Check if uncompressed file exists and can be read
            const uncompressedStat = await fileReader.stat(absPath);
            if (uncompressedStat !== null) {
                // Update sendPath to uncompressed file
                sendPath = absPath;
                const uncompressedEtag = weakEtagFromStat(uncompressedStat);
                if (uncompressedEtag) {
                    headers.set("ETag", uncompressedEtag);
                }

                // Remove Content-Encoding header since we're serving uncompressed
                headers.delete(HTTP_HEADER_CONTENT_ENCODING);
                contentEncoding = null;

                // Try reading uncompressed file
                content = await fileReader.read(sendPath);
            }
        }

        if (content === null) {
            return null;
        }

        return new Response(/** @type {BodyInit} */ (content), {
            status: HTTP_STATUS_OK,
            headers,
        });
    };
}

/**
 * Check whether an `If-None-Match` header matches the current ETag.
 *
 * GET and HEAD use weak comparison, so `W/"abc"` and `"abc"` match.
 * Other methods are ignored here to preserve current static handler behavior.
 *
 * @param {string | null} ifNoneMatch - Raw request header value
 * @param {string} etag - Current response ETag
 * @param {string} method - HTTP request method
 * @returns {boolean} True when the request should return 304
 */
function matchesIfNoneMatch(ifNoneMatch, etag, method) {
    if (!ifNoneMatch || (method !== "GET" && method !== HTTP_METHOD_HEAD)) {
        return false;
    }

    const normalizedEtag = normalizeWeakEntityTag(etag);
    if (normalizedEtag === null) {
        return false;
    }

    for (const candidate of ifNoneMatch.split(",")) {
        const token = candidate.trim();
        if (!token) {
            continue;
        }

        if (token === "*") {
            return true;
        }

        if (normalizeWeakEntityTag(token) === normalizedEtag) {
            return true;
        }
    }

    return false;
}

/**
 * Normalize an entity-tag for weak comparison.
 *
 * @param {string} value - Entity-tag header value
 * @returns {string | null} Entity-tag without weak prefix, or null if invalid
 */
function normalizeWeakEntityTag(value) {
    const trimmed = value.trim();
    const unprefixed = trimmed.startsWith("W/") ? trimmed.slice(2).trim() : trimmed;

    if (unprefixed.length < 2 || !unprefixed.startsWith('"') || !unprefixed.endsWith('"')) {
        return null;
    }

    return unprefixed;
}
