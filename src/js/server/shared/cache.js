/**
 * @fileoverview Unified cache utilities for SXO servers.
 *
 * This module provides all caching constants and utilities used across
 * dev and prod servers, including ETags and Cache-Control headers.
 *
 * @module server/shared/cache
 * @since 1.0.0
 */

// =============================================================================
// Cache-Control Header Constants
// =============================================================================

/**
 * Cache-Control for immutable hashed assets (1 year).
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
 * Cache-Control for development mode (no caching).
 * Forces browser to always fetch fresh content.
 * @type {string}
 */
export const CACHE_NO_CACHE = "no-cache";

/**
 * Cache-Control for error responses (no caching).
 * Used for 500 errors to prevent caching error pages.
 * @type {string}
 */
export const CACHE_NO_STORE = "no-store";

/**
 * Cache-Control for must-revalidate responses.
 * Used for SSR and 404 responses.
 * @type {string}
 */
export const CACHE_MUST_REVALIDATE = "public, max-age=0, must-revalidate";

// =============================================================================
// Semantic Aliases (for clarity in usage context)
// =============================================================================

/**
 * Cache-Control for SSR responses (same as must-revalidate).
 * @type {string}
 */
export const CACHE_SSR = CACHE_MUST_REVALIDATE;

/**
 * Cache-Control for generated/pre-rendered routes (same as short).
 * @type {string}
 */
export const CACHE_GENERATED = CACHE_SHORT;

/**
 * Cache-Control for 404 responses (same as must-revalidate).
 * @type {string}
 */
export const CACHE_404 = CACHE_MUST_REVALIDATE;

/**
 * Cache-Control for 500 responses (same as no-store).
 * @type {string}
 */
export const CACHE_500 = CACHE_NO_STORE;

// =============================================================================
// ETag Utilities
// =============================================================================

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
