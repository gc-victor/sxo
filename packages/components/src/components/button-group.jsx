/**
 * @fileoverview Accessible button group container (vanilla JSX)
 *
 * @module ui/button-group
 * @description
 * Groups related buttons together in a horizontal or vertical layout.
 * Uses basecoat `.btn-group` and `.btn-group-vertical` CSS classes.
 * Provides variant and size props that flow down to the group container.
 *
 * Exports:
 * - `ButtonGroup` (default): Container for grouped buttons.
 *
 * Design notes:
 * - Renders as a `<div>` wrapping child buttons.
 * - `orientation="vertical"` adds `btn-group-vertical` class.
 * - `variant` and `size` props are applied as classes for consistency.
 * - Attribute forwarding: all unrecognized props spread to the root element.
 *
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 */

import { cn } from "@utils/cn.js";

/**
 * Props accepted by `<ButtonGroup />`.
 *
 * Groups related buttons with consistent spacing and styling.
 * Supports horizontal and vertical orientations, visual variants,
 * and size classes passed to the root element.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {
 *   orientation?: "horizontal"|"vertical",
 *   variant?: string,
 *   size?: string,
 * }} ButtonGroupProps
 * @function ButtonGroup
 * @param {ButtonGroupProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <ButtonGroup>
 *   <button class="btn">One</button>
 *   <button class="btn">Two</button>
 *   <button class="btn">Three</button>
 * </ButtonGroup>
 * @example
 * <ButtonGroup orientation="vertical">
 *   <button class="btn">Top</button>
 *   <button class="btn">Middle</button>
 *   <button class="btn">Bottom</button>
 * </ButtonGroup>
 * @public
 */
export default function ButtonGroup({ class: klass, className, orientation = "horizontal", variant, size, children, ...rest }) {
    const orientationClass = orientation === "vertical" ? "btn-group-vertical" : "btn-group";
    const variantClass = variant ? `btn-group-${variant}` : "";
    const sizeClass = size ? `btn-group-${size}` : "";

    return (
        // biome-ignore lint/a11y/useSemanticElements: <div role="group"> is correct ARIA for button groups
        <div class={cn(orientationClass, variantClass, sizeClass, klass, className)} role="group" {...rest}>
            {children}
        </div>
    );
}
