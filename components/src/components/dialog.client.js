/**
 * @fileoverview Dialog reactive component using native <dialog> showModal()
 */

import { define } from "@qery/reactive-component";

define("el-dialog", ({ $element, $on }) => {
    /**
     * Helper to query the inner <dialog> element.
     */
    const dialog = /** @type {HTMLDialogElement} */ $element.querySelector("dialog");

    /**
     * Show the dialog using native showModal()
     */
    $on.showDialog = () => {
        dialog?.showModal();
    };

    /**
     * Close the dialog using native close()
     */
    $on.closeDialog = () => {
        dialog?.close();
    };
});
