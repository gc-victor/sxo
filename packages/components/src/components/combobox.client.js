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

    function updateOptionVisibility(option, query) {
        const text = (option.getAttribute("data-value") || option.textContent || "").toLowerCase();
        const matches = !query || text.includes(query);
        option.hidden = !matches;
        return matches;
    }

    /**
     * Filter options based on input value.
     */
    function filterOptions() {
        const query = ($state.query || "").toLowerCase().trim();
        const visibleCount = Array.from(options).filter((option) => updateOptionVisibility(option, query)).length;

        if (emptyMsg) emptyMsg.hidden = visibleCount > 0;

        // Reset highlight to first visible
        const visible = visibleOptions();
        $state.activeIndex = visible.length > 0 ? 0 : -1;
        highlightOption(visible[$state.activeIndex]);
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

    function findHighlightedOption(visible) {
        return visible.find((option) => option.classList.contains("active")) || visible[$state.activeIndex] || visible[0];
    }

    function getOptionValue(option) {
        return option.getAttribute("data-value") || option.textContent || "";
    }

    function writeOptionValue(option) {
        const value = getOptionValue(option);
        if (!input) return;
        input.value = value;
        $state.query = value;
    }

    /**
     * Select the currently highlighted option.
     */
    function selectHighlighted() {
        const target = findHighlightedOption(visibleOptions());
        if (!target) return;
        writeOptionValue(target);
        closeDropdown();
    }

    // --- Event handlers ---

    /** Handle input changes */
    $on.onInput = (/** @type {Event} */ e) => {
        const target = /** @type {HTMLInputElement} */ (e.target);
        $state.query = target.value;
        if (!$state.open) {
            openDropdown();
        } else {
            filterOptions();
        }
    };

    /**
     * Select a value and close.
     * @param {HTMLElement} target
     */
    function selectValue(target) {
        writeOptionValue(target);
        closeDropdown();
        input?.blur();
    }

    // --- Keyboard and focus handling ---

    function onFocus() {
        openDropdown();
    }

    function onClick() {
        if (!$state.open) {
            openDropdown();
        }
    }

    function closeOnEscape(e) {
        if (e.key !== "Escape" || !$state.open) return false;
        e.preventDefault();
        closeDropdown();
        input?.blur();
        return true;
    }

    function openOnArrowKey(e) {
        if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
        e.preventDefault();
        openDropdown();
    }

    const openKeyActions = new Map([
        ["ArrowDown", () => navigate(1)],
        ["ArrowUp", () => navigate(-1)],
        ["Enter", selectHighlighted],
    ]);

    function handleOpenKeydown(e) {
        const action = openKeyActions.get(e.key);
        if (!action) return;
        e.preventDefault();
        action();
    }

    /** @param {KeyboardEvent} e */
    function onGlobalKeydown(e) {
        if (closeOnEscape(e)) return;
        // Only intercept if the event target is within our element
        if (!$element.contains(/** @type {Node} */ (e.target))) return;
        if (!$state.open) {
            openOnArrowKey(e);
            return;
        }
        handleOpenKeydown(e);
    }

    function onClickOutside(/** @type {MouseEvent} */ e) {
        if ($state.open && !$element.contains(/** @type {Node} */ (e.target))) {
            closeDropdown();
        }
    }

    /** Handle click on option elements. */
    function onOptionClick(e) {
        e.preventDefault();
        e.stopPropagation();
        const target = /** @type {HTMLElement} */ (e.currentTarget);
        selectValue(target);
    }

    // Attach listeners
    input?.addEventListener("focus", onFocus);
    input?.addEventListener("click", onClick);
    options.forEach((opt) => {
        opt.addEventListener("click", onOptionClick);
    });
    document.addEventListener("keydown", onGlobalKeydown);
    document.addEventListener("click", onClickOutside);

    return {
        disconnected: () => {
            input?.removeEventListener("focus", onFocus);
            input?.removeEventListener("click", onClick);
            options.forEach((opt) => {
                opt.removeEventListener("click", onOptionClick);
            });
            document.removeEventListener("keydown", onGlobalKeydown);
            document.removeEventListener("click", onClickOutside);
        },
    };
});
