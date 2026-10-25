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
import { define } from "sxo/client";

function findAccordionDetails(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return null;
    return target.closest("summary")?.closest("details") ?? null;
}

function closeSiblingDetails(element, currentDetails) {
    for (const details of element.querySelectorAll("details")) {
        if (details !== currentDetails) details.removeAttribute("open");
    }
}

/**
 * @typedef {"single"|"multiple"} AccordionType
 */
define("el-accordion", function ElAccordion({ $element, $on }) {
    // No-op unless single type
    if ($element.getAttribute("type") !== "single") return {};

    // Handler: $onclick="toggle" on <summary>; close siblings when opening
    $on.toggle = (/** @type {Event} */ e) => {
        const details = findAccordionDetails(e);
        if (details && !details.open) {
            closeSiblingDetails($element, details);
        }
    };

    return {};
});
