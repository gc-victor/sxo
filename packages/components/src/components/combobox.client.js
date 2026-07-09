/**
 * @fileoverview <el-combobox> enhancement component for combobox input.
 *
 * Provides type-ahead combobox with:
 * - Open dropdown on focus
 * - Close on Escape or outside click
 * - Case-insensitive option filtering as user types
 * - Arrow key navigation between visible options
 * - Enter or click to select
 * - No-results state when nothing matches
 *
 * @license MIT
 */

import { define } from "@sxo/client";

define("el-combobox", function Combobox({ $element, $on, $state }) {
    /** @type {HTMLInputElement|null} */
    const input = $element.querySelector('[role="combobox"]');

    /** @type {HTMLElement|null} */
    const listbox = $element.querySelector('[role="listbox"]');

    /** @type {NodeListOf<HTMLElement>} */
    const options = $element.querySelectorAll('[role="option"]');

    /** @type {HTMLElement|null} */
    const emptyMsg = $element.querySelector(".combobox-empty");

    $state.open = false;
    $state.query = "";
    $state.activeIndex = -1;

    /**
     * Get only visible (non-hidden) options.
     * @returns {HTMLElement[]}
     */
    function visibleOptions() {
        return Array.from(options).filter((el) => !el.hidden);
    }

    /**
     * Open the dropdown.
     */
    function openDropdown() {
        $state.open = true;
        updateListbox();
        filterOptions();
    }

    /**
     * Close the dropdown.
     */
    function closeDropdown() {
        $state.open = false;
        if (listbox) listbox.classList.remove("open");
        if (input) input.setAttribute("aria-expanded", "false");
    }

    /**
     * Sync listbox visibility with $state.open.
     */
    function updateListbox() {
        if (!listbox) return;
        if ($state.open) {
            listbox.classList.add("open");
        } else {
            listbox.classList.remove("open");
        }
        if (input) {
            input.setAttribute("aria-expanded", String($state.open));
        }
    }

    /**
     * Filter options based on input value.
     */
    function filterOptions() {
        const q = ($state.query || "").toLowerCase().trim();
        let visibleCount = 0;

        options.forEach((opt) => {
            const text = (opt.getAttribute("data-value") || opt.textContent || "").toLowerCase();
            const match = !q || text.includes(q);
            opt.hidden = !match;
            if (match) visibleCount++;
        });

        if (emptyMsg) {
            emptyMsg.hidden = visibleCount > 0;
        }

        // Reset highlight to first visible
        const vis = visibleOptions();
        $state.activeIndex = vis.length > 0 ? 0 : -1;
        highlightOption(vis[$state.activeIndex]);
    }

    /**
     * Highlight a specific option.
     * @param {HTMLElement|null} target
     */
    function highlightOption(target) {
        options.forEach((el) => {
            el.classList.remove("active", "bg-gray-100", "dark:bg-gray-800");
        });
        if (target) {
            target.classList.add("active", "bg-gray-100", "dark:bg-gray-800");
        }
    }

    /**
     * Navigate to next/previous option.
     * @param {1|-1} dir
     */
    function navigate(dir) {
        const vis = visibleOptions();
        if (vis.length === 0) return;

        const current = vis.indexOf(document.activeElement);
        const next = current === -1 ? (dir === 1 ? 0 : vis.length - 1) : (current + dir + vis.length) % vis.length;
        vis[next]?.focus();
        highlightOption(vis[next]);
        $state.activeIndex = next;
    }

    /**
     * Select the currently highlighted option.
     */
    function selectHighlighted() {
        const vis = visibleOptions();
        const target = vis.find((el) => el.classList.contains("active")) || vis[$state.activeIndex] || vis[0];
        if (target) {
            const value = target.getAttribute("data-value") || target.textContent || "";
            if (input) {
                input.value = value;
                $state.query = value;
            }
            closeDropdown();
        }
    }

    // --- Event handlers ---

    /** Handle input changes */
    $on.onInput = (/** @type {Event} */ e) => {
        const target = /** @type {HTMLInputElement} */ (e.target);
        $state.query = target.value;
        if ($state.open) {
            filterOptions();
        }
    };

    /** Handle keydown on the input */
    $on.onKeyDown = (/** @type {KeyboardEvent} */ e) => {
        if (e.key === "Escape") {
            e.preventDefault();
            closeDropdown();
            input?.blur();
        }
    };

    /** Handle option click */
    $on.selectOption = (/** @type {Event} */ e) => {
        const target = /** @type {HTMLElement} */ (e.currentTarget);
        selectValue(target);
    };

    /**
     * Select a value and close.
     * @param {HTMLElement} target
     */
    function selectValue(target) {
        const value = target.getAttribute("data-value") || target.textContent || "";
        if (input) {
            input.value = value;
            $state.query = value;
        }
        suppressReopen = true;
        closeDropdown();
        input?.blur();
        setTimeout(() => { suppressReopen = false; }, 200);
    }

    // --- Keyboard and focus handling ---

    let suppressReopen = false;

    function onFocus() {
        if (!suppressReopen) {
            openDropdown();
        }
    }

    function onClick() {
        if (!$state.open && !suppressReopen) {
            openDropdown();
        }
    }

    /** @param {KeyboardEvent} e */
    function onGlobalKeydown(e) {
        if (e.key === "Escape" && $state.open) {
            e.preventDefault();
            closeDropdown();
            input?.blur();
            return;
        }

        if (!$state.open) {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                // Only intercept if the event target is within our element
                if ($element.contains(/** @type {Node} */ (e.target))) {
                    e.preventDefault();
                    openDropdown();
                }
            }
            return;
        }

        switch (e.key) {
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
                selectHighlighted();
                break;
        }
    }

    function onClickOutside(/** @type {MouseEvent} */ e) {
        if ($state.open && !$element.contains(/** @type {Node} */ (e.target))) {
            closeDropdown();
        }
    }

    /** Handle click on option elements (native, not via $onclick). */
    function onOptionClick(e) {
        e.preventDefault();
        e.stopPropagation();
        const target = /** @type {HTMLElement} */ (e.currentTarget);
        if (target.getAttribute("role") === "option") {
            selectValue(target);
        }
    }

    // Attach listeners
    input?.addEventListener("focus", onFocus);
    input?.addEventListener("click", onClick);
    options.forEach((opt) => opt.addEventListener("click", onOptionClick));
    document.addEventListener("keydown", onGlobalKeydown);
    document.addEventListener("click", onClickOutside);

    return {
        disconnected: () => {
            input?.removeEventListener("focus", onFocus);
            input?.removeEventListener("click", onClick);
            options.forEach((opt) => opt.removeEventListener("click", onOptionClick));
            document.removeEventListener("keydown", onGlobalKeydown);
            document.removeEventListener("click", onClickOutside);
        },
    };
});
