/**
 * @fileoverview Combobox input with dropdown (vanilla JSX + reactive client island)
 *
 * @module ui/combobox
 * @description
 * Type-ahead combobox with filtering dropdown and option selection.
 * SSR renders markup; client island manages open/close, filtering, keyboard nav.
 *
 * Exports:
 * - `Combobox` (default): Combobox with search filtering.
 *
 * Design notes:
 * - Uses `<el-combobox>` custom element for client enhancement.
 * - All options SSR-rendered; client JS filters by `data-value`.
 * - Free-text input allowed (no forced selection).
 *
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 */

import { cn } from "@utils/cn.js";

/**
 * @typedef {{ value: string, label: string }} ComboboxOption
 */

const DEFAULT_OPTIONS = [
    { value: "Apple", label: "Apple" },
    { value: "Banana", label: "Banana" },
    { value: "Blueberry", label: "Blueberry" },
    { value: "Cherry", label: "Cherry" },
    { value: "Grape", label: "Grape" },
    { value: "Orange", label: "Orange" },
    { value: "Strawberry", label: "Strawberry" },
    { value: "Watermelon", label: "Watermelon" },
];

/**
 * Props accepted by `<Combobox />`.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {
 *   options?: ComboboxOption[],
 *   placeholder?: string,
 * }} ComboboxProps
 * @function Combobox
 * @param {ComboboxProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <Combobox />
 * @public
 */
export default function Combobox({ class: klass, className, options = DEFAULT_OPTIONS, placeholder = "Search fruits...", ...rest }) {
    const listboxId = "combobox-listbox";

    return (
        <el-combobox>
            <div class={cn("combobox", klass, className)} {...rest}>
                <input
                    role="combobox"
                    class="combobox-input"
                    placeholder={placeholder}
                    aria-expanded="false"
                    aria-controls={listboxId}
                    aria-autocomplete="list"
                    autocomplete="off"
                    $oninput="onInput"
                    $onkeydown="onKeyDown"
                />
                <div id={listboxId} role="listbox" class="combobox-listbox">
                    {options.map((opt) => (
                        <button
                            type="button"
                            key={opt.value}
                            role="option"
                            class="combobox-option"
                            data-value={opt.value}
                            aria-selected="false"
                            $onclick="selectOption"
                        >
                            {opt.label}
                        </button>
                    ))}
                    <div class="combobox-empty" hidden>
                        No results found.
                    </div>
                </div>
            </div>
        </el-combobox>
    );
}
