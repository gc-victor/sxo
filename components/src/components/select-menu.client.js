/**
 * @fileoverview <el-select-menu> custom element providing accessible select/listbox functionality.
 *
 * This component manages:
 * - Selected value and label display
 * - Popover open/close with keyboard navigation
 * - Arrow key navigation through options
 * - Optional search/filter functionality
 * - Click outside to close
 * - Emits change event on selection
 *
 * HTML structure:
 * <el-select-menu>
 *   <div class="select">
 *     <button type="button" class="select-trigger" $onclick="toggleSelect">
 *       <span class="select-label">Selected label</span>
 *     </button>
 *     <div class="select-popover" data-popover aria-hidden="true">
 *       <header>
 *         <input type="text" placeholder="Search..." />
 *       </header>
 *       <div role="listbox">
 *         <div role="option" data-value="1" data-label="Option 1">Option 1</div>
 *         <div role="option" data-value="2" data-label="Option 2">Option 2</div>
 *       </div>
 *     </div>
 *     <input type="hidden" name="field" value="" />
 *   </div>
 * </el-select-menu>
 *
 * @license MIT
 * @since 1.0.0
 */
import { define } from "@qery/reactive-component";

define("el-select-menu", function SelectMenu({ $element, $state, $on, $effect }) {
    /**
     * Query the trigger button
     * @returns {HTMLButtonElement|null}
     */
    const queryTrigger = () => /** @type {HTMLButtonElement|null} */ ($element.querySelector('button[aria-haspopup="listbox"]'));

    /**
     * Query the selected label span
     * @returns {HTMLElement|null}
     */
    const queryLabel = () => /** @type {HTMLElement|null} */ ($element.querySelector(".select-label"));

    /**
     * Query the popover content
     * @returns {HTMLElement|null}
     */
    const queryPopover = () => /** @type {HTMLElement|null} */ ($element.querySelector("[data-popover]"));

    /**
     * Query the listbox container
     * @returns {HTMLElement|null}
     */
    const queryListbox = () => /** @type {HTMLElement|null} */ ($element.querySelector('[role="listbox"]'));

    /**
     * Query the hidden input
     * @returns {HTMLInputElement|null}
     */
    const queryInput = () => /** @type {HTMLInputElement|null} */ ($element.querySelector('input[type="hidden"]'));

    /**
     * Query the filter input (if present)
     * @returns {HTMLInputElement|null}
     */
    const queryFilter = () => /** @type {HTMLInputElement|null} */ ($element.querySelector('header input[type="text"]'));

    /**
     * Query all option elements
     * @returns {HTMLElement[]}
     */
    const queryOptions = () => Array.from($element.querySelectorAll('[role="option"]'));

    /**
     * Query visible (non-hidden) options
     * @returns {HTMLElement[]}
     */
    const queryVisibleOptions = () => queryOptions().filter((opt) => opt.getAttribute("aria-hidden") !== "true");

    // Initialize state
    $state.isOpen = false;
    $state.activeIndex = -1;
    $state.selectedValue = queryInput()?.value || "";

    // Set initial label from first option or selected value
    const initialOption = queryOptions().find((opt) => opt.dataset.value === $state.selectedValue) || queryOptions()[0];
    if (initialOption) {
        const label = queryLabel();
        if (label) {
            label.innerHTML = initialOption.dataset.label || initialOption.innerHTML;
        }
    }

    // Effect: sync ARIA attributes, active/selected states, and focus when state changes
    $effect(() => {
        const trigger = queryTrigger();
        const popover = queryPopover();
        const filter = queryFilter();
        const options = queryOptions();

        if (!trigger || !popover) return;

        const open = /** @type {boolean} */ ($state.isOpen);
        trigger.setAttribute("aria-expanded", String(open));
        popover.setAttribute("aria-hidden", String(!open));

        // Update all option states
        const visibleOptions = queryVisibleOptions();
        options.forEach((opt) => {
            // Update selected state
            const isSelected = opt.dataset.value === $state.selectedValue;
            opt.setAttribute("aria-selected", isSelected ? "true" : "false");

            // Update active state (only for visible options)
            const visibleIdx = visibleOptions.indexOf(opt);
            const isActive = visibleIdx === $state.activeIndex && visibleIdx !== -1;
            opt.classList.toggle("active", isActive);
        });

        if (open && filter) {
            requestAnimationFrame(() => {
                filter.focus();
            });
        }

        // Scroll active option into view
        if (open && $state.activeIndex !== -1) {
            const activeOption = visibleOptions[$state.activeIndex];
            if (activeOption) {
                activeOption.scrollIntoView({ block: "nearest", behavior: "smooth" });
            }
        }
    });

    /**
     * Close popover and reset filter
     * @param {boolean} focusOnTrigger
     */
    const closePopover = (focusOnTrigger = true) => {
        if (!$state.isOpen) return;

        const filter = queryFilter();
        if (filter) {
            filter.value = "";
            // Reset all options visibility
            queryOptions().forEach((opt) => {
                opt.setAttribute("aria-hidden", "false");
            });
        }

        $state.isOpen = false;
        $state.activeIndex = -1;

        if (focusOnTrigger) {
            requestAnimationFrame(() => {
                queryTrigger()?.focus();
            });
        }
    };

    /**
     * Open popover and set active to selected option
     */
    const openPopover = () => {
        document.dispatchEvent(
            new CustomEvent("el-select-menu:popover", {
                detail: { source: $element },
            }),
        );

        $state.isOpen = true;

        // Set active index to currently selected option
        const options = queryVisibleOptions();
        const selectedIdx = options.findIndex((opt) => opt.dataset.value === $state.selectedValue);
        $state.activeIndex = selectedIdx !== -1 ? selectedIdx : 0;
    };

    /**
     * Update selected value and label
     * @param {HTMLElement} option
     */
    const selectOption = (option) => {
        const oldValue = $state.selectedValue;
        const newValue = option.dataset.value || "";

        if (newValue !== oldValue) {
            $state.selectedValue = newValue;

            const label = queryLabel();
            const input = queryInput();

            if (label) {
                label.innerHTML = option.dataset.label || option.innerHTML;
            }
            if (input) {
                input.value = newValue;
            }

            // Emit change event
            const event = new CustomEvent("change", {
                detail: { value: newValue },
                bubbles: true,
            });
            $element.dispatchEvent(event);
        }

        closePopover();
    };

    /**
     * Toggle popover open/close
     * Designed for inline usage: $onclick="toggleSelect"
     */
    $on.toggleSelect = () => {
        if ($state.isOpen) {
            closePopover();
        } else {
            openPopover();
        }
    };

    /**
     * Handle filter input
     */
    const onFilterInput = () => {
        const filter = queryFilter();
        if (!filter) return;

        const searchTerm = filter.value.trim().toLowerCase();
        $state.activeIndex = -1;

        queryOptions().forEach((opt) => {
            const optionText = (opt.dataset.label || opt.textContent || "").trim().toLowerCase();
            const matches = optionText.includes(searchTerm);
            opt.setAttribute("aria-hidden", String(!matches));
        });
    };

    /**
     * Handle keyboard navigation
     * @param {KeyboardEvent} e
     */
    const onKeyDown = (e) => {
        const open = /** @type {boolean} */ ($state.isOpen);

        if (!["ArrowDown", "ArrowUp", "Enter", "Home", "End", "Escape"].includes(e.key)) {
            return;
        }

        if (!open) {
            if (e.key !== "Enter" && e.key !== "Escape") {
                e.preventDefault();
                openPopover();
            }
            return;
        }

        e.preventDefault();

        if (e.key === "Escape") {
            closePopover();
            return;
        }

        const visibleOptions = queryVisibleOptions();
        if (visibleOptions.length === 0) return;

        if (e.key === "Enter") {
            const activeOption = visibleOptions[$state.activeIndex];
            if (activeOption) {
                selectOption(activeOption);
            }
            return;
        }

        let nextIndex = $state.activeIndex;

        switch (e.key) {
            case "ArrowDown":
                nextIndex = $state.activeIndex < visibleOptions.length - 1 ? $state.activeIndex + 1 : $state.activeIndex;
                break;
            case "ArrowUp":
                nextIndex = $state.activeIndex > 0 ? $state.activeIndex - 1 : 0;
                break;
            case "Home":
                nextIndex = 0;
                break;
            case "End":
                nextIndex = visibleOptions.length - 1;
                break;
        }

        $state.activeIndex = nextIndex;
    };

    /**
     * Handle option click
     * @param {MouseEvent} e
     */
    const onOptionClick = (e) => {
        const target = /** @type {HTMLElement} */ (e.target);
        const option = /** @type {HTMLElement|null} */ (target.closest('[role="option"]'));
        if (option) {
            selectOption(option);
        }
    };

    /**
     * Handle option mousemove
     * @param {MouseEvent} e
     */
    const onOptionMouseMove = (e) => {
        const target = /** @type {HTMLElement} */ (e.target);
        const option = /** @type {HTMLElement|null} */ (target.closest('[role="option"]'));
        if (option) {
            const visibleOptions = queryVisibleOptions();
            const index = visibleOptions.indexOf(option);
            if (index !== -1 && index !== $state.activeIndex) {
                $state.activeIndex = index;
            }
        }
    };

    /**
     * Handle click outside to close
     * @param {MouseEvent} e
     */
    const onClickOutside = (e) => {
        if (!$state.isOpen) return;
        const target = /** @type {Node} */ (e.target);
        if (!$element.contains(target)) {
            closePopover(false);
        }
    };

    /**
     * Handle custom event from other popovers
     * @param {CustomEvent} e
     */
    const onPopoverEvent = (e) => {
        if (e.detail?.source !== $element) {
            closePopover(false);
        }
    };

    // Attach event listeners
    const trigger = queryTrigger();
    const listbox = queryListbox();
    const filter = queryFilter();

    return {
        connected: () => {
            if (trigger) {
                trigger.addEventListener("keydown", onKeyDown);
            }
            if (filter) {
                filter.addEventListener("input", onFilterInput);
                filter.addEventListener("keydown", onKeyDown);
            }
            if (listbox) {
                listbox.addEventListener("click", onOptionClick);
                listbox.addEventListener("mousemove", onOptionMouseMove);
            }
            document.addEventListener("click", onClickOutside);
            document.addEventListener("el-select-menu:popover", onPopoverEvent);
        },
        disconnected: () => {
            if (trigger) {
                trigger.removeEventListener("keydown", onKeyDown);
            }
            if (filter) {
                filter.removeEventListener("input", onFilterInput);
                filter.removeEventListener("keydown", onKeyDown);
            }
            if (listbox) {
                listbox.removeEventListener("click", onOptionClick);
                listbox.removeEventListener("mousemove", onOptionMouseMove);
            }
            document.removeEventListener("click", onClickOutside);
            document.removeEventListener("el-select-menu:popover", onPopoverEvent);
        },
    };
});
