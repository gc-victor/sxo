/**
 * @fileoverview Theme selector component for choosing between different theme styles (vanilla JSX).
 * Renders a select dropdown with theme options, with client-side interactivity for theme switching.
 *
 * Exports:
 * - ThemeSelector: Select component with theme options for selection.
 *
 * Design notes:
 * - Uses Select and SelectOption components for consistent styling.
 * - Options include Default (no theme), Claude, Doom 64, and Supabase.
 * - Client script handles theme class application and persistence.
 * - className prop for customization.
 *
 * Accessibility:
 * - Inherits accessibility from Select component.
 * - Screen reader support for options.
 *
 * @module ui/theme-selector
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 * @since 1.0.0
 */

import Select, { SelectOption } from "@components/select.jsx";

/**
 * Props accepted by `<ThemeSelector />`.
 *
 * @typedef {HTMLElementAttributes & {
 *   className?: string
 * }} ThemeSelectorProps
 * @since 1.0.0
 */

/**
 * Theme selector dropdown component.
 * Renders a select with options for different themes.
 *
 * @param {ThemeSelectorProps} props
 * @returns {string} Rendered HTML string
 * @public
 * @since 1.0.0
 */
export default function ThemeSelector({ className = "", ...rest }) {
    return (
        <el-theme-selector>
            <Select className={className} $bind-value="selectedTheme" {...rest}>
                <SelectOption value="">Default</SelectOption>
                <SelectOption value="claude">Claude</SelectOption>
                <SelectOption value="doom-64">Doom 64</SelectOption>
                <SelectOption value="supabase">Supabase</SelectOption>
            </Select>
        </el-theme-selector>
    );
}
