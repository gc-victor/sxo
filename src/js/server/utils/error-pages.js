/**
 * special-pages.js
 *
 * Utility helpers to resolve root-level special error pages (404 and 500)
 * inside the configured pages directory.
 *
 * Conventions:
 * - Candidate filenames (by precedence): .tsx, .jsx, .ts, .js
 * - Location: directly under PAGES_DIR (root of pages)
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
 * @param {"404" | "500"} name
 * @returns {string | null} Absolute path to the first matching file or null
 */
export function resolveErrorPage(name) {
    if (name !== "404" && name !== "500") {
        throw new Error(`Unsupported special page "${name}" (expected "404" or "500")`);
    }
    for (const ext of SPECIAL_PAGE_EXTS) {
        const abs = path.join(PAGES_DIR, `${name}${ext}`);
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

/**
 * Convenience to query both special pages at once.
 * @returns {{ "404": string | null, "500": string | null }}
 */
export function resolveErrorPages() {
    return {
        404: resolve404Page(),
        500: resolve500Page(),
    };
}
