import Skeleton from "@components/skeleton.jsx";
import Tabs, { TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import CopyButton from "@pages/components/copy-button.jsx";
import highlightJsx from "@pages/components/highlight-jsx.js";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

/**
 * Props accepted by `<SectionSkeleton />`.
 *
 * Demo section showing skeleton variants and usage.
 * Inherits native div attributes for the outer wrapper.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {}} SectionSkeletonProps
 * @function SectionSkeleton
 * @param {SectionSkeletonProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <SectionSkeleton />
 * @public
 * @since 1.0.0
 */
export function SectionSkeleton(props) {
    return (
        <Section id="skeleton" {...props}>
            <SectionHeading>Skeleton</SectionHeading>
            <SectionDescription>Use to show a placeholder while content is loading.</SectionDescription>
            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview" class="pt-4" active>
                    <div class="grid gap-3">
                        <Skeleton widthClass="w-full" heightClass="h-4" />
                        <Skeleton widthClass="w-2/3" heightClass="h-4" />
                        <Skeleton widthClass="w-1/2" heightClass="h-4" />
                        <div class="flex items-center gap-3">
                            <Skeleton widthClass="w-12" heightClass="h-12" shape="circle" />
                            <div class="flex-1 grid gap-2">
                                <Skeleton widthClass="w-1/3" heightClass="h-4" />
                                <Skeleton widthClass="w-2/3" heightClass="h-4" />
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre class="jsx-highlight">
                        <code id="skeleton-code" class="language-jsx">
                            {highlightJsx(`<div class="grid gap-3">
    <Skeleton widthClass="w-full" heightClass="h-4" />
    <Skeleton widthClass="w-2/3" heightClass="h-4" />
    <Skeleton widthClass="w-1/2" heightClass="h-4" />
    <div class="flex items-center gap-3">
        <Skeleton widthClass="w-12" heightClass="h-12" shape="circle" />
        <div class="flex-1 grid gap-2">
            <Skeleton widthClass="w-1/3" heightClass="h-4" />
            <Skeleton widthClass="w-2/3" heightClass="h-4" />
        </div>
    </div>
</div>`)}
                        </code>
                    </pre>

                    <CopyButton for="skeleton-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>Use the following primitives to build skeletons:</p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>&lt;Skeleton&gt;</strong>: A placeholder component for loading states, with customizable width, height,
                            and shape.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
