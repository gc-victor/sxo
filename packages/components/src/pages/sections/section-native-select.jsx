/**
 * @fileoverview Demo section for NativeSelect component (vanilla JSX)
 *
 * @module ui/sections/native-select
 * @description
 * Showcases the NativeSelect component with options array, placeholder, and disabled state.
 *
 * Exports:
 * - `<SectionNativeSelect>`: Demo section for NativeSelect.
 *
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 */

import NativeSelect from "@components/native-select.jsx";
import Tabs, { TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import CopyButton from "@pages/components/copy-button.jsx";
import highlightJsx from "@pages/components/highlight-jsx.js";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

/**
 * Props accepted by `<SectionNativeSelect />`.
 *
 * Demo section showcasing NativeSelect component variants.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {}} SectionNativeSelectProps
 * @function SectionNativeSelect
 * @param {SectionNativeSelectProps} props
 * @returns {JSX.Element} Rendered markup.
 * @public
 */
export function SectionNativeSelect({ class: klass, className, ...rest }) {
    const fruits = [
        { value: "apple", label: "Apple" },
        { value: "banana", label: "Banana" },
        { value: "orange", label: "Orange" },
    ];

    return (
        <Section id="native-select" {...rest}>
            <SectionHeading>Native Select</SectionHeading>
            <SectionDescription>Styled native select element with options array or children.</SectionDescription>
            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview" class="pt-4 space-y-6" active>
                    <div>
                        <p class="text-sm font-medium mb-2">Basic</p>
                        <NativeSelect options={fruits} />
                    </div>
                    <div>
                        <p class="text-sm font-medium mb-2">With placeholder</p>
                        <NativeSelect placeholder="Choose a fruit..." options={fruits} />
                    </div>
                    <div>
                        <p class="text-sm font-medium mb-2">Disabled</p>
                        <NativeSelect options={fruits} disabled />
                    </div>
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre class="jsx-highlight">
                        <code id="native-select-code" class="language-jsx">
                            {highlightJsx(`{/* Basic */}
<NativeSelect options={[
    { value: "apple", label: "Apple" },
    { value: "banana", label: "Banana" },
    { value: "orange", label: "Orange" },
]} />

{/* With placeholder */}
<NativeSelect placeholder="Choose a fruit..." options={fruits} />

{/* Disabled */}
<NativeSelect options={fruits} disabled />`)}
                        </code>
                    </pre>

                    <CopyButton for="native-select-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>Use the following primitive to build native selects:</p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>&lt;NativeSelect&gt;</strong>: Styled native select element with <code>options</code> array,
                            <code>placeholder</code>, and standard HTML attributes.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
