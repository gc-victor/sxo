/**
 * @fileoverview Client-side reactive interactivity for theme selector component.
 * Handles theme selection and class application to <html>.
 *
 * @module ui/theme-selector-client
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 * @since 1.0.0
 */

import { define } from "@qery/reactive-component";

define("el-theme-selector", ({ $state, $effect }) => {
    // Initialize selected theme state: fallback to default (empty string)
    $state.selectedTheme = "";

    // Effect to apply theme class to document root when selectedTheme changes
    $effect(() => {
        const theme = $state.selectedTheme;
        const htmlElement = document.documentElement;

        // Remove all theme classes
        htmlElement.classList.remove("theme-claude", "theme-doom-64", "theme-supabase");

        // Add the selected theme class if not default
        if (theme) {
            htmlElement.classList.add(`theme-${theme}`);
        }
    });
});
