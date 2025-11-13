import Label from "@components/label.jsx";
import RadioGroup, { RadioGroupItem } from "@components/radio-group.jsx";
import Tabs, { TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import CopyButton from "@pages/components/copy-button.jsx";
import highlightJsx from "@pages/components/highlight-jsx.js";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

/**
 * Props accepted by `<SectionRadioGroup />`.
 *
 * Demo section showing radio group usage and variants.
 * Renders examples of grouped radio inputs and demonstrates selected / disabled states.
 * Inherits native div attributes for the outer wrapper.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {}} SectionRadioGroupProps
 * @function SectionRadioGroup
 * @param {SectionRadioGroupProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <SectionRadioGroup />
 * @public
 * @since 1.0.0
 */
export function SectionRadioGroup({ class: klass, className, ...rest }) {
    return (
        <Section id="radio-group" {...rest}>
            <SectionHeading>Radio Group</SectionHeading>
            <SectionDescription>
                A set of checkable buttons—known as radio buttons—where no more than one of the buttons can be checked at a time.
            </SectionDescription>
            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview" class="pt-4" active>
                    <RadioGroup direction="row" aria-label="Appearance">
                        <div class="flex items-center gap-3">
                            <RadioGroupItem id="appearance-default" name="appearance" value="default" checked />
                            <Label for="appearance-default">Default</Label>
                        </div>
                        <div class="flex items-center gap-3">
                            <RadioGroupItem id="appearance-comfortable" name="appearance" value="comfortable" />
                            <Label for="appearance-comfortable">Comfortable</Label>
                        </div>
                        <div class="flex items-center gap-3">
                            <RadioGroupItem id="appearance-compact" name="appearance" value="compact" />
                            <Label for="appearance-compact">Compact</Label>
                        </div>
                    </RadioGroup>
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre class="jsx-highlight">
                        <code id="radio-group-code" class="language-jsx">
                            {highlightJsx(`<RadioGroup direction="row" aria-label="Appearance">
    <div class="flex items-center gap-3">
        <RadioGroupItem id="appearance-default" name="appearance" value="default" checked />
        <Label for="appearance-default">Default</Label>
    </div>
    <div class="flex items-center gap-3">
        <RadioGroupItem id="appearance-comfortable" name="appearance" value="comfortable" />
        <Label for="appearance-comfortable">Comfortable</Label>
    </div>
    <div class="flex items-center gap-3">
        <RadioGroupItem id="appearance-compact" name="appearance" value="compact" />
        <Label for="appearance-compact">Compact</Label>
    </div>
</RadioGroup>`)}
                        </code>
                    </pre>

                    <CopyButton for="radio-group-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>Use the following primitives to build radio groups:</p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>&lt;RadioGroup&gt;</strong>: The container component that manages the radio group state and provides
                            proper form integration.
                        </li>
                        <li>
                            <strong>&lt;RadioGroupItem&gt;</strong>: Individual radio button inputs that work together within a RadioGroup.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
