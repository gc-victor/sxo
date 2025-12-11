/**
 * @fileoverview Popover primitives with instance-scoped toggle and focus management (vanilla JSX)
 * @module ui/popover
 * @description
 * Composable popover primitives for SXO vanilla JSX transformer. This component is
 * framework-agnostic (NOT React) and renders plain markup with instance-scoped behavior.
 *
 * Composable exports:
 * - `Popover` (default): Root container grouping trigger + content (presentational).
 * - `PopoverTrigger`: Button-like trigger (requires enhancement to call show()/toggle()).
 * - `PopoverContent`: Custom accessible dialog wrapper for popover content panel.
 *
 * Design notes:
 * - Uses custom accessible dialog (div-based) instead of native <dialog> to respect container constraints.
 * - Toggle open/close on trigger click; close on outside click or Escape key.
 * - Focus management: focuses first focusable element inside on open; restores focus on close.
 * - Emits custom events: "popover:open" and "popover:close" with detail payload.
 * - Instance-scoped via `[data-popover-root]` selector; no global state leakage.
 * - No internal state management, focus trapping, or id generation — all suitable for
 *   progressive enhancement. Client-side enhancement scripts handle toggle/focus logic.
 * - Visibility controlled via `data-popover-open` attribute for CSS-driven styling.
 *
 * Typing notes:
 * - Root element is `<div>`; typedef inherits `HTMLDivAttributes`.
 * - `className` is an alias for `class`.
 *
 * Internal helpers in this file are documented with JSDoc and marked @internal to
 * distinguish them from the public component exports.
 *
 * @author Víctor García
 * @license MIT
 * @version 2.0.0
 */

import { cn } from "@utils/cn.js";
import Button from "./button";

/* -------------------------------------------------------------------------------------------------
 * Popover Root
 * ------------------------------------------------------------------------------------------------- */

/**
 * Root wrapper grouping trigger + popover content (presentational container).
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {}} PopoverProps
 * @param {PopoverProps} props
 * @public
 */
export function Popover({ class: klass, className, children, ...rest }) {
    return (
        <el-popover>
            <div class={cn("popover", klass || className)} data-popover-root {...rest}>
                {children}
            </div>
        </el-popover>
    );
}

/* -------------------------------------------------------------------------------------------------
 * PopoverTrigger
 * ------------------------------------------------------------------------------------------------- */

/**
 * Button-like trigger using native popover API.
 *
 * This component pairs with PopoverContent and uses the popovertarget attribute
 * for native browser popover control. The browser automatically manages aria-expanded.
 *
 * @typedef {HTMLButtonAttributes & ComponentProps & {
 *   contentId: string,
 *   variant?: "primary"|"secondary"|"outline"|"ghost"|"destructive"|"link",
 * }} PopoverTriggerProps
 * @param {PopoverTriggerProps} props
 * @public
 */
export function PopoverTrigger({ variant = "outline", class: klass, className, contentId, children, ...rest }) {
    const triggerId = `${contentId}-trigger`;
    return (
        <Button
            id={triggerId}
            type="button"
            variant={variant}
            class={cn(className || klass)}
            $ref="trigger"
            $bind-attr="triggerAttrs"
            $onclick="openPopover"
            {...rest}
        >
            {children}
        </Button>
    );
}

/* -------------------------------------------------------------------------------------------------
 * PopoverContent
 * ------------------------------------------------------------------------------------------------- */

/**
 * Div-based popover content using native Popover API.
 *
 * Uses a div[popover] element with role="dialog" for accessibility:
 * - Browser manages aria-details relationship
 * - Explicit dialog role for screen readers
 * - Focus management on open/close
 * - Keyboard navigation (Escape to close)
 *
 * The popover attribute enables light-dismiss behavior and proper z-index stacking.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {
 *   id: string,
 * }} PopoverContentProps
 * @param {PopoverContentProps} props
 * @public
 */
export function PopoverContent({ class: klass, className, children, ...rest }) {
    const contentClass = cn("popover-content", "hidden", "text-foreground", className || klass, "absolute z-10");

    return (
        <div
            data-popover
            $ref="content"
            $bind-class="contentClasses"
            $bind-attr="contentAttrs"
            class={contentClass}
            role="dialog"
            {...rest}
        >
            {children}
        </div>
    );
}
