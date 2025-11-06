/**
 * @fileoverview Reactive popover component using define() API
 * @module ui/popover.client
 * @description
 * A reactive popover component built with the Reactive Component library's define() API.
 * Provides accessible popover functionality with reactive state management, keyboard navigation,
 * and proper ARIA attributes for screen readers.
 *
 * Features:
 * - Reactive state management for open/closed states
 * - Keyboard navigation (Escape to close, Enter/Space to toggle)
 * - Click outside to close functionality
 * - Focus management with restoration
 * - ARIA attributes for accessibility

 * - Multiple popover support with proper isolation
 *
 * Usage:
 * ```html
 * <el-popover>
 *   <button $ref="trigger" $bind-attr="triggerAttrs" $onclick="togglePopover">Open Popover</button>
 *   <div $ref="content" $bind-class="contentClasses" $bind-attr="contentAttrs" class="popover-content" role="dialog">
 *     <p>Popover content goes here</p>
 *     <button $onclick="closePopover">Close</button>
 *   </div>
 * </el-popover>
 * ```
 *
 * State:
 * - isOpen: boolean - Whether the popover is currently open
 * - triggerRect: object - Bounding rect of trigger element for positioning
 *
 * Methods:
 * - openPopover(): Opens the popover and manages focus
 * - closePopover(): Closes the popover and restores focus
 * - togglePopover(): Toggles the popover state
 *

 * @author Víctor García
 * @license MIT
 * @version 1.0.0
 */

import { define } from "@qery/reactive-component";

define("el-popover", function ReactivePopover({ $state, $on, $ref, $effect, $compute, $element }) {
    // Initialize reactive state
    $state.isOpen = false;
    $state.triggerRect = null;
    $state.focusedBeforeOpen = null;

    // Computed properties for ARIA attributes and CSS classes
    $compute("triggerAttrs", ["isOpen"], (isOpen) => ({
        "aria-expanded": isOpen ? "true" : "false",
        "aria-haspopup": "true",
    }));

    // Computed property for content class operations for $bind-class
    $compute("contentClasses", ["isOpen"], (isOpen) => {
        // Operations object for $bind-class
        // When open: add 'popover-open' and remove 'popover-closed' and 'hidden'
        // When closed: add 'popover-closed' and 'hidden', remove 'popover-open'
        return isOpen
            ? { add: ["popover-open"], remove: ["popover-closed", "hidden"] }
            : { add: ["popover-closed", "hidden"], remove: ["popover-open"] };
    });

    // Computed attributes object for $bind-attr
    $compute("contentAttrs", ["isOpen"], (isOpen) => {
        return {
            "aria-hidden": isOpen ? "false" : "true",
            role: "dialog",
        };
    });

    // Bind methods for event handlers
    $on.openPopover = () => {
        // Update state
        $state.isOpen = true;

        const focusableElements = focusableContentElements();
        const firstElement = /** @type {HTMLElement} */ (focusableElements[0]);
        if (firstElement) {
            firstElement.focus();
        }
    };

    // Effects for managing global event listeners
    $effect(() => {
        if ($state.isOpen) {
            // Add global event listeners when popover is open
            document.addEventListener("click", handleDocumentClick);
            document.addEventListener("keydown", handleKeydown);
        } else {
            // Cleanup listeners when popover closes
            document.removeEventListener("click", handleDocumentClick);
            document.removeEventListener("keydown", handleKeydown);
        }
    });

    // Handle clicks outside the popover
    function handleDocumentClick(/** @type {MouseEvent} */ event) {
        // Check if click is outside the popover component
        if (event.target && !$element.contains(/** @type {Node} */ (event.target))) {
            closePopover();
        }
    }

    // Handle keyboard navigation
    function handleKeydown(/** @type {KeyboardEvent} */ event) {
        if (event.key === "Escape" && $state.isOpen) {
            event.preventDefault();
            closePopover();
        }

        if (event.key === "Tab") {
            event.preventDefault();

            const content = $ref.content;

            if (!content) return;

            const focusableElements = focusableContentElements();

            const activeElement = /** @type {HTMLElement} */ (document.activeElement);
            let idx = focusableElements.indexOf(activeElement);
            if (event.shiftKey) {
                idx = (idx - 1 + focusableElements.length) % focusableElements.length;
            } else {
                idx = (idx + 1) % focusableElements.length;
            }
            const next = /** @type {HTMLElement} */ (focusableElements[idx]);
            if (next) next.focus();
        }
    }

    function focusableContentElements() {
        const content = $ref.content;
        return content
            ? Array.from(content.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"))
            : [];
    }

    function closePopover() {
        const trigger = $ref.trigger;

        if (!$state.isOpen) return;

        $state.isOpen = false;

        // Restore focus to trigger if it exists
        if (trigger) {
            trigger.focus();
        }
    }

    // Lifecycle hooks
    return {
        connected: () => {
            // Set initial ARIA attributes on content; trigger ARIA handled via $bind-attr="triggerAttrs"
            const trigger = $ref.trigger;
            const content = $ref.content;

            // No direct aria-expanded/aria-haspopup on trigger here; use $bind-attr instead.
            // Provide static aria-controls linkage once content is available.
            if (trigger && content?.id) {
                trigger.setAttribute("aria-controls", content.id);
            }
        },

        disconnected: () => {
            // Clean up any remaining global listeners
            document.removeEventListener("click", handleDocumentClick);
            document.removeEventListener("keydown", handleKeydown);
        },
    };
});
