/**
 * @fileoverview Dialog primitives built on the native <dialog> element (vanilla JSX)
 *
 * @module ui/dialog
 * @description
 * Composable dialog primitives using the native <dialog> element plus lightweight structural
 * wrappers (header, title, description, footer, close trigger). Framework‑agnostic (NOT React),
 * compiled by SXO’s vanilla JSX transformer. No internal state management, focus trapping,
 * keyboard shortcuts, or id generation — all suitable for progressive enhancement.
 *
 * Limitations (static server output):
 * - No focus trapping / return focus (add client script if needed).
 * - No automatic ESC / backdrop close behavior.
 * - No generated ids; accessible naming relies on visible text.
 * - Close / Trigger buttons are inert without enhancement logic.
 *

 *
 * These constraints keep server output deterministic and minimal while enabling
 * optional client-side augmentation.
 */

import { cn } from "@utils/cn.js";
import Button from "./button";
import { IconX } from "./icon.jsx";

/* -------------------------------------------------------------------------------------------------
 * Shared / Utility Typedefs
 * ------------------------------------------------------------------------------------------------- */

/**
 * @typedef {JSX.Element|JSX.Element[]|string} DialogChildren
 */

/* -------------------------------------------------------------------------------------------------
 * Dialog Root
 * ------------------------------------------------------------------------------------------------- */

/**
 * Root wrapper grouping trigger + dialog content (presentational container).
 * @typedef {HTMLDivAttributes & ComponentProps & { }} DialogProps
 * @param {DialogProps} props
 */
export function Dialog({ class: klass, className, children, ...rest }) {
    return (
        <el-dialog>
            <div class={cn("dialog-root", className || klass)} {...rest}>
                {children}
            </div>
        </el-dialog>
    );
}

/* -------------------------------------------------------------------------------------------------
 * DialogTrigger
 * ------------------------------------------------------------------------------------------------- */

/**
 * Button-like trigger (requires enhancement to call show()/showModal()).
 * @typedef {HTMLButtonAttributes & ComponentProps & {
 *   variant?: "primary"|"secondary"|"outline"|"ghost"|"destructive"|"link" }} DialogTriggerProps
 * @param {DialogTriggerProps} props
 */
export function DialogTrigger({ variant = "primary", class: klass, className, children, ...rest }) {
    return (
        <Button type="button" variant={variant} class={cn(className || klass)} $onclick="showDialog" {...rest}>
            {children}
        </Button>
    );
}

/* -------------------------------------------------------------------------------------------------
 * DialogContent
 * ------------------------------------------------------------------------------------------------- */

/**
 * Native <dialog> wrapper. Adds/omits `open` attribute; hidden state uses a "hidden" class.
 * @typedef {HTMLDialogAttributes & ComponentProps & {
 *   open?: boolean, }} DialogContentProps
 * @param {DialogContentProps} props
 */
export function DialogContent({ open = false, class: klass, className, children, ...rest }) {
    const dlgClass = cn("dialog", "text-foreground", className || klass);
    return (
        <dialog class={dlgClass} {...rest}>
            <article class="flex flex-col gap-4">{children}</article>
        </dialog>
    );
}

/* -------------------------------------------------------------------------------------------------
 * DialogHeader
 * ------------------------------------------------------------------------------------------------- */

/**
 * Structural header region (usually holds title + description).
 * @typedef {HTMLDivAttributes & ComponentProps & { }} DialogHeaderProps
 * @param {DialogHeaderProps} props
 */
export function DialogHeader({ class: klass, className, children, ...rest }) {
    return (
        <header class={cn("dialog-header flex flex-col gap-1", className || klass)} {...rest}>
            {children}
        </header>
    );
}

/* -------------------------------------------------------------------------------------------------
 * DialogTitle
 * ------------------------------------------------------------------------------------------------- */

/**
 * Heading element for the dialog (no automatic aria-labelledby linkage).
 *
 * Dynamic tag pattern: accepts any valid element tag via `as` (default "h2").
 * Per HTML attribute inheritance migration, this uses `HTMLElementAttributes` instead of
 * a specific heading interface to reflect the open-ended tag choice. Consumers should
 * still prefer semantic heading levels (h1–h6) for accessible naming.
 *
 * @typedef {HTMLElementAttributes & ComponentProps & {
 *   as?: string, }} DialogTitleProps
 * @param {DialogTitleProps} props
 */
export function DialogTitle({ as = "h2", class: klass, className, children, ...rest }) {
    const Tag = as;
    return (
        <Tag class={cn("text-lg font-semibold tracking-tight", className || klass)} {...rest}>
            {children}
        </Tag>
    );
}

/* -------------------------------------------------------------------------------------------------
 * DialogDescription
 * ------------------------------------------------------------------------------------------------- */

/**
 * Descriptive text (not referenced programmatically; no ids).
 *
 * Dynamic tag pattern: uses `HTMLElementAttributes` so callers can change the wrapper element
 * (default "p") without losing native attribute inheritance. Keep semantic grouping (e.g. <p>, <div>)
 * and provide ARIA associations manually if needed.
 *
 * @typedef {HTMLElementAttributes & ComponentProps & {
 *   as?: string }} DialogDescriptionProps
 * @param {DialogDescriptionProps} props
 */
export function DialogDescription({ as = "p", class: klass, className, children, ...rest }) {
    const Tag = as;
    return (
        <Tag class={cn("text-sm text-muted-foreground leading-relaxed", className || klass)} {...rest}>
            {children}
        </Tag>
    );
}

/* -------------------------------------------------------------------------------------------------
 * DialogFooter
 * ------------------------------------------------------------------------------------------------- */

/**
 * Footer container for action buttons / supplemental controls.
 * @typedef {HTMLDivAttributes & ComponentProps & { }} DialogFooterProps
 * @param {DialogFooterProps} props
 */
export function DialogFooter({ class: klass, className, children, ...rest }) {
    return (
        <footer class={cn("flex gap-2 justify-end", className || klass)} {...rest}>
            {children}
        </footer>
    );
}

/* -------------------------------------------------------------------------------------------------
 * DialogClose
 * ------------------------------------------------------------------------------------------------- */

/**
 * Close button (no built-in logic; supply enhancement & accessible label).
 *
 * Requires an aria-label or text content for accessibility. When using the default
 * icon-only rendering (no children), pass `aria-label="Close dialog"` or similar via rest props.
 *
 * @typedef {HTMLButtonAttributes & ComponentProps & { }} DialogCloseProps
 * @param {DialogCloseProps} props
 */
export function DialogClose({ class: klass, className, children, ariaLabel = "Close", ...rest }) {
    const content = children != null ? children : <IconX width="20" height="20" aria-hidden="true" />;
    // ariaLabel prop converted to native aria-label HTML attribute for proper accessibility
    return (
        <button
            type="button"
            class={cn("inline-flex items-center justify-center", className || klass)}
            {...(ariaLabel ? { "aria-label": ariaLabel } : {})}
            $onclick="closeDialog"
            {...rest}
        >
            {content}
        </button>
    );
}
