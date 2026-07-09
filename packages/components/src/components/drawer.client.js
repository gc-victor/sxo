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

import { define } from "@sxo/client";

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

    /**
     * Trap focus within the drawer panel.
     * @param {KeyboardEvent} e
     */
    function trapFocus(e) {
        if (e.key !== "Tab") return;
        const focusable = focusableElements();
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
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

    /**
     * Sync DOM state with $state.open.
     */
    function updateState() {
        if (!backdrop || !panel) return;
        backdrop.classList.toggle("open", $state.open);
        panel.classList.toggle("open", $state.open);
        document.body.style.overflow = $state.open ? "hidden" : "";

        if ($state.open) {
            panel.addEventListener("keydown", trapFocus);
        } else {
            panel.removeEventListener("keydown", trapFocus);
        }
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
