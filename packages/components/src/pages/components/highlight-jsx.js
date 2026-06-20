/**
 * @fileoverview JSX syntax highlighter for server-side rendering (vanilla JSX)
 *
 * @module utils/highlight-jsx
 * @description
 * Provides a server-side utility to highlight JSX syntax in code snippets. This utility
 * parses JSX code and wraps syntax elements in HTML spans with CSS classes for styling.
 * Designed for displaying code examples in documentation or kitchen-sink pages.
 *
 * Exports:
 * - highlightJsx (named): Highlight JSX code string into HTML.
 * - default: Alias of highlightJsx.
 *
 * Design notes:
 * - Uses a simple tokenizer to identify JSX elements, attributes, strings, and expressions.
 * - Outputs semantic HTML with class names suitable for CSS styling.
 * - Does not validate JSX syntax; assumes input is valid JSX code.
 * - Uses escape-html utility for XSS-safe HTML entity escaping.
 * - Lightweight implementation without external dependencies.
 *
 * Intended for code display in server-rendered pages. Classes are prefixed with 'jsx-' for easy styling.
 *
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 */

import { escapeHtml } from "@utils/escape-html.js";

/**
 * Highlight JSX syntax by wrapping tokens in HTML spans with CSS classes.
 *
 * @function highlightJsx
 * @param {string} code - The JSX code string to highlight.
 * @returns {string} HTML string with highlighted JSX syntax.
 * @example
 * highlightJsx(`<Button variant="primary">Click me</Button>`)
 * // Returns: <span class="jsx-tag">&lt;</span><span class="jsx-name">Button</span> <span class="jsx-attribute">variant</span>=<span class="jsx-string">"primary"</span><span class="jsx-tag">&gt;</span>Click me<span class="jsx-tag">&lt;/span><span class="jsx-tag">Button</span><span class="jsx-tag">&gt;</span>
 * @public
 */
export function highlightJsx(code) {
    if (!code) return "";

    // Simple tokenizer for JSX - pattern-based approach
    const tokens = [];
    let i = 0;

    while (i < code.length) {
        const char = code[i];

        // JSX tags and attributes
        if (char === "<") {
            // Check if closing tag
            if (i + 1 < code.length && code[i + 1] === "/") {
                // Closing tag: </TagName>
                i += 2;

                // Tag name
                if (i < code.length && /[a-zA-Z_]/.test(code[i])) {
                    let tagName = "";
                    while (i < code.length && /[a-zA-Z0-9\-_]/.test(code[i])) {
                        tagName += code[i];
                        i++;
                    }
                    tokens.push({ type: "tag", value: `&lt;/<span class="jsx-name">${escapeHtml(tagName)}</span>&gt;` });
                }

                // Closing >
                if (i < code.length && code[i] === ">") {
                    i++;
                }
            } else {
                // Opening tag: <TagName attr="value">
                i++;

                // Skip whitespace
                while (i < code.length && /\s/.test(code[i])) {
                    tokens.push({ type: "text", value: code[i] });
                    i++;
                }

                // Tag name
                if (i < code.length && /[a-zA-Z_]/.test(code[i])) {
                    let tagName = "";
                    while (i < code.length && /[a-zA-Z0-9\-_]/.test(code[i])) {
                        tagName += code[i];
                        i++;
                    }

                    // Build fullAttrs
                    let fullAttrs = "";

                    // Parse attributes until > or />
                    while (i < code.length && code[i] !== ">" && !(code[i] === "/" && i + 1 < code.length && code[i + 1] === ">")) {
                        // Skip whitespace
                        while (i < code.length && /\s/.test(code[i])) {
                            fullAttrs += code[i];
                            i++;
                        }

                        if (i >= code.length || code[i] === ">" || (code[i] === "/" && i + 1 < code.length && code[i + 1] === ">")) break;

                        // Attribute name
                        if (/[a-zA-Z_]/.test(code[i])) {
                            let attrName = "";
                            while (i < code.length && /[a-zA-Z0-9\-_]/.test(code[i])) {
                                attrName += code[i];
                                i++;
                            }
                            fullAttrs += `<span class="jsx-attribute">${escapeHtml(attrName)}</span>`;

                            // Skip whitespace before =
                            while (i < code.length && /\s/.test(code[i])) {
                                fullAttrs += code[i];
                                i++;
                            }

                            // = sign
                            if (i < code.length && code[i] === "=") {
                                fullAttrs += "=";
                                i++;

                                // Skip whitespace after =
                                while (i < code.length && /\s/.test(code[i])) {
                                    fullAttrs += code[i];
                                    i++;
                                }

                                // Parse the attribute value (string or expression)
                                if (i < code.length && code[i] === '"') {
                                    // Parse string
                                    const quote = code[i];
                                    let str = quote;
                                    i++;
                                    while (i < code.length) {
                                        if (code[i] === "\\") {
                                            str += code[i];
                                            if (i + 1 < code.length) {
                                                str += code[i + 1];
                                                i += 2;
                                            } else {
                                                i++;
                                            }
                                        } else if (code[i] === quote) {
                                            str += quote;
                                            i++;
                                            break;
                                        } else {
                                            str += code[i];
                                            i++;
                                        }
                                    }
                                    fullAttrs += `<span class="jsx-string">${escapeHtml(str)}</span>`;
                                } else if (i < code.length && code[i] === "{") {
                                    // Parse expression
                                    let expr = "{";
                                    let depth = 1;
                                    i++;
                                    while (i < code.length && depth > 0) {
                                        if (code[i] === "{") {
                                            depth++;
                                        } else if (code[i] === "}") {
                                            depth--;
                                        }
                                        expr += code[i];
                                        i++;
                                    }
                                    fullAttrs += `<span class="jsx-expression">${escapeHtml(expr)}</span>`;
                                }
                            }
                        } else {
                            // Something unexpected, treat as text
                            fullAttrs += code[i];
                            i++;
                        }
                    }

                    // Skip whitespace before closing >
                    while (i < code.length && /\s/.test(code[i])) {
                        fullAttrs += code[i];
                        i++;
                    }

                    // Closing > or />
                    if (i < code.length) {
                        if (code[i] === "/" && i + 1 < code.length && code[i + 1] === ">") {
                            tokens.push({
                                type: "tag",
                                value: `&lt;<span class="jsx-name">${escapeHtml(tagName)}</span>${fullAttrs.trimEnd()} /&gt;`,
                            });
                            i += 2;
                        } else if (code[i] === ">") {
                            tokens.push({ type: "tag", value: `&lt;<span class="jsx-name">${escapeHtml(tagName)}</span>${fullAttrs}&gt;` });
                            i++;
                        }
                    }
                } else {
                    // No tag name, perhaps invalid, but push <
                    tokens.push({ type: "tag", value: "&lt;" });
                }
            }
        }
        // Strings (double quotes only)
        else if (char === '"') {
            const quote = char;
            let str = quote;
            i++;
            while (i < code.length) {
                if (code[i] === "\\") {
                    str += code[i];
                    if (i + 1 < code.length) {
                        str += code[i + 1];
                        i += 2;
                    } else {
                        i++;
                    }
                } else if (code[i] === quote) {
                    str += quote;
                    i++;
                    break;
                } else {
                    str += code[i];
                    i++;
                }
            }
            tokens.push({ type: "string", value: str });
        }
        // JSX expressions { ... }
        else if (char === "{") {
            let expr = "{";
            let depth = 1;
            i++;
            while (i < code.length && depth > 0) {
                if (code[i] === "{") {
                    depth++;
                } else if (code[i] === "}") {
                    depth--;
                }
                expr += code[i];
                i++;
            }
            tokens.push({ type: "expression", value: expr });
        }
        // Everything else as text
        else {
            tokens.push({ type: "text", value: char });
            i++;
        }
    }

    // Convert tokens to HTML
    return tokens
        .map((token) => {
            switch (token.type) {
                case "tag":
                    return `<span class="jsx-tag">${token.value}</span>`;
                case "attribute":
                    return `<span class="jsx-attribute">${escapeHtml(token.value)}</span>`;
                case "string":
                    return `<span class="jsx-string">${escapeHtml(token.value)}</span>`;
                case "expression":
                    return `<span class="jsx-expression">${escapeHtml(token.value)}</span>`;
                default:
                    return escapeHtml(token.value);
            }
        })
        .join("");
}

export default highlightJsx;
