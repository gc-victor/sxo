/**
 * @fileoverview Demonstration section for compound tooltip components (vanilla JSX)
 *
 * @module ui/sections/tooltip
 * @description
 * Renders a showcase of the compound tooltip API (`Tooltip`, `TooltipTrigger`, `TooltipContent`)
 * with four directional placement examples. Vanilla JSX only: no runtime logic bundled here;
 * any interactive delay/application behavior is handled by a progressive enhancement script.
 *
 * Exports:
 * - `<SectionTooltip>`: Section listing tooltip placement variants.
 *
 * Design notes:
 * - Uses predetermined `tooltipId` values for stable ARIA linkage.
 * - Demonstrates composition pattern without `asChild` (removed per standards).
 * - Accepts native wrapper attributes via `...rest`.
 * - Class aliasing (`class` / `className`) supported.
 *
 * @author Víctor García
 * @license MIT
 * @version 1.0.0
 */

import Tabs, { TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@components/tooltip.jsx";
import CopyButton from "@pages/components/copy-button.jsx";
import highlightJsx from "@pages/components/highlight-jsx.js";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

/**
 * Props accepted by `<SectionTooltip />`.
 *
 * Demo section showing compound tooltip usage.
 * Renders examples for each placement direction.
 * Inherits native div attributes for the outer wrapper.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {}} SectionTooltipProps
 * @function SectionTooltip
 * @param {SectionTooltipProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <SectionTooltip />
 * @public
 */
export function SectionTooltip({ class: klass, className, ...rest }) {
    const cls = ["section-tooltips", klass, className].filter(Boolean).join(" ");
    return (
        <Section id="tooltip" class={cls} {...rest}>
            <SectionHeading>Tooltip</SectionHeading>
            <SectionDescription>
                A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over
                it.
            </SectionDescription>

            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview" class="pt-4 space-x-2" active>
                    {/* Case 1: Left placement */}
                    <Tooltip placement="left">
                        <TooltipTrigger as="button" class="btn-outline" aria-label="Tooltip on the left">
                            Left
                        </TooltipTrigger>
                        <TooltipContent>Left</TooltipContent>
                    </Tooltip>

                    {/* Case 2: Top placement */}
                    <Tooltip placement="top">
                        <TooltipTrigger as="button" class="btn-outline" aria-label="Tooltip on the top">
                            Top
                        </TooltipTrigger>
                        <TooltipContent>Top</TooltipContent>
                    </Tooltip>

                    {/* Case 3: Bottom placement */}
                    <Tooltip placement="bottom">
                        <TooltipTrigger as="button" class="btn-outline" aria-label="Tooltip on the bottom">
                            Bottom
                        </TooltipTrigger>
                        <TooltipContent>Bottom</TooltipContent>
                    </Tooltip>

                    {/* Case 4: Right placement */}
                    <Tooltip placement="right">
                        <TooltipTrigger as="button" class="btn-outline" aria-label="Tooltip on the right">
                            Right
                        </TooltipTrigger>
                        <TooltipContent>Right</TooltipContent>
                    </Tooltip>
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre class="jsx-highlight">
                        <code id="tooltip-code" class="language-jsx">
                            {highlightJsx(`{/* Case 1: Left placement */}
<Tooltip placement="left">
    <TooltipTrigger as="button" class="btn-outline">
        Left
    </TooltipTrigger>
    <TooltipContent>Left</TooltipContent>
</Tooltip>

{/* Case 2: Top placement */}
<Tooltip placement="top">
    <TooltipTrigger as="button" class="btn-outline">
        Top
    </TooltipTrigger>
    <TooltipContent>Top</TooltipContent>
</Tooltip>

{/* Case 3: Bottom placement */}
<Tooltip placement="bottom">
    <TooltipTrigger as="button" class="btn-outline">
        Bottom
    </TooltipTrigger>
    <TooltipContent>Bottom</TooltipContent>
</Tooltip>

{/* Case 4: Right placement */}
<Tooltip placement="right">
    <TooltipTrigger as="button" class="btn-outline">
        Right
    </TooltipTrigger>
    <TooltipContent>Right</TooltipContent>
</Tooltip>`)}
                        </code>
                    </pre>

                    <CopyButton for="tooltip-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>Use the following primitives to build tooltips:</p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>&lt;Tooltip&gt;</strong>: The root component that manages tooltip state and positioning.
                        </li>
                        <li>
                            <strong>&lt;TooltipTrigger&gt;</strong>: The element that triggers the tooltip (usually a button).
                        </li>
                        <li>
                            <strong>&lt;TooltipContent&gt;</strong>: The content displayed in the tooltip.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
