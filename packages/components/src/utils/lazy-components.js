/**
 * @fileoverview Lazy component loading system with user intent detection.
 * Supports pointerover, focusin, touchstart events.
 *
 * Design inspired by is-land (11ty) with simplified implementation focused on
 * performance and maintainability.
 *
 * @example
 * ```javascript
 * lazyComponents({
 *   "el-dialog": () => import("@components/dialog.client.js"),
 *   "el-modal": () => import("@components/modal.client.js"),
 * });
 * ```
 */

/** @typedef {() => Promise<any>} LazyImporter */
/** @typedef {Record<string, LazyImporter>} LazyComponentMap */

const loadedTags = new Set();

function loadComponentForElement(element, componentMap) {
    const tag = element.tagName.toLowerCase();
    const importer = componentMap[tag];
    if (!importer || loadedTags.has(tag)) return;

    loadedTags.add(tag);
    importer().catch((err) => {
        console.warn(`Failed to load component <${tag}>:`, err);
        loadedTags.delete(tag);
    });
}

/**
 * Initialize lazy loading with user intent detection.
 * Attaches listeners to pointerover, focusin, and touchstart events.
 *
 * @param {LazyComponentMap} componentMap
 * @returns {void}
 */
export function lazyComponents(componentMap) {
    /**
     * Handle user intent and load matching ancestor components.
     *
     * @param {Event} event
     */
    const handle = (event) => {
        let element = event.target;
        if (!(element instanceof Element)) return;

        while (element && element !== document.body) {
            loadComponentForElement(element, componentMap);
            element = element.parentElement;
        }
    };

    document.addEventListener("pointerover", handle, { capture: true, passive: true });
    document.addEventListener("focusin", handle, { capture: true });
    document.addEventListener("touchstart", handle, { capture: true, passive: true });
}
