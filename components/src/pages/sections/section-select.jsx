import Select, { SelectGroup, SelectOption, SelectPlaceholder } from "@components/select.jsx";
import Tabs, { TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import CopyButton from "@pages/components/copy-button.jsx";
import highlightJsx from "@pages/components/highlight-jsx.js";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

/**
 * Props accepted by `<SectionSelect />`.
 *
 * Demo section showing Select component usage and examples.
 * Renders a small gallery of `Select` variants and groupings.
 * Inherits native div attributes for the outer wrapper.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {}} SectionSelectProps
 * @function SectionSelect
 * @param {SectionSelectProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <SectionSelect />
 * @public
 * @since 1.0.0
 */
export function SectionSelect(props) {
    return (
        <Section id="select" {...props}>
            <SectionHeading>Select</SectionHeading>
            <SectionDescription>Displays a list of options for the user to pick from—triggered by a button.</SectionDescription>

            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview" class="pt-4" active>
                    <div class="flex gap-4 items-end">
                        <div class="flex flex-col gap-2">
                            <label for="select-fruit" class="text-sm font-medium">
                                Fruit
                            </label>
                            <Select id="select-fruit" name="fruit">
                                <SelectPlaceholder>Fruits</SelectPlaceholder>
                                <SelectOption value="apple">Apple</SelectOption>
                                <SelectOption value="banana">Banana</SelectOption>
                                <SelectOption value="blueberry">Blueberry</SelectOption>
                                <SelectOption value="grapes">Grapes</SelectOption>
                                <SelectOption value="pineapple">Pineapple</SelectOption>
                            </Select>
                        </div>
                        <div class="flex flex-col gap-2">
                            <label for="select-chart" class="text-sm font-medium">
                                Chart
                            </label>
                            <Select id="select-chart" name="chart" value="line">
                                <SelectGroup label="Charts">
                                    <SelectOption value="bar">Bar</SelectOption>
                                    <SelectOption value="line">Line</SelectOption>
                                    <SelectOption value="pie">Pie</SelectOption>
                                </SelectGroup>
                            </Select>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre class="jsx-highlight">
                        <code id="select-code" class="language-jsx">
                            {highlightJsx(`<div class="flex space-x-4">
    <Select name="fruit">
        <SelectPlaceholder>Fruits</SelectPlaceholder>
        <SelectOption value="apple">Apple</SelectOption>
        <SelectOption value="banana">Banana</SelectOption>
        <SelectOption value="blueberry">Blueberry</SelectOption>
        <SelectOption value="grapes">Grapes</SelectOption>
        <SelectOption value="pineapple">Pineapple</SelectOption>
    </Select>
    <Select name="chart" value="line">
        <SelectGroup label="Charts">
            <SelectOption value="bar">Bar</SelectOption>
            <SelectOption value="line">Line</SelectOption>
            <SelectOption value="pie">Pie</SelectOption>
        </SelectGroup>
    </Select>
</div>`)}
                        </code>
                    </pre>

                    <CopyButton for="select-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>Use the following primitives to build a select:</p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>&lt;Select&gt;</strong>: The root component for a select dropdown.
                        </li>
                        <li>
                            <strong>&lt;SelectPlaceholder&gt;</strong>: Placeholder text shown when no option is selected.
                        </li>
                        <li>
                            <strong>&lt;SelectOption&gt;</strong>: Individual selectable options.
                        </li>
                        <li>
                            <strong>&lt;SelectGroup&gt;</strong>: Groups options with a label.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
