/**
 * @fileoverview Accessible checkbox input component (vanilla JSX) providing a minimal wrapper
 * around `<input type="checkbox">` with deterministic class merging and full attribute forwarding.
 *
 * Exports:
 * - Checkbox: Renders a native `<input type="checkbox">`.
 *
 * Design notes:
 * - Purely declarative: no internal state management or event wiring; outputs static markup.
 * - `className` accepted as alias of `class`; both merged predictably.
 * - Forwards all additional attributes (aria-*, data-*, form*, etc.) untouched.
 * - No automatic id or `aria-*` generation; caller manages associations.
 * - Does not emulate tri-state / indeterminate by setting DOM properties (server output only).
 * - No sentinel patterns; returns actual markup.
 *
 * Accessibility:
 * - Associate with a <Label for="..."> or wrap inside a label for proper semantics.
 * - Use `aria-describedby` to reference supplemental description text.
 * - Provide `disabled` attribute rather than aria-disabled for native semantics.
 *
 * @module ui/checkbox
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 * @since 1.0.0
 */

import { cn } from "@utils/cn.js";

/**
 * Props accepted by `<Checkbox />`.
 *
 * Thin wrapper over `<input type="checkbox">` that merges `class` and `className` values and
 * forwards all other attributes. No client runtime behavior or id generation is performed.
 *
 * @typedef {HTMLInputAttributes & ComponentProps} CheckboxProps
 * @function Checkbox
 * @param {CheckboxProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <div>
 *   <Checkbox id="terms" /> <Label htmlFor="terms">Agree to terms</Label>
 * </div>
 * @example
 * <label>
 *   <Checkbox name="updates" defaultChecked /> Send me product updates
 * </label>
 * @public
 * @since 1.0.0
 */
export default function Checkbox({ class: klass, className, ...rest }) {
    return <input type="checkbox" class={cn("input", klass, className)} {...rest} />;
}
