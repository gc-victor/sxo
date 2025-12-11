/**
 * @fileoverview Accessible switch toggle control (vanilla JSX)
 *
 * @module ui/switch
 * @description
 * Framework-agnostic switch built on a native checkbox with `role="switch"`.
 * Renders static HTML only (NOT React) and merges classes deterministically.
 *
 * Exports:
 * - `Switch`: Styled checkbox input with switch semantics.
 *
 * Design notes:
 * - Uses native `<input type="checkbox">` for semantics; `role="switch"` added for AT parity.
 * - Label must be provided externally via wrapping `<label>` or `aria-label` attribute.
 * - `className` aliases `class`.
 *
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 */

import { cn } from "@utils/cn.js";

/**
 * Props accepted by `<Switch />`.
 *
 * Styled checkbox input control with switch role for toggle semantics.
 * Label must be composed externally by the consumer.
 * Inherits all native input attributes and forwards them to the underlying checkbox.
 *
 * @typedef {HTMLInputAttributes & ComponentProps & {}} SwitchProps
 * @function Switch
 * @param {SwitchProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <label><Switch checked={true} /> Airplane Mode</label>
 * @public
 */
export default function Switch({ class: klass, className, checked = false, ...rest }) {
    const cls = cn("input", klass, className);
    const isChecked = !!checked;

    return (
        <input
            type="checkbox"
            class={cls}
            role="switch"
            aria-checked={isChecked ? "true" : "false"}
            {...(isChecked ? { checked: "" } : {})}
            {...rest}
        />
    );
}
