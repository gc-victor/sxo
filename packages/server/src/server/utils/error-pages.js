/**
 * Utility helpers to resolve root-level special error pages (404 and 500)
 * inside the configured pages directory.
 *
 * Conventions (precedence order):
 *   1. PAGES_DIR/{name}.tsx       — flat file
 *   2. PAGES_DIR/{name}.jsx       — flat file
 *   3. PAGES_DIR/{name}/index.tsx — folder with index
 *   4. PAGES_DIR/{name}/index.jsx — folder with index
 *
 * Return values:
 * - Absolute source path to the matched file (preferred for downstream usage
 *   with jsxBundlePath()) or null if not found.
 *
 * Notes:
 * - This module performs filesystem checks on each call and does not cache.
 * - Keep logic in sync with any similar precedence used elsewhere.
 */

import fs from "node:fs";
import path from "node:path";
import { PAGES_DIR } from "../../constants.js";

const SPECIAL_PAGE_EXTS = [".tsx", ".jsx"];

/**
 * Resolve a special page by name from the root of PAGES_DIR.
 *
 * Precedence (first match wins):
 *   1. PAGES_DIR/{name}.tsx       — flat file
 *   2. PAGES_DIR/{name}.jsx       — flat file
 *   3. PAGES_DIR/{name}/index.tsx — folder with index
 *   4. PAGES_DIR/{name}/index.jsx — folder with index
 *
 * @param {"404" | "500"} name
 * @returns {string | null} Absolute path to the first matching file or null
 */
export function resolveErrorPage(name) {
    if (name !== "404" && name !== "500") {
        throw new Error(`Unsupported special page "${name}" (expected "404" or "500")`);
    }
    // Check flat files first (backward compatible)
    for (const ext of SPECIAL_PAGE_EXTS) {
        const abs = path.join(PAGES_DIR, `${name}${ext}`);
        try {
            fs.accessSync(abs, fs.constants.F_OK);
            return abs;
        } catch {
            // continue
        }
    }
    // Check folder with index file
    for (const ext of SPECIAL_PAGE_EXTS) {
        const abs = path.join(PAGES_DIR, name, `index${ext}`);
        try {
            fs.accessSync(abs, fs.constants.F_OK);
            return abs;
        } catch {
            // continue
        }
    }
    return null;
}

/**
 * Resolve the absolute source path for the 404 page, if present.
 * @returns {string | null}
 */
export function resolve404Page() {
    return resolveErrorPage("404");
}

/**
 * Resolve the absolute source path for the 500 page, if present.
 * @returns {string | null}
 */
export function resolve500Page() {
    return resolveErrorPage("500");
}
