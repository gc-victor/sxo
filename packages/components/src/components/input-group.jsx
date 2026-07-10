/**
 * @fileoverview Input group with prepend/append addons (vanilla JSX)
 *
 * @module ui/input-group
 * @description
 * Groups an input with prepend and/or append addon elements (text or buttons)
 * using basecoat `.input-group` container and `data-align` attributes for addon element positioning.
 *
 * Exports:
 * - `InputGroup` (default): Input with prepend/append addons.
 *
 * Design notes:
 * - `prepend` renders before the child input, `append` renders after.
 * - Both prepend and append can be text or HTML elements.
 * - Uses basecoat `.input-group` container with `data-align="start"` / `data-align="end"` on addon elements for positioning.
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
 *   <input />
 * </InputGroup>
 * @example
 * <InputGroup append={<button class="btn">Search</button>}>
 *   <input />
 * </InputGroup>
 * @example
 * <InputGroup prepend="$" append=".00">
 *   <input />
 * </InputGroup>
 * @public
 */
export default function InputGroup({ class: klass, className, prepend, append, children, ...rest }) {
    return (
        <div class={cn("input-group", klass, className)} {...rest}>
            {prepend ? <span data-align="start">{prepend}</span> : ""}
            {children}
            {append ? <span data-align="end">{append}</span> : ""}
        </div>
    );
}
