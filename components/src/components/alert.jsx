/**
 * @fileoverview Inline alert (notice) UI primitives (vanilla JSX) for presenting status,
 * success, warning, or error messages. Framework‑agnostic (NOT React); emits static
 * markup for SXO's vanilla JSX transformer.
 *
 * Exports:
 * - Alert              : Root container with grid layout & optional leading icon.
 * - AlertTitle         : Single‑line heading (clamped); configurable heading level.
 * - AlertDescription   : Multi‑line descriptive content container.
 *
 * Design notes:
 * - Polymorphic semantics handled via `role` prop (defaults to "alert"). Use `status`
 *   for non‑urgent informational updates or `log`/`marquee` only when truly applicable.
 * - Root uses CSS grid; if an inline leading `<svg>` icon is present, a two‑column layout
 *   is automatically established (relies on `has-[>svg]` utility selector).
 * - `className` is accepted everywhere as an alias for `class`; both are merged
 *   deterministically (order: base tokens → class → className).
 * - No internal ids, `data-*`, or dynamic behaviors are introduced.
 *
 * Accessibility:
 * - Prefer `role="status"` for non‑urgent updates to avoid aggressive screen reader intrusion.
 * - Provide meaningful text content; avoid icon‑only alerts.
 * - Keep `<AlertTitle>` concise; extended prose belongs in `<AlertDescription>`.
 *
 * @module ui/alert
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 */

import { cn } from "@utils/cn.js";

/* -------------------------------------------------------------------------------------------------
 * Alert (root)
 * ------------------------------------------------------------------------------------------------- */
/**
 * Props accepted by `<Alert />`.
 *
 * Root container for an inline notice or status message. Applies a responsive grid
 * layout that reserves a leading column automatically when a direct child `<svg>`
 * is present (icon slot). Forwards arbitrary attributes (aria-*, data-*, etc.)
 * and normalizes `role` (default "alert").
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {
 *   role?: "alert"|"status"|"log"|"marquee"|string,
 * }} AlertProps
 * @function Alert
 * @param {AlertProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <Alert>
 *   <IconCircleInfo />
 *   <AlertTitle>Heads up</AlertTitle>
 *   <AlertDescription>This is an informational message.</AlertDescription>
 * </Alert>
 * @example
 * <Alert role="status">
 *   <AlertTitle level={4}>Profile updated</AlertTitle>
 *   <AlertDescription>All changes saved successfully.</AlertDescription>
 * </Alert>
 * @public
 */
export function Alert(props) {
    const { class: klass, className, role, children, ...rest } = props || {};
    const rootClass = cn(
        "alert",
        "relative",
        "w-full",
        "rounded-lg",
        "px-4",
        "py-3",
        "text-sm",
        "grid",
        "has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr]",
        "grid-cols-[0_1fr]",
        "has-[>svg]:gap-x-3",
        "gap-y-0.5",
        "items-start",
        "[&>svg]:size-4",
        "[&>svg]:translate-y-0.5",
        "[&>svg]:text-current",
        klass,
        className,
    );
    const computedRole = role || "alert";
    return (
        <div class={rootClass} role={computedRole} {...rest}>
            {children}
        </div>
    );
}

/* -------------------------------------------------------------------------------------------------
 * AlertTitle
 * ------------------------------------------------------------------------------------------------- */
/**
 * Props accepted by `<AlertTitle />`.
 *
 * Single‑line (clamped) heading element for an alert. Heading level is validated
 * and clamped to the 1–6 range (default level = 5). Returns the chosen heading
 * element (`<h1>`–`<h6>`). Does not inject additional wrapping markup.
 *
 * @typedef {HTMLHeadingAttributes & ComponentProps & {
 *   level?: number|string,
 * }} AlertTitleProps
 * @function AlertTitle
 * @param {AlertTitleProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <AlertTitle>Password updated</AlertTitle>
 * @example
 * <AlertTitle level={3}>System Warning</AlertTitle>
 * @public
 */
export function AlertTitle({ level, class: klass, className, children, ...rest }) {
    const numericLevel = Number(level);
    const lvl = numericLevel >= 1 && numericLevel <= 6 ? numericLevel : 5;
    const Tag = `h${lvl}`;
    const cls = cn("col-start-2", "line-clamp-1", "min-h-4", "font-medium", "tracking-tight", klass, className);
    return (
        <Tag class={cls} {...rest}>
            {children}
        </Tag>
    );
}

/* -------------------------------------------------------------------------------------------------
 * AlertDescription
 * ------------------------------------------------------------------------------------------------- */
/**
 * Props accepted by `<AlertDescription />`.
 *
 * Multi‑line descriptive region for supplementary alert content. Renders a `<div>`
 * with a small vertical layout stack (grid gap). Inline rich text (paragraphs,
 * lists) may be nested as children. Does not impose additional semantics.
 *
 * @typedef {HTMLDivAttributes & ComponentProps} AlertDescriptionProps
 * @function AlertDescription
 * @param {AlertDescriptionProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <AlertDescription>
 *   Your session will expire in <strong>2 minutes</strong>. Please save your work.
 * </AlertDescription>
 * @public
 */
export function AlertDescription(props) {
    const { class: klass, className, children, ...rest } = props || {};
    const cls = cn(
        "text-inherit",
        "col-start-2",
        "grid",
        "justify-items-start",
        "gap-1",
        "text-sm",
        "[&_p]:leading-relaxed",
        klass,
        className,
    );
    return (
        <div class={cls} {...rest}>
            {children}
        </div>
    );
}
