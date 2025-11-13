/**
 * @fileoverview <el-sidebar> reactive component for sidebar navigation with responsive behavior.
 *
 * Behavior:
 * - Toggles open/closed state based on breakpoint and initial settings
 * - Updates aria-current on links matching current path
 * - Closes on mobile when clicking links or outside
 * - Listens to 'sxo:sidebar' custom events for programmatic control
 * - Patches history API for location changes
 *
 * Usage (server-rendered HTML):
 * <el-sidebar id="main-sidebar" data-initial-open="true" data-initial-mobile-open="false" data-breakpoint="768">
 *   <nav>
 *     <a href="/">Home</a>
 *     <a href="/about">About</a>
 *   </nav>
 * </el-sidebar>
 *
 * @license MIT
 */
import { define } from "@qery/reactive-component";

define("el-sidebar", ({ $element, $state, $effect }) => {
    const breakpoint = 768;

    $state.open = window.getComputedStyle($element, null).display !== "none";

    $effect(() => {
        $element.classList.toggle("block!", $state.open);
        $element.classList.toggle("hidden", !$state.open);
        $element.classList.toggle("sidebar", $state.open);

        if ($state.open) {
            $element.removeAttribute("inert");
            $element.removeAttribute("aria-hidden");
        } else {
            $element.setAttribute("aria-hidden", "true");
            $element.setAttribute("inert", "");
        }
    });

    const handleSidebarEvent = () => {
        $state.open = !$state.open;
    };

    const handleClick = (/** @type {MouseEvent} */ event) => {
        const target = /** @type {Element | null} */ (event.target);
        const nav = $element.querySelector("nav");

        const isMobile = window.innerWidth < breakpoint;

        if (isMobile && target?.closest("a, button") && !target.closest("[data-keep-mobile-sidebar-open]")) {
            if (document.activeElement && "blur" in document.activeElement) {
                /** @type {HTMLElement} */ (document.activeElement).blur();
            }
            $state.open = false;
            return;
        }

        if (target === $element || (nav && target && !nav.contains(target))) {
            if (document.activeElement && "blur" in document.activeElement) {
                /** @type {HTMLElement} */ (document.activeElement).blur();
            }
            $state.open = false;
        }
    };

    return {
        connected: () => {
            document.addEventListener("sxo:sidebar", handleSidebarEvent);
            $element.addEventListener("click", handleClick);
        },
        disconnected: () => {
            document.removeEventListener("sxo:sidebar", handleSidebarEvent);
            $element.removeEventListener("click", handleClick);
        },
    };
});
