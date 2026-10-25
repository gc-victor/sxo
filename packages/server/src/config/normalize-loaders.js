/**
 * Normalize esbuild loader configuration from various input formats.
 *
 * This module provides utilities to parse and normalize esbuild loaders from
 * multiple sources: flags, environment variables, and config files. The normalized
 * output ensures consistent key formatting (dot-prefixed extensions) and
 * deterministic (alphabetical) ordering for stable builds.
 *
 * Supported input formats:
 * - Object map: `{ svg: "file", ".ts": "tsx" }`
 * - Array of strings: `[".svg=file", "ts=tsx"]`
 * - JSON string: `'{"svg":"file","ts":"tsx"}'`
 * - Single key=value string: `".svg=file,ts=tsx"`
 *
 * @module config/normalize-loaders
 */

/**
 * Normalize a loader key by trimming whitespace and ensuring it starts with a dot.
 *
 * Esbuild loader keys are file extensions that should start with a dot (e.g.,
 * ".svg", ".ts"). This function ensures consistent formatting regardless of input.
 *
 * @param {string} key - The loader key to normalize (e.g., "svg", ".ts", "  .json ")
 * @returns {string} The normalized key with dot prefix and trimmed (e.g., ".svg")
 */
export function normalizeLoaderKey(key) {
    const trimmed = String(key).trim();
    return trimmed.startsWith(".") ? trimmed : `.${trimmed}`;
}

/**
 * Parse a loaders string into an object map with deterministic ordering.
 *
 * Accepts comma-separated key=value pairs, where keys are file extensions
 * (with or without dot prefix) and values are esbuild loader types.
 *
 * Examples:
 * - `".svg=file"` → `{ ".svg": "file" }`
 * - `"svg=file,ts=tsx"` → `{ ".svg": "file", ".ts": "tsx" }`
 * - `".svg=file,.ts=tsx"` → `{ ".svg": "file", ".ts": "tsx" }`
 *
 * @param {string} raw - The loaders string to parse
 * @returns {Record<string,string>} An object map with normalized keys and sorted entries
 */
export function parseLoadersString(raw) {
    const parts = String(raw).split(",");
    /** @type {Record<string, string>} */
    const out = {};
    for (const p of parts) {
        const [extRaw, loaderRaw] = String(p).split("=");
        if (!extRaw || !loaderRaw) continue;
        const loader = String(loaderRaw).trim();
        if (!loader || !extRaw) continue;
        out[normalizeLoaderKey(extRaw)] = loader;
    }
    // Deterministic order (alphabetical by key)
    /** @type {Record<string, string>} */
    const ordered = {};
    for (const k of Object.keys(out).sort()) ordered[k] = out[k];
    return ordered;
}

/**
 * Merge multiple loader maps with deterministic (alphabetical) ordering.
 *
 * Later maps override earlier maps for the same keys, allowing proper precedence
 * resolution (e.g., config file → environment variables → CLI flags).
 *
 * @param {Record<string,string>[]} maps - Loader maps to merge (later takes precedence)
 * @returns {Record<string,string>} A new object map with sorted keys
 */
export function mergeLoadersMaps(...maps) {
    /** @type {Record<string, string>} */
    const merged = {};
    for (const map of maps) {
        if (map) Object.assign(merged, map);
    }
    // Return with deterministic (alphabetical) ordering
    /** @type {Record<string, string>} */
    const ordered = {};
    for (const k of Object.keys(merged).sort()) ordered[k] = merged[k];
    return ordered;
}

function normalizeLoaderEntries(entries) {
    /** @type {Record<string, string>} */
    const normalized = {};
    for (const [key, value] of entries) {
        normalized[normalizeLoaderKey(key)] = String(value);
    }

    const keys = Object.keys(normalized).sort();
    if (keys.length === 0) return undefined;

    /** @type {Record<string, string>} */
    const ordered = {};
    for (const key of keys) ordered[key] = normalized[key];
    return ordered;
}

function normalizeLoadersString(raw) {
    const value = raw.trim();
    if (value.startsWith("{")) {
        try {
            const parsed = JSON.parse(value);
            if (typeof parsed === "object" && !Array.isArray(parsed)) {
                const normalized = normalizeLoaderEntries(Object.entries(parsed));
                if (normalized) return normalized;
            }
        } catch {
            // Fall through to key=value parsing
        }
    }

    const parsedLoaders = parseLoadersString(value);
    return Object.keys(parsedLoaders).length > 0 ? parsedLoaders : undefined;
}

/**
 * Normalize esbuild loaders from various input formats.
 *
 * Accepts loaders configuration from multiple sources and returns a normalized
 * object map with dot-prefixed keys and deterministic ordering. Invalid or empty
 * inputs return `undefined`.
 *
 * Input formats:
 * - **Object map**: `{ svg: "file", ".ts": "tsx" }` - keys are normalized to add dot if missing
 * - **Array of strings**: `[".svg=file", "ts=tsx"]` - each string parsed as key=value pairs
 * - **JSON string**: `'{"svg":"file","ts":"tsx"}'` - parsed as JSON object
 * - **Key=value string**: `".svg=file,ts=tsx"` - comma-separated pairs
 *
 * @param {any} loaders - The loaders configuration to normalize
 * @returns {Record<string,string>|undefined} Normalized loaders object or undefined for invalid/empty input
 *
 * @example
 * ```js
 * // Object map
 * normalizeLoaders({ svg: "file", ".ts": "tsx" });
 * // → { ".svg": "file", ".ts": "tsx" }
 *
 * // Array of strings
 * normalizeLoaders([".svg=file", "ts=tsx"]);
 * // → { ".svg": "file", ".ts": "tsx" }
 *
 * // JSON string
 * normalizeLoaders('{"svg":"file","ts":"tsx"}');
 * // → { ".svg": "file", ".ts": "tsx" }
 *
 * // Key=value string
 * normalizeLoaders(".svg=file,ts=tsx");
 * // → { ".svg": "file", ".ts": "tsx" }
 * ```
 */
export function normalizeLoaders(loaders) {
    if (loaders === undefined || loaders === null) return undefined;

    if (Array.isArray(loaders)) {
        // Array of strings (repeatable flag), merge them all with deterministic ordering
        const maps = loaders.map((item) => parseLoadersString(String(item)));
        return maps.length > 0 ? mergeLoadersMaps(...maps) : undefined;
    }

    if (typeof loaders === "object") {
        return normalizeLoaderEntries(Object.entries(loaders));
    }

    if (typeof loaders === "string") {
        return normalizeLoadersString(loaders);
    }

    return undefined;
}
