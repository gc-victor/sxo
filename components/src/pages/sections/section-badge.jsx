import Badge from "@components/badge.jsx";
import { IconArrowRight } from "@components/icon.jsx";
import Tabs, { TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import CopyButton from "@pages/components/copy-button.jsx";
import highlightJsx from "@pages/components/highlight-jsx.js";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

/**
 * Props accepted by `<SectionBadge />`.
 *
 * Demo section showcasing the `Badge` component variants and usage.
 * Inherits native div attributes for the outer wrapper.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {}} SectionBadgeProps
 * @function SectionBadge
 * @param {SectionBadgeProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <SectionBadge />
 * @public
 */
export function SectionBadge(props) {
    return (
        <Section id="badge" {...props}>
            <SectionHeading>Badge</SectionHeading>
            <SectionDescription>Displays a badge or a component that looks like a badge.</SectionDescription>
            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview" class="pt-4" active>
                    <div class="flex flex-wrap items-center gap-2">
                        <Badge>Primary</Badge>
                        <Badge variant="secondary">Secondary</Badge>
                        <Badge variant="outline">Outline</Badge>
                        <Badge variant="outline">
                            <IconArrowRight aria-hidden="true" />
                        </Badge>
                        <Badge variant="destructive">Destructive</Badge>
                        <Badge pill count={8} aria-label="8 notifications" />
                        <Badge pill count="99+" aria-label="99+ notifications" />
                    </div>
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre class="jsx-highlight">
                        <code id="badge-code" class="language-jsx">
                            {highlightJsx(`<div class="flex flex-wrap items-center gap-2">
    <Badge>Primary</Badge>
    <Badge variant="secondary">Secondary</Badge>
    <Badge variant="outline">Outline</Badge>
    <Badge variant="outline">
        <IconArrowRight aria-hidden="true" />
    </Badge>
    <Badge variant="destructive">Destructive</Badge>
    <Badge pill count={8} aria-label="8 notifications" />
    <Badge pill count="99+" aria-label="99+ notifications" />
</div>`)}
                        </code>
                    </pre>

                    <CopyButton for="badge-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>Use the following primitive to build badges:</p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>&lt;Badge&gt;</strong>: Displays status indicators, labels, or counts with variants (primary, secondary,
                            outline, destructive) and a pill variant for numeric indicators.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
