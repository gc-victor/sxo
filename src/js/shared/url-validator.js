/**
 * @fileoverview URL validation/decoding utility for Web Standard APIs.
 *
 * Provides shared utilities for safely decoding URL pathnames
 * across dev/prod servers and runtime handlers.
 *
 * Exports:
 * - `decodeURIComponentSafe`: Exception-based API (standard)
 *
 * @module shared/url-validator
 */

/**
 * Decodes URL pathname, throwing exceptions on failure.
 *
 * Simplified exception-based API matching SXO's established error-handling pattern.
 * Callers use try/catch for error handling instead of checking result types.
 *
 * @param {string} pathname - URL pathname to decode
 * @returns {string} Decoded pathname
 * @throws {Error} If pathname contains invalid UTF-8 sequences
 * @public
 */
export function decodeURIComponentSafe(pathname) {
    try {
        return decodeURIComponent(pathname);
    } catch {
        throw new Error("Failed to parse URL");
    }
}
