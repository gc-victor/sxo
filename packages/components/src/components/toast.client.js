/**
 * @fileoverview <el-toast> custom elements for dynamic toast notification system.
 *
 * This system provides:
 * - Template-based toasts triggered by custom events with data
 * - Support for success, error, info, warning categories
 * - Custom duration per toast
 * - Auto-dismiss timers
 * - Accessible ARIA roles (alert/status)
 *
 * HTML structure:
 * <el-toast data-category="success" data-duration="3000">
 *   <template>
 *     <div class="toast" data-category="success" $onclick="handleToastClick">
 *       <div class="toast-content">
 *         {children}
 *         <footer>
 *           <button type="button" class="btn" data-toast-action>Dismiss</button>
 *         </footer>
 *       </div>
 *     </div>
 *   </template>
 * </el-toast>
 *
 * Usage:
 * Dispatch custom events with data: document.dispatchEvent(new CustomEvent('el-toast:success', { detail: { title: 'Saved', description: 'Settings saved.' } }));
 *
 * @license MIT
 */
import { define } from "sxo/client";

function setToastText(clone, selector, text) {
    const element = clone.querySelector(selector);
    if (element && text) element.textContent = text;
}

function populateToastContent(clone, detail) {
    setToastText(clone, ".toast-title", detail?.title);
    setToastText(clone, ".toast-description", detail?.description);
}

function createToastElement(template, category, detail) {
    const clone = /** @type {DocumentFragment} */ (template.content.cloneNode(true));
    const toastDiv = clone.querySelector(".toast");
    if (!toastDiv) return null;

    const accessibility = category === "bottom-left" ? ["alert", "assertive"] : ["status", "polite"];
    toastDiv.setAttribute("role", accessibility[0]);
    toastDiv.setAttribute("aria-live", accessibility[1]);
    toastDiv.setAttribute("aria-atomic", "true");
    toastDiv.setAttribute("aria-hidden", "false");
    populateToastContent(clone, detail);
    return toastDiv;
}

function scheduleToastDismiss(toastDiv, duration) {
    if (duration === -1) return;
    setTimeout(() => {
        if (toastDiv.parentNode) toastDiv.remove();
    }, duration);
}

/**
 * el-toast: Template-based toast notification component
 */
define("el-toast", function Toast({ $element, $on }) {
    const duration = Number.parseInt($element.dataset.duration || "3000", 10);
    const category = $element.dataset.category;

    // Listen for custom event to show toast with data
    const eventName = `el-toast:${category}`;

    /**
     * @param {CustomEvent} event
     */
    const showToast = (event) => {
        const template = $element.querySelector("template");
        if (!template) return;

        const toastDiv = createToastElement(template, category, event.detail);
        if (!toastDiv) return;

        $element.appendChild(toastDiv);
        scheduleToastDismiss(toastDiv, duration);
    };
    document.addEventListener(eventName, showToast);

    /**
     * Handle click to close the specific toast
     * @param {Event} event
     */
    $on.handleToastClick = (event) => {
        if (!(event.target instanceof Element)) return;
        const toastDiv = event.target.closest(".toast");
        if (toastDiv) {
            toastDiv.remove();
        }
    };

    return {
        disconnected: () => {
            document.removeEventListener(eventName, showToast);
            // Remove any remaining toast divs
            const toasts = $element.querySelectorAll(".toast");
            toasts.forEach((toast) => {
                toast.remove();
            });
        },
    };
});
