/**
 * @fileoverview Flexible form label component (vanilla JSX) providing semantic association
 * with form controls via explicit `for` / `htmlFor` or implicit wrapping. Designed for SXO's
 * vanilla JSX transformer (NOT React) and emits static markup only.
 *
 * Exports:
 * - Label: Renders a semantic <label> with layout variants and class/className merging.
 *
 * Design notes:
 * - Accepts both `for` and `htmlFor`; whichever is provided is emitted as a single `for` attribute.
 * - If neither `for` nor `htmlFor` is supplied, the label may wrap a control directly for implicit association.
 * - `variant` controls baseline layout utilities: "inline" (horizontal alignment), "stacked" (vertical alignment), "align-top" (inline with top alignment).
 * - `className` acts as an alias for `class`; both are merged deterministically.
 * - No automatic id generation or side effects; caller manages control ids and relationships.
 * - No internal `data-*` attributes or sentinel patterns are introduced.
 *
 * Accessibility:
 * - Prefer explicit association using `for` / `htmlFor` referencing the control `id`.
 * - When wrapping the control element directly, omit `for` / `htmlFor` for implicit nesting semantics.
 * - Use `aria-describedby` on the target control to reference helper / error text (not on the label).
 *
 * @module ui/label
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 */

import { cn } from "@utils/cn.js";

/**
 * Props accepted by `<Label />`.
 *
 * Semantic label wrapper that forwards native label attributes, merges `class` / `className`,
 * and supports a `variant` for layout styling. Accepts either `for` (native) or `htmlFor`
 * (alias) to associate the label with a form control by its `id`. If neither is provided,
 * the label may wrap the control element directly for implicit association.
 *
 * variant:
 * - "inline": Inline layout with label and control side-by-side.
 * - "stacked": Stacked layout with label above control.
 * - "align-top": Inline layout with label aligned to the top.
 *
 * @typedef {HTMLLabelAttributes & ComponentProps & {
 *   htmlFor?: string,
 *   variant?: "inline"|"stacked"|"align-top",
 * }} LabelProps
 * @function Label
 * @param {LabelProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <Label htmlFor="email">Email address</Label>
 * @example
 * <Label variant="stacked" htmlFor="username">
 *   Username
 * </Label>
 * @example
 * <Label>
 *   <input type="checkbox" /> Subscribe to updates
 * </Label>
 * @example
 * <Label variant="align-top">
 *   <span>Label</span>
 *   <textarea rows={4}></textarea>
 * </Label>
 * @public
 */
export default function Label({ variant = "inline", class: klass, className, children, ...rest }) {
    const variantClasses = {
        inline: "flex items-center gap-2",
        stacked: "grid gap-2",
        "align-top": "flex items-start gap-2",
    };
    const baseVariantClass = variantClasses[variant] || variantClasses.inline;

    return (
        // biome-ignore lint/a11y/noLabelWithoutControl: Label may wrap a control or use explicit for/htmlFor association
        <label class={cn("label", baseVariantClass, klass, className)} {...rest}>
            {children}
        </label>
    );
}
