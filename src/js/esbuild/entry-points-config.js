import fs from "node:fs";
import path from "node:path";
import { CLIENT_DIR, OUTPUT_DIR_SERVER, PAGES_DIR, PAGES_RELATIVE_DIR } from "../constants.js";

/**
 * Build route configs for esbuild htmlPlugin.
 * - Single-pass traversal (iterative)
 * - Optional reuse of routes.json if valid
 * - Only index.* pages (excluding any found in the configured client subdirectory) become routes
 * - Optional <clientDir>/index.* (precedence: .ts, .tsx, .js, .jsx) prepended to entryPoints
 * - global.css appended if present
 * - No configured client subdirectory prefix in output filenames
 */
export function entryPointsConfig() {
    const htmlTemplate = readHtmlTemplate();
    const globalCss = resolveGlobalCss();
    const cachePath = resolveRoutesCachePath();
    const cwd = process.cwd();

    if (cachePath && fsExists(cachePath)) {
        const reused = tryReuseCachedRoutes(cachePath, htmlTemplate, globalCss);
        if (reused) return reused;
    }

    const metaMap = scanPagesTree();
    const routes = assembleRoutes(metaMap, {
        htmlTemplate,
        globalCss,
        cwd,
    });

    return routes;
}

/* -------------------------------- Constants ------------------------------- */

const PAGE_EXTENSIONS = [".tsx", ".jsx", ".ts", ".js"];
const CLIENT_EXT_PRECEDENCE = [".ts", ".tsx", ".js", ".jsx"];
const ROUTES_CACHE_FILENAME = "routes.json";

/* ------------------------------ Core Helpers ------------------------------ */

function readHtmlTemplate() {
    const rootHtmlPath = path.join(PAGES_DIR, "index.html");
    try {
        return fs.readFileSync(rootHtmlPath, "utf8");
    } catch {
        throw new Error(`The index.html template not found in ${PAGES_DIR}`);
    }
}

function resolveGlobalCss() {
    const rel = `${PAGES_RELATIVE_DIR}/global.css`;
    const abs = path.join(process.cwd(), rel);
    return fsExists(abs) ? rel : null;
}

/**
 * Attempt to reuse cached routes.
 * Valid if:
 *  - Each route.jsx still exists
 *  - No new page index.* (excluding configured client subdirectory indexes) appeared
 */
function tryReuseCachedRoutes(cachePath, htmlTemplate, globalCss) {
    let cached;
    try {
        cached = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    } catch {
        return null;
    }
    if (!Array.isArray(cached)) return null;

    const jsxSet = new Set();
    for (const r of cached) {
        if (!r || typeof r !== "object" || typeof r.jsx !== "string") return null;
        const abs = path.join(process.cwd(), r.jsx);
        if (!fsExists(abs)) return null;
        jsxSet.add(normalizePath(r.jsx));
    }

    if (detectNewPagesNotInSet(jsxSet)) return null;

    // Rehydrate template + global.css presence
    for (const r of cached) {
        r.htmlTemplate = htmlTemplate;
        if (Array.isArray(r.entryPoints)) {
            const filtered = r.entryPoints.filter((ep) => !/[/\\]global\.css$/.test(ep));
            if (globalCss) filtered.push(globalCss);
            r.entryPoints = filtered;
        } else {
            r.entryPoints = globalCss ? [globalCss] : [];
        }
        r.scriptLoading = "module";
        // AIDEV-NOTE: Refresh hash flag when reusing cached routes so dev/build mode reflects current process.env
        r.hash = process.env.DEV === "true";
    }
    return cached;
}

/**
 * Scan PAGES_DIR for new page index.* not in jsxSet.
 * Ignore configured client subdirectory indexes.
 */
function detectNewPagesNotInSet(jsxSet) {
    const stack = [PAGES_DIR];
    while (stack.length) {
        const dir = stack.pop();
        let dirents;
        try {
            dirents = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            continue;
        }

        for (const d of dirents) {
            if (d.isDirectory()) {
                if (d.name === CLIENT_DIR) continue; // ignore client subtree
                stack.push(path.join(dir, d.name));
            } else if (d.isFile()) {
                const ext = path.extname(d.name);
                if (PAGE_EXTENSIONS.includes(ext) && isIndexFile(d.name)) {
                    const full = path.join(dir, d.name);
                    const rel = normalizePath(path.relative(process.cwd(), full));
                    if (!jsxSet.has(rel)) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

function isIndexFile(name) {
    return /^index\.(tsx|ts|jsx|js)$/.test(name);
}

/**
 * Single-pass scan:
 * - Do NOT traverse into the configured client subdirectory (it never produces routes).
 * - For each non-client directory with index.* => page
 * - Look for <clientDir>/index.* (precedence order) in the sibling configured subdirectory
 */
function scanPagesTree() {
    const metaMap = new Map(); // Map<absDir, { pageIndex: string, clientEntry: string|null }>
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

        // Find page index.* (if any)
        let pageIndex = null;
        for (const d of dirents) {
            if (d.isFile()) {
                const ext = path.extname(d.name);
                if (!pageIndex && PAGE_EXTENSIONS.includes(ext) && isIndexFile(d.name)) {
                    pageIndex = path.join(dir, d.name);
                }
            }
        }

        // Queue subdirectories (excluding client/)
        for (const d of dirents) {
            if (d.isDirectory()) {
                if (d.name === CLIENT_DIR) continue; // we'll inspect it separately for client entry
                if (d.isSymbolicLink()) continue; // skip symlinks
                stack.push(path.join(dir, d.name));
            }
        }

        if (pageIndex) {
            const clientEntry = findClientEntry(dir);
            metaMap.set(dir, { pageIndex, clientEntry });
        }
    }

    return metaMap;
}

/**
 * Locate first matching <clientDir>/index.* according to CLIENT_EXT_PRECEDENCE.
 * Returns absolute path or null.
 */
function findClientEntry(parentDir) {
    const clientDir = path.join(parentDir, CLIENT_DIR);
    try {
        const stat = fs.statSync(clientDir);
        if (!stat.isDirectory()) return null;
    } catch {
        return null;
    }

    // Equivalent to original loop you referenced (adapted precedence)
    for (const ext of CLIENT_EXT_PRECEDENCE) {
        const candidate = path.join(clientDir, `index${ext}`);
        if (fsExists(candidate)) return candidate;
    }
    return null;
}

/**
 * Turn metadata into final route objects.
 */
function assembleRoutes(metaMap, { htmlTemplate, globalCss, cwd }) {
    const routes = [];
    for (const [absDir, { pageIndex, clientEntry }] of metaMap.entries()) {
        const relDir = path.relative(PAGES_DIR, absDir);
        const isRoot = relDir === "" || relDir === ".";
        const pageBase = `${path.basename(pageIndex).replace(/\.(tsx|ts|jsx|js)$/, "")}.html`;
        const filename = isRoot ? pageBase : path.join(relDir, pageBase);

        const entryPoints = [];
        if (clientEntry) {
            entryPoints.push(normalizePath(path.relative(cwd, clientEntry)));
        }
        if (globalCss) {
            entryPoints.push(globalCss);
        }

        const jsxRel = normalizePath(path.relative(cwd, pageIndex));
        const route = {
            filename: normalizePath(filename),
            entryPoints,
            jsx: jsxRel,
            htmlTemplate,
            scriptLoading: "module",
            hash: process.env.DEV === "true", // AIDEV-NOTE: boolean flag (true in dev) enabling htmlPlugin cache-busting hash
        };
        if (!isRoot) {
            route.path = normalizePath(relDir);
        }
        routes.push(route);
    }
    return routes;
}

/**
 * Resolve routes.json path if OUTPUT_DIR_SERVER defined.
 */
function resolveRoutesCachePath() {
    if (!OUTPUT_DIR_SERVER) return null;
    return path.join(OUTPUT_DIR_SERVER, ROUTES_CACHE_FILENAME);
}

/* ------------------------------ Small Helpers ----------------------------- */

function fsExists(p) {
    try {
        fs.accessSync(p, fs.constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

function normalizePath(p) {
    return p.replace(/\\/g, "/");
}
