/**
 * @fileoverview Client-side reactive behavior for copy-button component.
 *
 * Uses reactive-component define() to add copy functionality.
 * Moves copy logic from copy-code.js util into the defined component.
 *
 * @module ui/copy-button.client
 */

import { define } from "@qery/reactive-component";

/**
 * Define the copy-button custom element with reactive copy functionality.
 *
 * On click, copies the text content of the <code> element referenced by the button's data-for attribute.
 */
define("el-copy-button", ({ $state, $on, $compute }) => {
    $state.copied = false;

    $compute("copyIconClass", ["copied"], (copied) => ({ add: copied ? ["hidden"] : [], remove: copied ? [] : ["hidden"] }));
    $compute("tickIconClass", ["copied"], (copied) => ({ add: copied ? [] : ["hidden"], remove: copied ? ["hidden"] : [] }));

    /** @param {Event} event */
    $on.copy = async (event) => {
        /** @type {HTMLButtonElement} */
        const button = /** @type {HTMLButtonElement} */ (event.currentTarget);
        const codeId = button.dataset.for;
        if (!codeId) {
            console.warn("copy-button: No 'for' attribute specified");
            return;
        }

        const codeElement = document.getElementById(codeId);
        if (!codeElement || codeElement.tagName !== "CODE") {
            console.warn(`copy-button: Element with id '${codeId}' is not a <code> tag`);
            return;
        }

        const text = (codeElement.textContent || "").trim();
        try {
            await navigator.clipboard.writeText(text);
            $state.copied = true;
            setTimeout(() => {
                $state.copied = false;
            }, 1000);
        } catch (error) {
            console.error("copy-button: Failed to copy to clipboard", error);
        }
    };
});
