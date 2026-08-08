/**
 * @fileoverview Documentation section for keyboard input styling (vanilla JSX)
 *
 * @module ui/sections/kbd
 * @description
 * Demonstrates the basecoat `.kbd` CSS class for styling `<kbd>` elements that
 * represent keyboard input or keys. No JSX component wrapper — the CSS class is the API.
 *
 * Exports:
 * - `<SectionKbd>`: Documentation section showing kbd usage.
 *
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import CopyButton from "@pages/components/copy-button.jsx";
import { highlightJsx } from "@pages/components/highlight-jsx.js";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

/**
 * Props accepted by `<SectionKbd />`.
 *
 * Documentation section for the kbd CSS class.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {}} SectionKbdProps
 * @function SectionKbd
 * @param {SectionKbdProps} props
 * @returns {JSX.Element} Rendered markup.
 * @public
 */
export function SectionKbd({ class: klass, className, ...rest }) {
    return (
        <Section id="kbd" {...rest}>
            <SectionHeading>Kbd</SectionHeading>
            <SectionDescription>
                Styling for keyboard input elements using the <code>.kbd</code> CSS class.
            </SectionDescription>
            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview" class="pt-4" active>
                    <div class="flex flex-wrap items-center gap-2">
                        <kbd class="kbd">Ctrl</kbd>
                        <span class="text-muted-foreground">+</span>
                        <kbd class="kbd">C</kbd>
                        <span class="text-muted-foreground mx-2">or</span>
                        <kbd class="kbd">⌘</kbd>
                        <span class="text-muted-foreground">+</span>
                        <kbd class="kbd">C</kbd>
                    </div>
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre class="jsx-highlight">
                        <code id="kbd-code" class="language-jsx">
                            {highlightJsx(`<kbd class="kbd">Ctrl</kbd>
<span class="text-muted-foreground">+</span>
<kbd class="kbd">C</kbd>

<span class="text-muted-foreground">or</span>

<kbd class="kbd">⌘</kbd>
<span class="text-muted-foreground">+</span>
<kbd class="kbd">C</kbd>`)}
                        </code>
                    </pre>

                    <CopyButton for="kbd-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>
                        Use the <code>.kbd</code> class on native <code>&lt;kbd&gt;</code> elements to style keyboard shortcuts and key
                        references.
                    </p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>&lt;kbd class="kbd"&gt;</strong>: Inline keyboard key styling with monospace font, border, and subtle
                            background.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
