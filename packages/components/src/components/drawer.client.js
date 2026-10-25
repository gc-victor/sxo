/**
 * @fileoverview <el-drawer> enhancement component for side sheet drawer.
 *
 * Provides:
 * - Open/close on trigger click
 * - Close on backdrop click and Escape
 * - Focus trap when open
 * - Focus restoration on close
 * - Body scroll lock when open
 *
 * @license MIT
 */

import { define } from "sxo/client";

define("el-drawer", function Drawer({ $element, $on, $state }) {
    /** @type {HTMLElement|null} */
    const backdrop = $element.querySelector(".drawer-backdrop");

    /** @type {HTMLElement|null} */
    const panel = $element.querySelector(".drawer-panel");

    /** @type {HTMLElement|null} */
    let lastFocused = null;

    $state.open = false;

    /**
     * Focusable elements within the drawer panel.
     * @returns {HTMLElement[]}
     */
    function focusableElements() {
        if (!panel) return [];
        return Array.from(panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'));
    }

    function getShiftTabTarget(focusable) {
        return document.activeElement === focusable[0] ? focusable[focusable.length - 1] : null;
    }

    function getTabTarget(focusable) {
        return document.activeElement === focusable[focusable.length - 1] ? focusable[0] : null;
    }

    function getFocusTrapTarget(e) {
        if (e.key !== "Tab") return null;
        const focusable = focusableElements();
        if (focusable.length === 0) return null;
        return e.shiftKey ? getShiftTabTarget(focusable) : getTabTarget(focusable);
    }

    /**
     * Trap focus within the drawer panel.
     * @param {KeyboardEvent} e
     */
    function trapFocus(e) {
        const target = getFocusTrapTarget(e);
        if (!target) return;
        e.preventDefault();
        target.focus();
    }

    /**
     * Open the drawer.
     */
    function openDrawer() {
        lastFocused = /** @type {HTMLElement} */ (document.activeElement);
        $state.open = true;
        updateState();
        if (panel) {
            panel.focus();
        }
    }

    /**
     * Close the drawer.
     */
    function closeDrawer() {
        $state.open = false;
        updateState();
        if (lastFocused) {
            lastFocused.focus({ preventScroll: true });
            lastFocused = null;
        }
    }

    function updateDrawerVisualState(open) {
        backdrop.classList.toggle("open", open);
        panel.classList.toggle("open", open);
    }

    function updateFocusTrap(open) {
        if (open) panel.addEventListener("keydown", trapFocus);
        else panel.removeEventListener("keydown", trapFocus);
    }

    /**
     * Sync DOM state with $state.open.
     */
    function updateState() {
        if (!backdrop || !panel) return;
        updateDrawerVisualState($state.open);
        document.body.style.overflow = $state.open ? "hidden" : "";
        updateFocusTrap($state.open);
    }

    // --- Event handlers ---

    $on.openDrawer = () => openDrawer();
    $on.closeDrawer = () => closeDrawer();

    // --- Global keydown for Escape ---

    function onGlobalKeydown(/** @type {KeyboardEvent} */ e) {
        if (!$state.open) return;
        if (e.key === "Escape") {
            e.preventDefault();
            closeDrawer();
        }
    }

    document.addEventListener("keydown", onGlobalKeydown);

    return {
        disconnected: () => {
            document.removeEventListener("keydown", onGlobalKeydown);
            panel?.removeEventListener("keydown", trapFocus);
            document.body.style.overflow = "";
        },
    };
});
