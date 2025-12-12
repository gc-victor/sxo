/** Safe slug validation used by route matching (keep synchronized with legacy utils). */
export const SLUG_REGEX = /^[A-Za-z0-9._-]{1,200}$/;

/**
 * Escape a string for safe literal inclusion inside a RegExp source.
 * @param {string} s
 * @returns {string}
 */
function escapeRegexLiteral(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Attempt to coerce an input into a normalized, decoded pathname without query/hash.
 * @param {string} url
 * @returns {string|null} normalized relative path segment (no leading/trailing slash) or null on failure
 */
function normalizeIncoming(url) {
    if (typeof url !== "string") return null;

    // Strip query/hash
    const withoutQuery = url.split(/[?#]/)[0];

    // Extract pathname if a full URL was provided
    let pathname = withoutQuery;
    if (/^https?:\/\//i.test(withoutQuery)) {
        try {
            pathname = new URL(withoutQuery).pathname;
        } catch {
            // Treat as raw path if URL parsing fails
        }
    }

    // Decode URI components safely
    let decoded;
    try {
        decoded = decodeURIComponent(pathname);
    } catch {
        return null;
    }

    // Remove leading/trailing slashes
    let clean = decoded.replace(/^\/+/, "").replace(/\/+$/, "");

    // Root normalization
    if (clean === "" || clean === "index.html") clean = "";

    return clean;
}

/**
 * Build a RegExp (as string) for a route pattern, substituting a single "[slug]" token.
 * @param {string} rawPattern
 * @returns {{src: string, hasSlug: boolean}}
 */
function buildPatternRegex(rawPattern) {
    const SLUG_TOKEN = "[slug]";
    if (rawPattern.includes(SLUG_TOKEN)) {
        const placeholder = "__SXO_SLUG__";
        const withPlaceholder = rawPattern.split(SLUG_TOKEN).join(placeholder);
        const escaped = escapeRegexLiteral(withPlaceholder);
        const src = `^${escaped.split(placeholder).join("([^/]+)")}$`;
        return { src, hasSlug: true };
    }
    return { src: `^${escapeRegexLiteral(rawPattern)}$`, hasSlug: false };
}

/**
 * Match an incoming request URL/pathname against route entries.
 *
 * @param {string} url - Incoming request URL or pathname (may include query/hash)
 * @param {Array<{path?: string, filename: string, jsx: string}>} files - Route manifest entries
 * @param {{validateSlug?: boolean}} [options]
 * @returns {{route: object, params: Record<string,string>} | {invalid: true} | null}
 */
export function routeMatch(url, files, options = {}) {
    const validateSlug = options.validateSlug !== false;
    const slugRegex = SLUG_REGEX;

    const clean = normalizeIncoming(url);
    if (clean === null) return null;

    for (const f of files) {
        const rawPattern = (f.path || "").replace(/\/+$/, ""); // trim trailing slash (except root)
        if (!rawPattern) {
            // Root route
            if (clean === "") {
                return { route: f, params: {} };
            }
            if (clean === "index.html") {
                return { route: f, params: {} };
            }
            continue;
        }

        // Fast path: explicit "<pattern>/index.html"
        if (clean === `${rawPattern}/index.html`) {
            return { route: f, params: {} };
        }

        const { src, hasSlug } = buildPatternRegex(rawPattern);
        const regex = new RegExp(src);
        const match = clean.match(regex);
        if (match) {
            const params = {};
            if (hasSlug) {
                const value = match[1];
                if (validateSlug && !slugRegex.test(value)) {
                    return { invalid: true };
                }
                params.slug = value;
            }
            return { route: f, params };
        }
    }

    return null;
}
