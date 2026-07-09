/**
 * @fileoverview Collapsible component — single independent toggle (vanilla JSX + reactive client island)
 *
 * @module ui/collapsible
 * @description
 * Single independent toggle that shows/hides content. Unlike accordion, collapsible is
 * an isolated toggle with no grouping behavior.
 *
 * SSR renders the markup; client island handles toggle state and aria attributes.
 *
 * Exports:
 * - `Collapsible` (default): Collapsible with trigger and content panel.
 *
 * Design notes:
 * - Uses `<el-collapsible>` custom element for client enhancement.
 * - `defaultOpen` prop controls initial state.
 * - Content uses CSS transition for smooth show/hide animation.
 * - Supports nested collapsibles.
 *
 * @license MIT
 */

import { cn } from "@utils/cn.js";

/**
 * Props accepted by `<Collapsible />`.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {
 *   defaultOpen?: boolean,
 *   trigger?: string,
 *   children?: JSX.Element|JSX.Element[]|string,
 * }} CollapsibleProps
 * @function Collapsible
 * @param {CollapsibleProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <Collapsible trigger="Toggle Content">Hidden content</Collapsible>
 * @public
 */
export default function Collapsible({ class: klass, className, defaultOpen = false, trigger = "Toggle Content", children, ...rest }) {
    const isOpen = defaultOpen;

    return (
        <el-collapsible>
            <div class={cn("collapsible-root", klass, className)} {...rest}>
                <button type="button" class="collapsible-trigger" aria-expanded={isOpen ? "true" : "false"} $onclick="toggleCollapsible">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="collapsible-chevron"
                        aria-hidden="true"
                    >
                        <path d="m9 18 6-6-6-6" />
                    </svg>
                    <span>{trigger}</span>
                </button>
                <div class={cn("collapsible-content", isOpen ? "open" : "")}>
                    <div class="collapsible-inner">{children}</div>
                </div>
            </div>
        </el-collapsible>
    );
}
