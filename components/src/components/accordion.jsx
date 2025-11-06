/**
 * @fileoverview Accordion component for creating collapsible content sections (vanilla JSX)
 * @module ui/accordion
 * @description
 * A small set of composable accordion primitives intended for use with the SXO vanilla JSX
 * transformer. These components are framework-agnostic (NOT React) and render plain markup nodes
 * compatible with the project's runtime.
 *
 * Exports:
 * - `Accordion`       : Root container that configures accordion interaction type.
 * - `AccordionItem`   : Per-item container (writes a `<details>` element).
 * - `AccordionHeader` : Header/summary element (renders a `<summary>` with heading + optional icon).
 * - `AccordionContent`: Content panel for the item (renders a configurable tag, default `<section>`).
 *
 * Design notes:
 * - These primitives use native semantics (`<details>` / `<summary>`) for disclosure behavior.
 * - Consumers can style and control open state via standard HTML attributes (e.g. `open`) and CSS.
 *
 * @author: Víctor García
 * @license MIT
 * @version 1.0.0
 */

import { cn } from "@utils/cn.js";
import { IconChevronDown } from "./icon.jsx";

/**
 * @typedef {HTMLDivAttributes & ComponentProps & {
 *   type?: "single"|"multiple"
 * }} AccordionProps
 * @param {AccordionProps} props
 */
export function Accordion({ type = "multiple", class: klass, className, children, ...rest }) {
    return (
        <el-accordion type={type}>
            <div class={cn(className || klass)} {...rest} $onclick="toggle">
                {children}
            </div>
        </el-accordion>
    );
}

/**
 * @typedef {HTMLDetailsAttributes & ComponentProps} AccordionItemProps
 * @param {AccordionItemProps} props
 */
export function AccordionItem({ class: klass, className, children, ...rest }) {
    return (
        <details class={cn("group border-b last:border-b-0", className || klass)} {...rest}>
            {children}
        </details>
    );
}

/**
 * Header/summary element (renders a <summary> containing an <h2>).
 * @typedef {HTMLDivAttributes & ComponentProps & {
 *   hideIcon?: boolean
 * }} AccordionHeaderProps
 * @param {AccordionHeaderProps} props
 */
export function AccordionHeader({ class: klass, className, children, hideIcon = false, ...rest }) {
    return (
        <summary
            class={cn(
                "w-full focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] transition-all outline-none rounded-md",
                className || klass,
            )}
            {...rest}
        >
            <h2 class="flex flex-1 items-start justify-between gap-4 py-4 text-left text-sm font-medium hover:underline">
                {children}
                {!hideIcon && (
                    <IconChevronDown
                        class="text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200 group-open:rotate-180"
                        aria-hidden="true"
                    />
                )}
            </h2>
        </summary>
    );
}

/**
 * @typedef {HTMLElementAttributes & ComponentProps & {
 *   as?: string
 * }} AccordionContentProps
 * @param {AccordionContentProps} props
 */
export function AccordionContent({ class: klass, className, children, as = "section", ...rest }) {
    const Tag = as;
    return (
        <Tag class={cn("pb-4", className || klass)} {...rest}>
            <p class="text-sm">{children}</p>
        </Tag>
    );
}
