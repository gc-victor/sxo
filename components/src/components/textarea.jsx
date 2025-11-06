/**
 * @fileoverview Minimal textarea wrapper (vanilla JSX)
 *
 * @module ui/textarea
 * @description
 * Framework-agnostic (NOT React) textarea primitive exposing only a native <textarea> with
 * deterministic class merging. All native attributes (id, name, rows, placeholder, etc.) are
 * passed through via rest without being explicitly destructured—reducing surface and avoiding
 * redundant prop declarations.
 *
 * Exports:
 * - `Textarea` (default): Bare textarea element wrapper.
 *
 * Design notes:
 * - No internal id generation or wrapper elements.
 * - Caller supplies any labels or descriptions externally.
 * - Only custom props (`class`, `className`, `textareaClass`, `children`) are surfaced; all other
 *   native attributes flow through `...rest`.
 *
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 */

import { cn } from "@utils/cn.js";

/**
 * Props accepted by `<Textarea />`.
 *
 * Minimal textarea wrapper with deterministic class merging.
 * Forwards all native textarea attributes.
 *
 * @typedef {HTMLTextAreaAttributes & ComponentProps & {
 * }} TextareaProps
 * @function Textarea
 * @param {TextareaProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <Textarea placeholder="Type your notes..." rows={4} />
 * @public
 * @since 1.0.0
 */
export default function Textarea({ class: klass, className, children, ...rest }) {
    return (
        <textarea class={cn("textarea", klass, className)} {...rest}>
            {children || ""}
        </textarea>
    );
}
