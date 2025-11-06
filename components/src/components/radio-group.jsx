/**
 * @fileoverview Accessible radio group primitives with declarative item children (vanilla JSX)
 *
 * @module ui/radio-group
 * @description
 * Provides a semantic radiogroup container and individual radio item components (vanilla JSX, non-React).
 * Encourages declarative composition: list items as `<RadioGroupItem />` children instead of array props.
 * Avoids imperative child traversal; markup is emitted directly as static HTML.
 *
 * Exports:
 * - `<RadioGroup>`: Group wrapper applying layout + `role="radiogroup"`.
 * - `<RadioGroupItem>`: Single radio input + label wrapper.
 *
 * Design notes:
 * - Native radio behavior supplies keyboard navigation (Arrow keys / Home / End) without JS.
 * - No generated IDs—each `<input>` is wrapped by a `<label>` to couple control + text.
 *
 * - Boolean attributes (`disabled`, `checked`) emitted only when truthy.
 * - Layout direction switches simple utility classes (`row` vs `column`).
 *
 * @author Víctor García
 * @license MIT
 * @version 1.0.0
 */

import { cn } from "@utils/cn.js";
import Input from "./input.jsx";

/**
 * Props accepted by `<RadioGroup />`.
 *
 * Accessible container for grouped radio inputs.
 * Direction controls visual layout only (not selection mechanics).
 * Inherits all native div attributes.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {
 *   direction?: "column"|"row",
 * }} RadioGroupProps
 * @function RadioGroup
 * @param {RadioGroupProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <RadioGroup direction="row" aria-label="Theme">
 *   <div class="flex items-center gap-3">
 *     <RadioGroupItem id="r1" name="theme" value="light" checked />
 *     <Label htmlFor="r1">Light</Label>
 *   </div>
 *   <div class="flex items-center gap-3">
 *     <RadioGroupItem id="r2" name="theme" value="dark" />
 *     <Label htmlFor="r2">Dark</Label>
 *   </div>
 * </RadioGroup>
 * @public
 * @since 1.0.0
 */
export function RadioGroup({ class: klass, className, direction = "column", children, ...rest }) {
    const rootClass = cn("radio-group", direction === "row" ? "flex flex-row gap-3" : "grid gap-3", klass, className);
    // AIDEV-NOTE: No proxy props (e.g., ariaLabel, name); pass native attributes like `aria-label` directly via rest.
    return (
        <div role="radiogroup" class={rootClass} {...rest}>
            {children}
        </div>
    );
}

/**
 * Props accepted by `<RadioGroupItem />`.
 *
 * Single radio input element (no internal label).
 * Use external `<Label htmlFor>` referencing the radio `id` for accessible text.
 * Inherits all native input attributes.
 *
 * @typedef {HTMLInputAttributes & ComponentProps & {}} RadioGroupItemProps
 * @function RadioGroupItem
 * @param {RadioGroupItemProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <RadioGroupItem id="r1" name="theme" value="light" />
 * @public
 * @since 1.0.0
 */
export function RadioGroupItem({ class: klass, className, ...rest }) {
    return <Input type="radio" class={cn(klass, className)} {...rest} />;
}

// Backward compatibility: default export remains the group component.
export default RadioGroup;
