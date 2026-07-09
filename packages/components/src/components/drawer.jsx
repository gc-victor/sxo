/**
 * @fileoverview Drawer component — animated side sheet (vanilla JSX + reactive client island)
 *
 * @module ui/drawer
 * @description
 * Animated side sheet that slides in from the left or right edge.
 * SSR renders the markup; client island handles open/close, focus trap, and scroll lock.
 *
 * Exports:
 * - `Drawer` (default): Drawer with trigger, backdrop, and side panel.
 *
 * Design notes:
 * - Uses `<el-drawer>` custom element for client enhancement.
 * - `side` prop controls slide direction ("left" | "right", default "right").
 * - Focus trap when open, focus restoration on close.
 * - CSS transitions on `translate` for smooth animation.
 *
 * @license MIT
 */

import { cn } from "@utils/cn.js";
import { IconX } from "./icon.jsx";

/**
 * Props accepted by `<Drawer />`.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {
 *   side?: "left" | "right",
 *   title?: string,
 *   children?: JSX.Element|JSX.Element[]|string,
 * }} DrawerProps
 * @function Drawer
 * @param {DrawerProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <Drawer side="right" title="Settings">Content</Drawer>
 * @public
 */
export default function Drawer({ class: klass, className, side = "right", title = "Drawer", children, ...rest }) {
    const panelDirClass = side === "left" ? "drawer-left" : "drawer-right";

    return (
        <el-drawer>
            <div class={cn("drawer-root", klass, className)} {...rest}>
                {/* Trigger button */}
                <button type="button" class="btn btn-outline" $onclick="openDrawer">
                    Open {side === "left" ? "Left" : "Right"}
                </button>

                {/* Backdrop */}
                <div class="drawer-backdrop" $onclick="closeDrawer" />

                {/* Side panel */}
                <div class={cn("drawer-panel", panelDirClass)} role="dialog" aria-label={title} aria-modal="true">
                    <div class="drawer-header">
                        <h2 class="drawer-title">{title}</h2>
                        <button type="button" class="drawer-close" aria-label="Close drawer" $onclick="closeDrawer">
                            <IconX width="20" height="20" aria-hidden="true" />
                        </button>
                    </div>
                    <div class="drawer-body">{children}</div>
                </div>
            </div>
        </el-drawer>
    );
}
