/**
 * @fileoverview Shared path utilities for SXO adapters.
 *
 * This module provides path manipulation utilities used across
 * all platform adapters (Node.js, Bun, Deno, Cloudflare).
 *
 * @module sxo/adapters/utils/path
 */

import { MAX_PATH_LEN } from "./mime-types.js";

/**
 * Check if a path has a file extension.
 *
 * @param {string} pathname - URL pathname
 * @returns {boolean} True if path has an extension
 *
 * @example
 * ```javascript
 * hasFileExtension("/styles.css")    // true
 * hasFileExtension("/about")         // false
 * hasFileExtension("/.gitignore")    // false (dotfiles excluded)
 * ```
 */
export function hasFileExtension(pathname) {
    const lastSegment = pathname.split("/").pop() || "";
    return lastSegment.includes(".") && !lastSegment.startsWith(".");
}

/**
 * Check if a filename has a content hash (for immutable caching).
 *
 * Recognizes:
 * - Hex hash segments (8+ chars): file.abcdef12.css, file-abcdef1234.css
 * - Esbuild base36 uppercase 8-char hashes: global.JF2RTEIZ.css
 *
 * @param {string} basename - File basename
 * @returns {boolean} True if filename appears to be hashed
 *
 * @example
 * ```javascript
 * isHashedAsset("styles.abcdef12.css")  // true
 * isHashedAsset("global.JF2RTEIZ.css")  // true
 * isHashedAsset("styles.css")           // false
 * ```
 */
export function isHashedAsset(basename) {
    // Accept either:
    // - hex hash segment (>=8 chars) e.g. file.abcdef1234.css / file-abcdef1234.css
    // - esbuild-style base36 uppercase 8-char hash e.g. global.JF2RTEIZ.css
    return /(?:^|\.|-)(?:[a-f0-9]{8,}|[A-Z0-9]{8})(?:\.|$)/.test(basename);
}

/**
 * Get file extension from path (POSIX-style).
 *
 * @param {string} pathname - Path to extract extension from
 * @returns {string} Extension including dot, or empty string if none
 *
 * @example
 * ```javascript
 * getExtension("/app.js")            // ".js"
 * getExtension("/app.bundle.min.js") // ".js"
 * getExtension("/README")            // ""
 * getExtension("/.gitignore")        // ""
 * ```
 */
export function getExtension(pathname) {
    const lastSlash = pathname.lastIndexOf("/");
    const basename = lastSlash >= 0 ? pathname.substring(lastSlash + 1) : pathname;
    const dotIndex = basename.lastIndexOf(".");
    if (dotIndex <= 0) return "";
    return basename.substring(dotIndex);
}

/**
 * Get basename from path (POSIX-style).
 *
 * @param {string} pathname - Path
 * @returns {string} Basename (filename with extension)
 *
 * @example
 * ```javascript
 * getBasename("/assets/app.js")  // "app.js"
 * getBasename("file.txt")        // "file.txt"
 * getBasename("/dir/")           // ""
 * ```
 */
export function getBasename(pathname) {
    const lastSlash = pathname.lastIndexOf("/");
    return lastSlash >= 0 ? pathname.substring(lastSlash + 1) : pathname;
}

/**
 * Normalize a pathname: decode URI and validate path segments.
 *
 * Returns null for invalid paths (too long, null bytes, traversal attempts).
 *
 * @param {string} pathname - Raw pathname
 * @returns {{ normalized: string, rel: string } | null} Normalized paths or null on error
 *
 * @example
 * ```javascript
 * normalizePath("/hello%20world.txt")
 * // { normalized: "/hello world.txt", rel: "hello world.txt" }
 *
 * normalizePath("/../etc/passwd")
 * // null (traversal attempt)
 * ```
 */
export function normalizePath(pathname) {
    // Check length
    if (pathname.length > MAX_PATH_LEN) return null;

    // Check for null bytes, newlines, carriage returns
    if (pathname.includes("\0") || /[\r\n]/.test(pathname)) return null;

    // Decode URI
    let decodedPath;
    try {
        decodedPath = decodeURIComponent(pathname);
    } catch {
        return null;
    }

    // Split and filter path segments
    const segments = decodedPath.split("/").filter(Boolean);

    // Check for path traversal
    for (const seg of segments) {
        if (seg === ".." || seg === ".") {
            return null;
        }
    }

    const rel = segments.join("/");
    return { normalized: decodedPath, rel };
}

/**
 * Resolve a relative path under a base directory safely.
 *
 * Returns null if the resolved path would escape the base directory.
 *
 * @param {string} base - Base directory (POSIX path)
 * @param {string} relative - Relative path to resolve
 * @returns {string | null} Resolved absolute path or null if unsafe
 *
 * @example
 * ```javascript
 * resolveSafePath("/dist/client", "assets/app.js")
 * // "/dist/client/assets/app.js"
 *
 * resolveSafePath("/dist/client", "../server/secret.js")
 * // null (would escape root)
 * ```
 */
export function resolveSafePath(base, relative) {
    // Normalize base: remove trailing slashes
    const normalizedBase = base.replace(/\/+$/, "");

    // Normalize relative: remove leading slashes
    const normalizedRelative = relative.replace(/^\/+/, "");

    // Build the path
    const resolved = `${normalizedBase}/${normalizedRelative}`;

    // Check for traversal by looking for ..
    // Split and check each segment
    const segments = normalizedRelative.split("/");
    for (const seg of segments) {
        if (seg === ".." || seg === ".") {
            return null;
        }
    }

    // Final check: resolved path should start with base
    if (!resolved.startsWith(`${normalizedBase}/`) && resolved !== normalizedBase) {
        return null;
    }

    return resolved;
}
