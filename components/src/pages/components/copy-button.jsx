/**
 * @fileoverview Copy button component (vanilla JSX) with reactive copy functionality.
 *
 * Exports:
 * - CopyButton: Button that copies content from associated <code> element.
 *
 * Design notes:
 * - Renders a button with copy icon.
 * - Expects a `for` attribute pointing to the id of the <code> element to copy.
 * - Client-side behavior defined in copy-button.client.js using reactive-component.
 * - Uses Button component for consistent styling.
 *
 * Accessibility:
 * - Button has aria-label for screen readers.
 * - Icon is decorative.
 *
 * @module ui/copy-button
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 * @since 1.0.0
 */

import Button from "@components/button.jsx";
import { IconCheckmark, IconCopy } from "@components/icon.jsx";
import cn from "@utils/cn.js";

/**
 * Button component that copies text content from an associated <code> element.
 * @typedef {HTMLButtonAttributes & ComponentProps & {
 *   for: string }} CopyButtonProps
 * @param {CopyButtonProps} props
 */
export default function CopyButton({ for: forId, class: klass, className, ...rest }) {
    return (
        <el-copy-button>
            <div class="absolute top-2 right-2">
                <Button
                    variant="ghost"
                    size="sm"
                    class={cn(className || klass, "p-0", "h-4", "w-4")}
                    type="button"
                    aria-label="Copy code to clipboard"
                    data-for={forId}
                    $onclick="copy"
                    {...rest}
                >
                    <IconCopy $bind-class="copyIconClass" />
                    <IconCheckmark $bind-class="tickIconClass" class="hidden" />
                </Button>
            </div>
        </el-copy-button>
    );
}
