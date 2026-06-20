/**
 * @fileoverview Inline badge UI primitive (vanilla JSX) with variant, shape, and optional count.
 *
 * Exports:
 * - Badge: Inline visual label that renders as `<span>`.
 *
 * Design notes:
 * - Renders as `<span>` element.
 * - `className` accepted as alias of `class`; merged deterministically.
 * - `pill` boolean overrides `shape="pill"`.
 * - `count` renders compact numeric style when no children provided.
 * - Attribute forwarding: all unrecognized props spread to the root element.
 * - No internal `id`, `data-*`, or auto-generated attributes.
 *
 * Accessibility:
 * - Provide accessible text (avoid icon-only without labeling).
 * - When using `count` alone, ensure surrounding context labels purpose.
 *
 * @module ui/badge
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 */

import { cn } from "@utils/cn.js";

/**
 * Compute classes for a particular visual variant.
 * @param {"default"|"secondary"|"outline"|"destructive"|"primary"} variant
 * @returns {string}
 * @private
 */
function variantClasses(variant) {
    const map = {
        secondary: "badge-secondary",
        outline: "badge-outline",
        destructive: "badge-destructive",
        default: "badge",
        primary: "badge",
    };

    // Guard against undefined / unexpected keys before indexing the map.
    if (typeof variant === "string" && Object.hasOwn(map, variant)) {
        return map[variant];
    }

    return map.default || "badge";
}

/**
 * Compute classes for the badge shape (pill vs rounded).
 * `pill` boolean takes precedence over `shape`.
 * @param {{shape:"rounded"|"pill"|undefined, pill:boolean}} options
 * @returns {string}
 * @private
 */
function shapeClasses({ shape, pill }) {
    if (pill === true) return "rounded-full";
    const map = {
        pill: "rounded-full",
        rounded: "",
    };

    if (typeof shape === "string" && Object.hasOwn(map, shape)) {
        return map[shape];
    }

    return "";
}

/**
 * Compute classes for compact numeric/count rendering.
 * @param {boolean} enabled
 * @returns {string}
 * @private
 */
function countClasses(enabled) {
    return enabled ? "rounded-full font-mono tabular-nums" : "";
}

/**
 * Props accepted by `<Badge />`.
 *
 * Inline status / metadata label with visual variants and optional count style. Renders as `<span>`.
 * Forwards native span attributes plus custom props. When `count` is provided and there are no
 * `children`, the count value is rendered and compact numeric classes are applied. `pill` overrides
 * `shape="pill"`.
 *
 * @typedef {(HTMLElementAttributes) & ComponentProps & {
 *   variant?: "default"|"secondary"|"outline"|"destructive"|"primary",
 *   shape?: "rounded"|"pill",
 *   pill?: boolean,
 *   count?: number|string,
 * }} BadgeProps
 * @function Badge
 * @param {BadgeProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <Badge variant="secondary">Beta</Badge>
 * @example
 * <Badge count={3} variant="outline" />
 * @example
 * <Badge pill variant="destructive">Deprecated</Badge>
 * @public
 */
export default function Badge(props) {
    const {
        // visual state
        variant = "default",
        shape = "rounded",
        pill = false,

        // content
        children,
        count,

        // class merging
        class: klass,
        className,

        // Any other HTML attributes (aria-*, data-*, etc.)
        ...rest
    } = props || {};

    const isCount = typeof count !== "undefined" && count !== "";
    const rootClass =
        cn(variantClasses(variant), shapeClasses({ shape, pill }), countClasses(isCount), klass, className) || variantClasses(variant);

    const content = children !== undefined ? children : isCount ? String(count) : "";

    return (
        <span class={rootClass} {...rest}>
            {content}
        </span>
    );
}
