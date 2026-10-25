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

        const { sendPath, contentEncoding, compressible } = await selectCompressedVariant({
            request,
            absPath,
            ext,
            fileReader,
            skipCompression,
        });

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

        if (etag) {
            const notModified = createNotModifiedResponse({
                request,
                etag,
                cacheControl: effectiveCacheControl,
                skipCompression,
                compressible,
                contentEncoding,
            });
            if (notModified) return notModified;
        }

        const headers = createResponseHeaders({
            mimeType,
            cacheControl: effectiveCacheControl,
            etag,
            skipCompression,
            compressible,
            contentEncoding,
        });

        // Handle HEAD requests
        if (request.method === HTTP_METHOD_HEAD) {
            return new Response(null, {
                status: HTTP_STATUS_OK,
                headers,
            });
        }

        const content = await readStaticFile({ fileReader, sendPath, absPath, contentEncoding, headers });

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
 * Select a precompressed file when the request accepts an available variant.
 * @param {{ request: Request, absPath: string, ext: string, fileReader: FileReader, skipCompression?: boolean }} options
 * @returns {Promise<{ sendPath: string, contentEncoding: string | null, compressible: boolean }>}
 */
async function selectCompressedVariant({ request, absPath, ext, fileReader, skipCompression }) {
    if (skipCompression) {
        return { sendPath: absPath, contentEncoding: null, compressible: false };
    }

    const compressible = isCompressible(ext);
    if (!compressible) {
        return { sendPath: absPath, contentEncoding: null, compressible };
    }

    const acceptEncoding = request.headers.get("Accept-Encoding") || "";
    if (acceptsEncoding(acceptEncoding, "br") && (await fileReader.exists(`${absPath}.br`))) {
        return { sendPath: `${absPath}.br`, contentEncoding: "br", compressible };
    }

    if (acceptsEncoding(acceptEncoding, "gzip") && (await fileReader.exists(`${absPath}.gz`))) {
        return { sendPath: `${absPath}.gz`, contentEncoding: "gzip", compressible };
    }

    return { sendPath: absPath, contentEncoding: null, compressible };
}

/**
 * Build a 304 response when the request validator matches the selected file.
 * @param {{ request: Request, etag: string, cacheControl: string, skipCompression?: boolean, compressible: boolean, contentEncoding: string | null }} options
 * @returns {Response | null}
 */
function createNotModifiedResponse({ request, etag, cacheControl, skipCompression, compressible, contentEncoding }) {
    const ifNoneMatch = request.headers.get(HTTP_HEADER_IF_NONE_MATCH);
    if (!matchesIfNoneMatch(ifNoneMatch, etag, request.method)) {
        return null;
    }

    const headers = new Headers({ [HTTP_HEADER_CACHE_CONTROL]: cacheControl, ETag: etag });
    if (!skipCompression && compressible) {
        headers.set("Vary", "Accept-Encoding");
    }
    if (contentEncoding) {
        headers.set(HTTP_HEADER_CONTENT_ENCODING, contentEncoding);
    }

    return new Response(null, { status: HTTP_STATUS_NOT_MODIFIED, headers });
}

/**
 * Build headers shared by successful static file responses.
 * @param {{ mimeType: string, cacheControl: string, etag: string | null, skipCompression?: boolean, compressible: boolean, contentEncoding: string | null }} options
 * @returns {Headers}
 */
function createResponseHeaders({ mimeType, cacheControl, etag, skipCompression, compressible, contentEncoding }) {
    const headers = new Headers({
        [HTTP_HEADER_CONTENT_TYPE]: mimeType,
        [HTTP_HEADER_CACHE_CONTROL]: cacheControl,
    });
    if (etag) headers.set("ETag", etag);
    if (!skipCompression && compressible) headers.set("Vary", "Accept-Encoding");
    if (contentEncoding) headers.set(HTTP_HEADER_CONTENT_ENCODING, contentEncoding);
    return headers;
}

/**
 * Read the selected static file and fall back to the original when compression fails.
 * @param {{ fileReader: FileReader, sendPath: string, absPath: string, contentEncoding: string | null, headers: Headers }} options
 * @returns {Promise<Uint8Array | null>}
 */
async function readStaticFile({ fileReader, sendPath, absPath, contentEncoding, headers }) {
    const content = await fileReader.read(sendPath);
    if (content !== null || contentEncoding === null) {
        return content;
    }

    console.error(`Failed to read compressed file: ${sendPath}, falling back to uncompressed: ${absPath}`);
    const uncompressedStat = await fileReader.stat(absPath);
    if (uncompressedStat === null) {
        return null;
    }

    const uncompressedEtag = weakEtagFromStat(uncompressedStat);
    if (uncompressedEtag) headers.set("ETag", uncompressedEtag);
    headers.delete(HTTP_HEADER_CONTENT_ENCODING);
    return fileReader.read(absPath);
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
