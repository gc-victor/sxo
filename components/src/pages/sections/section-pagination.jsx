import Pagination from "@components/pagination.jsx";
import Tabs, { TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import CopyButton from "@pages/components/copy-button.jsx";
import highlightJsx from "@pages/components/highlight-jsx.js";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

/**
 * Props accepted by `<SectionPagination />`.
 *
 * Demo section showing pagination examples.
 * Inherits native div attributes for the outer wrapper.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {}} SectionPaginationProps
 * @function SectionPagination
 * @param {SectionPaginationProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <SectionPagination />
 * @public
 * @since 1.0.0
 */
export function SectionPagination(props) {
    return (
        <Section id="pagination" {...props}>
            <SectionHeading>Pagination</SectionHeading>
            <SectionDescription>Pagination with page navigation, next and previous links.</SectionDescription>

            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview" class="pt-4 overflow-x-auto" active>
                    <Pagination totalPages={12} currentPage={6} showPrev={true} showNext={true} showFirst={false} showLast={true} />
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre class="jsx-highlight">
                        <code id="pagination-code" class="language-jsx">
                            {highlightJsx(
                                `<Pagination totalPages={12} currentPage={6} showPrev={true} showNext={true} showFirst={false} showLast={true} />`,
                            )}
                        </code>
                    </pre>

                    <div class="absolute top-2 right-2">
                        <CopyButton for="pagination-code" />
                    </div>
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>Use the following primitives to build pagination:</p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>&lt;Pagination&gt;</strong>: Displays page navigation with customizable props like{" "}
                            <code>totalPages</code>, <code>currentPage</code>, and visibility options for prev/next/first/last buttons.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
