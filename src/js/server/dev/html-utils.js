/**
 * @fileoverview HTML parsing utilities for dev server hot-reload.
 *
 * @module server/dev/html-utils
 */

/**
 * Extract body innerHTML from HTML string.
 *
 * Matches content between `<body>` and `</body>` tags, case-insensitive.
 * Handles body tags with attributes (e.g., `<body class="dark">`).
 *
 * @param {string} html - Full HTML document string
 * @returns {string} Body content or empty string if no body tags found
 */
export function extractBodyFromHtml(html) {
    // Use dotAll flag (s) to match across newlines
    const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    return match ? match[1] : "";
}

// Re-export as extractBody for backward compatibility
export { extractBodyFromHtml as extractBody };
