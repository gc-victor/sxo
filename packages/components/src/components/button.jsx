/**
 * @fileoverview Polymorphic accessible button component (vanilla JSX) with visual variants,
 * size tokens, loading state, and optional anchor rendering when `href` is supplied. Designed
 * for SXO's vanilla JSX transformer (NOT React) and emits static markup only.
 *
 * Exports:
 * - Button: Renders a `<button>` by default or an `<a>` when `href` is provided (with disabled emulation).
 *
 * Design notes:
 * - Polymorphic: `<button>` vs `<a>` decided by presence of `href`.
 * - Attribute forwarding: All unrecognized props are forwarded to the rendered element.
 * - `className` is accepted as an alias of `class` and both are merged deterministically.
 * - Loading state (`loading`) disables interaction; `loadingText` (if provided) replaces children.
 * - Disabled anchor emulation uses `aria-disabled="true"` + `tabindex="-1"` (no `disabled` attribute on `<a>`).
 * - No internal `id`, `data-*`, or auto-generated attributes.
 * - Consumers supply any icon or visual child elements; horizontal spacing handled via utility classes.
 *
 * Accessibility:
 * - Use `aria-busy="true"` while loading for assistive indication.
 * - Provide meaningful text content (avoid icon-only without accessible labeling).
 *
 * @module ui/button
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 */

import { cn } from "@utils/cn.js";

/**
 * Accepted visual variants.
 * @typedef {"primary"|"secondary"|"outline"|"ghost"|"destructive"|"link"} ButtonVariant
 */

/**
 * Accepted size tokens.
 * @typedef {"sm"|"md"|"lg"} ButtonSize
 */

/**
 * Compute the base class token based on variant and size.
 * (Internal utility; not exported.)
 *
 * @param {{variant: ButtonVariant, size: ButtonSize}} opts
 * @returns {string}
 * @private
 */
function resolveButtonClass({ variant, size }) {
    const v = variant || "primary";
    const s = size || "md";
    if (s === "sm") return `btn-sm-${v}`;
    if (s === "lg") return `btn-lg-${v}`;
    return `btn-${v}`;
}
/**
 * Props accepted by `<Button />`.
 *
 * @typedef {(HTMLButtonAttributes & HTMLAnchorAttributes) & ComponentProps & {
 *   variant?: ButtonVariant,
 *   size?: ButtonSize,
 *   loading?: boolean,
 *   loadingText?: string,
 *   href?: string,
 * }} ButtonProps
 */

/**
 * Polymorphic button or anchor element with visual variants and sizes. Renders `<a>` when `href`
 * is provided; otherwise `<button>`. Forwards native button/anchor attributes plus custom props.
 * When `loading` is true, interaction is disabled and `loadingText` (if supplied) replaces the
 * original children. Disabled anchors are emulated with `aria-disabled` + `tabindex="-1"`.
 *
 * @function Button
 * @param {ButtonProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <Button variant="secondary" size="sm">Save</Button>
 * @example
 * <Button href="/docs" variant="link">Documentation</Button>
 * @example
 * <Button loading loadingText="Submitting…">Submit</Button>
 * @public
 */
export default function Button(props) {
    const {
        variant = "primary",
        size = "md",
        loading = false,
        loadingText,
        href,
        target,
        rel,
        disabled: disabledProp = false,
        type = "button",
        class: klass,
        className,
        children,
        ...rest
    } = props;

    const isDisabled = !!disabledProp || !!loading;
    const baseClass = resolveButtonClass({ variant, size });
    const mergedClass = cn(baseClass, "inline-flex", "items-center", klass, className);

    const content = loading && loadingText ? loadingText : children;

    if (href) {
        const anchorAttrs = {
            href,
            target,
            rel,
            class: mergedClass,
            ...(loading ? { ariaBusy: "true" } : {}),
            ...(isDisabled ? { ariaDisabled: "true", tabindex: "-1" } : {}),
            ...rest,
        };
        return <a {...anchorAttrs}>{content}</a>;
    }

    const buttonAttrs = {
        type,
        class: mergedClass,
        ...(isDisabled ? { disabled: "" } : {}),
        ...(loading ? { ariaBusy: "true" } : {}),
        ...rest,
    };

    return <button {...buttonAttrs}>{content}</button>;
}
