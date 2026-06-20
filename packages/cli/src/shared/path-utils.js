/**
 * @fileoverview Shared path utilities for display normalization.
 *
 * This module provides path normalization utilities for display purposes
 * (logs, route keys, URLs, manifest stability).
 *
 * IMPORTANT: This is NOT for security validation.
 * For security-focused path validation (traversal detection, null-byte checks),
 * see `src/js/server/shared/path.js`.
 *
 * @module sxo/shared/path-utils
 */

/**
 * Convert a path to POSIX separators (forward slashes).
 *
 * This is for display-only path normalization, NOT for security validation.
 * For security-focused path validation (traversal detection, null-byte checks),
 * see `src/js/server/shared/path.js`.
 *
 * @param {string} p - Path to normalize (may contain Windows backslashes)
 * @returns {string} Path with backslashes converted to forward slashes
 *
 * @example
 * ```javascript
 * convertToPosixSlashes('C:\\Users\\test')
 * // 'C:/Users/test'
 *
 * convertToPosixSlashes('/home/user')
 * // '/home/user'
 *
 * convertToPosixSlashes(null)
 * // 'null'
 * ```
 */
export function convertToPosixSlashes(p) {
    return String(p).replace(/\\/g, "/");
}
