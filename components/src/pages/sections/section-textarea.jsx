import Label from "@components/label.jsx";
import Tabs, { TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import Textarea from "@components/textarea.jsx";
import highlightJsx from "@utils/highlight-jsx.js";
import CopyButton from "../components/copy-button.jsx";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

/**
 * Props accepted by `<SectionTextarea />`.
 *
 * Demo section showcasing textarea examples with and without labels and a disabled state.
 * Forwards native section/HTMLElement attributes to the outer `<Section>` wrapper.
 *
 * @typedef {HTMLElementAttributes & ComponentProps & {}} SectionTextareaProps
 * @function SectionTextarea
 * @param {SectionTextareaProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <SectionTextarea />
 * @public
 * @since 1.0.0
 */
export function SectionTextarea(props) {
    return (
        <Section id="textarea" {...props}>
            <SectionHeading>Textarea</SectionHeading>
            <SectionDescription>Displays a form textarea or a component that looks like a textarea.</SectionDescription>
            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview" class="pt-4" active>
                    <div class="grid gap-4">
                        <div class="grid gap-3">
                            <Label for="textarea-with-label" class="label">
                                Label
                            </Label>
                            <Textarea id="textarea-with-label" placeholder="Type your message here" rows={3} />
                            <p class="text-muted-foreground text-sm">Type your message and press enter to send.</p>
                        </div>
                        <div class="grid gap-3">
                            <Label for="textarea-disabled" class="label">
                                Disabled
                            </Label>
                            <Textarea id="textarea-disabled" placeholder="This field is disabled." disabled rows={3} />
                        </div>
                    </div>
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre class="jsx-highlight">
                        <code id="textarea-code" class="language-jsx">
                            {highlightJsx(`<div class="grid gap-4">
    <div class="grid gap-3">
        <Label for="textarea-with-label" class="label">
            Label
        </Label>
        <Textarea id="textarea-with-label" placeholder="Type your message here" rows={3} />
        <p class="text-muted-foreground text-sm">Type your message and press enter to send.</p>
    </div>
    <div class="grid gap-3">
        <Label for="textarea-disabled" class="label">
            Disabled
        </Label>
        <Textarea id="textarea-disabled" placeholder="This field is disabled." disabled rows={3} />
    </div>
</div>`)}
                        </code>
                    </pre>

                    <CopyButton for="textarea-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>Use the following primitive to build multi-line text inputs:</p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>&lt;Textarea&gt;</strong>: A multi-line text input component with auto-resize capability, validation
                            support, and accessibility features.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
