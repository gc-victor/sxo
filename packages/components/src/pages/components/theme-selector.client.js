/**
 * @fileoverview Client-side reactive interactivity for theme selector component.
 * Handles theme selection and class application to <html>.
 *
 * @module ui/theme-selector-client
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 */

import { define } from "sxo/client";

const STYLE_KEY = "sxo-style-pack";

/**
 * Swap the active style pack stylesheet.
 * Removes any existing override, then injects a new <link> for the given pack.
 * Vega is built into global.css — no extra request needed.
 */
function loadStylePack(name) {
    // Remove any existing override link
    document.querySelectorAll("#sxo-style-override").forEach((el) => {
        el.remove();
    });

    if (!name || name === "vega") return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `/styles/${name}.css`;
    link.id = "sxo-style-override";
    link.onerror = () => link.remove();
    document.head.appendChild(link);
}

/**
 * Read a value from localStorage, returning null on failure.
 */
function readStorage(key) {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

/**
 * Write a value to localStorage, silently ignoring errors.
 */
function writeStorage(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch {
        // Storage unavailable (private browsing, quota, etc.)
    }
}

define("el-theme-selector", ({ $state, $effect }) => {
    // Initialize selected theme state: fallback to default (empty string)
    $state.selectedTheme = "";

    // Initialize selected style pack from localStorage
    const savedStyle = readStorage(STYLE_KEY);
    $state.selectedStyle = savedStyle && savedStyle !== "vega" ? savedStyle : "";

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

    // Effect to swap style pack stylesheet when selectedStyle changes
    $effect(() => {
        const style = $state.selectedStyle;
        loadStylePack(style);
        writeStorage(STYLE_KEY, style || "vega");
    });
});
