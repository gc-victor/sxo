/**
 * @fileoverview <el-command> enhancement component for command palette.
 *
 * Provides keyboard-driven command palette with:
 * - Open via Meta+K / Ctrl+K keyboard shortcut
 * - Close on Escape or backdrop click
 * - Case-insensitive item filtering as user types
 * - Arrow key navigation between visible items
 * - Enter to select
 * - Focus trap when open
 * - Focus restoration on close
 *
 * @license MIT
 */

import { define } from "@sxo/client";

define("el-command", function Command({ $element, $on, $state }) {
    /** @type {HTMLDialogElement|null} */
    const overlay = $element.querySelector(".command-overlay");

    /** @type {HTMLInputElement|null} */
    const input = $element.querySelector('[role="combobox"]');

    /** @type {NodeListOf<HTMLElement>} */
    const items = $element.querySelectorAll('[role="option"]');

    /** @type {HTMLElement|null} */
    const emptyMsg = $element.querySelector(".command-empty");

    /** @type {HTMLElement|null} */
    let lastFocused = null;

    $state.open = false;
    $state.query = "";

    /**
     * Get only the visible (non-hidden) items.
     * @returns {HTMLElement[]}
     */
    function visibleItems() {
        return Array.from(items).filter((el) => !el.hidden);
    }

    /**
     * Open the command palette.
     */
    function openPalette() {
        lastFocused = /** @type {HTMLElement} */ (document.activeElement);
        $state.open = true;
        updateOverlay();
        input?.focus();
    }

    /**
     * Close the command palette and restore focus.
     */
    function closePalette() {
        $state.open = false;
        $state.query = "";
        $state.activeIndex = -1;
        updateOverlay();
        if (input) input.value = "";
        if (lastFocused) {
            lastFocused.focus({ preventScroll: true });
            lastFocused = null;
        }
    }

    /**
     * Sync overlay and body classes with $state.open.
     */
    function updateOverlay() {
        if (!overlay) return;
        overlay.classList.toggle("open", $state.open);
        document.body.style.overflow = $state.open ? "hidden" : "";
    }

    /**
     * Filter items based on $state.query.
     */
    function filterItems() {
        const q = ($state.query || "").toLowerCase().trim();
        let visibleCount = 0;

        items.forEach((item) => {
            const searchText = (item.getAttribute("data-search") || item.textContent || "").toLowerCase();
            const match = !q || searchText.includes(q);
            item.hidden = !match;
            if (match) visibleCount++;
        });

        if (emptyMsg) {
            emptyMsg.hidden = visibleCount > 0;
        }

        // Reset activeIndex to first visible
        const vis = visibleItems();
        $state.activeIndex = vis.length > 0 ? 0 : -1;
        highlightItem(vis[$state.activeIndex]);
    }

    /**
     * Highlight a specific item and remove highlight from others.
     * @param {HTMLElement|null} target
     */
    function highlightItem(target) {
        items.forEach((el) => {
            el.classList.remove("active", "bg-gray-100", "dark:bg-gray-800");
        });
        if (target) {
            target.classList.add("active", "bg-gray-100", "dark:bg-gray-800");
            target.scrollIntoView({ block: "nearest" });
        }
    }

    /**
     * Navigate to next/previous visible item.
     * @param {1|-1} direction
     */
    function navigate(direction) {
        const vis = visibleItems();
        if (vis.length === 0) return;

        const current = vis.indexOf(document.activeElement);
        if (current === -1) {
            // Focus first/last
            const target = direction === 1 ? vis[0] : vis[vis.length - 1];
            target?.focus();
            highlightItem(target);
            $state.activeIndex = direction === 1 ? 0 : vis.length - 1;
        } else {
            const next = (current + direction + vis.length) % vis.length;
            vis[next]?.focus();
            highlightItem(vis[next]);
            $state.activeIndex = next;
        }
    }

    /**
     * Select the currently highlighted/focused item.
     */
    function selectActive() {
        const vis = visibleItems();
        const target = vis.find((el) => el.classList.contains("active")) || vis[$state.activeIndex] || vis[0];
        if (target) {
            const action = target.getAttribute("data-action");
            if (action) {
                $on[action]?.();
            }
            closePalette();
        }
    }

    // --- Event handlers ---

    /** Open command from trigger button click */
    $on.openCommand = () => openPalette();

    /** Handle input changes */
    $on.onInput = (/** @type {Event} */ e) => {
        const target = /** @type {HTMLInputElement} */ (e.target);
        $state.query = target.value;
        filterItems();
    };

    /** Select a specific item by click */
    $on.selectItem = (/** @type {Event} */ e) => {
        const target = /** @type {HTMLElement} */ (e.currentTarget);
        const action = target.getAttribute("data-action");
        if (action) {
            $on[action]?.();
        }
        closePalette();
    };

    // --- Keyboard event handling ---

    /**
     * Global keydown handler for shortcut and Escape.
     * @param {KeyboardEvent} e
     */
    function onGlobalKeydown(e) {
        // Open: Meta+K or Ctrl+K
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
            e.preventDefault();
            openPalette();
            return;
        }

        if (!$state.open) return;

        switch (e.key) {
            case "Escape":
                e.preventDefault();
                closePalette();
                break;
            case "ArrowDown":
                e.preventDefault();
                navigate(1);
                break;
            case "ArrowUp":
                e.preventDefault();
                navigate(-1);
                break;
            case "Enter":
                e.preventDefault();
                selectActive();
                break;
        }
    }

    /** Backdrop click to close */
    function onBackdropClick(/** @type {MouseEvent} */ e) {
        if ($state.open && e.target === overlay) {
            closePalette();
        }
    }

    // Attach global listeners
    document.addEventListener("keydown", onGlobalKeydown);
    overlay?.addEventListener("click", onBackdropClick);

    return {
        disconnected: () => {
            document.removeEventListener("keydown", onGlobalKeydown);
            overlay?.removeEventListener("click", onBackdropClick);
        },
    };
});
