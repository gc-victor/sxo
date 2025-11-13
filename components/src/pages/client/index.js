/**
 * @fileoverview Client entry point for reactive components with intent-based lazy loading.
 *
 * @module pages/client
 * @description
 * Registers interactive components and sets up user-intent listeners to lazy-load
 * heavier components only when needed. Supports mobile-first interaction via touchstart.
 *
 * Eager components below are lightweight or foundational; heavier ones go into lazyComponents.
 *
 * @license MIT
 * @version 1.2.0
 */

import { lazyComponents } from "@utils/lazy-components.js";

if (process.env.NODE_ENV === "development") {
    const labels = [
        "@components/toast.client.js",
        "@components/accordion.client.js",
        "@components/alert-dialog.client.js",
        "@components/dialog.client.js",
        "@components/dropdown-menu.client.js",
        "@components/popover.client.js",
        "@components/select-menu.client.js",
        "@components/slider.client.js",
        "@components/tabs.client.js",
        "../components/copy-button.client.js",
        "../components/sidebar.client.js",
        "../components/theme-selector.client.js",
        "../components/theme-toggle.client.js",
    ];

    // Fire-and-forget, but report failures to avoid silent breakage in dev.
    void Promise.allSettled([
        import("@components/toast.client.js"),
        import("@components/accordion.client.js"),
        import("@components/alert-dialog.client.js"),
        import("@components/dialog.client.js"),
        import("@components/dropdown-menu.client.js"),
        import("@components/popover.client.js"),
        import("@components/select-menu.client.js"),
        import("@components/slider.client.js"),
        import("@components/tabs.client.js"),
        import("../components/copy-button.client.js"),
        import("../components/sidebar.client.js"),
        import("../components/theme-selector.client.js"),
        import("../components/theme-toggle.client.js"),
    ]).then((results) => {
        results.forEach((r, i) => {
            if (r.status === "rejected") {
                // eslint-disable-next-line no-console
                console.error(`Failed to load dev component: ${labels[i]}`, r.reason);
            }
        });
    });
} else {
    window.addEventListener("load", () => {
        import("../components/sidebar.client.js");
        import("@components/toast.client.js");
    });

    /**
     * Configure lazy loading for all interactive components.
     * Ensure modules exist before adding to avoid dynamic import errors.
     */
    lazyComponents({
        "el-accordion": () => import("@components/accordion.client.js"),
        "el-alert-dialog": () => import("@components/alert-dialog.client.js"),
        "el-copy-button": () => import("../components/copy-button.client.js"),
        "el-dialog": () => import("@components/dialog.client.js"),
        "el-dropdown-menu": () => import("@components/dropdown-menu.client.js"),
        "el-popover": () => import("@components/popover.client.js"),
        "el-select-menu": () => import("@components/select-menu.client.js"),
        "el-slider": () => import("@components/slider.client.js"),
        "el-tabs": () => import("@components/tabs.client.js"),
        "el-theme-selector": () => import("../components/theme-selector.client.js"),
        "el-theme-toggle": () => import("../components/theme-toggle.client.js"),
    });
}
