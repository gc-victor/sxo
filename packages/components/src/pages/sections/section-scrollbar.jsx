/**
 * @fileoverview Documentation section for custom scrollbar styling (vanilla JSX)
 *
 * @module ui/sections/scrollbar
 * @description
 * Documents the custom scrollbar CSS classes defined in the project's stylesheet.
 * These use CSS custom properties for theming and apply to both webkit and Firefox
 * scrollbar engines.
 *
 * Exports:
 * - `<SectionScrollbar>`: Documentation section showing scrollbar CSS usage.
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
 * Props accepted by `<SectionScrollbar />`.
 *
 * Documentation section for scrollbar CSS custom properties.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {}} SectionScrollbarProps
 * @function SectionScrollbar
 * @param {SectionScrollbarProps} props
 * @returns {JSX.Element} Rendered markup.
 * @public
 */
export function SectionScrollbar({ class: klass, className, ...rest }) {
    return (
        <Section id="scrollbar" {...rest}>
            <SectionHeading>Scrollbar</SectionHeading>
            <SectionDescription>
                Custom scrollbar styling using CSS custom properties. Applied globally via the project stylesheet.
            </SectionDescription>
            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview" class="pt-4" active>
                    <div
                        class="h-40 w-64 overflow-y-auto border rounded-lg p-4"
                        style="--scrollbar-thumb: #94a3b8; --scrollbar-track: #e2e8f0; --scrollbar-radius: 4px;"
                    >
                        <div class="space-y-4">
                            <p class="text-sm">Scroll down to see the custom scrollbar styling in action.</p>
                            {Array.from({ length: 10 }, (_, i) => (
                                <p key={i} class="text-sm text-muted-foreground">
                                    Item {i + 1}: The scrollbar uses custom properties --scrollbar-thumb for the handle color,
                                    --scrollbar-track for the track background, and --scrollbar-radius for rounded corners.
                                </p>
                            ))}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre class="css-highlight">
                        <code id="scrollbar-code" class="language-css">
                            {highlightJsx(`/* Custom scrollbar CSS custom properties */
--scrollbar-thumb: #94a3b8;
--scrollbar-track: #e2e8f0;
--scrollbar-radius: 4px;

/* Webkit scrollbar styling */
*::-webkit-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);
}
*::-webkit-scrollbar-track {
    background: var(--scrollbar-track);
    border-radius: var(--scrollbar-radius);
}
*::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb);
    border-radius: var(--scrollbar-radius);
    border: 1px solid var(--scrollbar-track);
}
*::-webkit-scrollbar-thumb:hover {
    background: var(--scrollbar-thumb-hover);
}`)}
                        </code>
                    </pre>

                    <CopyButton for="scrollbar-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>Custom scrollbar styles are applied globally and themed via CSS custom properties:</p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>
                                <code>--scrollbar-thumb</code>
                            </strong>
                            : Color of the scrollbar handle.
                        </li>
                        <li>
                            <strong>
                                <code>--scrollbar-track</code>
                            </strong>
                            : Background color of the scrollbar track.
                        </li>
                        <li>
                            <strong>
                                <code>--scrollbar-radius</code>
                            </strong>
                            : Border radius for the scrollbar elements.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
