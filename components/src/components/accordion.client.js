/**
 * @fileoverview <el-accordion> minimal reactive enhancer for native <details>/<summary>.
 *
 * Behavior:
 * - No-op unless type="single"
 * - Exposes $on.toggle for $onclick="toggle" on <summary>
 * - When toggling a closed item, closes sibling <details>
 *
 * Usage (server-rendered HTML):
 * <el-accordion type="single">
 *   <div class="accordion" $onclick="toggle">
 *     <details open>
 *       <summary>Section 1</summary>
 *       <section>Content 1</section>
 *     </details>
 *     <details>
 *       <summary>Section 2</summary>
 *       <section>Content 2</section>
 *     </details>
 *   </div>
 * </el-accordion>
 *
 * @license MIT
 */
import { define } from "@qery/reactive-component";

/**
 * @typedef {"single"|"multiple"} AccordionType
 */
define("el-accordion", function ElAccordion({ $element, $on }) {
    // No-op unless single type
    if ($element.getAttribute("type") !== "single") return {};

    // All descendant <details>
    const queryDetails = () => Array.from($element.querySelectorAll("details"));

    // Handler: $onclick="toggle" on <summary>; close siblings when opening
    $on.toggle = (/** @type {Event} */ e) => {
        const target = /** @type {HTMLElement|null} */ (e.target instanceof HTMLElement ? e.target : null);
        const summary = target?.closest?.("summary");
        if (!summary) return;
        const details = summary.closest?.("details");
        if (!details) return;

        // If this item is currently closed, close others before native toggle opens it
        if (!details.open) {
            queryDetails().forEach((d) => {
                if (d !== details) d.removeAttribute("open");
            });
        }
    };

    return {};
});
