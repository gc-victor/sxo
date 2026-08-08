/**
 * @fileoverview Demo section for Combobox component (vanilla JSX + reactive client island)
 *
 * @module ui/sections/combobox
 * @description
 * Showcases the Combobox component with search filtering and dropdown selection.
 *
 * Exports:
 * - `<SectionCombobox>`: Demo section for Combobox.
 *
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 */

import Combobox from "@components/combobox.jsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import CopyButton from "@pages/components/copy-button.jsx";
import { highlightJsx } from "@pages/components/highlight-jsx.js";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

/**
 * Props accepted by `<SectionCombobox />`.
 *
 * Demo section showcasing Combobox.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {}} SectionComboboxProps
 * @function SectionCombobox
 * @param {SectionComboboxProps} props
 * @returns {JSX.Element} Rendered markup.
 * @public
 */
export function SectionCombobox({ class: klass, className, ...rest }) {
    return (
        <Section id="combobox" {...rest}>
            <SectionHeading>Combobox</SectionHeading>
            <SectionDescription>Type-ahead combobox with search filtering and dropdown option selection.</SectionDescription>
            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview" class="pt-4" active>
                    <Combobox />
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre class="jsx-highlight">
                        <code id="combobox-code" class="language-jsx">
                            {highlightJsx(`<Combobox />`)}
                        </code>
                    </pre>

                    <CopyButton for="combobox-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>Use the following primitive to build comboboxes:</p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>&lt;Combobox&gt;</strong>: Type-ahead combobox with search filtering, keyboard navigation, and option
                            selection.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
