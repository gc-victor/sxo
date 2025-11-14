/**
 * @fileoverview Section showcasing the Form component (vanilla JSX)
 *
 * @module ui/SectionForm
 * @description
 * This section demonstrates various Form component usages, including
 * text inputs, date picker, radio buttons, switches, and form validation.
 * It showcases nested FormInput, FormLabel, FormDescription, FormFieldset,
 * FormLegend, FormSubmit, and FormReset components.
 *
 * Exports:
 * - `SectionForm`: Displays different Form component examples.
 *
 * @author Víctor García
 * @license MIT
 * @version 1.0.0
 */

import Form, { FormDescription, FormFieldset, FormInput, FormLabel, FormLegend, FormReset, FormSubmit } from "@components/form.jsx";
import Tabs, { TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import CopyButton from "@pages/components/copy-button.jsx";
import highlightJsx from "@pages/components/highlight-jsx.js";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

/**
 * Props accepted by `<SectionForm />`.
 *
 * Demo section wrapper for form examples. Inherits native section/div attributes
 * and forwards them to the outer `<Section>` wrapper.
 *
 * @typedef {HTMLElementAttributes & ComponentProps & {}} SectionFormProps
 * @function SectionForm
 * @param {SectionFormProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <SectionForm />
 * @public
 * @since 1.0.0
 */
export function SectionForm({ class: klass, className, ...rest }) {
    return (
        <Section id="form" {...rest}>
            <SectionHeading>Form</SectionHeading>
            <SectionDescription>Building forms with React Hook Form and Zod.</SectionDescription>
            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview" class="pt-4" active>
                    {/* Case 1: Username field */}
                    <Form class="grid gap-6">
                        <div class="grid gap-2">
                            <FormLabel for="demo-form-text">Username</FormLabel>
                            <FormInput type="text" id="demo-form-text" placeholder="hunvreus" />
                            <FormDescription class="text-foreground/70 text-sm">This is your public display name.</FormDescription>
                        </div>

                        {/* Case 2: Email field */}
                        <div class="grid gap-2">
                            <FormLabel for="demo-form-select">Email</FormLabel>
                            {/* TODO: Use FormSelect */}
                            <select id="demo-form-select" class="input">
                                <option value="m@example.com">m@example.com</option>
                                <option value="m@google.com">m@google.com</option>
                                <option value="m@support.com">m@support.com</option>
                            </select>
                            <FormDescription class="text-foreground/70 text-sm">
                                You can manage email addresses in your email settings.
                            </FormDescription>
                        </div>

                        {/* Case 3: Bio field */}
                        <div class="grid gap-2">
                            <FormLabel for="demo-form-textarea">Bio</FormLabel>
                            {/* TODO: Use FormTextarea */}
                            <textarea id="demo-form-textarea" placeholder="I like to..." rows="3" class="textarea"></textarea>
                            <FormDescription class="text-foreground/70 text-sm">
                                You can @mention other users and organizations.
                            </FormDescription>
                        </div>

                        <div class="grid gap-2">
                            <FormLabel for="demo-form-date">Date of birth</FormLabel>
                            <FormInput type="date" id="demo-form-date" />
                            <FormDescription class="text-foreground/70 text-sm">
                                Your date of birth is used to calculate your age.
                            </FormDescription>
                        </div>

                        <div class="flex flex-col gap-3">
                            <FormFieldset class="grid gap-3">
                                <FormLegend class="text-sm font-medium">Notify me about...</FormLegend>
                                <FormLabel class="font-normal mt-4" for="demo-form-radio-1">
                                    <FormInput type="radio" name="demo-form-radio" id="demo-form-radio-1" value="1" checked />
                                    All new messages
                                </FormLabel>
                                <FormLabel class="font-normal" for="demo-form-radio-2">
                                    <FormInput type="radio" name="demo-form-radio" id="demo-form-radio-2" value="2" />
                                    Direct messages and mentions
                                </FormLabel>
                                <FormLabel class="font-normal" for="demo-form-radio-3">
                                    <FormInput type="radio" name="demo-form-radio" id="demo-form-radio-3" value="3" />
                                    Nothing
                                </FormLabel>
                            </FormFieldset>
                        </div>

                        <section class="grid gap-4">
                            <h3 class="text-lg font-medium">Email Notifications</h3>
                            <div class="gap-2 flex flex-row items-start justify-between rounded-lg border p-4 shadow-xs">
                                <div class="flex flex-col gap-0.5">
                                    <FormLabel for="demo-form-switch" class="leading-normal">
                                        Marketing emails
                                    </FormLabel>
                                    <FormDescription class="text-foreground/70 text-sm">
                                        Receive emails about new products, features, and more.
                                    </FormDescription>
                                </div>
                                <FormInput type="checkbox" id="demo-form-switch" role="switch" aria-checked="false" class="switch" />
                            </div>
                            <div class="gap-2 flex flex-row items-start justify-between rounded-lg border p-4 shadow-xs">
                                <div class="flex flex-col gap-0.5 opacity-60">
                                    <FormLabel for="demo-form-switch-disabled" class="leading-normal">
                                        Security emails
                                    </FormLabel>
                                    <FormDescription class="text-foreground text-sm">
                                        Receive emails about your account security.
                                    </FormDescription>
                                </div>
                                <FormInput
                                    type="checkbox"
                                    id="demo-form-switch-disabled"
                                    role="switch"
                                    aria-checked="false"
                                    disabled
                                    class="switch"
                                />
                            </div>
                        </section>

                        <div class="flex gap-2">
                            <FormSubmit>Submit</FormSubmit>
                            <FormReset>Reset</FormReset>
                        </div>
                    </Form>
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre class="jsx-highlight">
                        <code id="form-code" class="language-jsx">
                            {highlightJsx(`{/* Case 1: Username field */}
<div class="grid gap-2">
    <FormLabel for="demo-form-text">Username</FormLabel>
    <FormInput type="text" id="demo-form-text" placeholder="hunvreus" />
    <FormDescription class="text-muted-foreground text-sm">This is your public display name.</FormDescription>
</div>

{/* Case 2: Email field */}
<div class="grid gap-2">
    <FormLabel for="demo-form-select">Email</FormLabel>
    <select id="demo-form-select" class="input">
        <option value="m@example.com">m@example.com</option>
        <option value="m@google.com">m@google.com</option>
        <option value="m@support.com">m@support.com</option>
    </select>
    <FormDescription class="text-muted-foreground text-sm">
        You can manage email addresses in your email settings.
    </FormDescription>
</div>

{/* Case 3: Bio field */}
<div class="grid gap-2">
    <FormLabel for="demo-form-textarea">Bio</FormLabel>
    <textarea id="demo-form-textarea" placeholder="I like to..." rows="3" class="textarea"></textarea>
    <FormDescription class="text-muted-foreground text-sm">You can @mention other users and organizations.</FormDescription>
</div>

{/* Case 4: Date of birth */}
<div class="grid gap-2">
    <FormLabel for="demo-form-date">Date of birth</FormLabel>
    <FormInput type="date" id="demo-form-date" />
    <FormDescription class="text-muted-foreground text-sm">
        Your date of birth is used to calculate your age.
    </FormDescription>
</div>

{/* Case 5: Notification preferences */}
<div class="flex flex-col gap-3">
    <FormFieldset class="grid gap-3">
        <FormLegend class="text-sm font-medium">Notify me about...</FormLegend>
        <FormLabel class="font-normal mt-4" for="demo-form-radio-1">
            <FormInput type="radio" name="demo-form-radio" id="demo-form-radio-1" value="1" checked />
            All new messages
        </FormLabel>
        <FormLabel class="font-normal" for="demo-form-radio-2">
            <FormInput type="radio" name="demo-form-radio" id="demo-form-radio-2" value="2" />
            Direct messages and mentions
        </FormLabel>
        <FormLabel class="font-normal" for="demo-form-radio-3">
            <FormInput type="radio" name="demo-form-radio" id="demo-form-radio-3" value="3" />
            Nothing
        </FormLabel>
    </FormFieldset>
</div>

{/* Case 6: Email notifications switches */}
<section class="grid gap-4">
    <h3 class="text-lg font-medium">Email Notifications</h3>
    <div class="gap-2 flex flex-row items-start justify-between rounded-lg border p-4 shadow-xs">
        <div class="flex flex-col gap-0.5">
            <FormLabel for="demo-form-switch" class="leading-normal">
                Marketing emails
            </FormLabel>
            <FormDescription class="text-muted-foreground text-sm">
                Receive emails about new products, features, and more.
            </FormDescription>
        </div>
        <FormInput type="checkbox" id="demo-form-switch" role="switch" aria-checked="false" class="switch" />
    </div>
    <div class="gap-2 flex flex-row items-start justify-between rounded-lg border p-4 shadow-xs">
        <div class="flex flex-col gap-0.5 opacity-60">
            <FormLabel for="demo-form-switch-disabled" class="leading-normal">
                Security emails
            </FormLabel>
            <FormDescription class="text-muted-foreground text-sm">
                Receive emails about your account security.
            </FormDescription>
        </div>
        <FormInput
            type="checkbox"
            id="demo-form-switch-disabled"
            role="switch"
            aria-checked="false"
            disabled
            class="switch"
        />
    </div>
</section>

{/* Case 7: Form actions */}
<div class="flex gap-2">
    <FormSubmit>Submit</FormSubmit>
    <FormReset>Reset</FormReset>
</div>`)}
                        </code>
                    </pre>

                    <CopyButton for="form-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>Use the following primitives to build forms:</p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>&lt;Form&gt;</strong>: The root form component.
                        </li>
                        <li>
                            <strong>&lt;FormLabel&gt;</strong>: Labels for form inputs.
                        </li>
                        <li>
                            <strong>&lt;FormInput&gt;</strong>: Input fields (text, date, radio, checkbox).
                        </li>
                        <li>
                            <strong>&lt;FormDescription&gt;</strong>: Descriptive text for form fields.
                        </li>
                        <li>
                            <strong>&lt;FormFieldset&gt;</strong>: Groups related form fields.
                        </li>
                        <li>
                            <strong>&lt;FormLegend&gt;</strong>: Legend for fieldsets.
                        </li>
                        <li>
                            <strong>&lt;FormSubmit&gt;</strong>: Submit button.
                        </li>
                        <li>
                            <strong>&lt;FormReset&gt;</strong>: Reset button.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
