/**
 * @fileoverview HTTP status codes, method constants, headers, MIME types, and security values.
 *
 * This module provides standard HTTP status codes, method names, header names,
 * MIME types, and security header values to avoid hardcoding magic numbers and
 * strings throughout the codebase.
 *
 * @module server/shared/http-constants
 */

/**
 * HTTP 200 OK - Request succeeded.
 * @type {number}
 */
export const HTTP_STATUS_OK = 200;

/**
 * HTTP 204 No Content - Request succeeded with no response body.
 * @type {number}
 */
export const HTTP_STATUS_NO_CONTENT = 204;

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

/**
 * Content-Type header - specifies the media type of the resource.
 * @type {string}
 */
export const HTTP_HEADER_CONTENT_TYPE = "Content-Type";

/**
 * Cache-Control header - directives for caching mechanisms.
 * @type {string}
 */
export const HTTP_HEADER_CACHE_CONTROL = "Cache-Control";

/**
 * Content-Encoding header - specifies encoding transformations applied to the entity-body.
 * @type {string}
 */
export const HTTP_HEADER_CONTENT_ENCODING = "Content-Encoding";

/**
 * If-None-Match header - makes the request conditional based on ETag.
 * @type {string}
 */
export const HTTP_HEADER_IF_NONE_MATCH = "If-None-Match";

/**
 * Referrer-Policy header - controls how much referrer information is included with requests.
 * @type {string}
 */
export const HTTP_HEADER_REFERRER_POLICY = "Referrer-Policy";

/**
 * Strict-Transport-Security header - enforces HTTPS connections.
 * @type {string}
 */
export const HTTP_HEADER_STRICT_TRANSPORT_SECURITY = "Strict-Transport-Security";

/**
 * Access-Control-Allow-Origin header - specifies which origins can access the resource.
 * @type {string}
 */
export const HTTP_HEADER_ACCESS_CONTROL_ALLOW_ORIGIN = "Access-Control-Allow-Origin";

/**
 * X-Frame-Options header - controls whether the page can be embedded in frames.
 * @type {string}
 */
export const HTTP_HEADER_X_FRAME_OPTIONS = "X-Frame-Options";

/**
 * X-Content-Type-Options header - prevents MIME type sniffing.
 * @type {string}
 */
export const HTTP_HEADER_X_CONTENT_TYPE_OPTIONS = "X-Content-Type-Options";

/**
 * HTML MIME type.
 * @type {string}
 */
export const MIME_TYPE_HTML = "text/html";

/**
 * HTML MIME type with UTF-8 charset.
 * @type {string}
 */
export const MIME_TYPE_HTML_UTF8 = "text/html; charset=utf-8";

/**
 * Plain text MIME type.
 * @type {string}
 */
export const MIME_TYPE_PLAIN = "text/plain";

/**
 * Plain text MIME type with UTF-8 charset.
 * @type {string}
 */
export const MIME_TYPE_PLAIN_UTF8 = "text/plain; charset=utf-8";

/**
 * JavaScript MIME type with UTF-8 charset.
 * @type {string}
 */
export const MIME_TYPE_JS_UTF8 = "application/javascript; charset=utf-8";

/**
 * Server-Sent Events MIME type.
 * @type {string}
 */
export const MIME_TYPE_EVENT_STREAM = "text/event-stream";

/**
 * nosniff value for X-Content-Type-Options header.
 * @type {string}
 */
export const SECURITY_VALUE_NOSNIFF = "nosniff";

/**
 * SAMEORIGIN value for X-Frame-Options header.
 * @type {string}
 */
export const SECURITY_VALUE_SAMEORIGIN = "SAMEORIGIN";

/**
 * DENY value for X-Frame-Options header.
 * @type {string}
 */
export const SECURITY_VALUE_DENY = "DENY";

/**
 * ALLOW value for security headers.
 * @type {string}
 */
export const SECURITY_VALUE_ALLOW = "ALLOW";
