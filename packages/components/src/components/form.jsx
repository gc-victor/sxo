/**
 * @fileoverview Form primitives (vanilla JSX) enabling semantic, declarative composition
 * without schema objects or client runtime frameworks. Provides thin wrappers that forward
 * native attributes, merge `class` + `className`, and emit static HTML only.
 *
 * Exports:
 * - Form
 * - FormFieldset
 * - FormLegend
 * - FormDescription
 * - FormSubmit
 * - FormReset
 * - FormInput (re-export alias of Input)
 * - FormLabel (re-export alias of Label)
 * - FormSelect (re-export alias of Select)
 * - FormTextarea (re-export alias of Textarea)
 *
 * Design notes:
 * - No automatic id generation: caller manages relationships (`id`, `for`/`htmlFor`, `aria-describedby`).
 * - Minimal baseline utility class tokens (e.g., "form", "form-fieldset", etc.) as styling hooks.
 * - Components are markup wrappers; no internal state, events, or effects (NOT React).
 * - Attribute forwarding: all additional props (action, method, data-*, aria-*, etc.) are spread to the root element.
 * - Re-exported aliases exist for ergonomic co-location with other form primitives.
 *
 * Accessibility:
 * - Use <FormFieldset> + <FormLegend> to group related controls (e.g., option sets).
 * - Associate <Label> via `for`/`htmlFor` and matching input `id`, or nest inputs directly.
 * - Use `aria-describedby` on inputs to link supplementary <FormDescription> content.
 * - Prefer native `type="submit"` / `type="reset"` semantics (handled by FormSubmit/FormReset).
 *
 * @module ui/form
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 */
import { cn } from "@utils/cn.js";
import Button from "./button.jsx";

/* -------------------------------------------------------------------------------------------------
 * Form (root)
 * ----------------------------------------------------------------------------------------------- */
/**
 * Props accepted by `<Form />`.
 *
 * Root form wrapper that forwards native form attributes, merges `class` / `className`, and
 * renders children unchanged. Does not create ids, intercept submission, or modify method/action.
 * Add `noValidate` to disable browser validation or handle progressive enhancement externally.
 *
 * @typedef {HTMLFormAttributes & ComponentProps} FormProps
 * @function Form
 * @param {FormProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <Form action="/subscribe" method="post" class="space-y-6">
 *   {children}
 * </Form>
 * @example
 * <Form noValidate aria-describedby="form-help">
 *   <FormDescription id="form-help">All fields required.</FormDescription>
 *   {children}
 * </Form>
 * @public
 */
export default function Form({ class: klass, className, children, ...rest }) {
    const merged = cn("form", klass, className);
    return (
        <form class={merged} {...rest}>
            {children}
        </form>
    );
}

/* -------------------------------------------------------------------------------------------------
 * FormFieldset
 * ----------------------------------------------------------------------------------------------- */
/**
 * Props accepted by `<FormFieldset />`.
 *
 * Semantic grouping container for related form controls. Forwards native `<fieldset>` attributes
 * and merges classes. Use alongside `<FormLegend />` for accessible naming of grouped controls.
 *
 * @typedef {HTMLFieldSetAttributes & ComponentProps} FormFieldsetProps
 * @function FormFieldset
 * @param {FormFieldsetProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <FormFieldset>
 *   <FormLegend>Contact Preferences</FormLegend>
 *   {children}
 * </FormFieldset>
 * @public
 */
export function FormFieldset({ class: klass, className, children, ...rest }) {
    const merged = cn("form-fieldset", klass, className);
    return (
        <fieldset class={merged} {...rest}>
            {children}
        </fieldset>
    );
}

/* -------------------------------------------------------------------------------------------------
 * FormLegend
 * ----------------------------------------------------------------------------------------------- */
/**
 * Props accepted by `<FormLegend />`.
 *
 * Caption / title for a `<FormFieldset>` grouping. Forwards native legend attributes and merges
 * classes. Keep legend text concise; additional explanation belongs in a description block.
 *
 * @typedef {HTMLLegendAttributes & ComponentProps} FormLegendProps
 * @function FormLegend
 * @param {FormLegendProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <FormFieldset>
 *   <FormLegend>Shipping Method</FormLegend>
 *   {children}
 * </FormFieldset>
 * @public
 */
export function FormLegend({ class: klass, className, children, ...rest }) {
    const merged = cn("form-legend", klass, className);
    return (
        <legend class={merged} {...rest}>
            {children}
        </legend>
    );
}

/* -------------------------------------------------------------------------------------------------
 * FormDescription
 * ----------------------------------------------------------------------------------------------- */
/**
 * Props accepted by `<FormDescription />`.
 *
 * Descriptive inline or block text associated with a form control or group. Assign an `id`
 * and reference it from controls via `aria-describedby` for accessible contextual help.
 *
 * @typedef {HTMLParagraphAttributes & ComponentProps} FormDescriptionProps
 * @function FormDescription
 * @param {FormDescriptionProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <FormDescription id="email-help">We will never share your email.</FormDescription>
 * @example
 * <div>
 *   <FormLabel htmlFor="username">Username</FormLabel>
 *   <FormDescription id="username-note">3–16 characters, letters or digits.</FormDescription>
 * </div>
 * @public
 */
export function FormDescription({ class: klass, className, children, ...rest }) {
    const merged = cn("form-description", klass, className);
    return (
        <p class={merged} {...rest}>
            {children}
        </p>
    );
}

/* -------------------------------------------------------------------------------------------------
 * FormSubmit
 * ----------------------------------------------------------------------------------------------- */
/**
 * Props accepted by `<FormSubmit />`.
 *
 * Convenience wrapper around `<Button />` enforcing `type="submit"`. Forwards button/anchor
 * attributes (though anchor polymorphism is discouraged for submit semantics) plus custom
 * Button props (variant, size, loading, etc.). Supplying `type` is optional—always normalized
 * to "submit".
 *
 * @typedef {(HTMLButtonAttributes & HTMLAnchorAttributes) & ComponentProps & {
 *   variant?: import("./button.jsx").ButtonVariant,
 *   size?: "sm"|"md"|"lg",
 *   loading?: boolean,
 *   loadingText?: string,
 *   href?: string,
 * }} FormSubmitProps
 * @function FormSubmit
 * @param {FormSubmitProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <FormSubmit variant="secondary">Save</FormSubmit>
 * @example
 * <FormSubmit loading loadingText="Saving…">Save</FormSubmit>
 * @public
 */
export function FormSubmit({ children, ...rest }) {
    return (
        <Button type="submit" {...rest}>
            {children}
        </Button>
    );
}

/* -------------------------------------------------------------------------------------------------
 * FormReset
 * ----------------------------------------------------------------------------------------------- */
/**
 * Props accepted by `<FormReset />`.
 *
 * Convenience wrapper around `<Button />` enforcing `type="reset"` and defaulting `variant="outline"`.
 * Forwards the same polymorphic + custom props accepted by `<Button />`. Passing an explicit
 * `variant` overrides the default outline styling.
 *
 * @typedef {(HTMLButtonAttributes & HTMLAnchorAttributes) & ComponentProps & {
 *   variant?: import("./button.jsx").ButtonVariant,
 *   size?: "sm"|"md"|"lg",
 *   loading?: boolean,
 *   loadingText?: string,
 *   href?: string,
 * }} FormResetProps
 * @function FormReset
 * @param {FormResetProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <FormReset>Reset</FormReset>
 * @example
 * <FormReset variant="ghost">Clear</FormReset>
 * @public
 */
export function FormReset({ children, variant = "outline", ...rest }) {
    return (
        <Button type="reset" variant={variant} {...rest}>
            {children}
        </Button>
    );
}

/* -------------------------------------------------------------------------------------------------
 * Re-exports (Input / Label aliases)
 * ----------------------------------------------------------------------------------------------- */
/**
 * Props accepted by `<FormInput />`.
 *
 * Alias re-export of `<Input />` for ergonomic colocation within form primitives. See `ui/input`
 * for complete prop reference and examples. All props are forwarded unchanged; no additional
 * behavior is introduced.
 *
 * @typedef {import("./input.jsx").InputProps} FormInputProps
 * @public
 */
export { default as FormInput } from "./input.jsx";

/**
 * Props accepted by `<FormLabel />`.
 *
 * Alias re-export of `<Label />` for ergonomic grouping with other form primitives. See `ui/label`
 * for the authoritative prop contract and examples.
 *
 * @typedef {import("./label.jsx").LabelProps} FormLabelProps
 * @public
 */
export { default as FormLabel } from "./label.jsx";

/**
 * Props accepted by `<FormSelect />`.
 *
 * Alias re-export of `<Select />` for ergonomic colocation within form primitives. See `ui/select`
 * for complete prop reference and examples. All props are forwarded unchanged; no additional
 * behavior is introduced.
 *
 * @typedef {import("./select.jsx").SelectProps} FormSelectProps
 * @public
 */
export { default as FormSelect } from "./select.jsx";

/**
 * Props accepted by `<FormTextarea />`.
 *
 * Alias re-export of `<Textarea />` for ergonomic colocation within form primitives. See `ui/textarea`
 * for complete prop reference and examples. All props are forwarded unchanged; no additional
 * behavior is introduced.
 *
 * @typedef {import("./textarea.jsx").TextareaProps} FormTextareaProps
 * @public
 */
export { default as FormTextarea } from "./textarea.jsx";
