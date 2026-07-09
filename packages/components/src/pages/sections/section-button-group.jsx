/**
 * @fileoverview Demo section for ButtonGroup component (vanilla JSX)
 *
 * @module ui/sections/button-group
 * @description
 * Showcases the ButtonGroup component with horizontal, vertical, and
 * variant examples.
 *
 * Exports:
 * - `<SectionButtonGroup>`: Demo section for ButtonGroup.
 *
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 */

import ButtonGroup from "@components/button-group.jsx";
import Tabs, { TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import CopyButton from "@pages/components/copy-button.jsx";
import highlightJsx from "@pages/components/highlight-jsx.js";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

/**
 * Props accepted by `<SectionButtonGroup />`.
 *
 * Demo section showcasing ButtonGroup component variants.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {}} SectionButtonGroupProps
 * @function SectionButtonGroup
 * @param {SectionButtonGroupProps} props
 * @returns {JSX.Element} Rendered markup.
 * @public
 */
export function SectionButtonGroup({ class: klass, className, ...rest }) {
    return (
        <Section id="button-group" {...rest}>
            <SectionHeading>Button Group</SectionHeading>
            <SectionDescription>Groups related buttons together in a horizontal or vertical layout.</SectionDescription>
            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview" class="pt-4 space-y-6" active>
                    <div>
                        <p class="text-sm font-medium mb-2">Horizontal</p>
                        <ButtonGroup>
                            <button type="button" class="btn">
                                First
                            </button>
                            <button type="button" class="btn">
                                Second
                            </button>
                            <button type="button" class="btn">
                                Third
                            </button>
                        </ButtonGroup>
                    </div>
                    <div>
                        <p class="text-sm font-medium mb-2">Vertical</p>
                        <ButtonGroup orientation="vertical">
                            <button type="button" class="btn">
                                Top
                            </button>
                            <button type="button" class="btn">
                                Middle
                            </button>
                            <button type="button" class="btn">
                                Bottom
                            </button>
                        </ButtonGroup>
                    </div>
                    <div>
                        <p class="text-sm font-medium mb-2">Outline Variant</p>
                        <ButtonGroup variant="outline">
                            <button type="button" class="btn">
                                Left
                            </button>
                            <button type="button" class="btn">
                                Center
                            </button>
                            <button type="button" class="btn">
                                Right
                            </button>
                        </ButtonGroup>
                    </div>
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre class="jsx-highlight">
                        <code id="button-group-code" class="language-jsx">
                            {highlightJsx(`{/* Horizontal */}
<ButtonGroup>
    <button class="btn">First</button>
    <button class="btn">Second</button>
    <button class="btn">Third</button>
</ButtonGroup>

{/* Vertical */}
<ButtonGroup orientation="vertical">
    <button class="btn">Top</button>
    <button class="btn">Middle</button>
    <button class="btn">Bottom</button>
</ButtonGroup>

{/* Outline Variant */}
<ButtonGroup variant="outline">
    <button class="btn">Left</button>
    <button class="btn">Center</button>
    <button class="btn">Right</button>
</ButtonGroup>`)}
                        </code>
                    </pre>

                    <CopyButton for="button-group-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>Use the following primitives to build button groups:</p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>&lt;ButtonGroup&gt;</strong>: Container for grouped buttons with <code>orientation</code>{" "}
                            (horizontal/vertical),
                            <code>variant</code>, and <code>size</code> props.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
