/**
 * @fileoverview Accessible breadcrumb navigation primitives (vanilla JSX) providing
 * composable structural components for hierarchical path display. Designed for SXO's
 * vanilla JSX transformer (NOT React) and emits static markup only.
 *
 * Exports:
 * - Breadcrumb (default) : Landmark wrapper (<nav>) with aria-label.
 * - BreadcrumbList       : Ordered list container (<ol>) applying layout utilities.
 * - BreadcrumbItem       : List item wrapper (<li>) for each segment.
 * - BreadcrumbSeparator  : Visual separator item (icon or custom child) marked aria-hidden.
 * - BreadcrumbLink       : Polymorphic segment (renders <a> when `href` present, else <span>).
 * - BreadcrumbPage       : Current page (renders <span aria-current="page">).
 *
 * Design notes:
 * - `className` acts as an alias of `class`; both are merged deterministically.
 * - Attribute forwarding: additional props (aria-*, data-*, etc.) are spread onto the root element.
 * - Separation of concerns: layout utilities live on list / item wrappers; link typography left to caller.
 * - No internal id generation or `data-*` attributes introduced.
 * - Avoids injecting default separators inside list items; explicit <BreadcrumbSeparator /> improves control.
 *
 * Accessibility:
 * - `Breadcrumb` sets `aria-label` (defaults to "Breadcrumb") to expose navigation purpose.
 * - Exactly one segment SHOULD have `aria-current="page"` (use <BreadcrumbPage />) representing the active location.
 * - Separator elements are marked `aria-hidden="true"` to prevent noise for assistive tech.
 * - Ensure link text is meaningful; avoid relying solely on icons.
 *
 * @module ui/breadcrumb
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 */

import { cn } from "@utils/cn.js";
import { IconChevronRight } from "./icon.jsx";

/* -------------------------------------------------------------------------------------------------
 * Breadcrumb (root)
 * ------------------------------------------------------------------------------------------------- */
/**
 * Props accepted by `<Breadcrumb />`.
 *
 * Landmark wrapper providing a navigation context for hierarchical links. Applies `aria-label`
 * (customizable via `ariaLabel`) and forwards additional attributes to the `<nav>` element.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {
 *   ariaLabel?: string
 * }} BreadcrumbProps
 * @function Breadcrumb
 * @param {BreadcrumbProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <Breadcrumb>
 *   <BreadcrumbList>
 *     <BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem>
 *     <BreadcrumbSeparator />
 *     <BreadcrumbItem><BreadcrumbLink href="/components">Components</BreadcrumbLink></BreadcrumbItem>
 *     <BreadcrumbSeparator />
 *     <BreadcrumbItem><BreadcrumbPage>Breadcrumb</BreadcrumbPage></BreadcrumbItem>
 *   </BreadcrumbList>
 * </Breadcrumb>
 * @public
 */
export default function Breadcrumb({ ariaLabel = "Breadcrumb", class: klass, className, children, ...rest }) {
    return (
        <nav aria-label={ariaLabel} class={cn(klass, className)} {...rest}>
            {children}
        </nav>
    );
}

/* -------------------------------------------------------------------------------------------------
 * BreadcrumbList
 * ------------------------------------------------------------------------------------------------- */
/**
 * Props accepted by `<BreadcrumbList />`.
 *
 * Ordered list container that lays out breadcrumb segments with wrapping and spacing utilities.
 * Forwards additional list attributes (e.g., `role`, `aria-*`).
 *
 * @typedef {HTMLOlAttributes & ComponentProps} BreadcrumbListProps
 * @function BreadcrumbList
 * @param {BreadcrumbListProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <BreadcrumbList>
 *   <BreadcrumbItem>...</BreadcrumbItem>
 * </BreadcrumbList>
 * @public
 */
export function BreadcrumbList({ class: klass, className, children, ...rest }) {
    return (
        <ol
            class={cn(
                "text-muted-foreground",
                "flex",
                "flex-wrap",
                "items-center",
                "gap-1.5",
                "text-sm",
                "wrap-break-word",
                "sm:gap-2.5",
                klass,
                className,
            )}
            {...rest}
        >
            {children}
        </ol>
    );
}

/* -------------------------------------------------------------------------------------------------
 * BreadcrumbItem
 * ------------------------------------------------------------------------------------------------- */
/**
 * Props accepted by `<BreadcrumbItem />`.
 *
 * Wrapper for a single breadcrumb segment (link, page label, or custom node). Provides inline-flex
 * alignment and spacing baseline. Forwards additional `<li>` attributes.
 *
 * @typedef {HTMLLiAttributes & ComponentProps} BreadcrumbItemProps
 * @function BreadcrumbItem
 * @param {BreadcrumbItemProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem>
 * @public
 */
export function BreadcrumbItem({ class: klass, className, children, ...rest }) {
    return (
        <li class={cn("inline-flex items-center gap-1.5", klass, className)} {...rest}>
            {children}
        </li>
    );
}

/* -------------------------------------------------------------------------------------------------
 * BreadcrumbSeparator
 * ------------------------------------------------------------------------------------------------- */
/**
 * Props accepted by `<BreadcrumbSeparator />`.
 *
 * Visual separator element between breadcrumb items. Defaults to a chevron icon when no children
 * are supplied. Marked `aria-hidden="true"` to avoid announcing decorative separators.
 *
 * @typedef {HTMLLiAttributes & ComponentProps} BreadcrumbSeparatorProps
 * @function BreadcrumbSeparator
 * @param {BreadcrumbSeparatorProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <BreadcrumbSeparator />
 * @example
 * <BreadcrumbSeparator>|</BreadcrumbSeparator>
 * @public
 */
export function BreadcrumbSeparator({ class: klass, className, children, ...rest }) {
    return (
        <li aria-hidden="true" class={cn(klass, className)} {...rest}>
            {children || <IconChevronRight class="size-3.5" />}
        </li>
    );
}

/* -------------------------------------------------------------------------------------------------
 * BreadcrumbLink (polymorphic)
 * ------------------------------------------------------------------------------------------------- */
/**
 * Props accepted by `<BreadcrumbLink />`.
 *
 * Polymorphic segment renderer: outputs `<a>` when `href` is provided; otherwise `<span>`. Merges
 * `class` and `className`, applies baseline hover color transition, and forwards remaining attributes
 * to the chosen element. Use inside `<BreadcrumbItem />`.
 *
 * @typedef {(HTMLAnchorAttributes) & ComponentProps & {
 *   href?: string
 * }} BreadcrumbLinkProps
 * @function BreadcrumbLink
 * @param {BreadcrumbLinkProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <BreadcrumbLink href="/guides">Guides</BreadcrumbLink>
 * @example
 * <BreadcrumbLink>Static Segment</BreadcrumbLink>
 * @public
 */
export function BreadcrumbLink({ href, class: klass, className, children, ...rest }) {
    const linkClass = cn("hover:text-foreground transition-colors", klass, className);
    if (href) {
        return (
            <a href={href} class={linkClass} {...rest}>
                {children}
            </a>
        );
    }
    return (
        <span class={linkClass} {...rest}>
            {children}
        </span>
    );
}

/* -------------------------------------------------------------------------------------------------
 * BreadcrumbPage (current page)
 * ------------------------------------------------------------------------------------------------- */
/**
 * Props accepted by `<BreadcrumbPage />`.
 *
 * Non-link terminal segment representing the current page/location. Renders a `<span>` with
 * `aria-current="page"` and elevated foreground color. Avoid duplicating an adjacent link label.
 *
 * @typedef {HTMLDivAttributes & ComponentProps} BreadcrumbPageProps
 * @function BreadcrumbPage
 * @param {BreadcrumbPageProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <BreadcrumbPage>Profile</BreadcrumbPage>
 * @public
 */
export function BreadcrumbPage({ class: klass, className, children, ...rest }) {
    return (
        <span class={cn("text-foreground font-normal", klass, className)} aria-current="page" {...rest}>
            {children}
        </span>
    );
}
