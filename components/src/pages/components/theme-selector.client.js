/**
 * @fileoverview Client-side reactive interactivity for theme selector component.
 * Handles theme selection, class application to <html>, and persistence using reactive-component.
 *
 * @module ui/theme-selector-client
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 * @since 1.0.0
 */

import { define } from "@qery/reactive-component";

define("el-theme-selector", ({ $state, $effect }) => {
    // Initialize selected theme state: check stored preference, fallback to default (empty string)
    $state.selectedTheme = getStoredTheme() || "";

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

        // Persist the selection
        setStoredTheme(theme);
    });
});

/**
 * Retrieves the stored selected theme from localStorage.
 *
 * @returns {string | null} The stored theme or null if not set or localStorage unavailable.
 */
function getStoredTheme() {
    try {
        return localStorage.getItem("selectedTheme");
    } catch (_e) {
        return null;
    }
}

/**
 * Stores the selected theme preference in localStorage.
 *
 * @param {string} theme - The theme to store (empty string for default).
 */
function setStoredTheme(theme) {
    try {
        localStorage.setItem("selectedTheme", theme);
    } catch (_e) {
        // localStorage unavailable, ignore
    }
}
