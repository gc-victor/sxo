import fs from "node:fs";
import path from "node:path";
import { CLIENT_DIR, PAGES_DIR, PAGES_RELATIVE_DIR } from "@sxo/server/constants";
import { validateRoutePattern } from "@sxo/server/utils/route-match";
import { convertToPosixSlashes } from "../shared/path-utils.js";

/**
 * @typedef {{filename: string, entryPoints: string[], jsx: string, scriptLoading: string, hash: boolean, path?: string, isErrorPage?: boolean}} Route
 */

/**
 * Build route configs for esbuild htmlPlugin.
 * - Single-pass traversal (iterative)
 * - Only index.* pages (excluding any found in the configured client subdirectory) become routes
 * - Collects all <clientDir>/index.* and <clientDir>/*.index.* files as client entry points
 * - global.css appended to each route's entryPoints if present
 * - No configured client subdirectory prefix in output filenames
 *
 * @param {object} [options] - Options for testing
 * @param {string} [options.pagesDir] - Absolute path to pages directory
 * @param {string} [options.pagesRelativeDir] - Relative path to pages directory
 * @param {string} [options.clientDir] - Client subdirectory name
 * @param {string} [options.cwd] - Current working directory
 * @returns {Array<Route & {isErrorPage?: boolean}>} Route configs
 */
export function entryPointsConfig(options = {}) {
    // Derive pagesRelativeDir from pagesDir when pagesDir is explicitly overridden
    // but pagesRelativeDir is not supplied
    const pagesDir = options.pagesDir ?? PAGES_DIR;
    const pagesRelativeDir =
        options.pagesRelativeDir ??
        (options.pagesDir !== undefined ? path.relative(options.cwd ?? process.cwd(), options.pagesDir) : PAGES_RELATIVE_DIR);
    const clientDir = options.clientDir ?? CLIENT_DIR;
    const cwd = options.cwd ?? process.cwd();

    const globalCss = resolveGlobalCss(pagesRelativeDir, cwd);
    const metaMap = scanPagesTree(pagesDir, clientDir);
    const routes = assembleRoutes(metaMap, { globalCss, cwd, pagesDir });

    return routes;
}

const PAGE_EXTENSIONS = [".tsx", ".jsx", ".ts", ".js"];

/**
 * Check if a filename matches client entry patterns.
 *
 * Matches:
 * - "index.*" - Direct index files (e.g., "index.js", "index.tsx")
 * - "*.index.*" - Files with .index prefix (e.g., "home.index.js")
 *
 * Valid extensions: .tsx, .jsx, .ts, .js (from PAGE_EXTENSIONS constant)
 *
 * @param {string} filename - Filename to check (e.g., "client/index.js", "pages/home.client.js")
 * @returns {boolean} True if filename matches client entry pattern
 *
 * @example
 * ```javascript
 * isClientEntry('client/index.js')   // true
 * isClientEntry('client/home.index.tsx') // true
 * isClientEntry('client/main.js')      // false
 * ```
 */
function isClientEntry(filename) {
    const ext = path.extname(filename);
    const name = path.basename(filename, ext);

    // Match: "index.*" or "*.index.*"
    const isIndexPattern = name === "index" || name.endsWith(".index");

    return isIndexPattern && PAGE_EXTENSIONS.includes(ext);
}

/**
 * @param {string} pagesRelativeDir
 * @param {string} cwd
 * @returns {string | null}
 */
function resolveGlobalCss(pagesRelativeDir, cwd) {
    const rel = `${pagesRelativeDir}/global.css`;
    const abs = path.join(cwd, rel);
    try {
        fs.accessSync(abs, fs.constants.F_OK);
        return rel;
    } catch {
        return null;
    }
}

/**
 * Check if a filename is an exact "index.*" file.
 *
 * This matches ONLY basename pattern: "index.(tsx|ts|jsx|js)"
 * For client entry detection (includes "*.index.*" pattern), use {@link isClientEntry}.
 *
 * @param {string} name - Filename basename (e.g., "index.js")
 * @returns {boolean} True if name is exactly "index" with valid extension
 *
 * @example
 * ```javascript
 * isIndexFile('index.js')       // true
 * isIndexFile('index.tsx')      // true
 * isIndexFile('home.index.js')  // false
 * isIndexFile('about.js')        // false
 * ```
 */
function isIndexFile(name) {
    return /^index\.(tsx|ts|jsx|js)$/.test(name);
}

/**
 * Scan PAGES_DIR for page directories with index.* and their client entries.
 * Uses iterative traversal to avoid the configured client subdirectory (which never produces routes).
 *
 * @param {string} pagesDir
 * @param {string} clientDir
 */
function scanPagesTree(pagesDir, clientDir) {
    const metaMap = new Map();
    const stack = [pagesDir];

    while (stack.length) {
        const dir = /** @type {string} */ (stack.pop());
        let dirents;
        try {
            dirents = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            continue;
        }

        // Skip if the directory itself is a client subdir
        if (path.basename(dir) === clientDir) {
            continue;
        }

        let pageIndex = null;

        // Single pass: find page index and queue subdirectories
        for (const d of dirents) {
            if (d.isFile()) {
                const ext = path.extname(/** @type {string} */ (d.name));
                if (!pageIndex && PAGE_EXTENSIONS.includes(ext) && isIndexFile(/** @type {string} */ (d.name))) {
                    pageIndex = path.join(dir, /** @type {string} */ (d.name));
                }
            } else if (d.isDirectory()) {
                if (/** @type {string} */ (d.name) !== clientDir && !d.isSymbolicLink()) {
                    stack.push(path.join(dir, /** @type {string} */ (d.name)));
                }
            }
        }

        if (pageIndex) {
            const clientEntries = findClientEntries(dir, clientDir);
            metaMap.set(dir, { pageIndex, clientEntries });
        }
    }

    return metaMap;
}

/**
 * Locate all matching <clientDir>/index.* and <clientDir>/*.index.* files.
 * Returns array of absolute paths (all variants, no precedence filtering).
 *
 * @param {string} parentDir
 * @param {string} clientDirName
 * @returns {string[]}
 */
function findClientEntries(parentDir, clientDirName) {
    const clientDir = path.join(parentDir, clientDirName);
    let dirents;
    try {
        const stat = fs.statSync(clientDir);
        if (!stat.isDirectory()) return [];
        dirents = fs.readdirSync(clientDir, { withFileTypes: true });
    } catch {
        return [];
    }

    return dirents
        .filter((d) => d.isFile())
        .map((d) => path.join(clientDir, d.name))
        .filter(isClientEntry);
}

/**
 * Count the number of dynamic segments in a route pattern.
 * Dynamic segments are enclosed in square brackets, e.g., [slug].
 *
 * @param {string} pattern - Route pattern (e.g., "blog/[slug]/comments")
 * @returns {number} Number of dynamic segments
 */
function countDynamicSegments(pattern) {
    const matches = pattern.match(/\[[^\]]+\]/g);
    return matches ? matches.length : 0;
}

/**
 * Sort routes by specificity for correct matching precedence.
 * Static routes (fewer dynamic segments) outrank dynamic routes.
 * Root route (empty path) is least specific and comes last.
 * For ties, alphabetical ordering provides stable sorting.
 *
 * @template T
 * @param {Array<T & {path?: string}>} routes - Route objects to sort
 * @returns {Array<T & {path?: string}>} Sorted routes
 */
function sortRoutesBySpecificity(routes) {
    return routes.sort((a, b) => {
        const pathA = a.path || "";
        const pathB = b.path || "";

        // Root route (empty path) is least specific, comes last
        if (pathA === "" && pathB !== "") return 1;
        if (pathB === "" && pathA !== "") return -1;

        // Count dynamic segments - fewer = more specific = comes first
        const dynamicA = countDynamicSegments(pathA);
        const dynamicB = countDynamicSegments(pathB);

        if (dynamicA !== dynamicB) {
            return dynamicA - dynamicB;
        }

        // Same specificity: alphabetical for stable ordering
        return pathA.localeCompare(pathB);
    });
}

/**
 * Convert metadata into final route objects for esbuild.
 * Each route's entryPoints includes route-specific client code and global.css (if present).
 * Note: esbuild deduplicates identical entries during bundling.
 *
 * Validates route patterns to ensure parameter names are:
 * - Alphanumeric (plus underscore)
 * - Start with a letter
 * - Unique within each route
 *
 * Routes are sorted by specificity so static routes outrank dynamic siblings.
 *
 * @param {Map<string, {pageIndex: string, clientEntries: string[]}>} metaMap
 * @param {{globalCss: string | null, cwd: string, pagesDir: string}} options
 * @returns {{filename: string, entryPoints: string[], jsx: string, scriptLoading: string, hash: boolean, path?: string, isErrorPage?: boolean}[]}
 */
function assembleRoutes(metaMap, { globalCss, cwd, pagesDir }) {
    const routes = [];
    for (const [absDir, { pageIndex, clientEntries }] of metaMap.entries()) {
        const relDir = convertToPosixSlashes(path.relative(pagesDir, absDir));
        const isRoot = relDir === "" || relDir === ".";
        const pageBase = `${path.basename(pageIndex).replace(/\.(tsx|ts|jsx|js)$/, "")}.html`;
        const filename = convertToPosixSlashes(isRoot ? pageBase : path.join(relDir, pageBase));

        // Validate route pattern before building (fail fast)
        if (!isRoot) {
            const validation = validateRoutePattern(relDir);
            if (!validation.valid) {
                throw new Error(`Invalid route pattern "${relDir}": ${validation.error}`);
            }
        }

        // Detect special error page directories (404, 500)
        const isErrorPage = !isRoot && (relDir === "404" || relDir === "500");

        const entryPoints = [
            ...clientEntries.map((/** @type {string} */ entry) => convertToPosixSlashes(path.relative(cwd, entry))),
            ...(globalCss ? [globalCss] : []),
        ];

        /** @type {{filename: string, entryPoints: string[], jsx: string, scriptLoading: string, hash: boolean, path?: string, isErrorPage?: boolean}} */
        const route = {
            filename,
            entryPoints,
            jsx: convertToPosixSlashes(path.relative(cwd, pageIndex)),
            scriptLoading: "module",
            hash: process.env.DEV === "true", // boolean flag (true in dev) enabling htmlPlugin cache-busting hash
        };
        if (isErrorPage) {
            route.isErrorPage = true;
        } else if (!isRoot) {
            route.path = relDir;
        }
        routes.push(route);
    }

    // Sort routes by specificity: static routes outrank dynamic siblings
    return sortRoutesBySpecificity(routes);
}
