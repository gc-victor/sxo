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
 * Leading-dot final segments are treated as dotfiles, not extension-based
 * static asset paths.
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
 * Validate and normalize a pathname: decode URI and validate path segments.
 *
 * Returns null for invalid paths (too long, null bytes, traversal attempts).
 *
 * @param {string} pathname - Raw pathname
 * @returns {{ normalized: string, rel: string } | null} Normalized paths or null on error
 *
 * @example
 * ```javascript
 * validateAndNormalizePath("/hello%20world.txt")
 * // { normalized: "/hello world.txt", rel: "hello world.txt" }
 *
 * validateAndNormalizePath("/../etc/passwd")
 * // null (traversal attempt)
 * ```
 */
function isValidRawPathname(pathname) {
    return pathname.length <= MAX_PATH_LEN && !/[\r\n]/.test(pathname);
}

function decodePathname(pathname) {
    let decodedPath;
    try {
        decodedPath = decodeURIComponent(pathname);
    } catch {
        return null;
    }
    return decodedPath.includes("\0") || decodedPath.includes("\\") ? null : decodedPath;
}

function hasTraversalSegment(segments) {
    return segments.some((segment) => segment === ".." || segment === "." || /^%2[eE]%2[eE]$/.test(segment));
}

function validatePathname(pathname) {
    if (!isValidRawPathname(pathname)) return null;

    const decodedPath = decodePathname(pathname);
    if (decodedPath === null) return null;

    const segments = decodedPath.split("/").filter(Boolean);
    if (hasTraversalSegment(segments)) return null;
    return { decodedPath, segments };
}

function normalizePathname({ decodedPath, segments }) {
    return { normalized: decodedPath, rel: segments.join("/") };
}

export function validateAndNormalizePath(pathname) {
    const validated = validatePathname(pathname);
    return validated ? normalizePathname(validated) : null;
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
    // Defense-in-depth: validate and normalize relative path
    const validated = validateAndNormalizePath(relative);
    if (!validated) return null;

    // Ensure base has exactly one trailing slash for safe confinement check
    const root = `${base.replace(/\/+$/, "")}/`;
    const resolved = root + validated.rel;

    // Confinement check: resolved path must remain under root
    if (!resolved.startsWith(root)) {
        return null;
    }

    return resolved;
}
