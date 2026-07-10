/**
 * @fileoverview Style pack selector component (vanilla JSX).
 * Renders a single dropdown for switching style packs.
 *
 * Exports:
 * - ThemeSelector: Dropdown with style pack options.
 *
 * Design notes:
 * - Color theme functionality (theme-* classes) still works via the client-side logic
 *   even though the dropdown now controls style packs.
 * - Client script handles stylesheet swap and persists selection to localStorage.
 * - className prop applies to the Select element for inline layout.
 *
 * @module ui/theme-selector
 */

import Select, { SelectOption } from "@components/select.jsx";

/**
 * @typedef {HTMLElementAttributes & {
 *   className?: string
 * }} ThemeSelectorProps
 */

export default function ThemeSelector({ className = "" }) {
    return (
        <el-theme-selector>
            <Select id="style-selector" className={className} $bind-value="selectedStyle">
                <SelectOption value="vega">Vega</SelectOption>
                <SelectOption value="nova">Nova</SelectOption>
                <SelectOption value="maia">Maia</SelectOption>
                <SelectOption value="lyra">Lyra</SelectOption>
                <SelectOption value="mira">Mira</SelectOption>
                <SelectOption value="luma">Luma</SelectOption>
                <SelectOption value="sera">Sera</SelectOption>
                <SelectOption value="rhea">Rhea</SelectOption>
            </Select>
        </el-theme-selector>
    );
}
