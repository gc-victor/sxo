/**
 * @fileoverview Theme toggle component for switching between light and dark modes (vanilla JSX).
 * Renders a button with sun and moon icons, with ARIA attributes for accessibility.
 * Client-side interactivity handles theme switching and persistence.
 *
 * Exports:
 * - ThemeToggle: Button component with sun/moon icons for theme toggling.
 *
 * Design notes:
 * - Renders both sun and moon icons; client script controls visibility based on current theme.
 * - Uses Button component for consistent styling.
 * - ARIA attributes included for screen reader support.
 * - className prop for customization.
 *
 * Accessibility:
 * - aria-label provides descriptive text for the toggle action.
 * - Icons have titles for visual users.
 *
 * @module ui/theme-toggle
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 */

import Button from "@components/button.jsx";
import { IconMoon, IconSun } from "@components/icon.jsx";

/**
 * Props accepted by `<ThemeToggle />`.
 *
 * @typedef {HTMLElementAttributes & {
 *   className?: string
 * }} ThemeToggleProps
 */

/**
 * Theme toggle button component.
 * Renders a button with sun and moon icons for theme switching.
 *
 * @param {ThemeToggleProps} props
 * @returns {string} Rendered HTML string
 * @public
 */
export default function ThemeToggle({ className = "", ...rest }) {
    return (
        <el-theme-toggle>
            <Button className={className} variant="outline" type="button" aria-label="Toggle theme" $onclick="toggle" {...rest}>
                <IconSun $bind-class="sunIconClass" title="Switch to light mode" />
                <IconMoon className="hidden" $bind-class="moonIconClass" title="Switch to dark mode" />
            </Button>
        </el-theme-toggle>
    );
}
