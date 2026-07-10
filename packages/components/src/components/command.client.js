/**
 * @fileoverview <el-command> custom element — basecoat-aligned command palette.
 *
 * Keyboard-driven searchable menu with:
 * - Item filtering via input (matches data-filter / data-keywords / textContent)
 * - Arrow key, Home/End navigation, Enter to select
 * - Click / mousemove delegation on the menu
 * - Dialog close on item click (unless data-keep-command-open)
 * - Exposes $element.refresh for dynamic content updates
 * - Integrated with SXO reactive component system via $state
 *
 * @license MIT
 */

import { define } from "@sxo/client";

define("el-command", function Command({ $element, $state }) {
    $state.activeIndex = -1;

    let input = null;
    let menu = null;
    let root = null;
    let allItems = [];
    let items = []; // non-disabled items
    let visibleItems = []; // items matching the current filter
    let observer = null;
    let cleanup = null;

    function isDisabled(el) {
        return el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true" || el.getAttribute("data-disabled") === "true";
    }

    function getAllItems(menuEl) {
        const found = Array.from(menuEl.querySelectorAll('[role="menuitem"]'));
        return { allItems: found, items: found.filter((el) => !isDisabled(el)) };
    }

    function setActive(index) {
        const prev = $state.activeIndex;
        if (prev > -1 && items[prev]) items[prev].classList.remove("active");
        $state.activeIndex = index;
        if (index > -1 && items[index]) {
            const el = items[index];
            el.classList.add("active");
            if (el.id) input.setAttribute("aria-activedescendant", el.id);
            else input.removeAttribute("aria-activedescendant");
        } else {
            input.removeAttribute("aria-activedescendant");
        }
    }

    function filterItems() {
        const q = input.value.trim().toLowerCase();
        visibleItems = [];

        allItems.forEach((el) => {
            if (el.hasAttribute("data-force")) {
                el.setAttribute("aria-hidden", "false");
                if (items.includes(el)) visibleItems.push(el);
                return;
            }

            const text = (el.dataset.filter || el.textContent || "").trim().toLowerCase();
            const keywords = (el.dataset.keywords || "")
                .toLowerCase()
                .split(/[\s,]+/)
                .filter(Boolean);
            const matches = !q || text.includes(q) || keywords.some((k) => k.includes(q));
            el.setAttribute("aria-hidden", matches ? "false" : "true");
            if (matches && items.includes(el)) visibleItems.push(el);
        });

        if (visibleItems.length > 0) {
            setActive(items.indexOf(visibleItems[0]));
        } else {
            setActive(-1);
        }
    }

    function scrollIntoView(el) {
        if (!menu || !el) return;
        const er = el.getBoundingClientRect();
        const mr = menu.getBoundingClientRect();
        if (er.top < mr.top) menu.scrollTop -= mr.top - er.top;
        else if (er.bottom > mr.bottom) menu.scrollTop += er.bottom - mr.bottom;
    }

    function onKeydown(e) {
        if (!["ArrowDown", "ArrowUp", "Enter", "Home", "End"].includes(e.key)) return;
        // Don't intercept while a <button> is focused (e.g. the dialog trigger)
        if (e.target.closest?.("button")) return;

        e.preventDefault();

        if (e.key === "Enter") {
            if ($state.activeIndex > -1 && items[$state.activeIndex]) {
                items[$state.activeIndex].click();
            }
            return;
        }

        if (visibleItems.length === 0) return;

        const curVis = $state.activeIndex > -1 ? visibleItems.indexOf(items[$state.activeIndex]) : -1;
        let next = curVis;

        if (e.key === "ArrowDown" && curVis < visibleItems.length - 1) next = curVis + 1;
        if (e.key === "ArrowUp") next = curVis > 0 ? curVis - 1 : 0;
        if (e.key === "Home") next = 0;
        if (e.key === "End") next = visibleItems.length - 1;

        if (next !== curVis) {
            const el = visibleItems[next];
            setActive(items.indexOf(el));
            scrollIntoView(el);
        }
    }

    return {
        connected() {
            root = $element.querySelector(".command") || $element;
            if (root.dataset.commandInitialized) return;

            input = root.querySelector("header input, input[role='combobox']");
            menu = root.querySelector('[role="menu"]');
            if (!input || !menu) {
                console.error("Command component initialization failed. Missing input or menu in", root);
                return;
            }

            const data = getAllItems(menu);
            allItems = data.allItems;
            items = data.items;

            // Filter when the user types
            const onInput = () => filterItems();
            input.addEventListener("input", onInput);

            // Listen for keyboard on the host so arrow keys work even when the
            // native <dialog> (rather than the <input>) holds focus.
            $element.addEventListener("keydown", onKeydown);

            // Mousemove tracking
            menu.addEventListener("mousemove", (e) => {
                const item = e.target.closest('[role="menuitem"]');
                if (item && visibleItems.includes(item)) {
                    const idx = items.indexOf(item);
                    if (idx !== $state.activeIndex) setActive(idx);
                }
            });

            // Click handler (dialog close)
            menu.addEventListener("click", (e) => {
                const item = e.target.closest('[role="menuitem"]');
                if (item && visibleItems.includes(item)) {
                    const dlg = root.closest("dialog.command-dialog");
                    if (dlg && !item.hasAttribute("data-keep-command-open")) dlg.close();
                }
            });

            // Auto-focus the <input> when a containing dialog opens.
            const dlg = root.closest("dialog.command-dialog");
            if (dlg) {
                observer = new MutationObserver(() => {
                    if (dlg.hasAttribute("open")) input.focus();
                });
                observer.observe(dlg, { attributes: true, attributeFilter: ["open"] });
                if (dlg.hasAttribute("open")) input.focus();
            }

            cleanup = () => {
                input.removeEventListener("input", onInput);
                $element.removeEventListener("keydown", onKeydown);
                if (observer) observer.disconnect();
                delete $element.refresh;
            };

            // Expose refresh()
            $element.refresh = () => {
                if (!input || !menu) return;
                const data = getAllItems(menu);
                allItems = data.allItems;
                items = data.items;
                filterItems();
            };

            filterItems();
            root.dataset.commandInitialized = "true";
            $element.dispatchEvent(new CustomEvent("command:initialized", { bubbles: true }));
        },

        disconnected() {
            if (cleanup) cleanup();
            cleanup = null;
            if (root) delete root.dataset.commandInitialized;
        },
    };
});
