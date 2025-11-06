import path from "node:path";
import { OUTPUT_DIR_SERVER, PAGES_DIR, PAGES_RELATIVE_DIR } from "../../constants.js";

/**
 * Internal helper: ensure a value is a string.
 * @param {unknown} v
 * @param {string} label
 */
function assertString(v, label) {
    if (typeof v !== "string") {
        throw new Error(`${label} must be a string (received: ${String(v)})`);
    }
}

/**
 * Convert a source JSX/TSX page module path to its built JS bundle path.
 *
 * @param {string} jsxPath - Absolute or relative path to a source page module under PAGES_DIR
 * @returns {string} Absolute path of the expected built JS bundle under OUTPUT_DIR_SERVER
 */
export function jsxBundlePath(jsxPath) {
    assertString(jsxPath, "jsxPath");

    // Use env if set (for generate with custom pagesDir), else constants
    const pagesDirEnv = process.env.PAGES_DIR;
    const pagesAbs = pagesDirEnv ? path.resolve(process.cwd(), pagesDirEnv) : PAGES_DIR;
    const pagesRel = pagesDirEnv ? path.relative(process.cwd(), pagesAbs) : PAGES_RELATIVE_DIR;
    const absInput = path.resolve(jsxPath);

    // Accept either already-absolute path inside pagesAbs or a relative path
    // starting with the relative pages directory string.
    const isInsideAbs = absInput.startsWith(pagesAbs + path.sep) || absInput === pagesAbs;
    const isRelPrefix = jsxPath.startsWith(`${pagesRel}/`) || jsxPath === pagesRel;

    if (!isInsideAbs && !isRelPrefix) {
        throw new Error(`JSX path must start with ${pagesRel}: ${jsxPath}`);
    }

    // Derive the relative path from pages root (always from absolute anchor)
    const relFromPages = path.relative(pagesAbs, absInput).replace(/\\/g, "/"); // normalize Windows separators

    // Replace .jsx / .tsx with .js (other extensions pass through unchanged)
    const relJs = relFromPages.replace(/\.(jsx|tsx)$/i, ".js");

    const outRoot = path.resolve(OUTPUT_DIR_SERVER);
    const candidate = path.resolve(outRoot, relJs);

    // Escape guard: ensure final absolute candidate stays within the intended root.
    if (!candidate.startsWith(outRoot + path.sep) && candidate !== outRoot) {
        throw new Error("Resolved JSX module path escapes OUTPUT_DIR_SERVER");
    }

    return candidate;
}
