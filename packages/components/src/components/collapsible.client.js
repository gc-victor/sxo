/**
 * @fileoverview <el-collapsible> enhancement component for single toggle.
 *
 * Provides:
 * - Toggle open/close on trigger click
 * - aria-expanded attribute management
 * - Chevron rotation animation
 * - Content show/hide with CSS transition
 *
 * @license MIT
 */

import { define } from "sxo/client";

define("el-collapsible", function Collapsible({ $element, $on, $state }) {
    /** @type {HTMLElement|null} */
    const trigger = $element.querySelector(".collapsible-trigger");

    /** @type {HTMLElement|null} */
    const content = $element.querySelector(".collapsible-content");

    $state.open = trigger?.getAttribute("aria-expanded") === "true";

    /**
     * Toggle the collapsible open/closed.
     */
    function toggle() {
        $state.open = !$state.open;
        updateState();
    }

    /**
     * Sync DOM state with $state.open.
     */
    function updateState() {
        if (!trigger || !content) return;
        trigger.setAttribute("aria-expanded", $state.open ? "true" : "false");
        content.classList.toggle("open", $state.open);
    }

    // --- Event handlers ---

    $on.toggleCollapsible = () => toggle();

    return {};
});
