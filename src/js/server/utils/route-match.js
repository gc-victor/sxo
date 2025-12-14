/** Safe slug validation used by route matching (keep synchronized with legacy utils). */
export const SLUG_REGEX = /^[A-Za-z0-9._-]{1,200}$/;

/** Parameter name validation: must start with letter, followed by alphanumeric or underscore. */
const PARAM_NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]*$/;

/**
 * Validate a route pattern's parameter names.
 * Ensures parameter names are valid JavaScript identifiers and unique.
 *
 * @param {string} pattern - Route pattern (e.g., "blog/[category]/[slug]")
 * @returns {{valid: true} | {valid: false, error: string}}
 */
export function validateRoutePattern(pattern) {
    // Reject empty brackets explicitly
    if (pattern.includes("[]")) {
        return { valid: false, error: "Empty parameter [] is not allowed" };
    }

    const paramRegex = /\[([^\]]+)\]/g;
    const matches = [...pattern.matchAll(paramRegex)];
    const paramNames = matches.map((m) => m[1]);

    if (paramNames.length === 0) {
        return { valid: true };
    }

    // Check for duplicate parameter names
    const seen = new Set();
    for (const name of paramNames) {
        if (seen.has(name)) {
            return {
                valid: false,
                error: `Duplicate parameter [${name}]`,
            };
        }
        seen.add(name);
    }

    // Validate each parameter name
    for (const name of paramNames) {
        if (!PARAM_NAME_REGEX.test(name)) {
            return {
                valid: false,
                error: `Parameter [${name}] must start with a letter and contain only alphanumeric characters or underscores`,
            };
        }
    }

    return { valid: true };
}

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
 * Memoization cache for buildPatternRegex results.
 * Bounded to prevent memory growth from attacker-influenced or numerous patterns.
 */
const MAX_PATTERN_CACHE = 2000;
const patternCache = new Map();

/**
 * Build a RegExp for a route pattern by scanning segments.
 * Avoids placeholder collisions by directly building the regex source.
 * Results are memoized (compiled RegExp + param names) to avoid redundant regex compilation on every request.
 * @param {string} rawPattern
 * @returns {{regex: RegExp, paramNames: string[]}}
 */
function buildPatternRegex(rawPattern) {
    // Check cache first
    const cached = patternCache.get(rawPattern);
    if (cached) {
        return cached;
    }

    const paramRegex = /\[([^\]]+)\]/g;
    /** @type {string[]} */
    const srcParts = ["^"];
    /** @type {string[]} */
    const paramNames = [];

    let lastIndex = 0;
    for (const match of rawPattern.matchAll(paramRegex)) {
        const index = match.index ?? 0;
        const full = match[0];
        const name = match[1];

        // Escape static part before this parameter token
        if (index > lastIndex) {
            srcParts.push(escapeRegexLiteral(rawPattern.slice(lastIndex, index)));
        }

        // Add capture group for dynamic parameter
        srcParts.push("([^/]+)");
        paramNames.push(name);

        lastIndex = index + full.length;
    }

    // Escape any trailing static part
    if (lastIndex < rawPattern.length) {
        srcParts.push(escapeRegexLiteral(rawPattern.slice(lastIndex)));
    }
    srcParts.push("$");

    const regex = new RegExp(srcParts.join(""));
    const result = { regex, paramNames };

    // Bounded cache eviction (FIFO)
    if (patternCache.size >= MAX_PATTERN_CACHE) {
        const firstKey = patternCache.keys().next().value;
        if (firstKey !== undefined) {
            patternCache.delete(firstKey);
        }
    }
    patternCache.set(rawPattern, result);

    return result;
}

/**
 * Match an incoming request URL/pathname against route entries.
 * Supports multi-parameter dynamic routes (e.g., `/blog/[category]/[post]`).
 *
 * @param {string} url - Incoming request URL or pathname (may include query/hash)
 * @param {Array<{path?: string, filename: string, jsx: string}>} files - Route manifest entries
 * @param {{validateSlug?: boolean}} [options]
 * @returns {{route: object, params: Record<string,string>} | {invalid: true} | null}
 */
export function routeMatch(url, files, options = {}) {
    const validateSlug = options.validateSlug !== false;
    // SLUG_REGEX validates parameter VALUES (not names) - ensures safe URL segments
    const slugRegex = SLUG_REGEX;

    const clean = normalizeIncoming(url);
    if (clean === null) return null;

    for (const f of files) {
        const rawPattern = (f.path || "").replace(/\/+$/, ""); // trim trailing slash (except root)
        if (!rawPattern) {
            // Root route
            if (clean === "") {
                return { route: f, params: Object.create(null) };
            }
            if (clean === "index.html") {
                return { route: f, params: Object.create(null) };
            }
            continue;
        }

        // Fast path: explicit "<pattern>/index.html"
        if (clean === `${rawPattern}/index.html`) {
            return { route: f, params: Object.create(null) };
        }

        const { regex, paramNames } = buildPatternRegex(rawPattern);
        const match = clean.match(regex);
        if (match) {
            /** @type {Record<string, string>} */
            const params = Object.create(null);

            // Map each captured group to its parameter name
            for (let i = 0; i < paramNames.length; i++) {
                const value = match[i + 1]; // match[0] is full match, params start at match[1]
                if (validateSlug && !slugRegex.test(value)) {
                    return { invalid: true };
                }
                params[paramNames[i]] = value;
            }

            return { route: f, params };
        }
    }

    return null;
}
