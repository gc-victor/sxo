/**
 * @fileoverview <el-dropdown-menu> enhancement component for native <details>/<summary>.
 *
 * This component enhances the native browser details/summary toggle with:
 * - Keyboard navigation (ArrowUp, ArrowDown, Home, End) within menu items
 * - Escape key to close the menu
 * - Click outside to close the menu
 * - Auto-focus first menu item when opening
 * - Focus return to trigger when closing
 *
 * The native <details> element handles the basic open/close toggle—no custom state needed.
 *
 * HTML structure:
 * <el-dropdown-menu>
 *   <details class="dropdown-menu-root">
 *     <summary class="dropdown-menu-trigger">...</summary>
 *     <div class="dropdown-menu-content" role="menu">
 *       <button type="button" role="menuitem">Item 1</button>
 *       <button type="button" role="menuitem">Item 2</button>
 *     </div>
 *   </details>
 * </el-dropdown-menu>
 *
 * @license MIT
 * @since 1.0.0
 */
import { define } from "@qery/reactive-component";

define("el-dropdown-menu", function DropdownMenu({ $element, $on, $effect }) {
    /**
     * Helper to query the inner <details> element.
     * @returns {HTMLDetailsElement|null}
     */
    const queryDetails = () => /** @type {HTMLDetailsElement|null} */ ($element.querySelector("details"));

    /**
     * Helper to query all menu item elements (role="menuitem").
     * @returns {HTMLElement[]}
     */
    const queryMenuItems = () => Array.from($element.querySelectorAll('[role="menuitem"]'));

    /**
     * Helper to query the summary element.
     * @returns {HTMLElement|null}
     */
    const querySummary = () => /** @type {HTMLElement|null} */ ($element.querySelector("summary"));

    /**
     * Check if the menu is currently open.
     * @returns {boolean}
     */
    const isOpen = () => queryDetails()?.hasAttribute("open") ?? false;

    /**
     * Close the menu and return focus to the trigger.
     */
    const closeMenu = () => {
        const details = queryDetails();
        if (details) {
            details.removeAttribute("open");
        }
        requestAnimationFrame(() => {
            querySummary()?.focus();
        });
    };

    /**
     * Focus the first menu item when the menu opens.
     * Observe the details element for attribute changes (open/close).
     */
    $effect(() => {
        const details = queryDetails();
        if (!details) return;

        const observer = new MutationObserver(() => {
            if (details.hasAttribute("open") && isOpen()) {
                requestAnimationFrame(() => {
                    const items = queryMenuItems();
                    items[0]?.focus();
                });
            }
        });

        observer.observe(details, { attributes: true, attributeFilter: ["open"] });

        return () => observer.disconnect();
    });

    /**
     * Handle menu item click to close the menu.
     * Designed for inline usage: $onclick="itemClick" on menu items.
     * @param {MouseEvent} e
     */
    $on.itemClick = (e) => {
        const target = /** @type {HTMLElement} */ (e.target);
        const menuItem = /** @type {HTMLElement|null} */ (target?.closest('[role="menuitem"]'));

        // Don't close if item is disabled
        if (menuItem?.getAttribute("aria-disabled") === "true") {
            e.preventDefault();
            return;
        }

        // Close menu and return focus to trigger
        closeMenu();
    };

    /**
     * Handle keyboard navigation within the menu.
     * Arrow keys move focus; Home/End jump to edges; Escape closes.
     * @param {KeyboardEvent} e
     */
    const onKeyDown = (e) => {
        // Only handle events when menu is open
        if (!isOpen()) return;

        const items = queryMenuItems();
        if (!items.length) return;

        const activeEl = document.activeElement;
        const currentIndex = activeEl instanceof HTMLElement && items.includes(activeEl) ? items.indexOf(activeEl) : -1;

        /** @type {Record<string, () => void>} */
        const keyActions = {
            ArrowDown: () => {
                e.preventDefault();
                const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % items.length;
                items[nextIndex]?.focus();
            },
            ArrowUp: () => {
                e.preventDefault();
                const prevIndex = currentIndex === -1 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length;
                items[prevIndex]?.focus();
            },
            Home: () => {
                e.preventDefault();
                items[0]?.focus();
            },
            End: () => {
                e.preventDefault();
                items[items.length - 1]?.focus();
            },
            Escape: () => {
                e.preventDefault();
                closeMenu();
            },
        };

        const action = keyActions[e.key];
        if (action) {
            action();
        }
    };

    /**
     * Handle click outside to close the menu.
     * @param {MouseEvent} e
     */
    const onClickOutside = (e) => {
        if (!isOpen()) return;

        const target = /** @type {Node} */ (e.target);
        if (!$element.contains(target)) {
            closeMenu();
        }
    };

    // Attach event listeners
    $element.addEventListener("keydown", onKeyDown);
    document.addEventListener("click", onClickOutside);

    return {
        disconnected: () => {
            $element.removeEventListener("keydown", onKeyDown);
            document.removeEventListener("click", onClickOutside);
        },
    };
});
