/**
 * @fileoverview Styled native select element (vanilla JSX)
 *
 * @module ui/native-select
 * @description
 * Thin wrapper around a native `<select>` element with basecoat `.native-select`
 * CSS class. Accepts an `options` array for convenience but also supports
 * passing `<option>` elements as children.
 *
 * Exports:
 * - `NativeSelect` (default): Styled native select.
 *
 * Design notes:
 * - Uses native `<select>` for correct form behavior and accessibility.
 * - `options` prop: array of `{value, label, disabled}` objects.
 * - `placeholder` prop renders as the first disabled option.
 * - Standard HTML form behavior — no custom JS overlay.
 *
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 */

import { cn } from "@utils/cn.js";

/**
 * Props accepted by `<NativeSelect />`.
 *
 * Styled native select element with options array or children.
 *
 * @typedef {HTMLSelectAttributes & ComponentProps & {
 *   options?: Array<{value: string, label: string, disabled?: boolean}>,
 *   placeholder?: string,
 * }} NativeSelectProps
 * @function NativeSelect
 * @param {NativeSelectProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <NativeSelect options={[{value: "1", label: "One"}, {value: "2", label: "Two"}]} />
 * @example
 * <NativeSelect placeholder="Choose..." options={[{value: "1", label: "One"}]} />
 * @example
 * <NativeSelect disabled>
 *   <option value="1">One</option>
 * </NativeSelect>
 * @public
 */
export default function NativeSelect({ class: klass, className, options, placeholder, children, ...rest }) {
    return (
        <select class={cn("native-select", klass, className)} {...rest}>
            {placeholder ? (
                <option value="" disabled selected>
                    {placeholder}
                </option>
            ) : null}
            {options
                ? options.map((opt) => (
                      <option key={opt.value} value={opt.value} disabled={opt.disabled || false}>
                          {opt.label}
                      </option>
                  ))
                : children}
        </select>
    );
}
