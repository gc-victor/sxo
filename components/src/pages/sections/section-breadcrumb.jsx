import Breadcrumb, {
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@components/breadcrumb.jsx";
import Tabs, { TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import highlightJsx from "@utils/highlight-jsx.js";
import CopyButton from "../components/copy-button.jsx";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

/**
 * Props accepted by `<SectionBreadcrumb />`.
 *
 * Demo section that showcases the `Breadcrumb` compound primitives.
 * Inherits native section attributes for the outer wrapper.
 *
 * @typedef {HTMLElementAttributes & ComponentProps & {}} SectionBreadcrumbProps
 * @function SectionBreadcrumb
 * @param {SectionBreadcrumbProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <SectionBreadcrumb />
 * @public
 * @since 1.0.0
 */
export function SectionBreadcrumb(props) {
    return (
        <Section id="breadcrumb" {...props}>
            <SectionHeading>Breadcrumb</SectionHeading>
            <SectionDescription>Displays the path to the current resource using a hierarchy of links.</SectionDescription>
            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview" class="pt-4" active>
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink href="/">Home</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbLink href="/components">Components</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre class="jsx-highlight">
                        <code id="breadcrumb-code" class="language-jsx">
                            {highlightJsx(`<Breadcrumb>
    <BreadcrumbList>
        <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
            <BreadcrumbLink href="/components">Components</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
            <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
        </BreadcrumbItem>
    </BreadcrumbList>
</Breadcrumb>`)}
                        </code>
                    </pre>

                    <CopyButton for="breadcrumb-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>Use the following primitives to build breadcrumbs:</p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>&lt;Breadcrumb&gt;</strong>: The root component for breadcrumbs.
                        </li>
                        <li>
                            <strong>&lt;BreadcrumbList&gt;</strong>: Contains the breadcrumb items.
                        </li>
                        <li>
                            <strong>&lt;BreadcrumbItem&gt;</strong>: Individual breadcrumb item.
                        </li>
                        <li>
                            <strong>&lt;BreadcrumbLink&gt;</strong>: Link for navigable breadcrumb items.
                        </li>
                        <li>
                            <strong>&lt;BreadcrumbPage&gt;</strong>: Text for the current page.
                        </li>
                        <li>
                            <strong>&lt;BreadcrumbSeparator&gt;</strong>: Separator between items.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
