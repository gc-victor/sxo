/**
 * inject-assets.js
 *
 * Shared HTML asset injection utilities for server runtime (dev/prod) and static generator reuse.
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
 * AIDEV-NOTE:
 * Keep this module minimal and side‑effect free. It is imported by both servers and the generator.
 * If behavior changes (injection points, tag shapes), update tests accordingly.
 */

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
    const s = p == null ? "/" : String(p);
    if (s === "") return "";
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
    if (typeof html !== "string" || !html) return String(html ?? "");
    const css = Array.isArray(assets?.css) ? assets.css : [];
    const js = Array.isArray(assets?.js) ? assets.js : [];

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
    if (!Array.isArray(css) || css.length === 0) return html;
    // Preserve provided order; avoid duplicates while keeping first occurrence
    const seenCss = new Set();
    const cssTags = [];
    for (const href of css) {
        if (typeof href !== "string" || href.length === 0) continue;
        if (seenCss.has(href)) continue;
        seenCss.add(href);
        cssTags.push(`  <link rel="stylesheet" href="${publicPath}${href}">`);
    }
    if (cssTags.length > 0) {
        if (/<\/head>/i.test(html)) {
            return html.replace(/<\/head>/i, `${cssTags.join("\n")}\n</head>`);
        } else {
            // Fallback: prepend to document if no head section present
            return `${cssTags.join("\n")}\n${html}`;
        }
    }
    return html;
}

/**
 * Inject JS assets into HTML before </body>
 * @param {string} html
 * @param {string[]} js
 * @param {string} publicPath
 * @returns {string}
 */
export function injectJs(html, js, publicPath) {
    if (!Array.isArray(js) || js.length === 0) return html;
    const seenJs = new Set();
    const jsTags = [];
    for (const src of js) {
        if (typeof src !== "string" || src.length === 0) continue;
        if (seenJs.has(src)) continue;
        seenJs.add(src);
        jsTags.push(`  <script type="module" src="${publicPath}${src}"></script>`);
    }
    if (jsTags.length > 0) {
        if (/<\/body>/i.test(html)) {
            return html.replace(/<\/body>/i, `${jsTags.join("\n")}\n</body>`);
        } else {
            // Fallback: append to document if no body section present
            return `${html}\n${jsTags.join("\n")}`;
        }
    }
    return html;
}
