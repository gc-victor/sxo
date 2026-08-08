/**
 * @fileoverview Unified cache utilities for SXO servers.
 *
 * This module provides all caching constants and utilities used across
 * dev and prod servers, including ETags and Cache-Control headers.
 *
 * @module server/shared/cache
 */

/**
 * Cache-Control for immutable hashed assets (365 days).
 * Used for files with content hashes in their names (e.g., app.abc123.js).
 * @type {string}
 */
export const CACHE_IMMUTABLE = "public, max-age=31536000, immutable";

/**
 * Cache-Control for non-hashed assets (5 minutes).
 * Used for static files without content hashes.
 * @type {string}
 */
export const CACHE_SHORT = "public, max-age=300";

/**
 * Generate a weak ETag from file size and modification time.
 *
 * @param {number} size - File size in bytes
 * @param {number} mtimeMs - Modification time in milliseconds
 * @returns {string} Weak ETag string
 *
 * @example
 * ```javascript
 * weakEtag(1024, 1700000000000)
 * // 'W/"400-18c0f9ed400"'
 * ```
 */
export function weakEtag(size, mtimeMs) {
    return `W/"${size.toString(16)}-${Math.floor(mtimeMs).toString(16)}"`;
}

/**
 * Generate a weak ETag from a stat object.
 *
 * Supports both Node.js-style stat (with mtimeMs) and Deno-style stat (with mtime Date).
 *
 * @param {{ size: number, mtimeMs?: number, mtime?: Date | null }} stat - File stat object
 * @returns {string} Weak ETag string
 *
 * @example
 * ```javascript
 * // Node.js style
 * weakEtagFromStat({ size: 1024, mtimeMs: 1700000000000 })
 *
 * // Deno style
 * weakEtagFromStat({ size: 1024, mtime: new Date(1700000000000) })
 * ```
 */
export function weakEtagFromStat(stat) {
    // Handle Deno style (mtime is a Date) and Node style (mtimeMs is a number)
    let mtimeMs = 0;
    if (typeof stat.mtimeMs === "number") {
        mtimeMs = stat.mtimeMs;
    } else if (stat.mtime instanceof Date) {
        mtimeMs = stat.mtime.getTime();
    }
    return weakEtag(stat.size, mtimeMs);
}
