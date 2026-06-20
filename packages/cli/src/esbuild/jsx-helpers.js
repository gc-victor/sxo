const CAMEL_PROPS =
    /^(?:accent|alignment|arabic|baseline|cap|clip(?!PathU)|color|dominant|fill|flood|font|glyph(?!R)|horiz|image(!S)|letter|lighting|marker(?!H|W|U)|overline|paint|pointer|shape|stop|strikethrough|stroke|text(?!L)|transform|underline|unicode|units|v|vector|vert|word|writing|x(?!C))[A-Z]/;
const CAMEL_REPLACE = /[A-Z0-9]/g;
const ON_ANI = /^on(Ani|Tra|Tou|BeforeInp|Compo)/;

/**
 * Join array values or return fallback.
 *
 * @param {string[] | undefined} value - Array to join or fallback value
 * @returns {string} Joined string or fallback
 */
function __jsxList(value) {
    if (Array.isArray(value)) return value.join("");
    return value ?? "";
}

function __jsxFragment({ children }) {
    return children;
}

/**
 * Render JSX component with props and children.
 *
 * @param {Function | string} Component - Component function or intrinsic tag name
 * @param {object | object[] | undefined} props - Props object or array
 * @param {any} children - Child nodes or content
 * @returns {string} Rendered JSX or HTML string
 */
function __jsxComponent(Component, props, children) {
    // Accept both array-of-prop-objects (current transformer output) or a single object.
    /** @type {Record<string, unknown>} */
    let finalProps;
    if (Array.isArray(props)) {
        finalProps = {};
        for (const prop of props) {
            if (prop && typeof prop === "object") {
                for (const [key, value] of Object.entries(prop)) {
                    finalProps[key] = value;
                }
            }
        }
    } else {
        finalProps = /** @type {Record<string, unknown>} */ (props) || {};
    }
    // Attach children last so explicit "children" in prop objects can override if desired
    finalProps = { ...finalProps, children };

    // Intrinsic element support: if Component is a string (e.g. "div", "section"), render as an HTML element.
    if (typeof Component === "string") {
        const tag = Component;
        // Handle void elements (no closing tag, children ignored)
        const voidTags = new Set([
            "area",
            "base",
            "br",
            "col",
            "embed",
            "hr",
            "img",
            "input",
            "link",
            "meta",
            "param",
            "source",
            "track",
            "wbr",
        ]);
        // Separate children from attributes
        const { children: _ignoredChildren, ...rest } = finalProps;
        const spread = __jsxSpread(rest);
        if (voidTags.has(tag)) {
            return `<${tag}${spread}/>`;
        }
        return `<${tag}${spread}>${__jsxList(children)}</${tag}>`;
    }

    if (typeof Component !== "function") {
        throw new TypeError(`__jsxComponent expected a function or intrinsic tag string; received ${typeof Component}`);
    }

    const result = Component(finalProps);
    return Array.isArray(result) ? result.join("") : result;
}

/**
 * Convert object to attribute string.
 *
 * @param {Record<string, unknown>} obj - Object with properties to convert
 * @returns {string} Attribute string (space-separated key="value" pairs)
 */
function __jsxSpread(obj) {
    const result = [];
    for (const [propKey, propValue] of Object.entries(obj)) {
        if (propValue === null || propValue === undefined) continue;

        const normalizedKey = normalizeAttributeName(propKey);

        if (typeof propValue === "boolean") {
            if (propValue) {
                result.push(normalizedKey);
            }
            continue;
        }
        result.push(`${normalizedKey}="${propValue}"`);
    }
    return result.length ? ` ${result.join(" ")}` : "";
}

/**
 * Normalize attribute names from React to HTML conventions.
 *
 * Converts className → class, htmlFor → for, handles ARIA and ANI attributes.
 *
 * @param {string} name - Attribute name to normalize
 * @returns {string} Normalized attribute name
 */
function normalizeAttributeName(name) {
    const lowerCased = name.toLowerCase();

    if (name === "className") return "class";
    if (name === "htmlFor") return "for";
    if (name === "acceptCharset") return "accept-charset";
    if (name === "httpEquiv") return "http-equiv";
    if (name === "imageRendering") return "image-rendering";

    if (lowerCased[0] === "o" && lowerCased[1] === "n") {
        if (lowerCased === "ondoubleclick") return "ondblclick";
        if (ON_ANI.test(name)) return lowerCased;
        return lowerCased;
    }

    if (name.startsWith("aria") && !name.startsWith("aria-")) {
        return `aria-${name.slice(4).toLowerCase()}`;
    }

    if (CAMEL_PROPS.test(name)) {
        return name.replace(CAMEL_REPLACE, "-$&").toLowerCase();
    }

    return name;
}

// Intentionally attaching runtime helpers to global scope
globalThis.__jsxComponent = __jsxComponent;
globalThis.__jsxFragment = __jsxFragment;
globalThis.__jsxSpread = __jsxSpread;
globalThis.__jsxList = __jsxList;
