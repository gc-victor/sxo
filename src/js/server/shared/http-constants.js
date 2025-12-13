/**
 * @fileoverview HTTP status codes and method constants.
 *
 * This module provides standard HTTP status codes and method names
 * to avoid hardcoding magic numbers and strings throughout the codebase.
 *
 * @module server/shared/http-constants
 */

// =============================================================================
// HTTP Status Codes
// =============================================================================

/**
 * HTTP 200 OK - Request succeeded.
 * @type {number}
 */
export const HTTP_STATUS_OK = 200;

/**
 * HTTP 304 Not Modified - Resource not modified since last request.
 * @type {number}
 */
export const HTTP_STATUS_NOT_MODIFIED = 304;

/**
 * HTTP 403 Forbidden - Access denied.
 * @type {number}
 */
export const HTTP_STATUS_FORBIDDEN = 403;

/**
 * HTTP 400 Bad Request - Malformed request.
 * @type {number}
 */
export const HTTP_STATUS_BAD_REQUEST = 400;

/**
 * HTTP 404 Not Found - Resource not found.
 * @type {number}
 */
export const HTTP_STATUS_NOT_FOUND = 404;

/**
 * HTTP 414 URI Too Long - Request URI exceeds server limits.
 * @type {number}
 */
export const HTTP_STATUS_URI_TOO_LONG = 414;

/**
 * HTTP 500 Internal Server Error - Server error.
 * @type {number}
 */
export const HTTP_STATUS_SERVER_ERROR = 500;

// =============================================================================
// HTTP Methods
// =============================================================================

/**
 * HTTP GET method.
 * @type {string}
 */
export const HTTP_METHOD_GET = "GET";

/**
 * HTTP HEAD method.
 * @type {string}
 */
export const HTTP_METHOD_HEAD = "HEAD";

/**
 * HTTP OPTIONS method.
 * @type {string}
 */
export const HTTP_METHOD_OPTIONS = "OPTIONS";
