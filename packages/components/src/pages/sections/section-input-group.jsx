/**
 * @fileoverview Demo section for InputGroup component (vanilla JSX)
 *
 * @module ui/sections/input-group
 * @description
 * Showcases the InputGroup component with text, icon, button, vertical, and spinner variants.
 *
 * Exports:
 * - `<SectionInputGroup>`: Demo section for InputGroup.
 *
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 */

import { IconCopy, IconSearch, IconSpinner } from "@components/icon.jsx";
import InputGroup from "@components/input-group.jsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import CopyButton from "@pages/components/copy-button.jsx";
import { highlightJsx } from "@pages/components/highlight-jsx.js";
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
                        <p class="text-sm font-medium mb-2">Text prepend + append</p>
                        <InputGroup prepend="$" append="USD">
                            <input placeholder="0.00" />
                        </InputGroup>
                    </div>
                    <div>
                        <p class="text-sm font-medium mb-2">Icon start</p>
                        <InputGroup prepend={<IconSearch aria-hidden="true" class="size-4" />}>
                            <input placeholder="Search..." />
                        </InputGroup>
                    </div>
                    <div>
                        <p class="text-sm font-medium mb-2">Button append</p>
                        <InputGroup
                            append={
                                <button type="button" class="btn" data-variant="ghost" data-size="icon-xs" aria-label="Copy">
                                    <IconCopy class="size-4" />
                                </button>
                            }
                        >
                            <input placeholder="https://x.com/shadcn" readonly />
                        </InputGroup>
                    </div>
                    <div>
                        <p class="text-sm font-medium mb-2">Vertical with footer</p>
                        <InputGroup
                            append={
                                <footer data-align="end">
                                    <span class="text-xs text-muted-foreground">120 characters left</span>
                                </footer>
                            }
                            data-orientation="vertical"
                        >
                            <textarea placeholder="Write a comment..."></textarea>
                        </InputGroup>
                    </div>
                    <div>
                        <p class="text-sm font-medium mb-2">Loading spinner</p>
                        <InputGroup append={<IconSpinner aria-label="Loading" role="status" class="size-4 animate-spin" />}>
                            <input placeholder="Searching..." />
                        </InputGroup>
                    </div>
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre class="jsx-highlight">
                        <code id="input-group-code" class="language-jsx">
                            {highlightJsx(`{/* Text prepend + append */}
<InputGroup prepend="$" append="USD">
    <input placeholder="0.00" />
</InputGroup>

{/* Icon start */}
<InputGroup
    prepend={<IconSearch aria-hidden="true" class="size-4" />}
>
    <input placeholder="Search..." />
</InputGroup>

{/* Button append */}
<InputGroup
    append={
        <button type="button" class="btn" data-variant="ghost" data-size="icon-xs" aria-label="Copy">
            <IconCopy class="size-4" />
        </button>
    }
>
    <input placeholder="https://x.com/shadcn" readonly />
</InputGroup>

{/* Vertical with footer */}
<InputGroup
    append={
        <footer data-align="end">
            <span class="text-xs text-muted-foreground">120 characters left</span>
        </footer>
    }
    data-orientation="vertical"
>
    <textarea placeholder="Write a comment..."></textarea>
</InputGroup>

{/* Loading spinner */}
<InputGroup
    append={<IconSpinner aria-label="Loading" role="status" class="size-4 animate-spin" />}
>
    <input placeholder="Searching..." />
</InputGroup>`)}
                        </code>
                    </pre>

                    <CopyButton for="input-group-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>
                        Use <code>&lt;InputGroup&gt;</code> to wrap an <code>input</code> or <code>textarea</code> with addon elements on
                        either side. Addons use <code>data-align="start"</code> (prepend) or <code>data-align="end"</code>
                        (append) for positioning. Use <code>data-orientation="vertical"</code> for header/footer layouts with textareas.
                    </p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>Addon types</strong>: Text, icons (<code>IconSearch</code>, <code>IconCopy</code>, etc.), buttons, kbd,
                            spinners, or any element.
                        </li>
                        <li>
                            <strong>Orientation</strong>: Default horizontal (<code>data-align="start|end"</code>); add{" "}
                            <code>data-orientation="vertical"</code> with <code>header</code> or <code>footer</code> for block placement.
                        </li>
                        <li>
                            <strong>Accessibility</strong>: Use <code>aria-hidden="true"</code> on decorative icons;
                            <code>aria-label</code> on action buttons.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
