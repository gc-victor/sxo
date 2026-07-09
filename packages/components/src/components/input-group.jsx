/**
 * @fileoverview Input group with prepend/append addons (vanilla JSX)
 *
 * @module ui/input-group
 * @description
 * Groups an input with prepend and/or append addon elements (text or buttons)
 * using basecoat `.input-group` and `.input-group-text` CSS classes.
 *
 * Exports:
 * - `InputGroup` (default): Input with prepend/append addons.
 *
 * Design notes:
 * - `prepend` renders before the child input, `append` renders after.
 * - Both prepend and append can be text or HTML elements.
 * - Uses basecoat `.input-group` container and `.input-group-text` addon classes.
 *
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 */

import { cn } from "@utils/cn.js";

/**
 * Props accepted by `<InputGroup />`.
 *
 * Groups an input element with prepend and/or append addon content.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {
 *   prepend?: string|JSX.Element,
 *   append?: string|JSX.Element,
 * }} InputGroupProps
 * @function InputGroup
 * @param {InputGroupProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <InputGroup prepend="https://">
 *   <input class="input" />
 * </InputGroup>
 * @example
 * <InputGroup append={<button class="btn">Search</button>}>
 *   <input class="input" />
 * </InputGroup>
 * @example
 * <InputGroup prepend="$" append=".00">
 *   <input class="input" />
 * </InputGroup>
 * @public
 */
export default function InputGroup({ class: klass, className, prepend, append, children, ...rest }) {
    return (
        <div class={cn("input-group", klass, className)} {...rest}>
            {prepend ? <span class="input-group-text">{prepend}</span> : null}
            {children}
            {append ? <span class="input-group-text">{append}</span> : null}
        </div>
    );
}
