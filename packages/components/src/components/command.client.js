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

import { define } from "sxo/client";

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

    function setActiveDescendant(item) {
        if (item?.id) input.setAttribute("aria-activedescendant", item.id);
        else input.removeAttribute("aria-activedescendant");
    }

    function setActive(index) {
        const previous = items[$state.activeIndex];
        if (previous) previous.classList.remove("active");
        $state.activeIndex = index;

        const next = index > -1 ? items[index] : null;
        if (next) next.classList.add("active");
        setActiveDescendant(next);
    }

    function getItemFilterText(item) {
        return (item.dataset.filter || item.textContent || "").trim().toLowerCase();
    }

    function getItemKeywords(item) {
        return (item.dataset.keywords || "")
            .toLowerCase()
            .split(/[\s,]+/)
            .filter(Boolean);
    }

    function itemMatchesQuery(item, query) {
        return getItemFilterText(item).includes(query) || getItemKeywords(item).some((keyword) => keyword.includes(query));
    }

    function updateItemVisibility(item, query) {
        if (item.hasAttribute("data-force")) {
            item.setAttribute("aria-hidden", "false");
            return items.includes(item);
        }

        const matches = !query || itemMatchesQuery(item, query);
        item.setAttribute("aria-hidden", String(!matches));
        return matches && items.includes(item);
    }

    function filterItems() {
        const query = input.value.trim().toLowerCase();
        visibleItems = allItems.filter((item) => updateItemVisibility(item, query));
        setActive(visibleItems.length > 0 ? items.indexOf(visibleItems[0]) : -1);
    }

    function getScrollDelta(itemRect, menuRect) {
        if (itemRect.top < menuRect.top) return menuRect.top - itemRect.top;
        if (itemRect.bottom > menuRect.bottom) return menuRect.bottom - itemRect.bottom;
        return 0;
    }

    function scrollIntoView(el) {
        if (!menu || !el) return;
        const itemRect = el.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();
        const delta = getScrollDelta(itemRect, menuRect);
        if (delta !== 0) menu.scrollTop -= delta;
    }

    function selectActiveItem() {
        if ($state.activeIndex > -1 && items[$state.activeIndex]) items[$state.activeIndex].click();
    }

    function getNextVisibleIndex(key, currentIndex) {
        const lastIndex = visibleItems.length - 1;
        return {
            ArrowDown: () => Math.min(currentIndex + 1, lastIndex),
            ArrowUp: () => Math.max(currentIndex - 1, 0),
            Home: () => 0,
            End: () => lastIndex,
        }[key]();
    }

    function moveActiveItem(key) {
        if (visibleItems.length === 0) return;

        const currentIndex = $state.activeIndex > -1 ? visibleItems.indexOf(items[$state.activeIndex]) : -1;
        const nextIndex = getNextVisibleIndex(key, currentIndex);
        if (nextIndex === currentIndex) return;

        const item = visibleItems[nextIndex];
        setActive(items.indexOf(item));
        scrollIntoView(item);
    }

    const keyActions = new Map([
        ["ArrowDown", () => moveActiveItem("ArrowDown")],
        ["ArrowUp", () => moveActiveItem("ArrowUp")],
        ["Enter", selectActiveItem],
        ["Home", () => moveActiveItem("Home")],
        ["End", () => moveActiveItem("End")],
    ]);

    function onKeydown(e) {
        const action = keyActions.get(e.key);
        if (!action) return;
        // Don't intercept while a <button> is focused (e.g. the dialog trigger)
        if (e.target.closest?.("button")) return;

        e.preventDefault();
        action();
    }

    function initializeRoot() {
        root = $element.querySelector(".command");
        if (!root) root = $element;
        if (root.dataset.commandInitialized) return false;

        return findCommandElements();
    }

    function findCommandElements() {
        input = root.querySelector("header input, input[role='combobox']");
        menu = root.querySelector('[role="menu"]');
        if (!input || !menu) {
            console.error("Command component initialization failed. Missing input or menu in", root);
            return false;
        }
        return true;
    }

    function updateItems() {
        const data = getAllItems(menu);
        allItems = data.allItems;
        items = data.items;
    }

    function onMenuMousemove(e) {
        const item = e.target.closest('[role="menuitem"]');
        if (!item || !visibleItems.includes(item)) return;

        const index = items.indexOf(item);
        if (index !== $state.activeIndex) setActive(index);
    }

    function onMenuClick(e) {
        const item = e.target.closest('[role="menuitem"]');
        if (!item) return;
        if (!visibleItems.includes(item)) return;

        closeCommandDialog(item);
    }

    function closeCommandDialog(item) {
        const dialog = root.closest("dialog.command-dialog");
        if (!dialog || item.hasAttribute("data-keep-command-open")) return;
        dialog.close();
    }

    function observeDialogOpen() {
        const dialog = root.closest("dialog.command-dialog");
        if (!dialog) return;

        observer = new MutationObserver(() => {
            if (dialog.hasAttribute("open")) input.focus();
        });
        observer.observe(dialog, { attributes: true, attributeFilter: ["open"] });
        if (dialog.hasAttribute("open")) input.focus();
    }

    function connected() {
        if (!initializeRoot()) return;

        updateItems();
        const onInput = () => filterItems();
        input.addEventListener("input", onInput);
        $element.addEventListener("keydown", onKeydown);
        menu.addEventListener("mousemove", onMenuMousemove);
        menu.addEventListener("click", onMenuClick);
        observeDialogOpen();

        cleanup = () => {
            input.removeEventListener("input", onInput);
            $element.removeEventListener("keydown", onKeydown);
            if (observer) observer.disconnect();
            delete $element.refresh;
        };

        $element.refresh = () => {
            if (!input || !menu) return;
            updateItems();
            filterItems();
        };

        filterItems();
        root.dataset.commandInitialized = "true";
        $element.dispatchEvent(new CustomEvent("command:initialized", { bubbles: true }));
    }

    return {
        connected,

        disconnected() {
            if (cleanup) cleanup();
            cleanup = null;
            if (root) delete root.dataset.commandInitialized;
        },
    };
});
