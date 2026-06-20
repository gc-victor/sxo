/**
 * @fileoverview Protected security headers policy.
 *
 * Defines which security-critical headers are protected by default from
 * middleware override. This prevents middleware from accidentally weakening
 * the application's security posture without explicit opt-in.
 *
 * @module server/shared/protected-headers
 */

/**
 * Security-critical headers that middleware cannot override by default.
 *
 * Override requires explicit opt-in via `allowMiddlewareSecurityOverride` config flag.
 *
 * Protected headers:
 * - Content-Security-Policy: Controls resources the browser can load
 * - Strict-Transport-Security: Forces HTTPS connections
 * - X-Frame-Options: Prevents clickjacking attacks
 * - X-Content-Type-Options: Prevents MIME-sniffing attacks
 * - Referrer-Policy: Controls referrer information disclosure
 *
 * These headers are normalized to lowercase for case-insensitive comparison
 * (Headers API is case-insensitive per Web Standard).
 *
 * @type {string[]}
 */
export const PROTECTED_SECURITY_HEADERS = [
    "content-security-policy",
    "strict-transport-security",
    "x-frame-options",
    "x-content-type-options",
    "referrer-policy",
];

/**
 * Check if a header name is a protected security header.
 *
 * @param {string} headerName - Header name (case-insensitive)
 * @returns {boolean} True if header is protected
 *
 * @example
 * ```javascript
 * isProtectedHeader("X-Frame-Options") // true
 * isProtectedHeader("Cache-Control")   // false
 * ```
 */
export function isProtectedHeader(headerName) {
    const normalized = String(headerName).toLowerCase();
    return PROTECTED_SECURITY_HEADERS.includes(normalized);
}

/**
 * Apply middleware headers to a response, respecting protected header policy.
 *
 * When `allowOverride` is false (default):
 * - Protected security headers from middleware are skipped
 * - Non-protected headers are applied normally
 *
 * When `allowOverride` is true:
 * - All middleware headers are applied (including security headers)
 *
 * @param {Headers} targetHeaders - Headers object to update (mutated in place)
 * @param {Headers} middlewareHeaders - Headers from middleware response
 * @param {boolean} [allowOverride=false] - Allow middleware to override protected headers
 * @returns {void}
 *
 * @example
 * ```javascript
 * const finalHeaders = new Headers(withSecurityHeaders({}, securityHeaders));
 * applyMiddlewareHeaders(finalHeaders, middlewareResponse.headers, false);
 * ```
 */
export function applyMiddlewareHeaders(targetHeaders, middlewareHeaders, allowOverride = false) {
    // Handle Set-Cookie separately via getSetCookie() to preserve multiple values;
    // Headers.forEach() incorrectly joins multi-value headers with commas.
    const setCookieValues = middlewareHeaders.getSetCookie();
    for (const cookie of setCookieValues) {
        targetHeaders.append("Set-Cookie", cookie);
    }

    middlewareHeaders.forEach((value, key) => {
        const lowerKey = key.toLowerCase();
        if (lowerKey === "set-cookie") return;

        // Check if this is a protected header and overrides are not allowed
        if (!allowOverride && isProtectedHeader(lowerKey)) {
            // Skip: middleware cannot override this protected header
            return;
        }

        // Allow override for non-protected headers or when explicitly enabled
        targetHeaders.set(key, value);
    });
}
