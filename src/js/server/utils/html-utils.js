/** Regex to match the <div id="page">...</div> in HTML templates (lazy, DOTALL via [\s\S]) */
export const DIV_APP_REGEX = /<div\s+id=["']page["'][^>]*>[\s\S]*?<\/div>/i;
/** Regex to match the <title>...</title> in HTML templates */
export const TITLE_REGEX = /<title>[\s\S]*?<\/title>/i;

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
 * Render a styled error message placed inside the #page container.
 * The message is escaped to avoid script/style injection.
 * @param {unknown} message
 * @returns {string}
 */
export function renderErrorHtml(message) {
    return `<body><div id="page"><pre style="padding:32px;color:red;">✘ [ERROR]: ${escapeHtml(message)}</pre></div>`;
}
