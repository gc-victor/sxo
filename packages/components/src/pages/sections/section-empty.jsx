/**
 * @fileoverview Demo section for Empty component (vanilla JSX)
 *
 * @module ui/sections/empty
 * @description
 * Showcases the Empty component with title/description, icon, and action variants.
 *
 * Exports:
 * - `<SectionEmpty>`: Demo section for Empty.
 *
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 */

import Empty from "@components/empty.jsx";
import { IconSearch } from "@components/icon.jsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import CopyButton from "@pages/components/copy-button.jsx";
import { highlightJsx } from "@pages/components/highlight-jsx.js";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

/**
 * Props accepted by `<SectionEmpty />`.
 *
 * Demo section showcasing Empty component variants.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {}} SectionEmptyProps
 * @function SectionEmpty
 * @param {SectionEmptyProps} props
 * @returns {JSX.Element} Rendered markup.
 * @public
 */
export function SectionEmpty({ class: klass, className, ...rest }) {
    return (
        <Section id="empty" {...rest}>
            <SectionHeading>Empty</SectionHeading>
            <SectionDescription>Displays an empty state placeholder with optional icon, title, description, and action.</SectionDescription>
            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview" class="pt-4 space-y-6" active>
                    <div>
                        <p class="text-sm font-medium mb-2">With title and description</p>
                        <Empty title="No results found" description="Try adjusting your search or filter criteria." />
                    </div>
                    <div>
                        <p class="text-sm font-medium mb-2">With icon</p>
                        <Empty
                            icon={<IconSearch aria-hidden="true" class="size-8" />}
                            title="No messages"
                            description="You have no unread messages."
                        />
                    </div>
                    <div>
                        <p class="text-sm font-medium mb-2">With action button</p>
                        <Empty
                            title="No data"
                            description="Add your first entry to get started."
                            action={
                                <button type="button" class="btn">
                                    Add item
                                </button>
                            }
                        />
                    </div>
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre class="jsx-highlight">
                        <code id="empty-code" class="language-jsx">
                            {highlightJsx(`{/* With title and description */}
<Empty title="No results found" description="Try adjusting your search." />

{/* With icon */}
<Empty icon={<IconSearch />} title="No messages" description="You have no unread messages." />

{/* With action button */}
<Empty title="No data" action={<button class="btn">Add item</button>} />`)}
                        </code>
                    </pre>

                    <CopyButton for="empty-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>Use the following primitive to build empty states:</p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>&lt;Empty&gt;</strong>: Displays an empty state with <code>icon</code>, <code>title</code>,
                            <code>description</code>, and <code>action</code> props.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
