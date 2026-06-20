/**
 * @fileoverview Security headers utilities for HTTP responses.
 *
 * This module provides default security headers and utilities for merging them
 * with user-provided headers. Used across dev and prod servers to ensure
 * consistent security posture.
 *
 * @module server/shared/security-headers
 */

import {
    HTTP_HEADER_REFERRER_POLICY,
    HTTP_HEADER_X_CONTENT_TYPE_OPTIONS,
    HTTP_HEADER_X_FRAME_OPTIONS,
    SECURITY_VALUE_DENY,
    SECURITY_VALUE_NOSNIFF,
} from "./http-constants.js";

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
 */
export const SECURITY_HEADERS = {
    [HTTP_HEADER_X_CONTENT_TYPE_OPTIONS]: SECURITY_VALUE_NOSNIFF,
    [HTTP_HEADER_X_FRAME_OPTIONS]: SECURITY_VALUE_DENY,
    [HTTP_HEADER_REFERRER_POLICY]: "strict-origin-when-cross-origin",
};

/**
 * Merge default security headers with user-provided headers.
 * User headers take precedence over both security and default headers.
 *
 * @param {Record<string, string>} userHeaders - User-provided headers
 * @param {Record<string, string> | null} [customSecurityHeaders] - Custom security headers (overrides defaults)
 * @returns {Record<string, string>} Merged headers
 *
 * @example
 * ```javascript
 * // Use default security headers
 * withSecurityHeaders({ [HTTP_HEADER_CONTENT_TYPE]: MIME_TYPE_HTML })
 * // { "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "...", "Content-Type": "text/html" }
 *
 * // Override specific security header
 * withSecurityHeaders(
 *   { [HTTP_HEADER_CONTENT_TYPE]: MIME_TYPE_HTML },
 *   { [HTTP_HEADER_X_FRAME_OPTIONS]: SECURITY_VALUE_SAMEORIGIN }
 * )
 * // { "X-Content-Type-Options": "nosniff", "X-Frame-Options": "SAMEORIGIN", "Referrer-Policy": "...", "Content-Type": "text/html" }
 *
 * // User headers take final precedence
 * withSecurityHeaders(
 *   { [HTTP_HEADER_CONTENT_TYPE]: MIME_TYPE_HTML, [HTTP_HEADER_X_FRAME_OPTIONS]: SECURITY_VALUE_ALLOW },
 *   { [HTTP_HEADER_X_FRAME_OPTIONS]: SECURITY_VALUE_SAMEORIGIN }
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
