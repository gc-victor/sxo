/**
 * @fileoverview Shared MIME types and constants for SXO adapters.
 *
 * This module provides common MIME type mappings and constants used across
 * all platform adapters (Node.js, Bun, Deno, Cloudflare).
 *
 * @module sxo/adapters/utils/mime-types
 */

/**
 * Maximum allowed path length for URL validation.
 * @type {number}
 */
export const MAX_PATH_LEN = 1024;

/**
 * Default output directory name.
 * @type {string}
 */
export const DEFAULT_OUTPUT_DIR = "dist";

/**
 * Default server directory name (contains SSR bundles).
 * @type {string}
 */
export const DEFAULT_SERVER_DIR = "server";

/**
 * Default client directory name (contains static assets).
 * @type {string}
 */
export const DEFAULT_CLIENT_DIR = "client";

/**
 * MIME type mapping for static files.
 * Keys are file extensions with leading dot.
 * @type {Record<string, string>}
 */
export const MIME_TYPES = {
    ".css": "text/css; charset=utf-8",
    ".gif": "image/gif",
    ".html": "text/html; charset=utf-8",
    ".htm": "text/html; charset=utf-8",
    ".ico": "image/x-icon",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".map": "application/json; charset=utf-8",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".svg": "image/svg+xml; charset=utf-8",
    ".xml": "application/xml; charset=utf-8",
    ".webp": "image/webp",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".eot": "application/vnd.ms-fontobject",
    ".webmanifest": "application/manifest+json; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
    ".csv": "text/csv; charset=utf-8",
    ".bmp": "image/bmp",
    ".tiff": "image/tiff",
    ".tif": "image/tiff",
    ".avif": "image/avif",
    ".apng": "image/apng",
    ".zip": "application/zip",
    ".gz": "application/gzip",
    ".tar": "application/x-tar",
    ".7z": "application/x-7z-compressed",
    ".rar": "application/vnd.rar",
    ".mp3": "audio/mpeg",
    ".mp4": "video/mp4",
    ".wav": "audio/wav",
    ".webm": "video/webm",
    ".weba": "audio/webm",
    ".ogg": "application/ogg",
    ".oga": "audio/ogg",
    ".ogv": "video/ogg",
    ".wasm": "application/wasm",
};

/**
 * Extensions that support precompression (brotli, gzip).
 * These are text-based formats that benefit from compression.
 * @type {Set<string>}
 */
export const COMPRESSIBLE_EXTS = new Set([
    ".html",
    ".htm",
    ".js",
    ".mjs",
    ".css",
    ".svg",
    ".json",
    ".xml",
    ".txt",
    ".md",
    ".csv",
    ".webmanifest",
    ".map",
]);

/**
 * Normalize an extension to lowercase with leading dot.
 *
 * @param {string} ext - Extension to normalize (with or without dot)
 * @returns {string} Normalized extension
 */
function normalizeExt(ext) {
    if (!ext) return "";
    const lower = ext.toLowerCase();
    return lower.startsWith(".") ? lower : `.${lower}`;
}

/**
 * Get MIME type for a file extension.
 *
 * @param {string} ext - File extension (with or without leading dot)
 * @returns {string | undefined} MIME type or undefined if unknown
 *
 * @example
 * ```javascript
 * getMimeType(".css")  // "text/css; charset=utf-8"
 * getMimeType("css")   // "text/css; charset=utf-8"
 * getMimeType(".CSS")  // "text/css; charset=utf-8"
 * getMimeType(".xyz")  // undefined
 * ```
 */
export function getMimeType(ext) {
    const normalized = normalizeExt(ext);
    return MIME_TYPES[normalized];
}

/**
 * Check if an extension supports precompression.
 *
 * @param {string} ext - File extension (with or without leading dot)
 * @returns {boolean} True if the extension is compressible
 *
 * @example
 * ```javascript
 * isCompressible(".html")  // true
 * isCompressible("js")     // true
 * isCompressible(".png")   // false
 * ```
 */
export function isCompressible(ext) {
    const normalized = normalizeExt(ext);
    return COMPRESSIBLE_EXTS.has(normalized);
}
