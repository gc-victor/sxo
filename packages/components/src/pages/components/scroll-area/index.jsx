/**
 * Scroll Area component page.
 *
 * Documentation for custom scroll-area styling using CSS custom properties.
 * Inline content (no separate section file — this component is standalone).
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import CopyButton from "@pages/components/copy-button.jsx";
import { highlightJsx } from "@pages/components/highlight-jsx.js";
import { Section, SectionDescription, SectionHeading } from "../../sections/section.jsx";
import { DocLayout } from "../doc-layout.jsx";

export default function ScrollAreaPage() {
    return (
        <DocLayout title="Scroll Area" currentPage="scroll-area">
            <Section id="scroll-area">
                <SectionHeading>Scroll Area</SectionHeading>
                <SectionDescription>
                    Custom scroll-area styling using CSS custom properties. Applied globally via the project stylesheet.
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
                            style="--scroll-area-thumb: #94a3b8; --scroll-area-track: #e2e8f0; --scroll-area-radius: 4px;"
                        >
                            <div class="space-y-4">
                                <p class="text-sm">Scroll down to see the custom scroll-area styling in action.</p>
                                {Array.from({ length: 10 }, (_, i) => (
                                    <p key={i} class="text-sm text-muted-foreground">
                                        Item {i + 1}: The scroll area uses custom properties --scroll-area-thumb for the handle color,
                                        --scroll-area-track for the track background, and --scroll-area-radius for rounded corners.
                                    </p>
                                ))}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent name="code" class="mt-4 relative">
                        <pre class="css-highlight">
                            <code id="scroll-area-code" class="language-css">
                                {highlightJsx(`/* Custom scroll-area CSS custom properties */
--scroll-area-thumb: #94a3b8;
--scroll-area-track: #e2e8f0;
--scroll-area-radius: 4px;

/* Webkit scrollbar styling */
*::-webkit-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: var(--scroll-area-thumb) var(--scroll-area-track);
}
*::-webkit-scrollbar-track {
    background: var(--scroll-area-track);
    border-radius: var(--scroll-area-radius);
}
*::-webkit-scrollbar-thumb {
    background: var(--scroll-area-thumb);
    border-radius: var(--scroll-area-radius);
    border: 1px solid var(--scroll-area-track);
}
*::-webkit-scrollbar-thumb:hover {
    background: var(--scroll-area-thumb-hover);
}`)}
                            </code>
                        </pre>

                        <CopyButton for="scroll-area-code" />
                    </TabsContent>
                </Tabs>

                <div class="mt-12 space-y-6">
                    <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                    <div class="prose space-y-4">
                        <p>Custom scroll-area styles are applied globally and themed via CSS custom properties:</p>
                        <ul class="list-disc pl-6 space-y-2">
                            <li>
                                <strong>
                                    <code>--scroll-area-thumb</code>
                                </strong>
                                : Color of the scroll handle.
                            </li>
                            <li>
                                <strong>
                                    <code>--scroll-area-track</code>
                                </strong>
                                : Background color of the scroll track.
                            </li>
                            <li>
                                <strong>
                                    <code>--scroll-area-radius</code>
                                </strong>
                                : Border radius for the scroll elements.
                            </li>
                        </ul>
                    </div>
                </div>
            </Section>
        </DocLayout>
    );
}
