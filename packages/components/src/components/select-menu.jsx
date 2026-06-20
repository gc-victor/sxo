/**
 * @fileoverview Declarative custom select menu (popover listbox pattern, vanilla JSX)
 *
 * @module ui/select-menu
 * @description
 * A purely declarative, markup-only component family that emulates the structure of an accessible
 * custom “select” (trigger + popover + listbox + options) without shipping ANY JavaScript
 * behaviors. These primitives intentionally avoid open/close logic, keyboard navigation, focus
 * management, active descendant handling, filtering, or positioning. Authors progressively
 * enhance externally if desired.
 *
 * Components:
 * - `SelectMenu`             : Root wrapper (NOT a native <select>).
 * - `SelectMenuTrigger`      : `<button>` with static `aria-haspopup="listbox"` + `aria-expanded`.
 * - `SelectMenuPopover`      : Container (optionally hidden).
 * - `SelectMenuSearch`       : Static `<input type="text">`; no filtering.
 * - `SelectMenuList`         : Listbox container `role="listbox"`.
 * - `SelectMenuGroup`        : Fieldset + legend grouping (native semantics).
 * - `SelectMenuOption`       : `<button role="option">` representing an item.
 * - `SelectMenuSeparator`    : Native `<hr>` separator.
 *
 * Design notes:
 * - Markup-first: no event handlers, no refs, no implicit data-* signaling.
 * - Selection entirely per-option via `selected` (no root state, no context).
 * - Hidden input included only if author renders it.
 *
 * LIMITATIONS:
 * - No interactive open/close logic (static `aria-expanded`).
 * - No keyboard navigation or roving focus.
 * - No active descendant management.
 * - No filtering logic (search input is static text).
 * - No positioning/portal logic.
 * - Author must manually ensure any IDs they add (if any) are unique.
 * - Updating selection requires re-render.
 *
 * Assumptions: authors will layer progressive enhancement scripts if richer behavior is required.
 *
 * @version 1.0.0
 * @public
 */
import { cn } from "@utils/cn.js";
import { IconChevronsVertical } from "./icon.jsx";
/* -------------------------------------------------------------------------------------------------
 * <SelectMenu /> (root)
 * -------------------------------------------------------------------------------------------------*/
/**
 * Props accepted by `<SelectMenu />`.
 *
 * Root structural wrapper. NOT a native `<select>`; renders a `<div>`.
 *
 * Selection:
 * - Root does not manage selection; each `<SelectMenuOption selected>` marks itself.
 *
 * ID coordination (author-managed):
 * - Author may add IDs manually if needed for aria relationships (not handled here).
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {
 *   name?: string,
 *   value?: string,
 * }} SelectMenuProps
 * @function SelectMenu
 * @param {SelectMenuProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <SelectMenu name="fruit" value="apple">
 *   <SelectMenuTrigger>Apple</SelectMenuTrigger>
 *   <SelectMenuPopover hidden>
 *     <SelectMenuSearch placeholder="Search entries..." />
 *     <SelectMenuList>
 *       <SelectMenuGroup label="Fruits">
 *         <SelectMenuOption value="apple" selected>Apple</SelectMenuOption>
 *         <SelectMenuOption value="banana">Banana</SelectMenuOption>
 *       </SelectMenuGroup>
 *       <SelectMenuSeparator />
 *       <SelectMenuOption value="pineapple">Pineapple</SelectMenuOption>
 *     </SelectMenuList>
 *   </SelectMenuPopover>
 * </SelectMenu>
 * @public
 *
 * Hidden value helper:
 * - If `name` provided, a hidden input is auto-rendered immediately after children.
 * - `value` (default empty string) populates its value.
 * - // LIMITATION: Static markup; no runtime synchronization with option selection.
 */
export function SelectMenu({ class: klass, className, children, name, value, ...rest }) {
    return (
        <el-select-menu>
            <div class={cn("select", className || klass)} {...rest}>
                {children}
                {name ? <input type="hidden" name={name} value={value != null ? String(value) : ""} /> : ""}
            </div>
        </el-select-menu>
    );
}
/* -------------------------------------------------------------------------------------------------
 * <SelectMenuTrigger />
 * -------------------------------------------------------------------------------------------------*/
/**
 * Props accepted by `<SelectMenuTrigger />`.
 *
 * Static button that announces a listbox. No toggle behavior.
 * // LIMITATION: `aria-expanded` static unless author changes it.
 *
 * Label precedence: children > `label`.
 *
 * Accessibility: Optionally provide `ariaLabel` for additional labeling if display text is insufficient.
 *
 * @typedef {HTMLButtonAttributes & ComponentProps & {
 *   label?: string|JSX.Element,
 *   ariaExpanded?: "true"|"false",
 *   ariaLabel?: string,
 * }} SelectMenuTriggerProps
 * @function SelectMenuTrigger
 * @param {SelectMenuTriggerProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <SelectMenu>
 *
 *   <SelectMenuTrigger ariaExpanded="false">Choose an item</SelectMenuTrigger>
 *   <SelectMenuPopover hidden>
 *     <SelectMenuList>
 *       <SelectMenuOption value="a" selected>Option A</SelectMenuOption>
 *     </SelectMenuList>
 *   </SelectMenuPopover>
 * </SelectMenu>
 * @public
 */
export function SelectMenuTrigger(props) {
    const { class: klass, className, children, label, ariaExpanded = "false", ariaLabel, ...rest } = props || {};
    const displayText = children != null ? children : label != null ? label : "";
    return (
        <button
            type="button"
            class={cn("btn-outline justify-between font-normal w-[180px]", className || klass)}
            aria-haspopup="listbox"
            aria-expanded={ariaExpanded}
            {...(ariaLabel ? { ariaLabel } : {})}
            $onclick="toggleSelect"
            {...rest}
        >
            <span class="select-label">{displayText}</span>
            <IconChevronsVertical aria-hidden="true" class="opacity-50 shrink-0" width="24" height="24" />
        </button>
    );
}
/* -------------------------------------------------------------------------------------------------
 * <SelectMenuPopover />
 * -------------------------------------------------------------------------------------------------*/
/**
 * Props accepted by `<SelectMenuPopover />`.
 *
 * Container for search + list + structural elements.
 * Hidden by default (author reveals via CSS or scripting).
 * // NOTE: Basic inline positioning provided: popover is absolutely positioned below the trigger via root's `relative`. No collision detection / portal / dynamic repositioning logic.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {
 *   hidden?: boolean,
 * }} SelectMenuPopoverProps
 * @function SelectMenuPopover
 * @param {SelectMenuPopoverProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <SelectMenuPopover hidden>
 *   <SelectMenuSearch />
 *   <SelectMenuList><SelectMenuOption value="x">X</SelectMenuOption></SelectMenuList>
 * </SelectMenuPopover>
 * @public
 */
export function SelectMenuPopover(props) {
    const { class: klass, className, children, hidden = true, ...rest } = props || {};
    return (
        <div class={cn("select-menu-popover", className || klass)} data-popover {...(hidden ? { ariaHidden: "true" } : {})} {...rest}>
            {children}
        </div>
    );
}
/* -------------------------------------------------------------------------------------------------
 * <SelectMenuSearch />
 * -------------------------------------------------------------------------------------------------*/
/**
 * Props accepted by `<SelectMenuSearch />`.
 *
 * Static search input (no filtering).
 * // LIMITATION: No option filtering; purely decorative / future enhancement hook.
 *
 * @typedef {HTMLInputAttributes & ComponentProps & {}} SelectMenuSearchProps
 * @function SelectMenuSearch
 * @param {SelectMenuSearchProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <SelectMenuSearch placeholder="Filter…” />
 * @public
 */
export function SelectMenuSearch(props) {
    const { class: klass, className, placeholder = "Search…", type, ...rest } = props || {};
    return (
        <input
            type={type || "text"}
            placeholder={placeholder}
            class={cn(
                "placeholder:text-muted-foreground flex h-10 flex-1 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50 min-w-0",
                className || klass,
            )}
            autocomplete="off"
            autocapitalize="none"
            spellcheck="false"
            role="combobox"
            aria-expanded="false"
            {...rest}
        />
    );
}
/* -------------------------------------------------------------------------------------------------
 * <SelectMenuList />
 * -------------------------------------------------------------------------------------------------*/
/**
 * Props accepted by `<SelectMenuList />`.
 *
 * `role="listbox"` container for options.
 * Author supplies any ID / labelling manually.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {
 *   ariaLabelledby?: string,
 * }} SelectMenuListProps
 * @function SelectMenuList
 * @param {SelectMenuListProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <SelectMenuList ariaLabelledby="fruit-trigger">
 *   <SelectMenuOption value="apple">Apple</SelectMenuOption>
 * </SelectMenuList>
 * @public
 */
export function SelectMenuList(props) {
    const { class: klass, className, children, ariaLabelledby, ...rest } = props || {};
    return (
        <div
            role="listbox"
            class={cn("select-menu-list", className || klass)}
            aria-labelledby={ariaLabelledby || null}
            aria-orientation="vertical"
            {...rest}
        >
            {children}
        </div>
    );
}
/* -------------------------------------------------------------------------------------------------
 * <SelectMenuGroup />
 * -------------------------------------------------------------------------------------------------*/
/**
 * Props accepted by `<SelectMenuGroup />`.
 *
 * Field grouping via `<fieldset><legend>`.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {
 *   label: string|JSX.Element,
 * }} SelectMenuGroupProps
 * @function SelectMenuGroup
 * @param {SelectMenuGroupProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <SelectMenuGroup label="Fruits">
 *   <SelectMenuOption value="apple">Apple</SelectMenuOption>
 * </SelectMenuGroup>
 * @public
 */
export function SelectMenuGroup(props) {
    const { class: klass, className, children, label, ...rest } = props || {};
    return (
        <fieldset class={cn("select-menu-group", className || klass)} {...rest}>
            <legend>{label != null ? label : ""}</legend>
            {children}
        </fieldset>
    );
}
/* -------------------------------------------------------------------------------------------------
 * <SelectMenuOption />
 * -------------------------------------------------------------------------------------------------*/
/**
 * Props accepted by `<SelectMenuOption />`.
 *
 * Single selectable option.
 * Selection:
 * - Uses `selected` prop only (no root/shared state).
 *
 * Output:
 * - `<button type="button" value="...">`
 * - `aria-selected="true"` when selected.
 *
 * @typedef {HTMLButtonAttributes & ComponentProps & {
 *   value: string,
 *   selected?: boolean,
 * }} SelectMenuOptionProps
 * @function SelectMenuOption
 * @param {SelectMenuOptionProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <SelectMenu>
 *
 *   <SelectMenuTrigger>Banana</SelectMenuTrigger>
 *   <SelectMenuPopover hidden>
 *     <SelectMenuList>
 *       <SelectMenuOption value="apple">Apple</SelectMenuOption>
 *       <SelectMenuOption value="banana" selected>Banana</SelectMenuOption>
 *     </SelectMenuList>
 *   </SelectMenuPopover>
 * </SelectMenu>
 * @example
 * <SelectMenu>
 *
 *   <SelectMenuTrigger>Apple</SelectMenuTrigger>
 *   <SelectMenuPopover hidden>
 *     <SelectMenuList>
 *       <SelectMenuOption value="apple" selected>Apple</SelectMenuOption>
 *       <SelectMenuOption value="pear">Pear</SelectMenuOption>
 *     </SelectMenuList>
 *   </SelectMenuPopover>
 * </SelectMenu>
 * @public
 */
export function SelectMenuOption(props) {
    const { class: klass, className, children, value, selected, ...rest } = props || {};
    const val = value != null ? String(value) : "";
    const effectiveSelected = !!selected;
    return (
        <button
            role="option"
            type="button"
            class={cn("select-menu-option", className || klass)}
            data-value={val}
            value={val}
            aria-selected={effectiveSelected ? "true" : "false"}
            {...rest}
        >
            {children != null ? children : val}
        </button>
    );
}
/* -------------------------------------------------------------------------------------------------
 * <SelectMenuSeparator />
 * -------------------------------------------------------------------------------------------------*/
/**
 * Props accepted by `<SelectMenuSeparator />`.
 *
 * Visual separator (`<hr>`).
 *
 * @typedef {HTMLHrAttributes & ComponentProps} SelectMenuSeparatorProps
 * @function SelectMenuSeparator
 * @param {SelectMenuSeparatorProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <SelectMenuSeparator />
 * @public
 */
export function SelectMenuSeparator(props) {
    const { class: klass, className, ...rest } = props || {};
    return <hr class={cn("select-menu-separator my-1 h-px bg-border", className || klass)} {...rest} />;
}
