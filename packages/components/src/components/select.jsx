/**
 * @fileoverview Declarative select component set (vanilla JSX)
 *
 * @module ui/select
 * @description
 * Accessible, framework-agnostic (NOT React) select primitives using fully declarative child
 * components that directly render native `<select>` subtree elements. Prior sentinel/object
 * patterns removed; all exports return actual markup. Native attributes are inherited (no
 * redundant prop re-declaration).
 *
 * Exports:
 * - `Select`: Root wrapper + `<select>`; no implicit selection context (manual option selection).
 * - `SelectPlaceholder`: Placeholder `<option disabled hidden>`.
 * - `SelectGroup`: Labeled `<optgroup>`; uses native `label` attribute.
 * - `SelectOption`: Single `<option>` (base primitive).
 * - `SelectItem`: Alias of `SelectOption` (semantic convenience).
 *
 * Design notes:
 * - Native-only implementation (no custom popover/listbox abstraction).
 * - Group labeling via `label` attribute (no nested label element inside `<optgroup>`).
 * - Placeholder semantics rely on author adding `selected` manually if desired.
 * - Declarative composition only; no arrays, no sentinels, no metadata objects.
 * - Internal context removed (v1.6.0) in favor of explicit native selection semantics.
 *
 * (Versioning section removed; consolidated to single baseline.)
 * @version 1.0.0
 * @public
 *
 *
 *
 *
 */

import { cn } from "@utils/cn.js";

/* -------------------------------------------------------------------------------------------------
 * <SelectOption />
 * -------------------------------------------------------------------------------------------------*/
/**
 * Props accepted by `<SelectOption />`.
 *
 * Single selectable option entry.
 * Selection is controlled by author via `selected` attribute or form defaults.
 * Inherits all native `<option>` attributes.
 *
 * @typedef {HTMLOptionAttributes & ComponentProps} SelectOptionProps
 * @function SelectOption
 * @param {SelectOptionProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <SelectOption value="apple">Apple</SelectOption>
 * @public
 */
export function SelectOption(props) {
    const { children, class: klass, className, value, disabled, selected, ...rest } = props || {};

    const labelSource = value != null ? value : typeof children === "string" ? children : "";
    const val = value != null ? String(value) : String(labelSource ?? "");

    return (
        <option
            {...rest}
            value={val}
            {...(disabled ? { disabled: "" } : {})}
            {...(selected ? { selected: "" } : {})}
            class={className || klass || null}
        >
            {children != null ? children : val}
        </option>
    );
}

/**
 * Props accepted by `<SelectItem />`.
 *
 * Alias of `<SelectOption />` for semantic clarity in grouped collections.
 * Selection managed explicitly via `selected` when needed.
 * Inherits all native `<option>` attributes.
 *
 * @typedef {SelectOptionProps} SelectItemProps
 * @function SelectItem
 * @param {SelectItemProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <SelectItem value="banana">Banana</SelectItem>
 * @public
 */
export function SelectItem(props) {
    return SelectOption(props);
}

/* -------------------------------------------------------------------------------------------------
 * <SelectGroup />
 * -------------------------------------------------------------------------------------------------*/
/**
 * Props accepted by `<SelectGroup />`.
 *
 * Labeled option grouping container.
 * Uses native `label` attribute; child options inherit group semantics.
 * Inherits all native `<optgroup>` attributes.
 *
 * @typedef {HTMLOptGroupAttributes & ComponentProps} SelectGroupProps
 * @function SelectGroup
 * @param {SelectGroupProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <SelectGroup label="Fruits"><SelectOption value="apple">Apple</SelectOption></SelectGroup>
 * @public
 */
export function SelectGroup({ children, class: klass, className, label, ...rest }) {
    return (
        <optgroup {...rest} label={label != null ? label : ""} class={className || klass || null}>
            {children}
        </optgroup>
    );
}

/* -------------------------------------------------------------------------------------------------
 * <SelectPlaceholder />
 * -------------------------------------------------------------------------------------------------*/
/**
 * Props accepted by `<SelectPlaceholder />`.
 *
 * Placeholder option shown before a user selection.
 * Emits `value=""`, `disabled`, and `hidden` for native placeholder semantics (not auto-selected).
 * Inherits all native `<option>` attributes.
 *
 * @typedef {HTMLOptionAttributes & ComponentProps} SelectPlaceholderProps
 * @function SelectPlaceholder
 * @param {SelectPlaceholderProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <SelectPlaceholder>Select a fruit</SelectPlaceholder>
 * @public
 */
export function SelectPlaceholder({ children, class: klass, className, selected }) {
    const label = children != null ? children : "Select…";
    return (
        <option value="" disabled="" hidden="" {...(selected ? { selected: "" } : {})} class={className || klass || "select-placeholder"}>
            {label}
        </option>
    );
}

/* -------------------------------------------------------------------------------------------------
 * <Select /> (root)
 * -------------------------------------------------------------------------------------------------*/
/**
 * Props accepted by `<Select />`.
 *
 * Native `<select>` element (no outer wrapper).
 * Authors mark `<SelectOption selected>` manually when needed; no auto-sync with `value`.
 * Forwards all native select attributes; `selectAttrs` merged last for explicit overrides.
 *
 * @typedef {HTMLSelectAttributes & ComponentProps & {
 *   value?: string,
 *   selectClass?: string,
 *   selectAttrs?: HTMLSelectAttributes,
 * }} SelectProps
 * @function Select
 * @param {SelectProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <Select>
 *   <SelectPlaceholder>Select a fruit</SelectPlaceholder>
 *   <SelectOption value="apple" selected>Apple</SelectOption>
 *   <SelectOption value="banana">Banana</SelectOption>
 * </Select>
 * @public
 */
export default function Select(props) {
    const { class: klass, className, children, ...rest } = props || {};

    const selectRootClass = cn("select", klass, className);

    return (
        <select class={selectRootClass} {...rest}>
            {children}
        </select>
    );
}
