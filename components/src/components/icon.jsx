/**
 * @fileoverview Icon component and tree-shakable SVG symbol wrappers (vanilla JSX). Provides a
 * low-level `<Icon />` component that references symbols from a sprite (injected by `svg-symbols.jsx`)
 * and a set of convenience wrapper components for common icons. All components are framework‑agnostic
 * (NOT React) and output static markup suitable for SXO's vanilla JSX transformer.
 *
 * Exports:
 * - Icon: Generic symbol renderer (polymorphic via `name` prop).
 * - ICON_NAMES: Ordered array of available symbol names (derived from `ICON_SYMBOL_MAP` keys).
 * - Convenience wrappers: IconChevronDown, IconChevronRight, IconChevronLeft, IconCircleExclamation,
 *   IconCircleCheck, IconTriangleWarning, IconCircleInfo, IconSend, IconArrowRight, IconDotsHorizontal,
 *   IconEllipsis, IconTrash, IconSpinner, IconList, IconGift, IconImage, IconCube, IconChevronsVertical,
 *   IconSearch, IconX, IconClose, IconCheckmark, IconShieldExclamation, IconCopy, IconSun, IconMoon, IconExternalLink.
 *
 * Design notes:
 * - Symbol resolution: If `name` lacks the `icon-` prefix it is added automatically (unless a map entry exists).
 * - Accessibility: Provide a `title` prop for an accessible label. Without `title`, the icon is treated as
 *   decorative (`aria-hidden="true"`).
 * - Layout reservation: When `name` is omitted the component still renders an empty `<svg>` to preserve layout.
 * - Attribute forwarding: All unrecognized props (aria-*, data-*, stroke parameters) are forwarded to `<svg>`.
 * - `className` is accepted as an alias for `class`; merging is performed by simple concatenation (no util dependency).
 * - No runtime side effects; the sprite injection is the caller's responsibility (ensure `<SvgSymbols />` is present once).
 *
 * Accessibility guidelines:
 * - Use `title` for meaningful icons (status, actions); omit or leave empty for purely decorative usage.
 * - Avoid redundant textual labels (e.g., do not repeat adjacent button text in `title`).
 *
 * @module ui/icon
 * @author Victor García
 * @license NOASSERTION
 * @version 1.3.0
 * @since 1.0.0
 */

import { ICON_SYMBOL_MAP } from "./svg-symbols.jsx";

/**
 * Ordered list of available icon names for runtime discovery, docs, or dynamic selection UIs.
 *
 * @constant {string[]}
 * @public
 * @since 1.1.0
 */
export const ICON_NAMES = Object.keys(ICON_SYMBOL_MAP);

/* AIDEV-NOTE:
 * The positional destructuring below maps stable indices to named constants so wrapper
 * components avoid hardcoded string literals. If ICON_SYMBOL_MAP insertion order changes
 * (e.g., icons inserted mid-list), update this block accordingly.
 *
 * Current (index → name):
 *  0 chevron-down
 *  1 chevron-right
 *  2 chevron-left
 *  3 circle-exclamation
 *  4 circle-check
 *  5 triangle-warning
 *  6 circle-info
 *  7 send
 *  8 arrow-right
 *  9 dots-horizontal
 * 10 ellipsis
 * 11 trash
 * 12 spinner
 * 13 list
 * 14 gift
 * 15 image
 * 16 cube
 * 17 chevrons-vertical
 * 18 search
 * 19 x
 * 20 close
 * 21 check
 * 22 shield-exclamation
 * 23 copy
 * 24 sun
 * 25 moon
 * 26 external-link
 */
const [
    NAME_CHEVRON_DOWN,
    NAME_CHEVRON_RIGHT,
    NAME_CHEVRON_LEFT,
    NAME_CIRCLE_EXCLAMATION,
    NAME_CIRCLE_CHECK,
    NAME_TRIANGLE_WARNING,
    NAME_CIRCLE_INFO,
    NAME_SEND,
    NAME_ARROW_RIGHT,
    NAME_DOTS_HORIZONTAL,
    NAME_ELLIPSIS,
    NAME_TRASH,
    NAME_SPINNER,
    NAME_LIST,
    NAME_GIFT,
    NAME_IMAGE,
    NAME_CUBE,
    NAME_CHEVRONS_VERTICAL,
    NAME_SEARCH,
    NAME_X,
    NAME_CLOSE,
    NAME_CHECK,
    NAME_SHIELD_EXCLAMATION,
    NAME_COPY,
    NAME_SUN,
    NAME_MOON,
    NAME_EXTERNAL_LINK,
] = ICON_NAMES;

/**
 * Props accepted by `<Icon />`.
 *
 * Generic SVG symbol renderer that locates an id in the shared sprite produced by `svg-symbols.jsx`.
 * If `name` is omitted, an empty `<svg>` is rendered (layout reservation without symbol). When a `title`
 * is provided it is injected as a child <title> for accessibility; otherwise the icon is treated as
 * decorative (`aria-hidden="true"`). Accepts standard SVG attributes plus convenience stroke modifiers.
 *
 * Symbol resolution rules:
 * - Exact match in `ICON_SYMBOL_MAP` → use mapped value.
 * - Else if `name` already starts with `icon-` → use as-is.
 * - Else → prefix with `icon-`.
 *
 * @typedef {HTMLSVGAttributes & ComponentProps & {
 *   name?: string,
 *   title?: string,
 *   width?: number|string,
 *   height?: number|string,
 *   viewBox?: string,
 *   fill?: string,
 *   stroke?: string,
 *   "stroke-width"?: number|string,
 *   "stroke-linecap"?: string,
 *   "stroke-linejoin"?: string
 * }} IconProps
 * @function Icon
 * @param {IconProps} [props={}]
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <Icon name="arrow-right" class="size-4" />
 * @example
 * <Icon name="circle-check" title="Success" class="text-green-600" />
 * @example
 * <Icon name="spinner" class="animate-spin" stroke-width="1.5" />
 * @public
 * @since 1.0.0
 */
export function Icon(props = {}) {
    const { name, title, class: klass, className, viewBox = "0 0 24 24", ...rest } = props;

    // Construct merged class (simple deterministic concatenation).
    const mergedClass = [klass, className].filter(Boolean).join(" ");

    // Layout reservation when no name provided.
    if (!name) {
        return <svg viewBox={viewBox} aria-hidden="true" class={mergedClass} {...rest}></svg>;
    }

    // Resolve symbol id.
    const symbolId = ICON_SYMBOL_MAP[name] || (name.startsWith("icon-") ? name : `icon-${name}`);

    return (
        // biome-ignore lint/a11y/noSvgWithoutTitle: May be decorative when no title is supplied.
        <svg
            viewBox={viewBox}
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden={title ? null : "true"}
            class={mergedClass}
            {...rest}
        >
            {title ? <title>{title}</title> : ""}
            <use href={`#${symbolId}`} />
        </svg>
    );
}

/**
 * Props accepted by icon convenience wrapper components.
 *
 * Identical to `<Icon />` (minus the `name` prop which is fixed per wrapper). Each wrapper sets
 * a specific symbol id while allowing callers to override sizing, stroke, classes, and accessibility
 * labeling via `title`.
 *
 * @typedef {Omit<IconProps,"name">} IconWrapperProps
 * @since 1.1.0
 */

/* -------------------------------------------------------------------------------------------------
 * Convenience Wrapper Canonical Blocks
 * ------------------------------------------------------------------------------------------------- */

/**
 * Props accepted by `<IconChevronDown />`.
 *
 * Convenience wrapper around `<Icon />` that renders the "chevron-down" symbol.
 *
 * @function IconChevronDown
 * @param {IconWrapperProps} [props={}]
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <IconChevronDown class="size-4" />
 * @public
 * @since 1.0.0
 */
export const IconChevronDown = (props = {}) => <Icon name={NAME_CHEVRON_DOWN} {...props} />;

/**
 * Props accepted by `<IconChevronRight />`.
 *
 * Wrapper for the "chevron-right" symbol.
 *
 * @function IconChevronRight
 * @param {IconWrapperProps} [props={}]
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <IconChevronRight class="size-4" />
 * @public
 * @since 1.0.0
 */
export const IconChevronRight = (props = {}) => <Icon name={NAME_CHEVRON_RIGHT} {...props} />;

/**
 * Props accepted by `<IconChevronLeft />`.
 *
 * Wrapper for the "chevron-left" symbol.
 *
 * @function IconChevronLeft
 * @param {IconWrapperProps} [props={}]
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <IconChevronLeft class="size-4" />
 * @public
 * @since 1.0.0
 */
export const IconChevronLeft = (props = {}) => <Icon name={NAME_CHEVRON_LEFT} {...props} />;

/**
 * Props accepted by `<IconCircleExclamation />`.
 *
 * Wrapper for the "circle-exclamation" symbol (warning / alert context).
 *
 * @function IconCircleExclamation
 * @param {IconWrapperProps} [props={}]
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <IconCircleExclamation title="Warning" class="text-amber-600" />
 * @public
 * @since 1.0.0
 */
export const IconCircleExclamation = (props = {}) => <Icon name={NAME_CIRCLE_EXCLAMATION} {...props} />;

/**
 * Props accepted by `<IconCircleCheck />`.
 *
 * Wrapper for the "circle-check" symbol (success / confirmation).
 *
 * @function IconCircleCheck
 * @param {IconWrapperProps} [props={}]
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <IconCircleCheck title="Success" class="text-green-600" />
 * @public
 * @since 1.0.0
 */
export const IconCircleCheck = (props = {}) => <Icon name={NAME_CIRCLE_CHECK} {...props} />;

/**
 * Props accepted by `<IconTriangleWarning />`.
 *
 * Wrapper for the "triangle-warning" symbol (caution / attention).
 *
 * @function IconTriangleWarning
 * @param {IconWrapperProps} [props={}]
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <IconTriangleWarning class="text-amber-600" />
 * @public
 * @since 1.0.0
 */
export const IconTriangleWarning = (props = {}) => <Icon name={NAME_TRIANGLE_WARNING} {...props} />;

/**
 * Props accepted by `<IconCircleInfo />`.
 *
 * Wrapper for the "circle-info" symbol (informational context).
 *
 * @function IconCircleInfo
 * @param {IconWrapperProps} [props={}]
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <IconCircleInfo class="size-4" />
 * @public
 * @since 1.1.0
 */
export const IconCircleInfo = (props = {}) => <Icon name={NAME_CIRCLE_INFO} {...props} />;

/**
 * Props accepted by `<IconSend />`.
 *
 * Wrapper for the "send" / paper plane symbol.
 *
 * @function IconSend
 * @param {IconWrapperProps} [props={}]
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <IconSend class="size-4" />
 * @public
 * @since 1.0.0
 */
export const IconSend = (props = {}) => <Icon name={NAME_SEND} {...props} />;

/**
 * Props accepted by `<IconArrowRight />`.
 *
 * Wrapper for the "arrow-right" symbol.
 *
 * @function IconArrowRight
 * @param {IconWrapperProps} [props={}]
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <IconArrowRight class="size-4" />
 * @public
 * @since 1.0.0
 */
export const IconArrowRight = (props = {}) => <Icon name={NAME_ARROW_RIGHT} {...props} />;

/**
 * Props accepted by `<IconDotsHorizontal />`.
 *
 * Wrapper for the "dots-horizontal" symbol (overflow / menu).
 *
 * @function IconDotsHorizontal
 * @param {IconWrapperProps} [props={}]
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <IconDotsHorizontal class="size-4" />
 * @public
 * @since 1.0.0
 */
export const IconDotsHorizontal = (props = {}) => <Icon name={NAME_DOTS_HORIZONTAL} {...props} />;

/**
 * Props accepted by `<IconEllipsis />`.
 *
 * Wrapper for the "ellipsis" symbol (alternate overflow).
 *
 * @function IconEllipsis
 * @param {IconWrapperProps} [props={}]
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <IconEllipsis class="size-4" />
 * @public
 * @since 1.1.0
 */
export const IconEllipsis = (props = {}) => <Icon name={NAME_ELLIPSIS} {...props} />;

/**
 * Props accepted by `<IconTrash />`.
 *
 * Wrapper for the "trash" symbol (delete action).
 *
 * @function IconTrash
 * @param {IconWrapperProps} [props={}]
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <IconTrash class="size-4" />
 * @public
 * @since 1.0.0
 */
export const IconTrash = (props = {}) => <Icon name={NAME_TRASH} {...props} />;

/**
 * Props accepted by `<IconSpinner />`.
 *
 * Wrapper for the "spinner" symbol (activity indicator). Combine with `animate-spin`.
 *
 * @function IconSpinner
 * @param {IconWrapperProps} [props={}]
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <IconSpinner class="size-4 animate-spin" />
 * @public
 * @since 1.0.0
 */
export const IconSpinner = (props = {}) => <Icon name={NAME_SPINNER} {...props} />;

/**
 * Props accepted by `<IconList />`.
 *
 * Wrapper for the "list" symbol.
 *
 * @function IconList
 * @param {IconWrapperProps} [props={}]
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <IconList class="size-4" />
 * @public
 * @since 1.0.0
 */
export const IconList = (props = {}) => <Icon name={NAME_LIST} {...props} />;

/**
 * Props accepted by `<IconGift />`.
 *
 * Wrapper for the "gift" symbol.
 *
 * @function IconGift
 * @param {IconWrapperProps} [props={}]
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <IconGift class="size-4" />
 * @public
 * @since 1.0.0
 */
export const IconGift = (props = {}) => <Icon name={NAME_GIFT} {...props} />;

/**
 * Props accepted by `<IconImage />`.
 *
 * Wrapper for the "image" symbol.
 *
 * @function IconImage
 * @param {IconWrapperProps} [props={}]
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <IconImage class="size-4" />
 * @public
 * @since 1.0.0
 */
export const IconImage = (props = {}) => <Icon name={NAME_IMAGE} {...props} />;

/**
 * Props accepted by `<IconCube />`.
 *
 * Wrapper for the "cube" / 3D box symbol.
 *
 * @function IconCube
 * @param {IconWrapperProps} [props={}]
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <IconCube class="size-4" />
 * @public
 * @since 1.0.0
 */
export const IconCube = (props = {}) => <Icon name={NAME_CUBE} {...props} />;

/**
 * Props accepted by `<IconChevronsVertical />`.
 *
 * Wrapper for the "chevrons-vertical" symbol.
 *
 * @function IconChevronsVertical
 * @param {IconWrapperProps} [props={}]
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <IconChevronsVertical class="size-4" />
 * @public
 * @since 1.0.0
 */
export const IconChevronsVertical = (props = {}) => <Icon name={NAME_CHEVRONS_VERTICAL} {...props} />;

/**
 * Props accepted by `<IconSearch />`.
 *
 * Wrapper for the "search" symbol (magnifier).
 *
 * @function IconSearch
 * @param {IconWrapperProps} [props={}]
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <IconSearch class="size-4" />
 * @public
 * @since 1.0.0
 */
export const IconSearch = (props = {}) => <Icon name={NAME_SEARCH} {...props} />;

/**
 * Props accepted by `<IconX />`.
 *
 * Wrapper for the "x" (close) symbol.
 *
 * @function IconX
 * @param {IconWrapperProps} [props={}]
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <IconX class="size-4" />
 * @public
 * @since 1.0.0
 */
export const IconX = (props = {}) => <Icon name={NAME_X} {...props} />;

/**
 * Props accepted by `<IconClose />`.
 *
 * Wrapper for the "close" symbol (alias to legacy naming distinct from "x" if both exist).
 *
 * @function IconClose
 * @param {IconWrapperProps} [props={}]
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <IconClose class="size-4" />
 * @public
 * @since 1.1.0
 */
export const IconClose = (props = {}) => <Icon name={NAME_CLOSE} {...props} />;

/**
 * Props accepted by `<IconCheckmark />`.
 *
 * Wrapper for the "check" symbol.
 *
 * @function IconCheckmark
 * @param {IconWrapperProps} [props={}]
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <IconCheckmark class="size-4" />
 * @public
 * @since 1.0.0
 */
export const IconCheckmark = (props = {}) => <Icon name={NAME_CHECK} {...props} />;

/**
 * Props accepted by `<IconShieldExclamation />`.
 *
 * Wrapper for the "shield-exclamation" symbol (security / warning).
 *
 * @function IconShieldExclamation
 * @param {IconWrapperProps} [props={}]
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <IconShieldExclamation class="size-4" />
 * @public
 * @since 1.0.0
 */
export const IconShieldExclamation = (props = {}) => <Icon name={NAME_SHIELD_EXCLAMATION} {...props} />;

/**
 * Props accepted by `<IconCopy />`.
 *
 * Wrapper for the "copy" symbol (clipboard copy action).
 *
 * @function IconCopy
 * @param {IconWrapperProps} [props={}]
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <IconCopy class="size-4" />
 * @public
 * @since 1.2.1
 */
export const IconCopy = (props = {}) => <Icon name={NAME_COPY} {...props} />;

/**
 * Props accepted by `<IconSun />`.
 *
 * Wrapper for the "sun" symbol (light mode indicator).
 *
 * @function IconSun
 * @param {IconWrapperProps} [props={}]
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <IconSun class="size-4" />
 * @public
 * @since 1.3.0
 */
export const IconSun = (props = {}) => <Icon name={NAME_SUN} {...props} />;

/**
 * Props accepted by `<IconMoon />`.
 *
 * Wrapper for the "moon" symbol (dark mode indicator).
 *
 * @function IconMoon
 * @param {IconWrapperProps} [props={}]
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <IconMoon class="size-4" />
 * @public
 * @since 1.3.0
 */
export const IconMoon = (props = {}) => <Icon name={NAME_MOON} {...props} />;

/**
 *
 * Wrapper for the "external-link" symbol (link to external resource).
 *
 * @function IconExternalLink
 * @param {IconWrapperProps} [props={}]
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <IconExternalLink class="size-4" />
 * @public
 * @since 1.3.0
 */
export const IconExternalLink = (props = {}) => <Icon name={NAME_EXTERNAL_LINK} {...props} />;
