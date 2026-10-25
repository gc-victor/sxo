/**
 * Resolve path aliases for esbuild from tsconfig.json, package.json, or directory structure.
 *
 * Priority: tsconfig.json compilerOptions.paths > package.json imports > auto-discovery.
 * When explicit config exists it takes full control; otherwise aliases are derived from
 * the source directory layout.
 *
 * @module config/aliases
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Strip JSON comments so we can parse non-strict tsconfig.json.
 * Handles both line (//) and block (slash-star) comments.
 *
 * @param {string} raw - Raw JSON string possibly containing comments
 * @returns {string} Comment-free JSON string
 */
function stripJsonComments(raw) {
    return raw.replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Parse a single tsconfig path alias entry into { alias, target }.
 *
 * @param {string} pattern - The path pattern (e.g., "@utils/*")
 * @param {string[]} targets - The target array (e.g., ["./src/utils/*"])
 * @param {string} cwd - Project root directory
 * @param {string} baseUrl - tsconfig baseUrl
 * @returns {{ alias: string, target: string } | null}
 */
function parseTsconfigAliasEntry(pattern, targets, cwd, baseUrl) {
    if (!Array.isArray(targets) || targets.length === 0) return null;
    return {
        alias: pattern.replace(/\/\*$/, ""),
        target: path.resolve(cwd, baseUrl, targets[0].replace(/\/\*$/, "")),
    };
}

/**
 * Resolve a package.json imports value to a target path string.
 *
 * Handles string values and conditional exports objects.
 * For conditional exports, prefers "default", falling back to the first string value.
 *
 * @param {unknown} value - The imports entry value
 * @returns {string | null} Resolved target path or null
 */
function resolveImportTarget(value) {
    if (typeof value === "string") return value;
    if (!value || typeof value !== "object") return null;
    // Conditional exports
    const def = value.default;
    if (typeof def === "string") return def;
    const first = Object.values(value).find((v) => typeof v === "string");
    return typeof first === "string" ? /** @type {string} */ (first) : null;
}

/**
 * Finalize an alias map: return null if empty, otherwise ensure @pages is present.
 *
 * @param {Record<string, string>} aliases
 * @param {string} pagesDir
 * @returns {Record<string, string> | null}
 */
function finalizeAliases(aliases, pagesDir) {
    if (Object.keys(aliases).length === 0) return null;
    if (!aliases["@pages"]) {
        aliases["@pages"] = pagesDir;
    }
    return aliases;
}

/**
 * Check whether a directory entry is a candidate for auto-discovery aliasing.
 * Skips entries starting with "." or "_".
 *
 * @param {fs.Dirent} entry
 * @returns {boolean}
 */
function isCandidateDir(entry) {
    return entry.isDirectory() && !entry.name.startsWith(".") && !entry.name.startsWith("_");
}

// ---------------------------------------------------------------------------
// Alias sources
// ---------------------------------------------------------------------------

/**
 * Build alias map from tsconfig.json compilerOptions.paths.
 *
 * Converts patterns like "@utils/*" to alias prefix "@utils" pointing to
 * the resolved absolute directory.
 *
 * @param {string} cwd - Project root directory
 * @param {string} pagesDir - Absolute path to pages directory (for @pages fallback)
 * @returns {Record<string, string> | null} Alias map or null if tsconfig has no paths
 */
function readTsconfigAliases(cwd, pagesDir) {
    const tsconfigPath = path.join(cwd, "tsconfig.json");
    if (!fs.existsSync(tsconfigPath)) return null;

    try {
        const raw = fs.readFileSync(tsconfigPath, "utf-8");
        const tsconfig = JSON.parse(stripJsonComments(raw));
        const paths = tsconfig?.compilerOptions?.paths;
        if (!paths || typeof paths !== "object") return null;

        const baseUrl = tsconfig.compilerOptions?.baseUrl || ".";
        /** @type {Record<string, string>} */
        const aliases = {};

        for (const [pattern, targets] of Object.entries(paths)) {
            const entry = parseTsconfigAliasEntry(pattern, targets, cwd, baseUrl);
            if (entry) aliases[entry.alias] = entry.target;
        }

        return finalizeAliases(aliases, pagesDir);
    } catch {
        return null;
    }
}

/**
 * Build alias map from package.json imports field.
 *
 * Converts #-prefixed subpath imports to @-prefixed esbuild aliases.
 * For conditional exports, picks the "default" or first string value.
 * If a target points to a file (has an extension), uses its directory.
 *
 * @param {string} cwd - Project root directory
 * @param {string} pagesDir - Absolute path to pages directory (for @pages fallback)
 * @returns {Record<string, string> | null} Alias map or null if package.json has no imports
 */
function readPackageImportsAliases(cwd, pagesDir) {
    const pkgPath = path.join(cwd, "package.json");
    if (!fs.existsSync(pkgPath)) return null;

    try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
        const imports = pkg.imports;
        if (!imports || typeof imports !== "object") return null;

        /** @type {Record<string, string>} */
        const aliases = {};

        for (const [key, value] of Object.entries(imports)) {
            if (!key.startsWith("#")) continue;

            const target = resolveImportTarget(value);
            if (typeof target === "string") {
                let resolved = target.replace(/\/\*$/, "");
                // If target points to a file (has extension), use its directory
                if (path.extname(resolved)) {
                    resolved = path.dirname(resolved);
                }
                aliases[key.replace("#", "@")] = path.resolve(cwd, resolved);
            }
        }

        return finalizeAliases(aliases, pagesDir);
    } catch {
        return null;
    }
}

/**
 * Build alias map by scanning the source directory for subdirectories.
 *
 * Each subdirectory foo/ under srcDir becomes alias @foo pointing to its
 * absolute path. Directories starting with "." or "_" are skipped.
 *
 * @param {string} srcDir - Absolute path to source directory
 * @param {string} pagesDir - Absolute path to pages directory
 * @returns {Record<string, string>} Alias map
 */
function discoverDirAliases(srcDir, pagesDir) {
    /** @type {Record<string, string>} */
    const aliases = {};

    if (fs.existsSync(srcDir)) {
        for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
            if (isCandidateDir(entry)) {
                aliases[`@${entry.name}`] = path.join(srcDir, entry.name);
            }
        }
    }

    // @pages always points to PAGES_DIR (may differ from src/pages)
    aliases["@pages"] = pagesDir;

    return aliases;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve path aliases for esbuild from the project configuration.
 *
 * Priority:
 *   1. tsconfig.json compilerOptions.paths (explicit config takes full control)
 *   2. package.json imports (#-prefixed → @-prefixed)
 *   3. Auto-discovery from SRC_DIR subdirectories
 *
 * @pages is always guaranteed to point to pagesDir regardless of source.
 *
 * @param {string} srcDir - Absolute path to source directory (e.g., /project/src)
 * @param {string} pagesDir - Absolute path to pages directory (e.g., /project/src/pages)
 * @param {string} [cwd] - Project root directory (defaults to process.cwd())
 * @returns {Record<string, string>} Alias map suitable for esbuild's alias option
 *
 * @example
 * // With tsconfig.json paths: { "@utils/*": ["./src/utils/*"] }
 * resolveAliases("/project/src", "/project/src/pages")
 * // => { "@utils": "/project/src/utils", "@pages": "/project/src/pages" }
 *
 * @example
 * // With auto-discovery and src/ containing api/, components/, utils/
 * resolveAliases("/project/src", "/project/src/pages")
 * // => { "@api": "/project/src/api", "@components": "/project/src/components",
 * //      "@pages": "/project/src/pages", "@utils": "/project/src/utils" }
 */
export function resolveAliases(srcDir, pagesDir, cwd = process.cwd()) {
    // 1. tsconfig.json paths — explicit config takes full control
    const tsconfigAliases = readTsconfigAliases(cwd, pagesDir);
    if (tsconfigAliases) return tsconfigAliases;

    // 2. package.json imports — explicit config takes full control
    const pkgAliases = readPackageImportsAliases(cwd, pagesDir);
    if (pkgAliases) return pkgAliases;

    // 3. Fallback: auto-discover from source directory
    return discoverDirAliases(srcDir, pagesDir);
}

// ---------------------------------------------------------------------------
// Node.js loader hook (used by resolve-aliases.js via --import and register)
// ---------------------------------------------------------------------------

/** @type {Record<string, string>} */
let hookAliasMap = {};
/** @type {string} */
let hookProjectRoot = "";

/**
 * Receive alias map and project root from register().
 * Called by Node.js loader when the hook is initialized.
 *
 * @param {{ aliasMap: Record<string, string>, projectRoot: string }} data
 */
export function initialize(data) {
    hookAliasMap = data.aliasMap || {};
    hookProjectRoot = data.projectRoot || "";
}

function findMatchingAlias(specifier) {
    for (const alias of Object.keys(hookAliasMap)) {
        if (specifier.startsWith(`${alias}/`) || specifier === alias) return alias;
    }
    return null;
}

function resolveAliasPath(specifier, alias, context, nextResolve) {
    const target = hookAliasMap[alias];
    const rest = specifier.slice(alias.length);
    const basePath = path.isAbsolute(target) ? target : path.join(hookProjectRoot, target);
    const absPath = path.resolve(basePath, rest ? `.${rest}` : ".");

    if (absPath.endsWith(".ts") || absPath.endsWith(".tsx")) {
        return nextResolve(pathToFileURL(absPath).href, context);
    }

    const tsPath = `${absPath}.ts`;
    if (fs.existsSync(tsPath)) {
        return nextResolve(pathToFileURL(tsPath).href, context);
    }

    const tsxPath = `${absPath}.tsx`;
    if (fs.existsSync(tsxPath)) {
        return nextResolve(pathToFileURL(tsxPath).href, context);
    }

    return nextResolve(pathToFileURL(absPath).href, context);
}

/**
 * Resolve @-prefixed bare specifiers to absolute file:// URLs.
 *
 * Matches specifiers against the alias map and resolves to absolute paths,
 * trying .ts and .tsx extensions as fallbacks for extensionless imports.
 *
 * @param {string} specifier
 * @param {object} context
 * @param {(specifier: string, context: object) => any} nextResolve
 * @returns {Promise<{ url: string }>}
 */
export async function resolve(specifier, context, nextResolve) {
    const alias = findMatchingAlias(specifier);
    if (alias === null) return nextResolve(specifier, context);
    return resolveAliasPath(specifier, alias, context, nextResolve);
}
