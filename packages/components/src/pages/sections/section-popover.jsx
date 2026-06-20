/**
 * @fileoverview Section showcasing the Popover component (vanilla JSX)
 *
 * @module ui/SectionPopover
 * @description
 * This section demonstrates the usage of the Popover component
 * with composable trigger and content, placement, width, and content including form inputs.
 *
 * Exports:
 * - `SectionPopover`: Displays different Popover component examples.
 *
 * @author Víctor García
 * @license MIT
 * @version 1.0.0
 */

import Input from "@components/input.jsx";
import Label from "@components/label.jsx";
import { Popover, PopoverContent, PopoverTrigger } from "@components/popover.jsx";
import Tabs, { TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import CopyButton from "@pages/components/copy-button.jsx";
import highlightJsx from "@pages/components/highlight-jsx.js";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

/**
 * Props accepted by `<SectionPopover />`.
 *
 * This component does not accept any custom props.
 * It primarily serves as a container for Popover examples.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {}} SectionPopoverProps
 * @function SectionPopover
 * @param {SectionPopoverProps} props
 * @returns {JSX.Element} Rendered markup for the Popover section.
 * @example
 * <SectionPopover />
 * @public
 */
export function SectionPopover(props) {
    const contentId = "popover-dimensions-panel";

    return (
        <Section id="popover" {...props}>
            <SectionHeading>Popover</SectionHeading>
            <SectionDescription>Displays rich content in a portal, triggered by a button.</SectionDescription>

            {/* NOTE: Tabs show Preview and Code; code snippet excludes SectionHeading/SectionDescription */}
            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview" class="pt-4" active>
                    <Popover>
                        <PopoverTrigger variant="outline" contentId={contentId}>
                            Open popover
                        </PopoverTrigger>

                        <PopoverContent id={contentId}>
                            <header class="mb-3">
                                <h3 class="text-sm font-medium">Dimensions</h3>
                            </header>
                            <div class="grid gap-3">
                                <Label variant="stacked">
                                    <span class="text-sm font-medium leading-none">Width</span>
                                    <Input id="popover-width" placeholder="Auto" />
                                </Label>
                                <Label variant="stacked">
                                    <span class="text-sm font-medium leading-none">Max. width</span>
                                    <Input id="popover-max-width" placeholder="None" />
                                </Label>
                                <Label variant="stacked">
                                    <span class="text-sm font-medium leading-none">Height</span>
                                    <Input id="popover-height" placeholder="Auto" />
                                </Label>
                                <Label variant="stacked">
                                    <span class="text-sm font-medium leading-none">Max. height</span>
                                    <Input id="popover-max-height" placeholder="None" />
                                </Label>
                            </div>
                        </PopoverContent>
                    </Popover>
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre class="jsx-highlight">
                        <code id="popover-code" class="language-jsx">
                            {highlightJsx(`<Popover>
    <PopoverTrigger variant="outline" contentId={contentId}>
        Open popover
    </PopoverTrigger>

    <PopoverContent id={contentId}>
        <header class="mb-3">
            <h3 class="text-sm font-medium">Dimensions</h3>
        </header>
        <div class="grid gap-3">
            <Label variant="stacked">
                <span class="text-sm font-medium leading-none">Width</span>
                <Input id="popover-width" placeholder="Auto" />
            </Label>
            <Label variant="stacked">
                <span class="text-sm font-medium leading-none">Max. width</span>
                <Input id="popover-max-width" placeholder="None" />
            </Label>
            <Label variant="stacked">
                <span class="text-sm font-medium leading-none">Height</span>
                <Input id="popover-height" placeholder="Auto" />
            </Label>
            <Label variant="stacked">
                <span class="text-sm font-medium leading-none">Max. height</span>
                <Input id="popover-max-height" placeholder="None" />
            </Label>
        </div>
    </PopoverContent>
</Popover>`)}
                        </code>
                    </pre>

                    <CopyButton for="popover-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>Use the following primitives to build a popover:</p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>&lt;Popover&gt;</strong>: The root component for a popover.
                        </li>
                        <li>
                            <strong>&lt;PopoverTrigger&gt;</strong>: The button that opens the popover.
                        </li>
                        <li>
                            <strong>&lt;PopoverContent&gt;</strong>: The content displayed in the popover.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
