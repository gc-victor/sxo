import Button from "@components/button.jsx";
import {
    IconArrowRight,
    IconCircleCheck,
    IconCircleExclamation,
    IconDotsHorizontal,
    IconGift,
    IconSend,
    IconShieldExclamation,
    IconSpinner,
} from "@components/icon.jsx";
import Tabs, { TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import CopyButton from "@pages/components/copy-button.jsx";
import highlightJsx from "@pages/components/highlight-jsx.js";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

/**
 * Props accepted by `<SectionButton />`.
 *
 * Demo section showcasing Button variants and sizes.
 * Inherits native section attributes for the outer wrapper.
 *
 * @typedef {HTMLElementAttributes & ComponentProps & {}} SectionButtonProps
 * @function SectionButton
 * @param {SectionButtonProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <SectionButton />
 * @public
 * @since 1.0.0
 */
export function SectionButton(props) {
    return (
        <Section id="button" {...props}>
            <SectionHeading>Button</SectionHeading>
            <SectionDescription>Displays a button or a component that looks like a button.</SectionDescription>
            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview" class="pt-4 space-y-6" active>
                    {/* Case 1: Large size variants */}
                    <div>
                        <h3 class="mb-4 text-md font-medium">Large</h3>
                        <div class="flex flex-wrap items-center gap-2">
                            <Button size="lg">Primary</Button>
                            <Button size="lg" variant="outline">
                                Outline
                            </Button>
                            <Button size="lg" variant="ghost">
                                Ghost
                            </Button>
                            <Button size="lg" variant="destructive">
                                Danger
                            </Button>
                            <Button size="lg" variant="secondary">
                                Secondary
                            </Button>
                            <Button size="lg" variant="link">
                                Link
                            </Button>
                        </div>
                    </div>

                    {/* Case 2: Default size variants */}
                    <div>
                        <h3 class="mb-4 text-md font-medium">Default</h3>
                        <div class="flex flex-wrap items-center gap-2">
                            <Button>Primary</Button>
                            <Button variant="outline">Outline</Button>
                            <Button variant="ghost">Ghost</Button>
                            <Button variant="destructive">Danger</Button>
                            <Button variant="secondary">Secondary</Button>
                            <Button variant="link">Link</Button>
                        </div>
                    </div>

                    {/* Case 3: With icons (default size) */}
                    <div>
                        <h3 class="mb-4 text-md font-medium">With Icons (Default)</h3>
                        <div class="flex flex-wrap items-center gap-2">
                            <Button variant="outline">
                                <IconSend />
                                Send
                            </Button>
                            <Button variant="outline">
                                Learn more
                                <IconArrowRight />
                            </Button>
                            <Button aria-label="Loading" loadingText="Loading…" variant="outline">
                                <IconSpinner class="animate-spin" />
                            </Button>
                            <Button aria-label="More options" variant="ghost">
                                <IconDotsHorizontal />
                            </Button>
                        </div>
                    </div>

                    {/* Case 4: With icons (small size) */}
                    <div>
                        <h3 class="mb-4 text-md font-medium">With Icons (Small)</h3>
                        <div class="flex flex-wrap items-center gap-2">
                            <Button size="sm" variant="outline">
                                <IconSend />
                                Send
                            </Button>
                            <Button size="sm" variant="outline">
                                Learn more
                                <IconArrowRight />
                            </Button>
                            <Button size="sm" aria-label="Loading" loadingText="Loading…" variant="outline">
                                <IconSpinner class="animate-spin" />
                            </Button>
                            <Button size="sm" aria-label="More options" variant="ghost">
                                <IconDotsHorizontal />
                            </Button>
                        </div>
                    </div>

                    {/* Case 5: Small size variants */}
                    <div>
                        <h3 class="mb-4 text-md font-medium">Small</h3>
                        <div class="flex flex-wrap items-center gap-2">
                            <Button size="sm">Primary</Button>
                            <Button size="sm" variant="outline">
                                Outline
                            </Button>
                            <Button size="sm" variant="ghost">
                                Ghost
                            </Button>
                            <Button size="sm" variant="destructive">
                                Danger
                            </Button>
                            <Button size="sm" variant="secondary">
                                Secondary
                            </Button>
                            <Button size="sm" variant="link">
                                Link
                            </Button>
                        </div>
                    </div>

                    {/* Case 6: Icon only buttons */}
                    <div>
                        <h3 class="mb-4 text-md font-medium">Icon Only</h3>
                        <div class="flex flex-wrap items-center gap-2">
                            <Button aria-label="Send message">
                                <IconSend />
                            </Button>
                            <Button variant="outline" aria-label="More options">
                                <IconDotsHorizontal />
                            </Button>
                            <Button variant="ghost" aria-label="Gift">
                                <IconGift />
                            </Button>
                            <Button variant="destructive" aria-label="Shield warning">
                                <IconShieldExclamation />
                            </Button>
                            <Button variant="secondary" aria-label="Check circle">
                                <IconCircleCheck />
                            </Button>
                            <Button size="sm" aria-label="Arrow right">
                                <IconArrowRight />
                            </Button>
                            <Button size="sm" variant="outline" aria-label="Loading">
                                <IconSpinner class="animate-spin" />
                            </Button>
                            <Button size="sm" variant="ghost" aria-label="Circle exclamation">
                                <IconCircleExclamation />
                            </Button>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre class="jsx-highlight">
                        <code id="button-code" class="language-jsx">
                            {highlightJsx(`{/* Case 1: Large size variants */}
<div>
    <h3 class="mb-4 text-md font-medium">Large</h3>
    <div class="flex flex-wrap items-center gap-2">
        <Button size="lg">Primary</Button>
        <Button size="lg" variant="outline">
            Outline
        </Button>
        <Button size="lg" variant="ghost">
            Ghost
        </Button>
        <Button size="lg" variant="destructive">
            Danger
        </Button>
        <Button size="lg" variant="secondary">
            Secondary
        </Button>
        <Button size="lg" variant="link">
            Link
        </Button>
    </div>
</div>

{/* Case 2: Default size variants */}
<div>
    <h3 class="mb-4 text-md font-medium">Default</h3>
    <div class="flex flex-wrap items-center gap-2">
        <Button>Primary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Danger</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="link">Link</Button>
    </div>
</div>

{/* Case 3: With icons (default size) */}
<div>
    <h3 class="mb-4 text-md font-medium">With Icons (Default)</h3>
    <div class="flex flex-wrap items-center gap-2">
        <Button variant="outline">
            <IconSend />
            Send
        </Button>
        <Button variant="outline">
            Learn more
            <IconArrowRight />
        </Button>
        <Button loadingText="Loading…" variant="outline">
            <IconSpinner class="animate-spin" />
        </Button>
        <Button aria-label="More options" variant="ghost">
            <IconDotsHorizontal />
        </Button>
    </div>
</div>

{/* Case 4: With icons (small size) */}
<div>
    <h3 class="mb-4 text-md font-medium">With Icons (Small)</h3>
    <div class="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline">
            <IconSend />
            Send
        </Button>
        <Button size="sm" variant="outline">
            Learn more
            <IconArrowRight />
        </Button>
        <Button size="sm" loadingText="Loading…" variant="outline">
            <IconSpinner class="animate-spin" />
        </Button>
        <Button size="sm" aria-label="More options" variant="ghost">
            <IconDotsHorizontal />
        </Button>
    </div>
</div>

{/* Case 5: Small size variants */}
<div>
    <h3 class="mb-4 text-md font-medium">Small</h3>
    <div class="flex flex-wrap items-center gap-2">
        <Button size="sm">Primary</Button>
        <Button size="sm" variant="outline">
            Outline
        </Button>
        <Button size="sm" variant="ghost">
            Ghost
        </Button>
        <Button size="sm" variant="destructive">
            Danger
        </Button>
        <Button size="sm" variant="secondary">
            Secondary
        </Button>
        <Button size="sm" variant="link">
            Link
        </Button>
    </div>
</div>

{/* Case 6: Icon only buttons */}
<div>
    <h3 class="mb-4 text-md font-medium">Icon Only</h3>
    <div class="flex flex-wrap items-center gap-2">
        <Button aria-label="Send message">
            <IconSend />
        </Button>
        <Button variant="outline" aria-label="More options">
            <IconDotsHorizontal />
        </Button>
        <Button variant="ghost" aria-label="Gift">
            <IconGift />
        </Button>
        <Button variant="destructive" aria-label="Shield warning">
            <IconShieldExclamation />
        </Button>
        <Button variant="secondary" aria-label="Check circle">
            <IconCircleCheck />
        </Button>
        <Button size="sm" aria-label="Arrow right">
            <IconArrowRight />
        </Button>
        <Button size="sm" variant="outline" aria-label="Loading">
            <IconSpinner class="animate-spin" />
        </Button>
        <Button size="sm" variant="ghost" aria-label="Circle exclamation">
            <IconCircleExclamation />
        </Button>
    </div>
</div>`)}
                        </code>
                    </pre>

                    <CopyButton for="button-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>Use the following primitives to build buttons:</p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>&lt;Button&gt;</strong>: The button component with variants (primary, outline, ghost, destructive,
                            secondary, link), sizes (lg, default, sm), and support for icons and loading states.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
