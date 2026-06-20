/**
 * @fileoverview HTML escape utility for rendering raw markup as text inside <code>/<pre> (vanilla JSX)
 *
 * @module utils/escape-html
 * @description
 * Provides a minimal, dependency-free function to escape unsafe HTML characters so that
 * strings containing markup can be safely injected into text-only contexts (e.g. the
 * content of <code> elements) without being interpreted by the browser.
 *
 * Exports:
 * - escapeHtml (named): Escape &, <, >, ", ' characters to corresponding entities.
 * - default: Alias of escapeHtml.
 *
 * Design notes:
 * - This targets text node contexts (e.g., <code>{escapeHtml(snippet)}</code>).
 * - It intentionally escapes the minimal set required to prevent HTML parsing:
 *   &, <, >, ", ' — which covers common injection vectors in text contexts.
 * - It does not attempt to sanitize URLs or CSS. For attributes/URLs, use
 *   dedicated validators/sanitizers upstream.
 *
 * Intended for code display panels. Keep escaping minimal to avoid altering code samples.
 *
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 */

/**
 * Escape a string for safe insertion into HTML text content (e.g., inside <code>...</code>).
 *
 * Escapes the following characters:
 * - &  -> &amp;
 * - <  -> &lt;
 * - >  -> &gt;
 * - "  -> &quot;
 * - '  -> &#39;
 *
 * @function escapeHtml
 * @param {unknown} value - Value to escape; will be stringified via String(value).
 * @returns {string} Escaped string safe for HTML text contexts.
 * @example
 * escapeHtml(`<b id="x">Hi & welcome</b>`)
 * // => "&lt;b id=&quot;x&quot;&gt;Hi &amp; welcome&lt;/b&gt;"
 * @public
 */
export function escapeHtml(value) {
    if (value == null) return "";
    const str = String(value);
    // Fast path: if no escapable chars, return original string
    const needsEscape = /[&<>"']/.test(str);
    if (!needsEscape) return str;

    /** @type {Record<string, string>} */
    const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    };

    return str.replace(/[&<>"']/g, (ch) => map[ch]);
}

export default escapeHtml;
