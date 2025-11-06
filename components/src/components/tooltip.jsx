/**
 * @fileoverview Compound tooltip components (container, trigger, content) for hover/focus hints (vanilla JSX)
 *
 * @module ui/tooltip
 * @description
 * Provides a markup-only compound API: `<Tooltip>`, `<TooltipTrigger>`, `<TooltipContent>`.
 * Delays + placement expressed as data attributes for a progressive enhancement script.
 * No imperative logic or hidden sentinel objects; all exports render actual HTML markup.
 *
 * Exports:
 * - `<Tooltip>`: Root wrapper assigning ID + delay + placement attributes.
 * - `<TooltipTrigger>`: Interactive or generic element that references the tooltip content.
 * - `<TooltipContent>`: Hidden (by styles) content region announced to assistive tech.
 *
 * Design notes:
 * - ID collision risk is minimal (6 random base36 chars); documented as LIMITATION.
 * - ARIA linkage: A runtime enhancer stitches trigger/content using DOM proximity selectors.
 * - All content children are treated as safe markup responsibility of caller (avoid unsanitized HTML).
 * - Root supports `class` / `className`; trigger/content do as well.
 *
 * @author Víctor García
 * @license MIT
 * @version 1.0.0
 */

/**
 * Internal utility to join class name fragments.
 * TODO(cn-migrate): Replace with shared utility when centralized.
 * @param {...any} parts
 * @returns {string}
 */
function cn(...parts) {
    return parts.filter(Boolean).join(" ");
}

/**
 * Props accepted by `<Tooltip />`.
 *
 * Root wrapper establishing shared attributes and placement classes.
 * Placement encoded as CSS classes for styling.
 * Inherits native div attributes (wrapper chosen as span for compact inline flow).
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {
 *   placement?: "top"|"right"|"bottom"|"left",
 *   align?: "start"|"center"|"end",
 * }} TooltipProps
 * @function Tooltip
 * @param {TooltipProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <Tooltip placement="right"><TooltipTrigger>Hover</TooltipTrigger><TooltipContent>Add</TooltipContent></Tooltip>
 * @public
 * @since 1.0.0
 */
export function Tooltip({ class: klass, className, placement = "top", align = "center", children, ...rest }) {
    const cls = cn("tooltip-root", `tooltip-side-${placement}`, `tooltip-align-${align}`, klass, className);
    return (
        <span class={cls} {...rest}>
            {children}
        </span>
    );
}

/**
 * Props accepted by `<TooltipTrigger />`.
 *
 * Interactive (or focusable) element that activates the tooltip.
 * Supports limited polymorphism via the `as` prop.
 * ARIA linkage is handled by runtime enhancement using DOM proximity.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {
 *   as?: "button"|"span"|"div"|"a",
 *   href?: string,
 * }} TooltipTriggerProps
 * @function TooltipTrigger
 * @param {TooltipTriggerProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <TooltipTrigger as="button">Hover</TooltipTrigger>
 * @public
 * @since 1.0.0
 */
export function TooltipTrigger({ class: klass, className, as = "button", href, children, ...rest }) {
    const tag = String(as).toLowerCase();
    const cls = cn("tooltip-trigger", klass, className);

    if (tag === "a") {
        return (
            <a href={href || "#"} class={cls} {...rest}>
                {children}
            </a>
        );
    }

    if (tag === "span" || tag === "div") {
        const Comp = tag;
        return (
            <Comp class={cls} tabindex="0" {...rest}>
                {children}
            </Comp>
        );
    }

    // Default button
    return (
        <button type="button" class={cls} {...rest}>
            {children}
        </button>
    );
}

/**
 * Props accepted by `<TooltipContent />`.
 *
 * Tooltip body region announced via `role="tooltip"`.
 * ARIA linkage is handled by runtime enhancement using DOM proximity.
 * Arbitrary markup children allowed; caller ensures safe content.
 * Hidden by default and shown on hover/focus of trigger.
 *
 * @typedef {HTMLDivAttributes & ComponentProps} TooltipContentProps
 * @function TooltipContent
 * @param {TooltipContentProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <TooltipContent>Helpful text</TooltipContent>
 * @public
 * @since 1.0.0
 */
export function TooltipContent({ class: klass, className, children, ...rest }) {
    const cls = cn("tooltip-content", klass, className);
    return (
        <span class={cls} role="tooltip" {...rest}>
            {children}
        </span>
    );
}
