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
import { define } from "@qery/reactive-component";

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

        const clone = /** @type {DocumentFragment} */ (template.content.cloneNode(true));
        const toastDiv = clone.querySelector(".toast");
        if (!toastDiv) return;

        // Set ARIA attributes based on category (error for bottom-left)
        const role = category === "bottom-left" ? "alert" : "status";
        const ariaLive = category === "bottom-left" ? "assertive" : "polite";
        toastDiv.setAttribute("role", role);
        toastDiv.setAttribute("aria-live", ariaLive);
        toastDiv.setAttribute("aria-atomic", "true");
        toastDiv.setAttribute("aria-hidden", "false");

        // Populate placeholders with event data
        const titleEl = clone.querySelector(".toast-title");
        if (titleEl && event.detail?.title) {
            titleEl.textContent = event.detail.title;
        }
        const descEl = clone.querySelector(".toast-description");
        if (descEl && event.detail?.description) {
            descEl.textContent = event.detail.description;
        }

        // Append the toast div
        $element.appendChild(toastDiv);

        // Start auto-dismiss timer
        if (duration !== -1) {
            setTimeout(() => {
                if (toastDiv.parentNode) {
                    toastDiv.remove();
                }
            }, duration);
        }
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
