import { toAbsolutePath, toRelativePosixPath } from "./helpers.js";
import { normalizeLoaders } from "./normalize-loaders.js";

/**
 * Configuration field schema with key aliases and normalization functions.
 *
 * @type {Array<{
 *   field: string,
 *   keys: string[],
 *   normalize?: (value: unknown, cwd: string) => unknown
 * }>}
 */
const CONFIG_SCHEMA = [
    { field: "port", keys: ["port"], normalize: toNumber },
    { field: "pagesDir", keys: ["pagesDir", "pages-dir"], normalize: (v, cwd) => toRelativePosixPath(String(v), cwd) },
    { field: "outDir", keys: ["outDir", "out-dir"], normalize: (v, cwd) => toAbsolutePath(String(v), cwd) },
    { field: "open", keys: ["open"], normalize: toBool },
    { field: "verbose", keys: ["verbose"], normalize: toBool },
    { field: "color", keys: ["color"], normalize: toBool },
    { field: "noColor", keys: ["noColor", "no-color"] },
    { field: "publicPath", keys: ["publicPath", "public-path"], normalize: (v) => String(v) },
    { field: "clientDir", keys: ["clientDir", "client-dir"], normalize: (v) => String(v) },
    { field: "componentsDir", keys: ["componentsDir", "components-dir"], normalize: (v, cwd) => toRelativePosixPath(String(v), cwd) },
    {
        field: "allowMiddlewareSecurityOverride",
        keys: ["allowMiddlewareSecurityOverride", "allow-middleware-security-override"],
        normalize: toBool,
    },
];

/**
 * Convert value to a finite integer.
 *
 * @param {unknown} x - Value to convert
 * @returns {number|undefined} Integer value or undefined if invalid
 */
export function toNumber(x) {
    if (typeof x === "number" && Number.isFinite(x)) return Math.trunc(x);
    const n = parseInt(String(x), 10);
    return Number.isFinite(n) ? n : undefined;
}

/**
 * Convert value to boolean.
 *
 * Accepts boolean values directly, or string representations:
 * - "1", "true", "yes", "on" → true
 * - "0", "false", "no", "off" → false
 *
 * @param {unknown} x - Value to convert
 * @returns {boolean|undefined} Boolean value or undefined if invalid
 */
export function toBool(x) {
    if (typeof x === "boolean") return x;
    if (x === undefined || x === null) return undefined;
    const s = String(x).toLowerCase().trim();
    if (["1", "true", "yes", "on"].includes(s)) return true;
    if (["0", "false", "no", "off"].includes(s)) return false;
    return undefined;
}

/**
 * Pick first defined value from arguments.
 *
 * Returns the first argument that is neither undefined nor null.
 *
 * @param {unknown[]} values - Values to check
 * @returns {unknown} First defined value or undefined
 */
export function pickDefined(...values) {
    for (const v of values) if (v !== undefined && v !== null) return v;
    return undefined;
}

/**
 * Normalize and merge config from a single source.
 *
 * Reads values from source object, normalizes types, and validates format.
 * Handles camelCase and kebab-case variations for config keys.
 * Uses schema-driven approach for maintainability and extensibility.
 *
 * @param {Record<string, unknown>} src - Source config object
 * @param {string} cwd - Current working directory for path resolution
 * @returns {Partial<ConfigObject>} Normalized config object
 */
export function mergeSrc(src, cwd) {
    if (!src || typeof src !== "object") return {};

    /**
     * Read first non-undefined value from source object by key names.
     * @param {string[]} keys - Possible key names to try
     * @returns {unknown} First defined value or undefined
     */
    const read = (...keys) => {
        if (!src || typeof src !== "object") return undefined;
        for (const k of keys) if (k in src && src[k] !== undefined) return src[k];
        return undefined;
    };

    /** @type {Partial<ConfigObject>} */
    const norm = {};

    // Process schema-driven fields
    for (const { field, keys, normalize } of CONFIG_SCHEMA) {
        const value = read(...keys);
        if (value !== undefined && normalize) {
            /** @type {Record<string, any>} */ (norm)[field] = normalize(value, cwd);
        }
    }

    // Special case: color field with noColor fallback (inverts logic)
    if (norm.color === undefined) {
        const noColorVal = toBool(read("noColor", "no-color"));
        if (noColorVal !== undefined) norm.color = !noColorVal;
    }

    // Special case: build object (preserve as-is if valid object)
    const buildVal = read("build");
    if (buildVal && typeof buildVal === "object" && buildVal !== null) norm.build = buildVal;

    // Special case: loaders with custom normalization
    const loadersVal = normalizeLoaders(read("loaders", "loader"));
    if (loadersVal !== undefined) norm.loaders = loadersVal;

    // Special case: securityHeaders (preserve as-is if valid object or null)
    const securityHeadersVal = read("securityHeaders", "security-headers");
    if (securityHeadersVal !== undefined) {
        norm.securityHeaders = /** @type {Record<string, string> | null} */ (securityHeadersVal);
    }

    return norm;
}

/**
 * Clamp port number to valid range.
 *
 * @param {number|undefined} p - Port value to clamp
 * @param {number} fb - Fallback port if invalid
 * @returns {number} Clamped port
 */
export function clampPort(p, fb) {
    const n = typeof p === "number" ? p : toNumber(p);
    return typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 65535 ? n : fb;
}
