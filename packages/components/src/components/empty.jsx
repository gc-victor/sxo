/**
 * @fileoverview Empty state display component (vanilla JSX)
 *
 * @module ui/empty
 * @description
 * Displays an empty state placeholder with optional icon, title, description,
 * and action button. Uses basecoat `.empty` CSS classes for consistent styling.
 *
 * Exports:
 * - `Empty` (default): Empty state display.
 *
 * Design notes:
 * - Returns `null` if both `title` and `description` are omitted (no invisible placeholder).
 * - `icon` can be an inline SVG or any JSX element rendered in `.empty-icon`.
 * - `action` is a button element rendered in `.empty-action`.
 *
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 */

import { cn } from "@utils/cn.js";

/**
 * Props accepted by `<Empty />`.
 *
 * Empty state placeholder with optional icon, title, description, and action.
 * Renders nothing when both title and description are missing.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {
 *   icon?: JSX.Element,
 *   title?: string,
 *   description?: string,
 *   action?: JSX.Element,
 * }} EmptyProps
 * @function Empty
 * @param {EmptyProps} props
 * @returns {JSX.Element|null} Rendered markup or null.
 * @example
 * <Empty title="No results" description="Try adjusting your search." />
 * @example
 * <Empty icon={<SearchIcon />} title="No results" />
 * @example
 * <Empty title="No data" action={<button class="btn">Add</button>} />
 * @public
 */
export default function Empty({ class: klass, className, icon, title, description, action, ...rest }) {
    if (!title && !description) {
        return null;
    }

    return (
        <div class={cn("empty", klass, className)} {...rest}>
            {icon ? <div class="empty-icon">{icon}</div> : ""}
            {title ? <div class="empty-title">{title}</div> : ""}
            {description ? <p class="empty-desc">{description}</p> : ""}
            {action ? <div class="empty-action">{action}</div> : ""}
        </div>
    );
}
