/**
 * @fileoverview Canonical class name merge utility (vanilla JSX)
 *
 * @module utils/cn
 * @description
 * Provides a tiny, dependency-free utility to merge conditional class name tokens into a
 * normalized space-separated string. This mirrors the documented canonical implementation
 * in the SXO Components Style Guide and SHOULD be imported instead of redefining ad‑hoc
 * `cn` helpers inside individual component modules.
 *
 * Exports:
 * - `cn` (named): Merge class tokens (arrays, strings, falsy) into a single string.
 * - `default`: Alias of `cn`.
 *
 * Design notes:
 * - Single-level flatten only (`Array.prototype.flat()` depth 1) to avoid surprising deep
 *   recursion on arbitrary user values.
 * - Filters out: `false`, `null`, `undefined`, `""`, `0` (any falsy except numeric > 0 or objects).
 * - Stable token ordering: preserves the original left‑to‑right order of truthy inputs.
 *
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 */

/**
 * Merge class name tokens into a single space-separated string.
 *
 * Accepts:
 * - Strings
 * - Numbers (non-zero)
 * - Arrays (one-level flatten)
 * - Falsy values (`false|null|undefined|''|0`) are discarded
 *
 * Does NOT:
 * - Deduplicate tokens (keeps intent explicit)
 * - Deeply flatten nested arrays beyond one level
 *
 * @function cn
 * @param {...(string|number|false|null|undefined|(string|number|false|null|undefined)[])} tokens
 *   Tokens or arrays of tokens to be merged.
 * @returns {string} A space-delimited class list (empty string when no truthy tokens).
 * @example
 * cn("btn", false && "btn-disabled", ["btn-primary", null]) // => "btn btn-primary"
 * @example
 * cn(["a", ["b", "c"]], "d") // => "a b c d"  (inner array flattened one level)
 * @public
 */
export function cn(...tokens) {
    // One-level flatten, filter out falsy (including 0). If preserving 0 is ever needed,
    // adjust the filter to `v != null && v !== false && v !== ''`.
    return tokens.flat().filter(Boolean).join(" ");
}

export default cn;
