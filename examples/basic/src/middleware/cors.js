import { IncomingMessage, ServerResponse } from "node:http";

/**
 * Comprehensive CORS middleware aligned with core server implementation (server/utils/cors.js).
 *
 * Differences vs core util:
 *  - This variant directly finalizes OPTIONS (preflight) requests with 204 and returns `true` to signal handling.
 *  - Uses only environment variables; fallback origin derived from PORT (no opts parameter).
 *
 * Environment variables (comma‑separated where noted):
 *   ALLOWED_ORIGINS          Exact origin matches. If unset, falls back to http://localhost:${PORT||3000}
 *   CORS_ALLOWED_METHODS     Default: "GET,HEAD,POST,PUT,DELETE,OPTIONS"
 *   CORS_ALLOWED_HEADERS     Default: "Content-Type, Authorization"
 *   CORS_ALLOW_CREDENTIALS   "true" | "false" (default: "true")
 *   CORS_MAX_AGE             Seconds for preflight cache (default: 600)
 *
 * Behavior:
 *  - Only decorates response for non-OPTIONS; full CORS preflight headers applied inside OPTIONS branch.
 *  - Vary header includes Origin + Access-Control-Request-Method + Access-Control-Request-Headers.
 *  - Does NOT enforce application method policy (leave 405 logic to higher layer).
 *
 * @param {IncomingMessage} req
 * @param {ServerResponse} res
 * @returns {boolean|undefined} true if the middleware fully handled the request (OPTIONS)
 */
export function cors(req, res) {
    // Build allowed origins list (exact match only)
    const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(",")
              .map((o) => o.trim())
              .filter(Boolean)
        : [`http://localhost:${process.env.PORT || 3000}`];

    const allowedMethods = (process.env.CORS_ALLOWED_METHODS || "GET,HEAD,POST,PUT,DELETE,OPTIONS")
        .split(",")
        .map((m) => m.trim().toUpperCase())
        .filter(Boolean);

    const allowedHeadersList = (process.env.CORS_ALLOWED_HEADERS || "Content-Type, Authorization")
        .split(",")
        .map((h) => h.trim().toLowerCase())
        .filter(Boolean);

    const allowCredentials = (process.env.CORS_ALLOW_CREDENTIALS || "true") === "true";
    const maxAge = parseInt(process.env.CORS_MAX_AGE || "600", 10);

    const origin = req.headers.origin;
    const isAllowedOrigin = !!origin && allowedOrigins.includes(origin);

    // Ensure cache differentiation for all request-dependent CORS response variants.
    appendVary(res, "Origin, Access-Control-Request-Method, Access-Control-Request-Headers");

    if (isAllowedOrigin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        if (allowCredentials) {
            res.setHeader("Access-Control-Allow-Credentials", "true");
        }
    }

    // Minimal safe exposed headers; expand cautiously if needed.
    res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Type, ETag");

    // Preflight handling (OPTIONS)
    if (req.method === "OPTIONS") {
        const reqMethod = (req.headers["access-control-request-method"] || "").toString().toUpperCase();
        const reqHeadersRaw = (req.headers["access-control-request-headers"] || "").toString();

        if (reqMethod && allowedMethods.includes(reqMethod)) {
            res.setHeader("Access-Control-Allow-Methods", allowedMethods.join(", "));
        }

        if (reqHeadersRaw) {
            // Echo only whitelisted headers
            const requested = reqHeadersRaw
                .split(",")
                .map((h) => h.trim().toLowerCase())
                .filter(Boolean);
            const allowed = requested.filter((h) => allowedHeadersList.includes(h));
            if (allowed.length > 0) {
                res.setHeader("Access-Control-Allow-Headers", allowed.join(", "));
            }
        } else {
            // No requested list => provide full configured set
            res.setHeader("Access-Control-Allow-Headers", allowedHeadersList.join(", "));
        }

        if (Number.isFinite(maxAge) && maxAge > 0) {
            res.setHeader("Access-Control-Max-Age", String(maxAge));
        }

        // Finish preflight with no body
        res.writeHead(204);
        res.end();
        return true;
    }
}

/**
 * Append values to the Vary header without duplication.
 * @param {ServerResponse} res
 * @param {string} value Comma-separated header names
 */
function appendVary(res, value) {
    const prev = res.getHeader("Vary");
    if (!prev) {
        res.setHeader("Vary", value);
        return;
    }
    const set = new Set(
        String(prev)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
    );
    value.split(",").forEach((v) => {
        const t = v.trim();
        if (t) set.add(t);
    });
    res.setHeader("Vary", Array.from(set).join(", "));
}
