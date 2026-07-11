/**
 * @fileoverview Sidebar component for navigation with responsive behavior (vanilla JSX).
 *
 * @module ui/sidebar
 *
 * @description
 * A sidebar navigation component that integrates with the reactive client component for
 * responsive show/hide behavior, current page highlighting, and mobile interactions.
 *
 * Exports:
 * - `Sidebar`: Root sidebar container with reactive behavior.
 *
 * Design notes:
 * - Uses <bc-sidebar> custom element with data attributes for configuration.
 * - Responsive: controlled by breakpoint, initial states for desktop/mobile.
 * - Integrates with client-side navigation and custom events.
 *
 * @author: Víctor García
 * @license MIT
 * @version 1.0.0
 */

import { cn } from "@utils/cn.js";

/**
 * Nav data model for sidebar navigation.
 *
 * Groups: "Getting started" (installation + external github) and "Components" (41 component pages).
 * Each item has a `label` (display text), `href` (route path), and optionally `external: true`.
 * Active-state highlighting matches `item.href` against the current page's href.
 */
const sidebarNav = {
    groups: [
        {
            label: "Getting started",
            items: [
                { label: "Installation", href: "/installation" },
                { label: "GitHub", href: "https://github.com/gc-victor/sxo", external: true },
            ],
        },
        {
            label: "Components",
            items: [
                { label: "Accordion", href: "/components/accordion" },
                { label: "Alert", href: "/components/alert" },
                { label: "Alert Dialog", href: "/components/alert-dialog" },
                { label: "Avatar", href: "/components/avatar" },
                { label: "Badge", href: "/components/badge" },
                { label: "Breadcrumb", href: "/components/breadcrumb" },
                { label: "Button", href: "/components/button" },
                { label: "Button Group", href: "/components/button-group" },
                { label: "Card", href: "/components/card" },
                { label: "Checkbox", href: "/components/checkbox" },
                { label: "Collapsible", href: "/components/collapsible" },
                { label: "Combobox", href: "/components/combobox" },
                { label: "Command", href: "/components/command" },
                { label: "Dialog", href: "/components/dialog" },
                { label: "Drawer", href: "/components/drawer" },
                { label: "Dropdown Menu", href: "/components/dropdown-menu" },
                { label: "Empty", href: "/components/empty" },
                { label: "Field", href: "/components/field" },
                { label: "Form", href: "/components/form" },
                { label: "Input", href: "/components/input" },
                { label: "Input Group", href: "/components/input-group" },
                { label: "Item", href: "/components/item" },
                { label: "Kbd", href: "/components/kbd" },
                { label: "Label", href: "/components/label" },
                { label: "Native Select", href: "/components/native-select" },
                { label: "Pagination", href: "/components/pagination" },
                { label: "Popover", href: "/components/popover" },
                { label: "Progress", href: "/components/progress" },
                { label: "Radio Group", href: "/components/radio-group" },
                { label: "Scrollbar", href: "/components/scrollbar" },
                { label: "Select", href: "/components/select" },
                { label: "Select Menu", href: "/components/select-menu" },
                { label: "Sidebar", href: "/components/sidebar" },
                { label: "Skeleton", href: "/components/skeleton" },
                { label: "Slider", href: "/components/slider" },
                { label: "Switch", href: "/components/switch" },
                { label: "Table", href: "/components/table" },
                { label: "Tabs", href: "/components/tabs" },
                { label: "Textarea", href: "/components/textarea" },
                { label: "Toast", href: "/components/toast" },
                { label: "Tooltip", href: "/components/tooltip" },
            ],
        },
    ],
};

/**
 * Sidebar component for navigation.
 *
 * Props:
 * - `initialOpen` (boolean, default: true) - Initial open state on desktop
 * - `initialMobileOpen` (boolean, default: false) - Initial open state on mobile
 * - `breakpoint` (number, default: 768) - Responsive breakpoint in pixels
 *
 * @param {HTMLElementAttributes & ComponentProps & {
 *   initialOpen?: boolean,
 *   initialMobileOpen?: boolean,
 *   breakpoint?: number,
 * }} props
 * @returns {string} Rendered HTML string
 * @public
 */
export default function Sidebar({
    children,
    class: klass,
    className,
    currentPage,
    initialOpen = true,
    initialMobileOpen = false,
    breakpoint = 768,
    ...rest
}) {
    const currentHref = currentPage === "installation" ? "/installation" : currentPage ? `/components/${currentPage}` : "";

    return (
        <el-sidebar class={cn("sidebar", className || klass)} {...rest}>
            <aside>
                <nav data-sidebar-initialized>
                    <header class="p-0! flex items-center justify-between">
                        <a href="/" class="p-4">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="currentColor"
                                viewBox="0 0 59 23"
                                width="100%"
                                height="100%"
                                class="w-full h-full"
                            >
                                <title>SXO</title>
                                <path d="M44.89 23v-4.5h-4.5V5h4.5V.5h9V5h4.5v13.5h-4.5V23h-9Zm0-4.68h9V5.18h-9v13.14Z" />
                                <path d="M36.25 23v-4.5h-4.5V14h-4.5V9.5h-4.5V5h-4.5V.5h4.5V5h4.5v4.5h4.5V14h4.5v4.5h4.5V23h-4.5Zm-4.5-13.5V5h4.5V.5h4.5V5h-4.5v4.5h-4.5Zm-9 9V14h4.5v4.5h-4.5Zm-4.5 4.5v-4.5h4.5V23h-4.5Z" />
                                <path d="M5.11 5V.5h13.5V5H5.11Zm9 13.5V14h-9V9.5H.61V5h4.5v4.5h9V14h4.5v4.5h-4.5ZM.61 23v-4.5h13.5V23H.61Z" />
                            </svg>
                        </a>
                    </header>

                    <div class="scrollbar flex flex-col flex-1 min-h-0 overflow-y-auto gap-8 p-4">
                        {sidebarNav.groups.map((group) => (
                            <div>
                                <h3 class="text-sm text-muted-foreground mb-4">{group.label}</h3>
                                <ul class="space-y-2 text-sm">
                                    {group.items.map((item) => {
                                        const isActive = item.href === currentHref;
                                        if (item.href === "/installation") {
                                            return (
                                                <li>
                                                    <a href={item.href} aria-current={isActive ? "page" : undefined}>
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            width="16"
                                                            height="16"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            stroke-width="2"
                                                            stroke-linecap="round"
                                                            stroke-linejoin="round"
                                                            class="inline-block mr-2 align-text-top"
                                                        >
                                                            <title>Installation</title>
                                                            <path d="m7 11 2-2-2-2"></path>
                                                            <path d="M11 13h4"></path>
                                                            <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
                                                        </svg>
                                                        <span>{item.label}</span>
                                                    </a>
                                                </li>
                                            );
                                        }
                                        if (item.external) {
                                            return (
                                                <li>
                                                    <a href={item.href} target="_blank" rel="noopener noreferrer">
                                                        <svg
                                                            fill="currentColor"
                                                            viewBox="0 0 24 24"
                                                            width="16"
                                                            height="16"
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            class="inline-block mr-2 align-text-top"
                                                        >
                                                            <title>GitHub</title>
                                                            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"></path>
                                                        </svg>
                                                        <span>{item.label}</span>
                                                    </a>
                                                </li>
                                            );
                                        }
                                        return (
                                            <li>
                                                <a href={item.href} aria-current={isActive ? "page" : undefined}>
                                                    {item.label}
                                                </a>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))}
                    </div>
                </nav>
            </aside>
        </el-sidebar>
    );
}
