/**
 * @fileoverview Section showcasing the Checkbox component (vanilla JSX)
 *
 * @module ui/SectionCheckbox
 * @description
 * This section demonstrates various Checkbox component usages,
 * including inline and stacked labels, disabled states, and custom styling.
 *
 * Exports:
 * - `SectionCheckbox`: Displays different Checkbox component examples.
 *
 * @author Víctor García
 * @license MIT
 * @version 1.0.0
 */

import Checkbox from "@components/checkbox.jsx";
import Label from "@components/label.jsx";
import Tabs, { TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import CopyButton from "@pages/components/copy-button.jsx";
import highlightJsx from "@pages/components/highlight-jsx.js";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

/**
 * Props accepted by `<SectionCheckbox />`.
 *
 * This component does not accept any custom props.
 * It primarily serves as a container for Checkbox examples.
 *
 * @typedef {HTMLElementAttributes & ComponentProps & {}} SectionCheckboxProps
 * @function SectionCheckbox
 * @param {SectionCheckboxProps} props
 * @returns {JSX.Element} Rendered markup for the Checkbox section.
 * @example
 * <SectionCheckbox />
 * @public
 * @since 1.0.0
 */
export function SectionCheckbox(props) {
    return (
        <Section id="checkbox" {...props}>
            <SectionHeading>Checkbox</SectionHeading>
            <SectionDescription>A control that allows the user to toggle between checked and not checked.</SectionDescription>
            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview" class="pt-4 space-y-4" active>
                    {/* Case 1: Inline label */}
                    <Label variant="inline">
                        <Checkbox name="terms" />
                        <span>Accept terms and conditions</span>
                    </Label>

                    {/* Case 2: Align Top label */}
                    <Label variant="align-top">
                        <Checkbox name="terms-stacked" />
                        <span class="grid gap-2">
                            <span class="block text-sm font-medium leading-none">Accept terms and conditions</span>
                            <span class="block text-muted-foreground text-sm">
                                By clicking this checkbox, you agree to the terms and conditions.
                            </span>
                        </span>
                    </Label>

                    {/* Case 3: Disabled checkbox */}
                    <Label variant="inline">
                        <Checkbox name="disabled-checkbox" disabled />
                        <span>Disabled checkbox</span>
                    </Label>

                    {/* Case 4: Custom styled checked checkbox */}
                    <Label
                        variant="inline"
                        class="flex items-start gap-3 border p-3 hover:bg-accent/50 rounded-lg has-[input[type='checkbox']:checked]:border-blue-600 has-[input[type='checkbox']:checked]:bg-blue-50 dark:has-[input[type='checkbox']:checked]:border-blue-900 dark:has-[input[type='checkbox']:checked]:bg-blue-950"
                    >
                        <Checkbox
                            name="marketing-emails"
                            class=" checked:bg-blue-600 checked:border-blue-600 dark:checked:bg-blue-700 dark:checked:border-blue-700 checked:after:bg-white"
                            checked
                        />
                        <span class="grid gap-2">
                            <span class="block text-sm font-medium leading-none">Marketing emails</span>
                            <span class="block text-muted-foreground text-sm">Receive emails about new products, features, and more.</span>
                        </span>
                    </Label>
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre class="jsx-highlight">
                        <code id="checkbox-code" class="language-jsx">
                            {highlightJsx(`{/* Case 1: Inline label */}
<Label variant="inline">
    <Checkbox name="terms" />
    <span>Accept terms and conditions</span>
</Label>

{/* Case 2: Align Top label */}
<Label variant="align-top">
    <Checkbox name="terms-stacked" />
    <span class="grid gap-2">
        <span class="block text-sm font-medium leading-none">Accept terms and conditions</span>
        <span class="block text-muted-foreground text-sm">
            By clicking this checkbox, you agree to the terms and conditions.
        </span>
    </span>
</Label>

{/* Case 3: Disabled checkbox */}
<Label variant="inline">
    <Checkbox name="disabled-checkbox" disabled />
    <span>Disabled checkbox</span>
</Label>

{/* Case 4: Custom styled checked checkbox */}
<Label
    variant="stacked"
    class="flex items-start gap-3 border p-3 hover:bg-accent/50 rounded-lg has-[input[type='checkbox']:checked]:border-blue-600 has-[input[type='checkbox']:checked]:bg-blue-50 dark:has-[input[type='checkbox']:checked]:border-blue-900 dark:has-[input[type='checkbox']:checked]:bg-blue-950"
>
    <Checkbox
        name="marketing-emails"
        class=" checked:bg-blue-600 checked:border-blue-600 dark:checked:bg-blue-700 dark:checked:border-blue-700 checked:after:bg-white"
        checked
    />
    <span class="grid gap-2">
        <span class="block text-sm font-medium leading-none">Marketing emails</span>
        <span class="block text-muted-foreground text-sm">Receive emails about new products, features, and more.</span>
    </span>
</Label>`)}
                        </code>
                    </pre>

                    <CopyButton for="checkbox-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>Use the following primitives to build checkboxes:</p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>&lt;Checkbox&gt;</strong>: The checkbox input component.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
