const CAMEL_PROPS =
    /^(?:accent|alignment|arabic|baseline|cap|clip(?!PathU)|color|dominant|fill|flood|font|glyph(?!R)|horiz|image(!S)|letter|lighting|marker(?!H|W|U)|overline|paint|pointer|shape|stop|strikethrough|stroke|text(?!L)|transform|underline|unicode|units|v|vector|vert|word|writing|x(?!C))[A-Z]/;
const CAMEL_REPLACE = /[A-Z0-9]/g;
const ON_ANI = /^on(Ani|Tra|Tou|BeforeInp|Compo)/;

/**
 * Render JSX expressions by filtering React-falsy values and joining arrays.
 *
 * React JSX semantics: false, null, undefined, and true render nothing.
 * Numbers (including 0) and strings (including "") pass through.
 * Arrays are filtered and joined into a string.
 *
 * @param {unknown} value - Expression value to render
 * @returns {string} Rendered string
 */
function __jsxRender(value) {
    if (Array.isArray(value)) return value.filter((v) => v !== false && v !== null && v !== undefined && v !== true).join("");
    if (value === false || value === null || value === undefined || value === true) return "";
    return value;
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
const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);

function mergeComponentProps(props, children) {
    /** @type {Record<string, unknown>} */
    const merged = {};
    const sources = Array.isArray(props) ? props : [props];

    for (const source of sources) {
        if (source && typeof source === "object") {
            Object.assign(merged, source);
        }
    }

    return { ...merged, children };
}

function renderIntrinsicElement(tag, props, children) {
    const { children: _ignoredChildren, ...attributes } = props;
    const spread = __jsxSpread(attributes);
    return VOID_TAGS.has(tag) ? `<${tag}${spread}/>` : `<${tag}${spread}>${__jsxRender(children)}</${tag}>`;
}

function __jsxComponent(Component, props, children) {
    const finalProps = mergeComponentProps(props, children);

    // Intrinsic element support: if Component is a string (e.g. "div", "section"), render as an HTML element.
    if (typeof Component === "string") {
        return renderIntrinsicElement(Component, finalProps, children);
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
globalThis.__jsxRender = __jsxRender;
