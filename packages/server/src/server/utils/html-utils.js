/**
 * Build a minimal HTML error page with semantic structure.
 *
 * @param {string} title - Page title and <h1> content
 * @param {string} message - <p> body text
 * @returns {string} Complete HTML error page
 */
export function htmlErrorPage(title, message) {
    return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>${title}</title></head><body><h1>${title}</h1><p>${message}</p></body></html>`;
}

/**
 * Escape HTML-sensitive characters to avoid injection when rendering messages or inline content.
 * @param {unknown} str
 * @returns {string}
 */
export function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/**
 * Walk the cause chain of an error, returning a human-readable string.
 * Returns empty string for null/undefined/primitive inputs.
 * @param {unknown} err
 * @returns {string}
 */
function errorChain(err) {
    if (err === null || err === undefined) return "";
    let result = String(err);
    if (result === "null" || result === "undefined") return "";
    let current = /** @type {Error | undefined} */ (err && typeof err === "object" ? err.cause : undefined);
    let depth = 0;
    while (current && depth < 10) {
        if (typeof AggregateError !== "undefined" && current instanceof AggregateError && current.errors) {
            result += `\n\nAggregateError with ${current.errors.length} error(s):`;
            for (let i = 0; i < current.errors.length; i++) {
                result += `\n  [${i}]: ${String(current.errors[i])}`;
            }
            if (current.cause) {
                current = /** @type {Error | undefined} */ (current.cause);
                continue;
            }
            break;
        }
        result += `\n\nCaused by: ${String(current)}`;
        current = /** @type {Error | undefined} */ (current.cause);
        depth++;
    }
    return result;
}

/**
 * Render a styled error message placed inside the #page container.
 * The message is escaped to avoid script/style injection.
 * @param {unknown} message
 * @returns {string}
 */
export function renderErrorHtml(message) {
    const fullMessage = errorChain(message);
    return `<body><div id="page"><pre style="padding:32px;color:red;">✘ [ERROR]: ${escapeHtml(fullMessage)}</pre></div>`;
}
