/**
 * @fileoverview Presentational skeleton loading block (vanilla JSX)
 *
 * @module ui/skeleton
 * @description
 * Lightweight, purely visual loading placeholder element using utility classes. Framework-agnostic
 * (NOT React) and compiled by SXO's vanilla JSX transformer.
 *
 * Exports:
 * - `Skeleton`: Presentational block with size/shape/animation props.
 *
 * Design notes:
 * - Purely decorative: `role="presentation"` and `aria-hidden="true"`.
 * - No children: width/height defined via props and utility classes.
 * - Uses shared `cn` for deterministic class merging (no local helper).
 * - No data-* attributes retained (standards compliance).
 *
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 */

import { cn } from "@utils/cn.js";

/**
 * Compute shape class token from shape option.
 * @param {"rect"|"rounded"|"circle"} shape
 * @returns {string}
 * @private
 */
function shapeClassFor(shape) {
    const map = {
        circle: "rounded-full",
        rounded: "rounded-md",
        rect: "rounded-none",
    };
    return map[shape] || "rounded-none";
}

/**
 * Props accepted by `<Skeleton>`.
 *
 * @typedef {HTMLDivAttributes & {
 *   widthClass?: string,
 *   heightClass?: string,
 *   shape?: "rect"|"rounded"|"circle",
 *   animate?: boolean,
 *   class?: string,
 *   className?: string,
 *   children?: never,
 *   rest?: Object
 * }} SkeletonProps
 */

/**
 * @function Skeleton
 * @param {SkeletonProps} props Component properties.
 * @returns {JSX.Element} Rendered skeleton block.
 * @example
 * <Skeleton widthClass="w-40" heightClass="h-6" shape="rounded" />
 * @public
 */
export default function Skeleton({
    class: klass,
    className,
    widthClass = "w-full",
    heightClass = "h-4",
    shape = "rect",
    animate = true,
    ...rest
}) {
    const rootClass = cn("bg-accent", animate ? "animate-pulse" : null, shapeClassFor(shape), widthClass, heightClass, klass, className);

    return <div class={rootClass} role="presentation" aria-hidden="true" {...rest}></div>;
}
