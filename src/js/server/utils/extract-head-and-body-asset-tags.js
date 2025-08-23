/**
 * @param {string} html
 * @returns {{ head: string[], body: string[] }}
 */
export function extractHeadAndBodyAssetTags(html) {
    if (typeof html !== "string") {
        return { head: [], body: [] };
    }

    // Helper to safely extract a section's inner HTML.
    const matchSection = (re) => {
        const m = html.match(re);
        if (!m) return null;
        return {
            full: m[0],
            inner: m[1] ?? "",
            start: m.index ?? -1,
            end: (m.index ?? -1) + m[0].length,
        };
    };

    // Capture <head>...</head> (non-greedy, allows attributes)
    const headSection = matchSection(/<head[^>]*>([\s\S]*?)<\/head>/i);
    // Capture <body>...</body>
    const bodySection = matchSection(/<body[^>]*>([\s\S]*?)<\/body>/i);

    const head = [];
    const body = [];

    // Regex patterns (global + case-insensitive)
    const LINK_RE = /<link\b[^>]*?>/gi; // matches self-closing or standard (HTML5 allows <link>)
    const SCRIPT_RE = /<script\b[\s\S]*?<\/script>/gi; // include inline content
    const STYLE_RE = /<style\b[\s\S]*?<\/style>/gi;

    if (headSection) {
        const h = headSection.inner;
        pushAll(h, LINK_RE, head);
        pushAll(h, SCRIPT_RE, head);
        pushAll(h, STYLE_RE, head);
    }

    if (bodySection) {
        const b = bodySection.inner;
        pushAll(b, LINK_RE, body);
        pushAll(b, SCRIPT_RE, body);
        pushAll(b, STYLE_RE, body);
    }

    return { head, body };
}

/**
 * Execute a global regex repeatedly against source and push matches to target array.
 * @param {string} source
 * @param {RegExp} regex (MUST be global)
 * @param {string[]} target
 */
function pushAll(source, regex, target) {
    regex.lastIndex = 0;
    let m;
    // AIDEV-NOTE: lint fix (noAssignInExpressions) – moved assignment out of while condition
    while (true) {
        m = regex.exec(source);
        if (m === null) break;
        target.push(m[0]);
    }
}
