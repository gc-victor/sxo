/**
 * @fileoverview Declarative dropdown menu component set (vanilla JSX)
 * @module ui/dropdown-menu
 *
 * Disclosure & nesting are powered by native <details>/<summary>. Client JS adds keyboard
 * navigation, Escape handling, and outside-click dismissal while preserving native toggle behavior.
 * Suitable for progressive enhancement.
 *
 * Components:
 * - DropdownMenu / default (root <details>)
 * - DropdownMenuTrigger (<summary>)
 * - DropdownMenuContent (menu surface)
 * - DropdownMenuItem (action / link)
 * - DropdownMenuLabel (section label)
 * - DropdownMenuSeparator (visual divider)
 * - DropdownMenuShortcut (right‑aligned hint)
 * - DropdownMenuGroup (fieldset + legend grouping)
 * - DropdownMenuSub (nested <details>)
 * - DropdownMenuSubTrigger (nested trigger)
 * - DropdownMenuSubContent (nested surface)
 * - DropdownMenuPortal (structural wrapper / placeholder)
 *
 * LIMITATIONS:
 * - No roving focus or arrow key navigation.
 * - No Escape / outside click dismissal beyond native summary toggle.
 * - Submenu positioning is static (CSS only).
 * - “Portal” is a no-op wrapper (no layering).
 *
 * @license MIT
 */

import { cn } from "@utils/cn.js";

/* -------------------------------------------------------------------------------------------------
 * Utilities
 * ------------------------------------------------------------------------------------------------- */

/**
 * Generate a lightweight slug from a label (non-crypto; for optional IDs).
 * @param {string} value
 * @returns {string}
 */
function slug(value) {
    return String(value)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40);
}

/* -------------------------------------------------------------------------------------------------
 * DropdownMenu (Root)
 * ------------------------------------------------------------------------------------------------- */

/**
 * @typedef {HTMLDetailsAttributes & ComponentProps & {
 *   open?: boolean,
 *   placement?: "top"|"bottom"|"left"|"right"
 * }} DropdownMenuProps
 * @param {DropdownMenuProps} props
 */
function DropdownMenu({ open = false, placement = "bottom", class: klass, className, children, ...rest }) {
    return (
        <el-dropdown-menu>
            <details
                class={cn("dropdown-menu-root", `dropdown-menu-placement-${placement}`, className || klass)}
                {...(open && { open: true })}
                {...rest}
            >
                {children}
            </details>
        </el-dropdown-menu>
    );
}

/**
 * Default export alias.
 */
export { DropdownMenu };
export default DropdownMenu;

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuTrigger
 * ------------------------------------------------------------------------------------------------- */

/**
 * @typedef {HTMLDivAttributes & ComponentProps & {
 *   ariaLabel?: string
 * }} DropdownMenuTriggerProps
 * @param {DropdownMenuTriggerProps} props
 */
export function DropdownMenuTrigger({ class: klass, className, children, ariaLabel, ...rest }) {
    return (
        <summary
            class={cn(
                "dropdown-menu-trigger list-none cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-md",
                className || klass,
            )}
            {...(ariaLabel ? { "aria-label": ariaLabel } : {})}
            {...rest}
        >
            {children}
        </summary>
    );
}

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuContent
 * ------------------------------------------------------------------------------------------------- */

/**
 * @typedef {HTMLDivAttributes & ComponentProps & {
 *   widthClass?: string,
 *   inset?: boolean
 * }} DropdownMenuContentProps
 * @param {DropdownMenuContentProps} props
 */
export function DropdownMenuContent({ class: klass, className, widthClass = "w-48", inset = false, children, ...rest }) {
    return (
        <div
            role="menu"
            class={cn(
                "dropdown-menu-content absolute mt-2 flex flex-col gap-0 rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
                widthClass,
                inset && "dropdown-menu-content-inset",
                className || klass,
            )}
            {...rest}
        >
            {children}
        </div>
    );
}

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuItem
 * ------------------------------------------------------------------------------------------------- */

/**
 * @typedef {(HTMLButtonAttributes & HTMLAnchorAttributes) & ComponentProps & {
 *   value?: string,
 *   disabled?: boolean,
 *   href?: string
 * }} DropdownMenuItemProps
 * @param {DropdownMenuItemProps} props
 */
export function DropdownMenuItem({ value, disabled = false, href, class: klass, className, children, ...rest }) {
    const baseClass = cn(
        "dropdown-menu-item relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
        "focus-visible:bg-accent",
        "hover:bg-accent",
        disabled && "opacity-50 pointer-events-none",
        className || klass,
    );
    const common = {
        role: "menuitem",
        class: baseClass,
        $onclick: "itemClick",
        ...(disabled && { "aria-disabled": "true", tabindex: "-1" }),
        ...(value != null ? { "data-value": value } : {}),
        ...rest,
    };

    if (href) {
        return (
            <a href={href} {...common}>
                {children}
            </a>
        );
    }

    return (
        <button type="button" {...common} {...(disabled ? { disabled: "" } : {})}>
            {children}
        </button>
    );
}

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuLabel
 * ------------------------------------------------------------------------------------------------- */

/**
 * @typedef {HTMLDivAttributes & ComponentProps & {
 *   inset?: boolean
 * }} DropdownMenuLabelProps
 * @param {DropdownMenuLabelProps} props
 */
export function DropdownMenuLabel({ class: klass, className, children, inset = false, ...rest }) {
    return (
        <div
            class={cn("dropdown-menu-label px-2 py-1.5 text-xs font-medium text-muted-foreground", inset && "pl-8", className || klass)}
            {...rest}
        >
            {children}
        </div>
    );
}

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuSeparator
 * ------------------------------------------------------------------------------------------------- */

/**
 * @typedef {HTMLHrAttributes & ComponentProps} DropdownMenuSeparatorProps
 * @param {DropdownMenuSeparatorProps} props
 */
export function DropdownMenuSeparator({ class: klass, className, ...rest }) {
    return <hr class={cn("dropdown-menu-separator -mx-1 my-1 h-px bg-border", className || klass)} {...rest} />;
}

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuShortcut
 * ------------------------------------------------------------------------------------------------- */

/**
 * @typedef {HTMLDivAttributes & ComponentProps} DropdownMenuShortcutProps
 * @param {DropdownMenuShortcutProps} props
 */
export function DropdownMenuShortcut({ class: klass, className, children, ...rest }) {
    return (
        <span class={cn("dropdown-menu-shortcut ml-auto text-xs tracking-widest text-muted-foreground", className || klass)} {...rest}>
            {children}
        </span>
    );
}

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuGroup
 * ------------------------------------------------------------------------------------------------- */

/**
 * @typedef {HTMLFieldSetAttributes & ComponentProps & {
 *   label?: string,
 *   id?: string
 * }} DropdownMenuGroupProps
 * @param {DropdownMenuGroupProps} props
 */
export function DropdownMenuGroup({ label, id, class: klass, className, children, ...rest }) {
    const groupId = id || (label ? `dropdown-group-${slug(label)}` : undefined);
    return (
        <fieldset
            class={cn("dropdown-menu-group flex flex-col", className || klass)}
            {...rest}
            {...(label ? { "aria-labelledby": groupId } : {})}
        >
            {label && (
                <legend
                    id={groupId}
                    class="dropdown-menu-group-label px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                    {label}
                </legend>
            )}
            {children}
        </fieldset>
    );
}

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuSub
 * ------------------------------------------------------------------------------------------------- */

/**
 * @typedef {HTMLDetailsAttributes & ComponentProps & {
 *   open?: boolean
 * }} DropdownMenuSubProps
 * @param {DropdownMenuSubProps} props
 */
export function DropdownMenuSub({ open = false, class: klass, className, children, ...rest }) {
    return (
        <details class={cn("dropdown-menu-sub relative", className || klass)} {...(open ? { open: "" } : {})} {...rest}>
            {children}
        </details>
    );
}

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuSubTrigger
 * ------------------------------------------------------------------------------------------------- */

/**
 * @typedef {HTMLDivAttributes & ComponentProps} DropdownMenuSubTriggerProps
 * @param {DropdownMenuSubTriggerProps} props
 */
export function DropdownMenuSubTrigger({ class: klass, className, children, ...rest }) {
    return (
        <summary
            class={cn(
                "dropdown-menu-sub-trigger flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring/50",
                className || klass,
            )}
            {...rest}
        >
            {children}
        </summary>
    );
}

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuSubContent
 * ------------------------------------------------------------------------------------------------- */

/**
 * @typedef {HTMLDivAttributes & ComponentProps} DropdownMenuSubContentProps
 * @param {DropdownMenuSubContentProps} props
 */
export function DropdownMenuSubContent({ class: klass, className, children, ...rest }) {
    return (
        <div
            role="menu"
            class={cn(
                "dropdown-menu-sub-content ml-2 mt-1 flex flex-col gap-0 rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
                className || klass,
            )}
            {...rest}
        >
            {children}
        </div>
    );
}

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuPortal
 * ------------------------------------------------------------------------------------------------- */

/**
 * @typedef {HTMLDivAttributes & ComponentProps} DropdownMenuPortalProps
 * @param {DropdownMenuPortalProps} props
 */
export function DropdownMenuPortal({ children, class: klass, className, ...rest }) {
    void rest;
    if (Array.isArray(children)) {
        return <div class={cn("dropdown-menu-portal", className || klass)}>{children}</div>;
    }
    return <div class={cn("dropdown-menu-portal", className || klass)}>{children}</div>;
}

/* -------------------------------------------------------------------------------------------------
 * Validation / Notes
 * -------------------------------------------------------------------------------------------------
 * - class / className alias supported on all components.
 * - Native elements used directly; minimal ARIA beyond role="menu"/"menuitem" where appropriate.
 * - Optional IDs only for grouped legends.
 * - Suitable for progressive enhancement (keyboard + focus mgmt can be added).
 */
