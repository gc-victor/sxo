/**
 * @fileoverview <el-tabs> custom element providing accessible tab switching.
 *
 * Responsibilities:
 * - Manage active tab state through an internal reactive state key: "active"
 * - Keep ARIA attributes on triggers (`role="tab"`) and panels (`role="tabpanel"`) in sync
 * - Provide keyboard navigation (ArrowLeft, ArrowRight, Home, End)
 * - Auto-focus newly selected tab trigger
 *
 * HTML from JSX renders as:
 * <el-tabs>
 *   <div class="tabs">
 *     <div role="tablist" class="tabs-list">
 *       <button
 *         class="tabs-trigger"
 *         type="button"
 *         role="tab"
 *         data-name="profile"
 *         aria-selected="false"
 *         tabindex="-1"
 *         $onclick="tabChange"
 *       >Profile</button>
 *       <button
 *         class="tabs-trigger"
 *         type="button"
 *         role="tab"
 *         data-name="billing"
 *         aria-selected="true"
 *         tabindex="0"
 *         $onclick="tabChange"
 *       >Billing</button>
 *     </div>
 *     <div
 *       class="tabs-panel hidden"
 *       role="tabpanel"
 *       tabindex="-1"
 *       data-name="profile"
 *     >Profile content...</div>
 *     <div
 *       class="tabs-panel"
 *       role="tabpanel"
 *       tabindex="-1"
 *       data-name="billing"
 *       active=""
 *     >Billing content...</div>
 *   </div>
 * </el-tabs>
 *
 * Notes:
 * - The element expects triggers to invoke `tabChange` (e.g. via inline $onclick="tabChange")
 * - The `active` attribute (if present on a panel) seeds initial state; otherwise the first tab's `data-name` is used.
 * - Runtime updates aria-selected and tabindex based on active state.
 *
 * @since 1.0.0
 */
import { define } from "@qery/reactive-component";

/**
 * @typedef {string} TabName
 */

define("el-tabs", function Tabs({ $state, $on, $effect, $element }) {
    /**
     * Return all tab trigger elements (role="tab") within this tabs container.
     * @returns {HTMLElement[]}
     */
    const queryTriggers = () => Array.from($element.querySelectorAll('[role="tab"]'));

    /**
     * Return all tab panel elements (role="tabpanel") within this tabs container.
     * @returns {HTMLElement[]}
     */
    const queryPanels = () => Array.from($element.querySelectorAll('[role="tabpanel"]'));

    /**
     * Derive first tab name (used as default active).
     * @returns {TabName}
     */
    const firstTabName = () => queryTriggers()[0]?.dataset.name || "";

    /**
     * Get the active tab name from the panel with active attribute or server-rendered visibility.
     * @returns {TabName}
     */
    const getActiveName = () => {
        const panels = queryPanels();
        const activePanel = panels.find((p) => p.hasAttribute("active"));
        if (activePanel) return activePanel.dataset.name || "";
        // Fallback to server-rendered visibility when active attribute is not available (JSX transformer limitation)
        const visiblePanel = panels.find((p) => !p.classList.contains("hidden"));
        return visiblePanel?.dataset.name || "";
    };

    // Initialize state with active from panel or first tab
    $state.active = getActiveName() || firstTabName();

    // Reactive effect: synchronize ARIA + visibility + active attribute whenever active tab changes
    $effect(() => {
        const triggers = queryTriggers();
        const panels = queryPanels();

        /** @type {TabName} */
        const current = /** @type {TabName} */ ($state.active);

        // Clear active from all panels
        panels.forEach((p) => {
            p.removeAttribute("active");
        });
        // Set active on the current panel
        const activePanel = panels.find((p) => p.dataset.name === current);
        if (activePanel) activePanel.setAttribute("active", "");

        // Sync triggers
        triggers.forEach((el) => {
            const isSelected = !!current && el.dataset.name === current;
            el.setAttribute("aria-selected", isSelected ? "true" : "false");
            el.tabIndex = isSelected ? 0 : -1;
        });
        // Sync panels
        panels.forEach((panel) => {
            const isSelected = !!current && panel.dataset.name === current;
            panel.classList.toggle("hidden", !isSelected);
            panel.setAttribute("aria-hidden", isSelected ? "false" : "true");
        });
    });

    /**
     * Delegated click handler for tab trigger activation.
     * Designed for inline usage: $onclick="tabChange" on buttons.
     *
     * @param {MouseEvent} e
     * @returns {void}
     */
    $on.tabChange = (e) => {
        const target = /** @type {HTMLElement} */ (e.target);
        const btn = /** @type {HTMLElement} */ (target?.closest('[role="tab"][data-name]'));
        const val = btn?.dataset.name;
        if (val) {
            $state.active = val;
        }
    };

    /**
     * Handle keyboard navigation on tab triggers.
     * Arrow keys rotate focus & selection; Home/End jump to edges.
     * @param {KeyboardEvent} e
     * @returns {void}
     */
    const onKeyDown = (e) => {
        const triggers = queryTriggers();

        if (!triggers.length) return;
        const activeEl = document.activeElement;
        const currentIndex = activeEl instanceof HTMLElement && triggers.includes(activeEl) ? triggers.indexOf(activeEl) : -1;
        if (currentIndex === -1) return;
        /** @type {Record<string, number>} */
        const keyActions = {
            ArrowLeft: (currentIndex - 1 + triggers.length) % triggers.length,
            ArrowRight: (currentIndex + 1) % triggers.length,
            Home: 0,
            End: triggers.length - 1,
        };
        const key = e.key;
        if (key in keyActions) {
            e.preventDefault();
            const btn = triggers[keyActions[key]];
            $state.active = btn.dataset.name;
            btn.focus();
        }
    };

    $element.addEventListener("keydown", onKeyDown);

    return {
        disconnected: () => {
            $element.removeEventListener("keydown", onKeyDown);
        },
    };
});
