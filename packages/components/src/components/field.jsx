/**
 * @fileoverview Form field wrapper with label, hint, and error (vanilla JSX)
 *
 * @module ui/field
 * @description
 * Wraps a form control with accessible label, optional hint text,
 * and error message display. Uses basecoat `.field` CSS classes.
 *
 * Exports:
 * - `Field` (default): Form field wrapper.
 *
 * Design notes:
 * - `error` overrides `hint` visually (both won't show simultaneously).
 * - `required` appends ` *` to the label text.
 * - `htmlFor` on the label links to the child input's `id`.
 * - `aria-invalid` is set on the wrapping div when error is present.
 *
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 */

import { cn } from "@utils/cn.js";

/**
 * Props accepted by `<Field />`.
 *
 * Form field wrapper with label, hint, error, required indicator, and children.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {
 *   label?: string,
 *   hint?: string,
 *   error?: string,
 *   required?: boolean,
 *   htmlFor?: string,
 * }} FieldProps
 * @function Field
 * @param {FieldProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <Field label="Name" hint="Enter your full name." htmlFor="name">
 *   <input id="name" class="input" />
 * </Field>
 * @example
 * <Field label="Email" error="This field is required." htmlFor="email">
 *   <input id="email" class="input" />
 * </Field>
 * @example
 * <Field label="Password" required htmlFor="password">
 *   <input id="password" class="input" type="password" />
 * </Field>
 * @public
 */
export default function Field({ class: klass, className, label, hint, error, required, htmlFor, children, ...rest }) {
    const fieldId = htmlFor || children?.props?.id;

    return (
        <div class={cn("field", klass, className)} {...(error ? { "aria-invalid": "true" } : {})} {...rest}>
            {label ? (
                <label for={fieldId}>
                    {label}
                    {required ? " *" : ""}
                </label>
            ) : null}
            {children}
            {error ? (
                <p class="field-error" role="alert">
                    {error}
                </p>
            ) : hint ? (
                <p class="field-hint">{hint}</p>
            ) : null}
        </div>
    );
}
