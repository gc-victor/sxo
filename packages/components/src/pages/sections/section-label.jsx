/**
 * @fileoverview Section showcasing the Label component (vanilla JSX)
 *
 * @module ui/SectionLabel
 * @description
 * This section demonstrates various Label component usages, including
 * inline, stacked, and checkbox labels with custom styling.
 *
 * Exports:
 * - `SectionLabel`: Displays different Label component examples.
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
 * Props accepted by `<SectionLabel />`.
 *
 * This component does not accept any custom props.
 * It primarily serves as a container for Label examples.
 *
 * @typedef {HTMLElementAttributes & ComponentProps & {}} SectionLabelProps
 * @function SectionLabel
 * @param {SectionLabelProps} props
 * @returns {JSX.Element} Rendered markup for the Label section.
 * @example
 * <SectionLabel />
 * @public
 */
export function SectionLabel(props) {
    return (
        <Section id="label" {...props}>
            <SectionHeading>Label</SectionHeading>
            <SectionDescription>Renders an accessible label associated with controls.</SectionDescription>
            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview" class="pt-4" active>
                    <div class="grid gap-8">
                        <Label variant="stacked" class="grid gap-3">
                            <span class="text-sm font-medium leading-none">Username</span>
                            <input class="input" type="text" placeholder="username" />
                        </Label>
                        <Label variant="stacked" class="grid gap-3">
                            <span class="text-sm font-medium leading-none">Message</span>
                            <textarea class="textarea" rows={3} placeholder="Type your message..."></textarea>
                            <span class="text-muted-foreground text-sm">Type your message and press enter to send.</span>
                        </Label>
                        <Label variant="inline">
                            <Checkbox id="demo-terms" />
                            <span>Accept terms and conditions</span>
                        </Label>
                        <Label variant="align-top">
                            <span class="text-sm font-medium leading-none">Comment</span>
                            <textarea class="textarea" rows={3} placeholder="Leave a comment..."></textarea>
                        </Label>
                    </div>
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre class="jsx-highlight">
                        <code id="label-code" class="language-jsx">
                            {highlightJsx(`<div class="grid gap-8">
    <Label variant="stacked" class="grid gap-3">
        <span class="text-sm font-medium leading-none">Username</span>
        <input class="input" type="text" placeholder="username" />
    </Label>
    <Label variant="stacked" class="grid gap-3">
        <span class="text-sm font-medium leading-none">Message</span>
        <textarea class="textarea" rows={3} placeholder="Type your message..."></textarea>
        <span class="text-muted-foreground text-sm">Type your message and press enter to send.</span>
    </Label>
    <Label variant="inline">
        <Checkbox id="demo-terms" />
        <span>Accept terms and conditions</span>
    </Label>
    <Label variant="align-top">
        <span class="text-sm font-medium leading-none">Comment</span>
        <textarea class="textarea" rows={3} placeholder="Leave a comment..."></textarea>
    </Label>
</div>`)}
                        </code>
                    </pre>

                    <CopyButton for="label-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>Use the following primitive to build form labels:</p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>&lt;Label&gt;</strong>: A form label component that properly associates with form controls and supports
                            variants (inline, stacked, align-top) for different layouts.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
