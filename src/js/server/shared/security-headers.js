/**
 * @fileoverview Security headers utilities for HTTP responses.
 *
 * This module provides default security headers and utilities for merging them
 * with user-provided headers. Used across dev and prod servers to ensure
 * consistent security posture.
 *
 * @module server/shared/security-headers
 * @since 1.0.0
 */

/**
 * Default security headers applied to all responses.
 *
 * Headers:
 * - X-Content-Type-Options: nosniff
 *   Prevents MIME-sniffing attacks by enforcing declared Content-Type.
 *
 * - X-Frame-Options: DENY
 *   Prevents clickjacking by disallowing iframe embedding.
 *
 * - Referrer-Policy: strict-origin-when-cross-origin
 *   Controls referrer information sent with requests.
 *
 * Note: Strict-Transport-Security (HSTS) is NOT included by default because
 * it should only be sent over HTTPS. Add it via middleware if needed.
 *
 * Note: Content-Security-Policy (CSP) is NOT included by default because
 * it requires per-application tuning and can break inline scripts/styles.
 *
 * @type {Record<string, string>}
 * @since 1.0.0
 */
export const SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
};

/**
 * Merge default security headers with user-provided headers.
 * User headers take precedence over both security and default headers.
 *
 * @param {Record<string, string>} userHeaders - User-provided headers
 * @param {Record<string, string>} [customSecurityHeaders] - Custom security headers (overrides defaults)
 * @returns {Record<string, string>} Merged headers
 *
 * @example
 * ```javascript
 * // Use default security headers
 * withSecurityHeaders({ "Content-Type": "text/html" })
 * // { "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "...", "Content-Type": "text/html" }
 *
 * // Override specific security header
 * withSecurityHeaders(
 *   { "Content-Type": "text/html" },
 *   { "X-Frame-Options": "SAMEORIGIN" }
 * )
 * // { "X-Content-Type-Options": "nosniff", "X-Frame-Options": "SAMEORIGIN", "Referrer-Policy": "...", "Content-Type": "text/html" }
 *
 * // User headers take final precedence
 * withSecurityHeaders(
 *   { "Content-Type": "text/html", "X-Frame-Options": "ALLOW" },
 *   { "X-Frame-Options": "SAMEORIGIN" }
 * )
 * // { "X-Content-Type-Options": "nosniff", "X-Frame-Options": "ALLOW", "Referrer-Policy": "...", "Content-Type": "text/html" }
 * ```
 */
export function withSecurityHeaders(userHeaders, customSecurityHeaders) {
    return {
        ...SECURITY_HEADERS,
        ...(customSecurityHeaders || {}),
        ...userHeaders,
    };
}
