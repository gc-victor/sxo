/**
 * @fileoverview Documentation section for sidebar layout pattern (vanilla JSX)
 *
 * @module ui/sections/sidebar
 * @description
 * Documents the page-level sidebar component used for navigation.
 * The sidebar is a layout pattern, not a single CSS class — it consists of
 * the sidebar container, navigation links, and responsive toggle behavior.
 *
 * Exports:
 * - `<SectionSidebar>`: Documentation section showing sidebar pattern.
 *
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 */

import Tabs, { TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import CopyButton from "@pages/components/copy-button.jsx";
import highlightJsx from "@pages/components/highlight-jsx.js";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

/**
 * Props accepted by `<SectionSidebar />`.
 *
 * Documentation section for the sidebar layout pattern.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {}} SectionSidebarProps
 * @function SectionSidebar
 * @param {SectionSidebarProps} props
 * @returns {JSX.Element} Rendered markup.
 * @public
 */
export function SectionSidebar({ class: klass, className, ...rest }) {
    return (
        <Section id="sidebar" {...rest}>
            <SectionHeading>Sidebar</SectionHeading>
            <SectionDescription>
                A responsive sidebar component for page-level navigation, with collapsible sections and active-state tracking.
            </SectionDescription>
            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview" class="pt-4" active>
                    <nav class="w-64 border rounded-lg p-4 space-y-4" aria-label="Sidebar example">
                        <div>
                            <h4 class="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Components</h4>
                            <ul class="space-y-1">
                                <li>
                                    <a href="/" class="block px-3 py-2 rounded-md text-sm font-medium bg-gray-100 dark:bg-gray-800">
                                        Button
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="/"
                                        class="block px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800"
                                    >
                                        Card
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="/"
                                        class="block px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800"
                                    >
                                        Dialog
                                    </a>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h4 class="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Layout</h4>
                            <ul class="space-y-1">
                                <li>
                                    <a
                                        href="/"
                                        class="block px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800"
                                    >
                                        Sidebar
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="/"
                                        class="block px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800"
                                    >
                                        Header
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </nav>
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre class="jsx-highlight">
                        <code id="sidebar-code" class="language-jsx">
                            {highlightJsx(`<nav class="w-64 border rounded-lg p-4 space-y-4">
    <div>
        <h4 class="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Components
        </h4>
        <ul class="space-y-1">
            <li>
                <a href="/" class="block px-3 py-2 rounded-md text-sm font-medium bg-gray-100">
                    Button
                </a>
            </li>
        </ul>
    </div>
</nav>`)}
                        </code>
                    </pre>

                    <CopyButton for="sidebar-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>
                        The sidebar is a layout pattern comprising collapsible navigation sections with active-state tracking and responsive
                        toggle behavior.
                    </p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>Sidebar component</strong>: The page-level navigation element with section groups and links.
                        </li>
                        <li>
                            <strong>Toggle button</strong>: Mobile-responsive hamburger button that shows/hides the sidebar.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
