/**
 * Extract <link> tags from the <head> section matching criteria.
 *
 * @param {string} html
 * @param {Object} [options]
 * @param {string|RegExp|Function|null} [options.filter="global.css"] - Match selector
 * @param {boolean} [options.excludeHotReplace=true] - Skip data-hot-replace links
 * @param {boolean} [options.returnFirst=true] - Return first match or an array of all
 * @returns {Object|Array|undefined}
 */
export function extractLinkTag(html, options = {}) {
    if (typeof html !== "string") {
        return options.returnFirst !== false ? undefined : [];
    }

    const { filter = "global.css", excludeHotReplace = true, returnFirst = true } = options;

    const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    if (!headMatch) {
        return returnFirst ? undefined : [];
    }
    const headInner = headMatch[1];

    const linkRegex = /<link\b([^>]*)\/?>/gi;
    const results = [];

    let m;
    // AIDEV-NOTE: lint fix (noAssignInExpressions) – move assignment outside condition
    while (true) {
        m = linkRegex.exec(headInner);
        if (m === null) break;
        const full = m[0];
        const attrFragment = m[1] || "";
        const attrs = parseAttributes(attrFragment);

        // Hot reload exclusion
        if (excludeHotReplace && Object.hasOwn(attrs, "data-hot-replace")) {
            continue;
        }

        if (!shouldIncludeLink(attrs, filter)) continue;

        const entry = {
            attributes: attrs,
            original: full,
        };
        results.push(entry);

        if (returnFirst) {
            return entry;
        }
    }

    if (returnFirst) {
        return results[0]; // may be undefined
    }
    return results;
}

/**
 * Determine whether a link should be included based on a filter.
 * @param {Record<string,string>} attrs
 * @param {string|RegExp|Function|null|undefined} filter
 * @returns {boolean}
 */
function shouldIncludeLink(attrs, filter) {
    const href = attrs.href;
    if (!href) return false;

    if (filter == null) return true;
    if (typeof filter === "string") return href.includes(filter);
    if (filter instanceof RegExp) return filter.test(href);
    if (typeof filter === "function") return !!filter(attrs);
    return true;
}

// ---------------------------------------------------------------------------
// Scripts
// ---------------------------------------------------------------------------

/**
 * Extract <script> tags with src attribute matching criteria.
 *
 * @param {string} html
 * @param {Object} [options]
 * @param {string|RegExp|Function|null} [options.filter="index.js"] - Match selector
 * @param {boolean} [options.excludeHotReplace=true] - Skip data-hot-replace scripts
 * @returns {Array<{attributes: Record<string,string>, location: string, original: string}>}
 */
export function extractScriptTags(html, options = {}) {
    if (typeof html !== "string") return [];

    const { filter = "index.js", excludeHotReplace = true } = options;

    const sections = findHtmlSections(html);

    // Matches:
    //   <script ...></script>
    //   <script .../>
    //   Inline content is captured but we only keep scripts with src
    const scriptRegex = /<script\b([^>]*?)(\/>|>([\s\S]*?)<\/script>)/gi;

    const out = [];
    let m;
    // AIDEV-NOTE: lint fix (noAssignInExpressions) – move assignment outside condition
    while (true) {
        m = scriptRegex.exec(html);
        if (m === null) break;
        const full = m[0];
        const attrFragment = m[1] || "";
        const pos = m.index;

        const attrs = parseAttributes(attrFragment);

        // Skip hot reload
        if (excludeHotReplace && Object.hasOwn(attrs, "data-hot-replace")) {
            continue;
        }

        // Only consider scripts with src
        if (!attrs.src) continue;

        if (!shouldIncludeScript(attrs, filter)) continue;

        const location = getScriptLocation(pos, sections);

        out.push({
            attributes: attrs,
            location,
            original: full,
        });
    }

    return out;
}

/**
 * Determine whether a script should be included based on a filter.
 * @param {Record<string,string>} attrs
 * @param {string|RegExp|Function|null|undefined} filter
 * @returns {boolean}
 */
function shouldIncludeScript(attrs, filter) {
    const src = attrs.src;
    if (!src) return false;

    if (filter == null) return true;
    if (typeof filter === "string") return src.includes(filter);
    if (filter instanceof RegExp) return filter.test(src);
    if (typeof filter === "function") return !!filter(attrs);
    return true;
}

// ---------------------------------------------------------------------------
// Shared internals
// ---------------------------------------------------------------------------

/**
 * Parse HTML attribute list into an object.
 *
 * @param {string} fragment
 * @returns {Record<string,string>}
 */
function parseAttributes(fragment) {
    const attrs = {};
    if (!fragment) return attrs;

    const attrRegex = /([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
    let m;
    // AIDEV-NOTE: lint fix (noAssignInExpressions) – move assignment outside condition
    while (true) {
        m = attrRegex.exec(fragment);
        if (m === null) break;
        const [, name, dq, sq, uq] = m;
        attrs[name] = dq ?? sq ?? uq ?? "";
    }
    return attrs;
}

/**
 * Identify <head> and <body> section ranges for location classification.
 * @param {string} html
 * @returns {{head:{start:number,end:number}, body:{start:number,end:number}}}
 */
function findHtmlSections(html) {
    const sections = {
        head: { start: -1, end: -1 },
        body: { start: -1, end: -1 },
    };

    const headOpen = html.match(/<head[^>]*>/i);
    if (headOpen) {
        sections.head.start = headOpen.index ?? -1;
        const closeIdx = html.indexOf("</head>", sections.head.start);
        sections.head.end = closeIdx === -1 ? -1 : closeIdx + "</head>".length;
    }

    const bodyOpen = html.match(/<body[^>]*>/i);
    if (bodyOpen) {
        sections.body.start = bodyOpen.index ?? -1;
        const closeIdx = html.indexOf("</body>", sections.body.start);
        sections.body.end = closeIdx === -1 ? -1 : closeIdx + "</body>".length;
    }

    return sections;
}

/**
 * Classify a script's location given its starting index.
 * Scripts outside explicit <head> boundaries default to "body".
 *
 * @param {number} position
 * @param {{head:{start:number,end:number}, body:{start:number,end:number}}} sections
 * @returns {"head"|"body"}
 */
function getScriptLocation(position, sections) {
    if (sections.head.start !== -1 && position >= sections.head.start && (sections.head.end === -1 || position < sections.head.end)) {
        return "head";
    }
    if (sections.body.start !== -1 && position >= sections.body.start && (sections.body.end === -1 || position < sections.body.end)) {
        return "body";
    }
    return "body";
}
