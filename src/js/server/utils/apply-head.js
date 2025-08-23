/**
 * Escape HTML-sensitive characters.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Shared tag categorization
const VOID_TAGS = new Set(["meta", "link", "base"]);
const FORCE_CLOSING_TAGS = new Set(["script", "style", "title"]);

/**
 * @param {Record<string, any>|null} obj
 * @param {string} tag
 * @returns {string}
 */
function buildAttrs(obj, tag) {
    if (!obj) return "";
    const parts = [];
    const isVoid = VOID_TAGS.has(tag);
    const forceClosing = FORCE_CLOSING_TAGS.has(tag);

    for (const [k, v] of Object.entries(obj)) {
        if (v === false || v === null || v === undefined) continue;

        // Skip content attr when it will be rendered as inner HTML
        if (k === "content" && !isVoid && (forceClosing || !isVoid)) continue;
        if (k === "content" && !isVoid) continue;

        const name = k === "httpEquiv" ? "http-equiv" : k;
        if (v === true) {
            parts.push(name);
        } else {
            parts.push(`${name}="${escapeHtml(String(v))}"`);
        }
    }

    return parts.length ? ` ${parts.join(" ")}` : "";
}

/**
 * Apply a page module `head` export to an HTML document.
 *
 * Layout of injected managed block:
 * <!-- sxo-head-start -->
 * <title>...</title>
 * <meta ...>
 * <link ...>
 * <script ...></script>
 * <script>inline</script>
 * <style>inline</style>
 * <!-- sxo-head-end -->
 *
 * Idempotent: re-running replaces previous managed block.
 *
 * @param {string} html - Full HTML document string
 * @param {object|Function|undefined} headExport - Page module export `head`
 * @param {object} [params] - Route params passed to dynamic head functions
 * @returns {string} HTML with managed head block applied (idempotent)
 */
export function applyHead(html, headExport, params = {}) {
    if (typeof html !== "string") return html;

    const START = "<!-- sxo-head-start -->";
    const END = "<!-- sxo-head-end -->";
    const managedBlockRegex = /<!-- sxo-head-start -->[\s\S]*?<!-- sxo-head-end -->\n?/i;

    // Remove any existing managed block first
    let out = html.replace(managedBlockRegex, "");
    if (!headExport) return out;

    let headObj;
    try {
        headObj = typeof headExport === "function" ? headExport(params) : headExport;
    } catch {
        // If user head function throws, return original (minus stale block) silently
        return out;
    }
    if (!headObj || typeof headObj !== "object") return out;

    // Normalize across supported convenience syntaxes
    const normalizedEntries = [];
    for (const [tag, rawVal] of Object.entries(headObj)) {
        // Title convenience (string | number | function)
        if (tag === "title" && (typeof rawVal === "string" || typeof rawVal === "number" || typeof rawVal === "function")) {
            normalizedEntries.push([tag, [{ content: rawVal }]]);
            continue;
        }
        // Single object convenience
        if (rawVal && typeof rawVal === "object" && !Array.isArray(rawVal)) {
            normalizedEntries.push([tag, [rawVal]]);
            continue;
        }
        // Array form
        if (Array.isArray(rawVal)) {
            normalizedEntries.push([tag, rawVal]);
        }
    }

    const nodes = [];
    for (const [tag, arr] of normalizedEntries) {
        for (const spec of arr) {
            if (!spec || typeof spec !== "object") continue;

            let inner = null;
            const isVoid = VOID_TAGS.has(tag);

            // Determine inner content if allowed (non-void)
            if (spec.content !== undefined && spec.content !== null && !isVoid && tag !== "meta") {
                inner = spec.content;
                if (typeof inner === "function") {
                    try {
                        inner = inner(params);
                    } catch {
                        inner = "";
                    }
                }
                inner = escapeHtml(String(inner));
            }

            // Build attribute bag excluding consumed inner content
            const attrs = {};
            for (const [k, v] of Object.entries(spec)) {
                if (k === "content" && inner !== null) continue;
                if (v === false || v === null || v === undefined) continue;
                attrs[k] = v;
            }
            nodes.push({ tag, attrs: Object.keys(attrs).length ? attrs : null, body: inner });
        }
    }

    if (!nodes.length) return out;

    const rendered = nodes
        .map(({ tag, attrs, body }) => {
            const a = buildAttrs(attrs, tag);
            if (body !== null) return `<${tag}${a}>${body}</${tag}>`;
            if (VOID_TAGS.has(tag)) return `<${tag}${a}>`;
            if (FORCE_CLOSING_TAGS.has(tag)) return `<${tag}${a}></${tag}>`;
            return `<${tag}${a}></${tag}>`;
        })
        .join("\n");

    const block = `${START}\n${rendered}\n${END}\n`;

    const headCloseIdx = out.search(/<\/head>/i);
    if (headCloseIdx !== -1) {
        out = out.slice(0, headCloseIdx) + block + out.slice(headCloseIdx);
    } else {
        // Fallback (no <head>): append to end so tests still see consistent output
        out += block;
    }

    return out;
}
