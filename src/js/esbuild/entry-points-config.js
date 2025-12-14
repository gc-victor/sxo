import fs from "node:fs";
import path from "node:path";
import { CLIENT_DIR, PAGES_DIR, PAGES_RELATIVE_DIR } from "../constants.js";
import { validateRoutePattern } from "../server/utils/route-match.js";

/**
 * Build route configs for esbuild htmlPlugin.
 * - Single-pass traversal (iterative)
 * - Only index.* pages (excluding any found in the configured client subdirectory) become routes
 * - Collects all <clientDir>/index.* and <clientDir>/*.index.* files as client entry points
 * - global.css appended to each route's entryPoints if present
 * - No configured client subdirectory prefix in output filenames
 */
export function entryPointsConfig() {
    const globalCss = resolveGlobalCss();
    const cwd = process.cwd();
    const metaMap = scanPagesTree();
    const routes = assembleRoutes(metaMap, { globalCss, cwd });

    return routes;
}

/* -------------------------------- Constants ------------------------------- */

const PAGE_EXTENSIONS = [".tsx", ".jsx", ".ts", ".js"];

/* ------------------------------ Core Helpers ------------------------------ */

function resolveGlobalCss() {
    const rel = `${PAGES_RELATIVE_DIR}/global.css`;
    const abs = path.join(process.cwd(), rel);
    try {
        fs.accessSync(abs, fs.constants.F_OK);
        return rel;
    } catch {
        return null;
    }
}

function isIndexFile(name) {
    return /^index\.(tsx|ts|jsx|js)$/.test(name);
}

/**
 * Scan PAGES_DIR for page directories with index.* and their client entries.
 * Uses iterative traversal to avoid the configured client subdirectory (which never produces routes).
 */
function scanPagesTree() {
    const metaMap = new Map();
    const stack = [PAGES_DIR];

    while (stack.length) {
        const dir = stack.pop();
        let dirents;
        try {
            dirents = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            continue;
        }

        // Skip if the directory itself is a client subdir
        if (path.basename(dir) === CLIENT_DIR) {
            continue;
        }

        let pageIndex = null;

        // Single pass: find page index and queue subdirectories
        for (const d of dirents) {
            if (d.isFile()) {
                const ext = path.extname(d.name);
                if (!pageIndex && PAGE_EXTENSIONS.includes(ext) && isIndexFile(d.name)) {
                    pageIndex = path.join(dir, d.name);
                }
            } else if (d.isDirectory()) {
                if (d.name !== CLIENT_DIR && !d.isSymbolicLink()) {
                    stack.push(path.join(dir, d.name));
                }
            }
        }

        if (pageIndex) {
            const clientEntries = findClientEntries(dir);
            metaMap.set(dir, { pageIndex, clientEntries });
        }
    }

    return metaMap;
}

/**
 * Locate all matching <clientDir>/index.* and <clientDir>/*.index.* files.
 * Returns array of absolute paths (all variants, no precedence filtering).
 */
function findClientEntries(parentDir) {
    const clientDir = path.join(parentDir, CLIENT_DIR);
    let dirents;
    try {
        const stat = fs.statSync(clientDir);
        if (!stat.isDirectory()) return [];
        dirents = fs.readdirSync(clientDir, { withFileTypes: true });
    } catch {
        return [];
    }

    const entries = [];
    for (const d of dirents) {
        if (d.isFile()) {
            const ext = path.extname(d.name);
            const name = d.name;
            // Match: index.* or *.index.*
            const isIndexPattern = isIndexFile(name) || /\.index$/.test(name.slice(0, -ext.length));
            if (isIndexPattern && PAGE_EXTENSIONS.includes(ext)) {
                entries.push(path.join(clientDir, name));
            }
        }
    }
    return entries;
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
 */
function assembleRoutes(metaMap, { globalCss, cwd }) {
    const routes = [];
    for (const [absDir, { pageIndex, clientEntries }] of metaMap.entries()) {
        const relDir = normalizePath(path.relative(PAGES_DIR, absDir));
        const isRoot = relDir === "" || relDir === ".";
        const pageBase = `${path.basename(pageIndex).replace(/\.(tsx|ts|jsx|js)$/, "")}.html`;
        const filename = normalizePath(isRoot ? pageBase : path.join(relDir, pageBase));

        // Validate route pattern before building (fail fast)
        if (!isRoot) {
            const validation = validateRoutePattern(relDir);
            if (!validation.valid) {
                throw new Error(`Invalid route pattern "${relDir}": ${validation.error}`);
            }
        }

        const entryPoints = [...clientEntries.map((entry) => normalizePath(path.relative(cwd, entry))), ...(globalCss ? [globalCss] : [])];

        const route = {
            filename,
            entryPoints,
            jsx: normalizePath(path.relative(cwd, pageIndex)),
            scriptLoading: "module",
            hash: process.env.DEV === "true", // boolean flag (true in dev) enabling htmlPlugin cache-busting hash
        };
        if (!isRoot) {
            route.path = relDir;
        }
        routes.push(route);
    }
    return routes;
}

/* ------------------------------ Small Helpers ----------------------------- */

function normalizePath(p) {
    return p.replace(/\\/g, "/");
}
