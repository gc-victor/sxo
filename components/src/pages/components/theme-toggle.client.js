/**
 * @fileoverview Client-side reactive interactivity for theme toggle component, including theme utility functions.
 * Handles theme switching, persistence, and icon updates using reactive-component.
 *
 * @module ui/theme-toggle-client
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 * @since 1.0.0
 */

import { define } from "@qery/reactive-component";

define("el-theme-toggle", ({ $state, $on, $compute }) => {
    // Initialize theme state: check stored preference, fallback to system preference
    $state.theme = getStoredTheme() || getSystemPreference();

    // Apply initial theme to document
    document.documentElement.classList.toggle("dark", $state.theme === "dark");

    // Compute icon classes reactively
    $compute("sunIconClass", ["theme"], (theme) => ({
        add: theme === "light" ? ["hidden"] : [],
        remove: theme === "light" ? [] : ["hidden"],
    }));
    $compute("moonIconClass", ["theme"], (theme) => ({
        add: theme === "dark" ? ["hidden"] : [],
        remove: theme === "dark" ? [] : ["hidden"],
    }));

    // Toggle method
    $on.toggle = () => {
        $state.theme = $state.theme === "light" ? "dark" : "light";
        document.documentElement.classList.toggle("dark", $state.theme === "dark");
        setStoredTheme($state.theme);
    };
});

/**
 * Detects the user's system color scheme preference.
 *
 * @returns {'light' | 'dark'} The preferred theme based on system settings.
 */
function getSystemPreference() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Retrieves the stored theme from localStorage.
 *
 * @returns {string | null} The stored theme or null if not set or localStorage unavailable.
 */
function getStoredTheme() {
    try {
        return localStorage.getItem("theme");
    } catch (_e) {
        return null;
    }
}

/**
 * Stores the theme preference in localStorage.
 *
 * @param {string} theme - The theme to store ('light' or 'dark').
 */
function setStoredTheme(theme) {
    try {
        localStorage.setItem("theme", theme);
    } catch (_e) {
        // localStorage unavailable, ignore
    }
}
