/**
 * @fileoverview Demo section for InputGroup component (vanilla JSX)
 *
 * @module ui/sections/input-group
 * @description
 * Showcases the InputGroup component with prepend, append, and both variants.
 *
 * Exports:
 * - `<SectionInputGroup>`: Demo section for InputGroup.
 *
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 */

import InputGroup from "@components/input-group.jsx";
import Tabs, { TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import CopyButton from "@pages/components/copy-button.jsx";
import highlightJsx from "@pages/components/highlight-jsx.js";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

/**
 * Props accepted by `<SectionInputGroup />`.
 *
 * Demo section showcasing InputGroup component variants.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {}} SectionInputGroupProps
 * @function SectionInputGroup
 * @param {SectionInputGroupProps} props
 * @returns {JSX.Element} Rendered markup.
 * @public
 */
export function SectionInputGroup({ class: klass, className, ...rest }) {
    return (
        <Section id="input-group" {...rest}>
            <SectionHeading>Input Group</SectionHeading>
            <SectionDescription>Groups an input with prepend and/or append addon elements.</SectionDescription>
            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview" class="pt-4 space-y-6" active>
                    <div>
                        <p class="text-sm font-medium mb-2">Prepend text</p>
                        <InputGroup prepend="https://">
                            <input class="input" placeholder="example.com" />
                        </InputGroup>
                    </div>
                    <div>
                        <p class="text-sm font-medium mb-2">Append button</p>
                        <InputGroup
                            append={
                                <button type="button" class="btn">
                                    Search
                                </button>
                            }
                        >
                            <input class="input" placeholder="Search..." />
                        </InputGroup>
                    </div>
                    <div>
                        <p class="text-sm font-medium mb-2">Both prepend and append</p>
                        <InputGroup prepend="$" append=".00">
                            <input class="input" placeholder="0.00" />
                        </InputGroup>
                    </div>
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre class="jsx-highlight">
                        <code id="input-group-code" class="language-jsx">
                            {highlightJsx(`{/* Prepend text */}
<InputGroup prepend="https://">
    <input class="input" placeholder="example.com" />
</InputGroup>

{/* Append button */}
<InputGroup append={<button class="btn">Search</button>}>
    <input class="input" placeholder="Search..." />
</InputGroup>

{/* Both prepend and append */}
<InputGroup prepend="$" append=".00">
    <input class="input" placeholder="0.00" />
</InputGroup>`)}
                        </code>
                    </pre>

                    <CopyButton for="input-group-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>Use the following primitive to build input groups:</p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>&lt;InputGroup&gt;</strong>: Groups an input with <code>prepend</code> and <code>append</code> addon
                            elements.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
