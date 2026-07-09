/**
 * @fileoverview Demo section for Collapsible component (vanilla JSX + reactive client island)
 *
 * @module ui/sections/collapsible
 * @description
 * Showcases the Collapsible component with default closed, default open, and nested usage.
 *
 * Exports:
 * - `<SectionCollapsible>`: Demo section for Collapsible.
 *
 * @license MIT
 */

import Collapsible from "@components/collapsible.jsx";
import Tabs, { TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import CopyButton from "@pages/components/copy-button.jsx";
import highlightJsx from "@pages/components/highlight-jsx.js";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

/**
 * Props accepted by `<SectionCollapsible />`.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {}} SectionCollapsibleProps
 * @function SectionCollapsible
 * @param {SectionCollapsibleProps} props
 * @returns {JSX.Element} Rendered markup.
 * @public
 */
export function SectionCollapsible({ class: klass, className, ...rest }) {
    return (
        <Section id="collapsible" {...rest}>
            <SectionHeading>Collapsible</SectionHeading>
            <SectionDescription>
                Single independent toggle that shows/hides content. Unlike Accordion, Collapsible is an isolated toggle with no grouping.
            </SectionDescription>
            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview" class="pt-4 space-y-4" active>
                    <Collapsible trigger="Toggle Content">
                        <p class="text-sm text-muted-foreground">This content is hidden by default. Click the trigger to toggle it open.</p>
                    </Collapsible>

                    <Collapsible trigger="Start Open" defaultOpen>
                        <p class="text-sm text-muted-foreground">
                            This content starts open because <code>defaultOpen</code> is set to <code>true</code>.
                        </p>
                    </Collapsible>
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre class="jsx-highlight">
                        <code id="collapsible-code" class="language-jsx">
                            {highlightJsx(`<Collapsible trigger="Toggle Content">
    <p>This content is hidden by default.</p>
</Collapsible>

<Collapsible trigger="Start Open" defaultOpen>
    <p>This content starts open.</p>
</Collapsible>`)}
                        </code>
                    </pre>
                    <CopyButton for="collapsible-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>Use the following primitive to build collapsible sections:</p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>&lt;Collapsible&gt;</strong>: Single independent toggle. Accepts <code>trigger</code> (button label),
                            <code>defaultOpen</code> (boolean), and <code>className</code>.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
