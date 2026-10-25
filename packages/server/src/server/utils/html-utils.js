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

function formatAggregateErrors(errors) {
    let result = `\n\nAggregateError with ${errors.length} error(s):`;
    for (let i = 0; i < errors.length; i++) {
        result += `\n  [${i}]: ${String(errors[i])}`;
    }
    return result;
}

function describeCauseStep(current) {
    if (typeof AggregateError !== "undefined" && current instanceof AggregateError && current.errors) {
        const message = formatAggregateErrors(current.errors);
        if (current.cause) {
            return { message, cause: current.cause, depth: 0 };
        }
        return { message, cause: undefined, depth: 0 };
    }

    return {
        message: `\n\nCaused by: ${String(current)}`,
        cause: current.cause,
        depth: 1,
    };
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
        const step = describeCauseStep(current);
        result += step.message;
        current = /** @type {Error | undefined} */ (step.cause);
        depth += step.depth;
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
