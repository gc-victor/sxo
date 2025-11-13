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
        let el = event.target instanceof Element ? event.target : null;

        while (el && el !== document.body) {
            const tag = el.tagName?.toLowerCase();
            if (tag && componentMap[tag] && !loadedTags.has(tag)) {
                loadedTags.add(tag);
                componentMap[tag]().catch((err) => {
                    console.warn(`Failed to load component <${tag}>:`, err);
                    loadedTags.delete(tag);
                });
            }
            el = el.parentElement;
        }
    };

    document.addEventListener("pointerover", handle, { capture: true, passive: true });
    document.addEventListener("focusin", handle, { capture: true });
    document.addEventListener("touchstart", handle, { capture: true, passive: true });
}
