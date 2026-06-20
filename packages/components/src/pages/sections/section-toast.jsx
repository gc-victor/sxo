import Button from "@components/button.jsx";
import Tabs, { TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import { Toast, ToastDescription, Toaster, ToastTitle } from "@components/toast.jsx";
import CopyButton from "@pages/components/copy-button.jsx";
import highlightJsx from "@pages/components/highlight-jsx.js";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

/**
 * Props accepted by `<SectionToast />`.
 *
 * Demonstration section for dynamic toast notifications.
 * Buttons dispatch custom events with title/description data to trigger toasts.
 * Inherits native section attributes.
 *
 * @typedef {HTMLElementAttributes & ComponentProps & {}} SectionToastProps
 * @function SectionToast
 * @param {SectionToastProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <SectionToast />
 * @public
 */
export function SectionToast(props) {
    return (
        <Section id="toast" {...props}>
            <SectionHeading>Toast</SectionHeading>
            <SectionDescription>A succinct message that is displayed temporarily.</SectionDescription>
            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview" class="pt-4" active>
                    <div class="relative mt-4">
                        <div class="flex flex-wrap items-center gap-2 mb-2">
                            <Button
                                variant="outline"
                                onclick="document.dispatchEvent(new CustomEvent('el-toast:top-right', { detail: { title: 'Saved', description: 'Your settings have been saved.' } }))"
                            >
                                Top-Right
                            </Button>
                            <Button
                                variant="outline"
                                onclick="document.dispatchEvent(new CustomEvent('el-toast:bottom-center', { detail: { title: 'New Feature', description: 'Check out the latest updates in your dashboard.' } }))"
                            >
                                Bottom-Center
                            </Button>
                            <Button
                                variant="outline"
                                onclick="document.dispatchEvent(new CustomEvent('el-toast:bottom-left', { detail: { title: 'Error', description: 'Failed to save your changes. Please try again.' } }))"
                            >
                                Bottom-Left
                            </Button>
                            <Button
                                variant="outline"
                                onclick="document.dispatchEvent(new CustomEvent('el-toast:bottom-right', { detail: { title: 'Heads up', description: 'You have unsaved changes.' } }))"
                            >
                                Bottom-Right
                            </Button>
                        </div>
                        {/* Case 1: Top-Right  */}
                        <Toaster align="end" class="top-0! bottom-auto!">
                            <Toast category="top-right">
                                <section>
                                    <ToastTitle />
                                    <ToastDescription />
                                </section>
                            </Toast>
                        </Toaster>
                        {/* Case 2: Bottom-Center */}
                        <Toaster align="center">
                            <Toast category="bottom-center">
                                <section>
                                    <ToastTitle />
                                    <ToastDescription />
                                </section>
                            </Toast>
                        </Toaster>
                        {/* Case 3: Bottom-Left */}
                        <Toaster align="start">
                            <Toast category="bottom-left">
                                <section>
                                    <ToastTitle />
                                    <ToastDescription />
                                </section>
                            </Toast>
                        </Toaster>
                        {/* Case 4: Bottom-Right */}
                        <Toaster align="end">
                            <Toast category="bottom-right">
                                <section>
                                    <ToastTitle />
                                    <ToastDescription />
                                </section>
                            </Toast>
                        </Toaster>
                    </div>
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre class="jsx-highlight">
                        <code id="toast-code" class="language-jsx">
                            {highlightJsx(`<div class="relative mt-4">
    {/* Case 1: Top-Right  */}
    <Toaster align="end" class="top-0! bottom-auto!">
    <Toast category="top-right">
            <section>
                <ToastTitle />
                <ToastDescription />
            </section>
        </Toast>
    </Toaster>
    {/* Case 2: Bottom-Center */}
    <Toaster align="center">
    <Toast category="bottom-center">
            <section>
                <ToastTitle />
                <ToastDescription />
            </section>
        </Toast>
    </Toaster>
    {/* Case 3: Bottom-Left */}
    <Toaster align="start">
    <Toast category="bottom-left">
            <section>
                <ToastTitle />
                <ToastDescription />
            </section>
        </Toast>
    </Toaster>
    {/* Case 4: Bottom-Right */}
    <Toaster align="end">
    <Toast category="bottom-right">
            <section>
                <ToastTitle />
                <ToastDescription />
            </section>
        </Toast>
    </Toaster>

    {/* Triggers */}
    <div class="flex flex-wrap items-center gap-2 mb-2">
        <Button
            variant="outline"
            onclick="document.dispatchEvent(new CustomEvent('el-toast:top-right', { detail: { title: 'Saved', description: 'Your settings have been saved.' } }))"
        >
            Top-Right
        </Button>
        <Button
            variant="outline"
            onclick="document.dispatchEvent(new CustomEvent('el-toast:bottom-center', { detail: { title: 'New Feature', description: 'Check out the latest updates in your dashboard.' } }))"
        >
            Bottom-Center
        </Button>
        <Button
            variant="outline"
            onclick="document.dispatchEvent(new CustomEvent('el-toast:bottom-left', { detail: { title: 'Error', description: 'Failed to save your changes. Please try again.' } }))"
        >
            Bottom-Left
        </Button>
        <Button
            variant="outline"
            onclick="document.dispatchEvent(new CustomEvent('el-toast:bottom-right', { detail: { title: 'Heads up', description: 'You have unsaved changes.' } }))"
        >
            Bottom-Right
        </Button>
    </div>
</div>`)}
                        </code>
                    </pre>

                    <CopyButton for="toast-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>Use the following primitives to build toast notifications:</p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>&lt;Toaster&gt;</strong>: The container that manages toast positioning and stacking with alignment
                            options (start, center, end).
                        </li>
                        <li>
                            <strong>&lt;Toast&gt;</strong>: Individual toast notification with category variants (success, info, warning,
                            destructive) and auto-dismiss functionality.
                        </li>
                        <li>
                            <strong>&lt;ToastTitle&gt;</strong>: The title text within a toast notification.
                        </li>
                        <li>
                            <strong>&lt;ToastDescription&gt;</strong>: The description text within a toast notification.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
