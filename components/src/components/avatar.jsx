/**
 * @fileoverview Avatar UI primitives (vanilla JSX) providing single avatar and grouped avatar
 * components with initials fallback, shape + size tokens, optional grayscale, and overlap stacking.
 * Designed for SXO's vanilla JSX transformer (NOT React) and emits static markup only.
 *
 * Exports:
 * - Avatar: Single avatar (image or initials fallback) rendered as an inline <span>.
 * - AvatarGroup: Horizontal stack / cluster of Avatars with optional overlap ring, grayscale, and hover spread.
 *
 * Design notes:
 * - No automatic id generation; caller manages accessible labeling or contextual descriptions.
 * - Attribute forwarding: unrecognized props are spread onto the root element of each component.
 * - `className` is accepted as an alias of `class`; merged deterministically.
 * - Fallback strategy: if `src` is missing (or intentionally omitted) initials are computed from
 *   `initials`, then `name`, then `alt`. A default "??" placeholder is used when nothing remains.
 * - Size token supports shorthands (xs|sm|md|lg|xl) mapping to utility classes or accepts a custom
 *   string (including pre-sized utility like "size-14").
 * - Returns static markup; no client-side lazy loading / observers or fetch logic.
 *
 * Accessibility:
 * - Provide a meaningful `alt` when the image conveys user identity; if purely decorative, supply
 *   an empty `alt=""` and consider separate textual labeling.
 * - Initials fallback content is textual and should not duplicate an external accessible label.
 * - Group wrapper does not impose list semantics; caller may wrap in <ul>/<ol> if needed.
 *
 * @module ui/avatar
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 */

import { cn } from "@utils/cn.js";

/* -------------------------------------------------------------------------------------------------
 * Avatar (single)
 * ------------------------------------------------------------------------------------------------- */
/**
 * Props accepted by `<Avatar />`.
 *
 * Single user/entity avatar component that displays an image (when `src` provided) or an initials
 * fallback (derived from `initials`, then `name`, then `alt`). Supports size + shape tokens and an
 * optional grayscale filter. All extra attributes are forwarded to the root `<span>` container.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {
 *   src?: string,
 *   alt?: string,
 *   srcset?: string,
 *   sizes?: string,
 *   name?: string,
 *   initials?: string,
 *   loading?: "lazy"|"eager"|"auto",
 *   size?: "xs"|"sm"|"md"|"lg"|"xl"|string,
 *   shape?: "circle"|"rounded"|"square",
 *   grayscale?: boolean
 * }} AvatarProps
 * @function Avatar
 * @param {AvatarProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <Avatar src="/users/alex.jpg" alt="Alex Doe" size="lg" />
 * @example
 * <Avatar name="Pat Smith" size="sm" shape="rounded" />
 * @example
 * <Avatar initials="AI" grayscale class="ring-2 ring-background" />
 * @public
 */
export default function Avatar(props) {
    const {
        src,
        alt = "",
        srcset,
        sizes,
        name,
        initials,
        loading,
        size = "md",
        shape = "circle",
        grayscale = false,
        class: klass,
        className,
        ...rest
    } = props || {};

    const rootClasses = cn(
        "avatar",
        "shrink-0",
        sizeClass(size),
        shapeClass(shape),
        "inline-flex",
        "items-center",
        "justify-center",
        "bg-muted",
        klass,
        className,
    );

    const initialsText = computeInitials({ initials, name, alt });
    const hasImage = !!src;

    return (
        <span class={rootClasses} {...rest}>
            {hasImage ? (
                <img
                    class={cn("object-cover", "w-full", "h-full", shapeClass(shape), grayscale ? "grayscale" : "")}
                    src={src}
                    srcset={srcset || src}
                    sizes={sizes}
                    alt={alt || name || initialsText}
                    {...(loading ? { loading } : {})}
                />
            ) : (
                <span class={cn("text-xs", "font-medium", "select-none", "leading-none", "text-foreground")}>{initialsText}</span>
            )}
        </span>
    );
}

/* -------------------------------------------------------------------------------------------------
 * AvatarGroup
 * ------------------------------------------------------------------------------------------------- */
/**
 * Props accepted by `<AvatarGroup />`.
 *
 * Cluster / stack wrapper that arranges multiple `<Avatar />` components horizontally with overlap
 * and optional ring outlines. Accepts either an `avatars` array (shorthand) or explicit `children`
 * markup (advanced composition). When using the `avatars` array, each entry maps directly to `<Avatar />`
 * props (with per-item `size` / `shape` fallback from group-level settings).
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {
 *   avatars?: AvatarProps[],
 *   size?: "xs"|"sm"|"md"|"lg"|"xl"|string,
 *   shape?: "circle"|"rounded"|"square",
 *   ring?: boolean,
 *   grayscaleChildren?: boolean,
 *   hoverSpread?: boolean
 * }} AvatarGroupProps
 * @function AvatarGroup
 * @param {AvatarGroupProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <AvatarGroup avatars={[
 *   { name: "Alex Doe" },
 *   { name: "Pat Smith" },
 *   { initials: "AI" },
 * ]} />
 * @example
 * <AvatarGroup size="sm" ring={false}>
 *   <Avatar name="Zara Lane" />
 *   <Avatar initials="JS" />
 * </AvatarGroup>
 * @example
 * <AvatarGroup hoverSpread grayscaleChildren avatars={[
 *   { name: "Design Lead", initials: "DL" },
 *   { name: "Dev Lead", initials: "VL" },
 * ]}/>
 * @public
 */
export function AvatarGroup(props) {
    const {
        avatars,
        size = "md",
        shape = "circle",
        ring = true,
        grayscaleChildren = false,
        hoverSpread = false,
        class: klass,
        className,
        children,
        ...rest
    } = props || {};

    const childImgQualifiers = cn(
        "[&_img]:object-cover",
        "[&_img]:shrink-0",
        ring ? "[&_img]:ring-background [&_img]:ring-2" : "",
        grayscaleChildren ? "[&_img]:grayscale" : "",
    );

    const wrapperClasses = cn(
        "avatar-group",
        "flex",
        "-space-x-2",
        hoverSpread ? "hover:space-x-1" : "",
        childImgQualifiers,
        klass,
        className,
    );

    let content;
    if (Array.isArray(avatars) && avatars.length) {
        content = avatars.map((av) => {
            const aSize = av?.size || size;
            const aShape = av?.shape || shape;
            const avProps = av || {};
            return <Avatar {...avProps} size={aSize} shape={aShape} />;
        });
    } else {
        content = children;
    }

    return (
        <div class={wrapperClasses} {...rest}>
            {content}
        </div>
    );
}

/* -------------------------------------------------------------------------------------------------
 * Internal utilities
 * ------------------------------------------------------------------------------------------------- */
/**
 * Map a size token or custom string to a utility class.
 * @param {string|undefined} size
 * @returns {string}
 * @private
 */
function sizeClass(size) {
    const map = {
        xs: "size-6",
        sm: "size-8",
        md: "size-10",
        lg: "size-12",
        xl: "size-16",
    };
    // Allow direct utility strings like "size-14"
    if (typeof size === "string" && size.startsWith("size-")) return size;

    // Guard against undefined / unexpected keys before indexing the map.
    if (typeof size === "string" && Object.hasOwn(map, size)) {
        // Use a local cast to silence index typing concerns while keeping the runtime check.
        return /** @type {any} */ (map)[size];
    }

    // Fallback to the medium size token when unknown.
    return map.md || "size-10";
}

/**
 * Map a shape token to a Tailwind border-radius utility class.
 * @param {string|undefined} shape
 * @returns {string}
 * @private
 */
function shapeClass(shape) {
    const map = {
        square: "rounded-none",
        rounded: "rounded-lg",
        circle: "rounded-full",
    };

    // Guard against undefined / unexpected keys before indexing the map.
    if (typeof shape === "string" && Object.hasOwn(map, shape)) {
        // Cast to any for safe dynamic indexing while preserving the runtime guard.
        return /** @type {any} */ (map)[shape];
    }

    return "rounded-full";
}

/**
 * Derive a compact initials string from provided options.
 * @param {Object} options
 * @param {string} [options.initials]
 * @param {string} [options.name]
 * @param {string} [options.alt]
 * @returns {string}
 * @private
 */
function computeInitials({ initials, name, alt }) {
    if (initials && String(initials).trim()) return String(initials).trim().slice(0, 3).toUpperCase();
    const source = (name || alt || "").trim();
    if (!source) return "??";
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
}
