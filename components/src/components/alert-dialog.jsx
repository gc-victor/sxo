/**
 * @fileoverview Alert dialog primitives built on the native <dialog> element (vanilla JSX)
 *
 * @module ui/alert-dialog
 * @description
 * Accessible alert dialog primitives using the native <dialog> element plus small structural
 * components (Trigger, Window, Title, Description, Footer). Framework‑agnostic (NOT React),
 * produced by SXO’s vanilla JSX transformer. No internal state management, focus trapping,
 * ESC handling, or id generation—intended for progressive enhancement.
 *
 * Limitations:
 * - No focus trap / return focus handling.
 * - No Escape key or backdrop click logic.
 * - No id / aria-labelledby wiring (relies on visible text; caller may add custom aria attrs).
 * - `AlertDialogTrigger` and dismissal behaviors require client scripts to call show()/close().
 *
 * Design:
 * - Uses native <dialog>.
 * - Open state controlled by `open` boolean -> adds empty `open` attribute; closed state uses "hidden" class.
 * - No data-* attributes; styling via class tokens.
 *
 * @license MIT
 * @version 1.0.0
 */

import { cn } from "@utils/cn.js";
import Button from "./button";

/**
 * @typedef {import("./button.jsx").ButtonVariant} ButtonVariant
 */

/**
 * Root alert dialog wrapper (presentational container).
 *
 * @typedef {HTMLDivAttributes & ComponentProps} AlertDialogProps
 * @param {AlertDialogProps} props
 */
export function AlertDialog({ class: klass, className, children, ...rest }) {
    const rootClass = cn("alert-dialog", className || klass);
    return (
        <el-alert-dialog>
            <div class={rootClass} {...rest}>
                {children}
            </div>
        </el-alert-dialog>
    );
}

/**
 * Trigger rendered as a button (or anchor if enhancement wraps Button).
 *
 * @typedef {(HTMLButtonAttributes & HTMLAnchorAttributes) & ComponentProps & {
 *   variant?: ButtonVariant
 * }} AlertDialogTriggerProps
 * @param {AlertDialogTriggerProps} props
 */
export function AlertDialogTrigger({ variant = "primary", class: klass, className, children, ...rest }) {
    return (
        <Button variant={variant} class={cn(className || klass)} type="button" $onclick="showDialog" {...rest}>
            {children}
        </Button>
    );
}

/**
 * Native dialog window (structural shell).
 *
 * @typedef {HTMLDialogAttributes & ComponentProps & {
 *   open?: boolean,
 *   label?: string,
 *   dialogClass?: string,
 *   dialogProps?: Record<string, any>,
 *   articleClass?: string
 * }} AlertDialogWindowProps
 * @param {AlertDialogWindowProps} props
 */
export function AlertDialogWindow({ label, class: klass, className, dialogClass, dialogProps = {}, articleClass, children, ...rest }) {
    const aria = {
        role: "alertdialog",
        ariaModal: "true",
        ariaLabel: label || null,
    };

    const dlgClass = cn("dialog", "text-foreground", dialogClass, dialogProps.class || dialogProps.className, className || klass);

    return (
        <dialog class={dlgClass} {...aria} {...dialogProps} {...rest}>
            <article class={cn("flex flex-col gap-4", articleClass)}>{children}</article>
        </dialog>
    );
}

/**
 * Dialog title (always rendered inside an h2 element).
 *
 * @typedef {HTMLHeadingAttributes & ComponentProps} AlertDialogTitleProps
 * @param {AlertDialogTitleProps} props
 */
export function AlertDialogTitle({ class: klass, className, children, ...rest }) {
    return (
        <header>
            <h2 class={cn("text-lg font-semibold tracking-tight", className || klass)} {...rest}>
                {children}
            </h2>
        </header>
    );
}

/**
 * Dialog description (dynamic tag via `as`, default "p").
 *
 * @typedef {HTMLElementAttributes & ComponentProps & {
 *   as?: string
 * }} AlertDialogDescriptionProps
 * @param {AlertDialogDescriptionProps} props
 */
export function AlertDialogDescription({ as = "p", class: klass, className, children, ...rest }) {
    const Tag = as;
    return (
        <Tag class={cn("text-sm text-muted-foreground leading-relaxed", className || klass)} {...rest}>
            {children}
        </Tag>
    );
}

/**
 * Footer container for action buttons.
 *
 * @typedef {HTMLDivAttributes & ComponentProps} AlertDialogFooterProps
 * @param {AlertDialogFooterProps} props
 */
export function AlertDialogFooter({ class: klass, className, children, ...rest }) {
    return (
        <footer class={cn("flex gap-2 justify-end", className || klass)} {...rest}>
            {children}
        </footer>
    );
}

/* -----------------------------------------------------------------------------------------------
 * Notes / Progressive Enhancement Hints
 * -----------------------------------------------------------------------------------------------
 * - Add a client script to:
 *   * Wire triggers to the nearest <dialog> (showModal / close)
 *   * Trap focus & restore on close
 *   * Handle ESC + backdrop click
 * - For programmatic labelling via aria-labelledby, caller must supply ids manually.
 * - This file intentionally omits examples & verbose descriptions per consolidation directive.
 */
