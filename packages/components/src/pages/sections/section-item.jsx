/**
 * @fileoverview Documentation section for item styling (vanilla JSX)
 *
 * @module ui/sections/item
 * @description
 * Demonstrates the basecoat `.item` CSS class used inside dropdown menus and
 * select components for consistent list-item styling.
 *
 * Exports:
 * - `<SectionItem>`: Documentation section showing item usage.
 *
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import CopyButton from "@pages/components/copy-button.jsx";
import { highlightJsx } from "@pages/components/highlight-jsx.js";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

/**
 * Props accepted by `<SectionItem />`.
 *
 * Documentation section for the item CSS class.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {}} SectionItemProps
 * @function SectionItem
 * @param {SectionItemProps} props
 * @returns {JSX.Element} Rendered markup.
 * @public
 */
export function SectionItem({ class: klass, className, ...rest }) {
    return (
        <Section id="item" {...rest}>
            <SectionHeading>Item</SectionHeading>
            <SectionDescription>
                List item styling for dropdown menus, select options, and navigation lists using <code>.item</code> CSS class.
            </SectionDescription>
            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview" class="pt-4" active>
                    <div class="w-64 border rounded-lg p-2 space-y-1">
                        <div class="item">Profile</div>
                        <div class="item">Settings</div>
                        <div class="item">Billing</div>
                        <hr class="my-2 border-t" />
                        <div class="item text-red-500">Log out</div>
                    </div>
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre class="jsx-highlight">
                        <code id="item-code" class="language-jsx">
                            {highlightJsx(`<div class="w-64 border rounded-lg p-2 space-y-1">
    <div class="item">Profile</div>
    <div class="item">Settings</div>
    <div class="item">Billing</div>
    <hr class="my-2 border-t" />
    <div class="item text-red-500">Log out</div>
</div>`)}
                        </code>
                    </pre>

                    <CopyButton for="item-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>
                        Use the <code>.item</code> class on list elements within dropdown menus, select components, and navigation lists for
                        consistent styling.
                    </p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>&lt;div class="item"&gt;</strong>: Interactive list item with hover/focus state, padding, and rounded
                            corners.
                        </li>
                        <li>
                            <strong>Composition</strong>: Combine with <code>role="option"</code> and <code>aria-selected</code> for
                            accessible menu items.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
