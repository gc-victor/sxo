/**
 * @fileoverview Pagination component with internal declarative subcomponents (vanilla JSX)
 * @module ui/pagination
 * @description
 * Accessible pagination control that renders a `<nav>` landmark containing a list of page buttons.
 * This refactored version removes all `id` and `data-*` attributes and instead relies on semantic
 * structure, ARIA attributes, and CSS classes. Internal declarative subcomponents are used to build
 * the interface in a composable, readable way while keeping a single public export.
 *
 * Declarative Internal Subcomponents (not exported):
 * - <PaginationContainer> : Wraps the navigation landmark and list.
 * - <ControlButton>       : First / Previous / Next / Last navigation buttons.
 * - <PageItem>            : A single numbered page button.
 * - <EllipsisItem>        : Visual gap indicator between non-contiguous page ranges.
 *
 * Iconography:
 * - Uses sprite-based wrappers from `icon.jsx`: `IconChevronLeft`, `IconChevronRight`, `IconEllipsis`.
 *
 * Accessibility:
 * - `nav[aria-label="Pagination"]` for landmark.
 * - Current page button: `aria-current="page"`.
 * - Disabled controls: `disabled` + `aria-disabled="true"`.
 * - Ellipsis items are presentational buttons with `aria-hidden="true"` and removed from tab order.
 *
 * Styling Conventions (No data-* hooks):
 * - Root element class: `pagination`.
 * - Page button conditional classes:
 *    * `is-current` when active.
 * - Disabled control buttons add `is-disabled`.
 *
 * Breaking Changes (since 1.0.0):
 * - Removed automatic `id` generation and all `data-*` attributes (previous selectors must migrate).
 *
 * This refactor intentionally avoids exposing additional runtime hooks. If future script-driven
 *   behaviors are required, consider purely semantic/ARIA-based approaches before reintroducing
 *   custom attributes.
 *
 * @author Víctor García
 * @license MIT
 * @version 2.0.0
 */

import { cn } from "@utils/cn.js";
import { IconChevronLeft, IconChevronRight, IconEllipsis } from "./icon.jsx";

/**
 * Clamp a number into an inclusive range.
 * @param {number} n
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

/**
 * Compute the ordered list of pagination items (numbers + ellipsis sentinels).
 * Sentinel values are the strings: "start-ellipsis" | "end-ellipsis".
 *
 * @param {number} total
 * @param {number} current
 * @param {number} boundaryCount
 * @param {number} siblingCount
 * @returns {(number|string)[]}
 */
function appendPages(items, start, end) {
    for (let page = start; page <= end; page++) items.push(page);
}

function appendSiblingPages(items, start, end, total) {
    for (let page = start; page <= end; page++) {
        if (page >= 1 && page <= total) items.push(page);
    }
}

function appendGap(items, gap, ellipsis, adjacentPage) {
    if (gap > 0) items.push(ellipsis);
    else if (gap === 0) items.push(adjacentPage);
}

function appendEndPages(items, start, total) {
    for (let page = start; page <= total; page++) {
        if (!items.includes(page)) items.push(page);
    }
}

function keepValidPages(items, total) {
    return items.filter((item) => {
        if (typeof item === "string") return true;
        return item >= 1 && item <= total;
    });
}

function deduplicatePages(items) {
    const seen = new Set();
    const uniqueItems = [];
    for (const item of items) {
        const key = String(item);
        if (!seen.has(key)) {
            seen.add(key);
            uniqueItems.push(item);
        }
    }
    return uniqueItems;
}

/**
 * Compute the ordered list of pagination items (numbers + ellipsis sentinels).
 * Sentinel values are the strings: "start-ellipsis" | "end-ellipsis".
 *
 * @param {number} total
 * @param {number} current
 * @param {number} boundaryCount
 * @param {number} siblingCount
 * @returns {(number|string)[]}
 */
function computePageItems(total, current, boundaryCount, siblingCount) {
    /** @type {(string | number)[]} */
    const items = [];
    if (total <= 0) return items;

    const startPagesEnd = Math.min(boundaryCount, total);
    const endPagesStart = Math.max(total - boundaryCount + 1, boundaryCount + 1);
    const leftSiblingStart = Math.max(Math.min(current - siblingCount, total - boundaryCount - siblingCount * 2 - 1), boundaryCount + 2);
    const rightSiblingEnd = Math.min(Math.max(current + siblingCount, boundaryCount + siblingCount * 2 + 2), endPagesStart - 2);

    appendPages(items, 1, startPagesEnd);
    appendGap(items, leftSiblingStart - boundaryCount - 2, "start-ellipsis", boundaryCount + 1);
    appendSiblingPages(items, leftSiblingStart, rightSiblingEnd, total);
    appendGap(items, endPagesStart - 2 - rightSiblingEnd, "end-ellipsis", endPagesStart - 1);
    appendEndPages(items, endPagesStart, total);

    return keepValidPages(deduplicatePages(items), total);
}

function numericOrDefault(value, fallback) {
    return Number(value) || fallback;
}

const PAGE_ITEM_STATES = {
    true: { className: "btn-outline size-9 is-current", ariaCurrent: "page", labelSuffix: ", current page" },
    false: { className: "btn-ghost size-9", ariaCurrent: undefined, labelSuffix: "" },
};

const CONTROL_STATES = {
    true: { className: "is-disabled", attributes: { disabled: "", ariaDisabled: "true" } },
    false: { className: "", attributes: {} },
};

const CONTROL_ICONS = new Map([
    ["left", () => <IconChevronLeft class="mr-1 size-4" aria-hidden="true" />],
    ["right", () => <IconChevronRight class="ml-1 size-4" aria-hidden="true" />],
]);

/**
 * Props for the public Pagination component.
 *
 * @typedef {HTMLElementAttributes & ComponentProps & {
 *   totalPages?: number,
 *   currentPage?: number,
 *   showFirst?: boolean,
 *   showLast?: boolean,
 *   showPrev?: boolean,
 *   showNext?: boolean,
 *   boundaryCount?: number,
 *   siblingCount?: number,
 *   ariaLabel?: string,
 *   prevLabel?: string,
 *   nextLabel?: string,
 *   firstLabel?: string,
 *   lastLabel?: string
 * }} PaginationProps
 */

/* ---------- Internal Declarative Subcomponents (NOT exported) ---------- */

/**
 * @typedef {HTMLElementAttributes & ComponentProps} PaginationContainerProps
 */

/**
 * Container: wraps navigation landmark and list.
 * @param {PaginationContainerProps & { ariaLabel?: string }} props
 */
function PaginationContainer({ ariaLabel = "Pagination", class: klass, className, children, ...rest } = {}) {
    return (
        <nav aria-label={ariaLabel} class={cn("pagination", className || klass)} {...rest}>
            <ul class="flex flex-row items-center gap-1">{children}</ul>
        </nav>
    );
}

/**
 * @typedef {(HTMLButtonAttributes & ComponentProps) & {
 *   page: number,
 *   current: number
 * }} PageItemProps
 *
 * @param {PageItemProps} props
 */
function PageItem({ page, current, class: klass, className, ...rest }) {
    const state = PAGE_ITEM_STATES[page === current];
    return (
        <li>
            <button
                type="button"
                class={cn(state.className, className || klass)}
                aria-current={state.ariaCurrent}
                aria-label={`Page ${page}${state.labelSuffix}`}
                {...rest}
            >
                {String(page)}
            </button>
        </li>
    );
}

/**
 * Visual ellipsis separator (presentational).
 */
function EllipsisItem() {
    return (
        <li>
            <button type="button" class="btn-icon-ghost is-disabled" disabled="" aria-disabled="true" aria-label="More pages" tabindex="-1">
                <IconEllipsis class="size-4" />
            </button>
        </li>
    );
}

/**
 * @typedef {(HTMLButtonAttributes & ComponentProps) & {
 *   targetPage: number,
 *   disabled?: boolean,
 *   variant?: "prev"|"next"|"first"|"last",
 *   label: string,
 *   icon?: "left"|"right"|null
 * }} ControlButtonProps
 *
 * @param {ControlButtonProps} props
 */
function ControlButton({ targetPage, disabled = false, variant, label, icon, class: klass, className, ...rest }) {
    const state = CONTROL_STATES[Boolean(disabled)];
    const iconContent = CONTROL_ICONS.get(icon)?.();
    const content = icon === "left" ? [iconContent, label] : [label, iconContent];
    return (
        <li>
            <button
                type="button"
                class={cn("btn-ghost", state.className, className || klass)}
                {...state.attributes}
                aria-label={label}
                {...rest}
            >
                {content}
            </button>
        </li>
    );
}

function renderLeadingControls(showFirst, showPrev, disabled, current, firstLabel, prevLabel) {
    return [
        showFirst ? <ControlButton variant="first" targetPage={1} disabled={disabled} label={firstLabel} icon={null} /> : "",
        showPrev ? <ControlButton variant="prev" targetPage={current - 1} disabled={disabled} label={prevLabel} icon="left" /> : "",
    ];
}

function renderPageItems(items, current) {
    return items.map((item) => (typeof item === "string" ? <EllipsisItem /> : <PageItem page={item} current={current} />));
}

function renderTrailingControls(showNext, showLast, disabled, current, total, nextLabel, lastLabel) {
    return [
        showNext ? <ControlButton variant="next" targetPage={current + 1} disabled={disabled} label={nextLabel} icon="right" /> : "",
        showLast ? <ControlButton variant="last" targetPage={total} disabled={disabled} label={lastLabel} icon={null} /> : "",
    ];
}

/* ---------- Public Component ---------- */

/**
 * Pagination component.
 *
 * Builds page + control items declaratively using internal subcomponents. The consumer receives
 * purely semantic HTML without an `id` or `data-*` attributes.
 *
 * @function Pagination
 * @param {PaginationProps} [props={}]
 * @returns {JSX.Element}
 * @example
 * <Pagination totalPages={12} currentPage={5} showPrev showNext showFirst showLast />
 * @public
 */
export default function Pagination(props = {}) {
    const {
        totalPages = 1,
        currentPage = 1,
        showFirst = false,
        showLast = false,
        showPrev = true,
        showNext = true,
        boundaryCount = 2,
        siblingCount = 2,
        ariaLabel = "Pagination",
        class: klass,
        className,
        prevLabel = "Prev",
        nextLabel = "Next",
        firstLabel = "First",
        lastLabel = "Last",
        ...rest
    } = props;

    const total = Math.max(1, numericOrDefault(totalPages, 1));
    const current = clamp(numericOrDefault(currentPage, 1), 1, total);
    const bCount = Math.max(0, numericOrDefault(boundaryCount, 0));
    const sCount = Math.max(0, numericOrDefault(siblingCount, 0));

    const items = computePageItems(total, current, bCount, sCount);

    const prevDisabled = current <= 1;
    const nextDisabled = current >= total;

    return (
        <PaginationContainer aria-label={ariaLabel} className={cn(klass, className)} {...rest}>
            {renderLeadingControls(showFirst, showPrev, prevDisabled, current, firstLabel, prevLabel)}
            {renderPageItems(items, current)}
            {renderTrailingControls(showNext, showLast, nextDisabled, current, total, nextLabel, lastLabel)}
        </PaginationContainer>
    );
}
