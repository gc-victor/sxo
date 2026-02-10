/**
 * @fileoverview Shared HTML asset injection utilities for server runtime (dev/prod) and static generator reuse.
 *
 * Responsibilities:
 * - Normalize PUBLIC_PATH semantics consistently across runtime and generator.
 * - Inject CSS/JS assets (client-relative paths) into HTML documents.
 *   - CSS: <link rel="stylesheet"> before </head>
 *   - JS:  <script type="module"> before </body>
 *
 * Conventions:
 * - Assets passed to these helpers must be client-relative paths (no PUBLIC_PATH prefix).
 * - PUBLIC_PATH normalization:
 *   - If empty string "", preserve as "" (no leading slash).
 *   - If undefined/null, default to "/".
 *   - If non-empty, ensure it ends with a trailing slash.
 *
 * Node >= 20, ESM
 *
 * Keep this module minimal and side‑effect free. It is imported by both servers and generator.
 * If behavior changes (injection points, tag shapes), update tests accordingly.
 */

import { escapeHtml } from "./html-utils.js";

/**
 * Inject HTML tags for assets at a specified marker position.
 *
 * @internal - Internal helper, not exported for public use
 *
 * @param {string} html - Full HTML document to modify
 * @param {string[]} assets - List of asset paths to inject (client-relative)
 * @param {RegExp} marker - Regex pattern matching injection point (e.g., /<\/head>/i)
 * @param {(asset: string) => string} tagBuilder - Callback to generate tag markup for each asset
 * @param {boolean} prepend - Whether to prepend tags (true) or append (false) on fallback
 * @returns {string} HTML string with tags injected
 *
 * @example
 * ```javascript
 * injectTags(html, ['style.css'], /<\/head>/i, (asset) => {
 *     return `<link rel="stylesheet" href="${asset}">`;
 * }, true)
 * ```
 */
function injectTags(html, assets, marker, tagBuilder, prepend) {
    if (!Array.isArray(assets) || assets.length === 0) {
        return html;
    }

    // Deduplicate assets (preserving first occurrence order)
    const seen = new Set();
    const tags = [];

    for (const asset of assets) {
        if (typeof asset !== "string" || asset.length === 0) continue;
        if (seen.has(asset)) continue;

        seen.add(asset);
        tags.push(tagBuilder(asset));
    }

    if (tags.length === 0) {
        return html;
    }

    // Inject before marker
    if (marker.test(html)) {
        return html.replace(marker, `${tags.join("\n")}\n$&`);
    }

    // Fallback: prepend or append based on marker type
    return prepend ? `${tags.join("\n")}\n${html}` : `${html}\n${tags.join("\n")}`;
}

/**
 * Normalize PUBLIC_PATH:
 * - If empty string "", preserve as "" (no leading slash)
 * - If undefined/null, default to "/"
 * - Ensure trailing slash for non-empty values
 * @param {unknown} p
 * @returns {string}
 */
export function normalizePublicPath(p) {
    if (p === "") return "";
    const s = p === null || p === undefined ? "/" : String(p);
    if (!s) return "";
    return s.endsWith("/") ? s : `${s}/`;
}

/**
 * Inject built assets into an HTML document string.
 *
 * @param {string} html - Full HTML document to modify
 * @param {{ css?: string[]; js?: string[] } | null | undefined} assets - Assets (client-relative paths)
 * @param {string} publicPath - Normalized PUBLIC_PATH (use normalizePublicPath first)
 * @returns {string} A new HTML string with assets injected
 */
export function injectAssets(html, assets, publicPath) {
    if (!html) return String(html ?? "");
    const css = assets?.css ?? [];
    const js = assets?.js ?? [];

    let result = html;

    // Inject CSS before </head>
    result = injectCss(result, css, publicPath);

    // Inject JS before </body>
    result = injectJs(result, js, publicPath);

    return result;
}

/**
 * Inject CSS assets into HTML before </head>
 * @param {string} html
 * @param {string[]} css
 * @param {string} publicPath
 * @returns {string}
 */
export function injectCss(html, css, publicPath) {
    const HEAD_MARKER = /<\/head>/i;

    return injectTags(
        html,
        css,
        HEAD_MARKER,
        (asset) => {
            const href = escapeHtml(publicPath + asset);
            return `  <link rel="stylesheet" href="${href}">`;
        },
        true,
    ); // prepend tags (for head)
}

/**
 * Inject JS assets into HTML before </body>
 * @param {string} html
 * @param {string[]} js
 * @param {string} publicPath
 * @returns {string}
 */
export function injectJs(html, js, publicPath) {
    const BODY_MARKER = /<\/body>/i;

    return injectTags(
        html,
        js,
        BODY_MARKER,
        (asset) => {
            const src = escapeHtml(publicPath + asset);
            return `  <script type="module" src="${src}"></script>`;
        },
        false,
    ); // append tags (for body)
}
