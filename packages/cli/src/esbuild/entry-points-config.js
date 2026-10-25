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
    const routes = assembleRoutes(metaMap, { globalCss, cwd, pagesDir, clientDir });

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

function readDirectoryEntries(dir) {
    try {
        return fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return null;
    }
}

function findPageIndex(dir, dirents) {
    for (const entry of dirents) {
        if (!entry.isFile()) continue;
        const name = /** @type {string} */ (entry.name);
        const ext = path.extname(name);
        if (PAGE_EXTENSIONS.includes(ext) && isIndexFile(name)) {
            return path.join(dir, name);
        }
    }
    return null;
}

function queuePageDirectories(dir, dirents, clientDir, stack) {
    for (const entry of dirents) {
        if (!entry.isDirectory()) continue;
        const name = /** @type {string} */ (entry.name);
        if (name !== clientDir && !entry.isSymbolicLink()) {
            stack.push(path.join(dir, name));
        }
    }
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
        const dirents = readDirectoryEntries(dir);
        if (!dirents) continue;
        if (path.basename(dir) === clientDir) continue;

        const pageIndex = findPageIndex(dir, dirents);
        queuePageDirectories(dir, dirents, clientDir, stack);
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
 * Create one route, including shared and route-specific client entries.
 * Route patterns are validated before the route is returned.
 *
 * @param {string} absDir
 * @param {{pageIndex: string, clientEntries: string[]}} page
 * @param {{globalCss: string | null, cwd: string, pagesDir: string, clientDir: string}} options
 * @param {string[]} rootClientEntries
 * @returns {{filename: string, entryPoints: string[], jsx: string, scriptLoading: string, hash: boolean, path?: string, isErrorPage?: boolean}}
 */
function createRoute(absDir, page, options, rootClientEntries) {
    const { globalCss, cwd, pagesDir } = options;
    const relDir = convertToPosixSlashes(path.relative(pagesDir, absDir));
    const isRoot = relDir === "" || relDir === ".";
    const pageBase = `${path.basename(page.pageIndex).replace(/\.(tsx|ts|jsx|js)$/, "")}.html`;
    const filename = convertToPosixSlashes(isRoot ? pageBase : path.join(relDir, pageBase));

    if (!isRoot) {
        const validation = validateRoutePattern(relDir);
        if (!validation.valid) {
            throw new Error(`Invalid route pattern "${relDir}": ${validation.error}`);
        }
    }

    const isErrorPage = relDir === "404" || relDir === "500";
    const entryPathSet = new Set([
        ...rootClientEntries.map((/** @type {string} */ entry) => convertToPosixSlashes(path.relative(cwd, entry))),
        ...page.clientEntries.map((/** @type {string} */ entry) => convertToPosixSlashes(path.relative(cwd, entry))),
    ]);
    const route = {
        filename,
        entryPoints: [...entryPathSet, ...(globalCss ? [globalCss] : [])],
        jsx: convertToPosixSlashes(path.relative(cwd, page.pageIndex)),
        scriptLoading: "module",
        hash: process.env.DEV === "true",
    };

    if (isErrorPage) {
        route.isErrorPage = true;
    } else if (!isRoot) {
        route.path = relDir;
    }
    return route;
}

/**
 * Convert page metadata into routes and sort them by specificity.
 * @param {Map<string, {pageIndex: string, clientEntries: string[]}>} metaMap
 * @param {{globalCss: string | null, cwd: string, pagesDir: string, clientDir: string}} options
 */
function assembleRoutes(metaMap, options) {
    const rootClientEntries = findClientEntries(options.pagesDir, options.clientDir);
    const routes = [];
    for (const [absDir, page] of metaMap.entries()) {
        routes.push(createRoute(absDir, page, options, rootClientEntries));
    }
    return sortRoutesBySpecificity(routes);
}
