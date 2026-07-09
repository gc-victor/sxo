/**
 * @fileoverview Demo section for Field component (vanilla JSX)
 *
 * @module ui/sections/field
 * @description
 * Showcases the Field component with label, hint, error, and required variants.
 *
 * Exports:
 * - `<SectionField>`: Demo section for Field.
 *
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 */

import Field from "@components/field.jsx";
import Tabs, { TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import CopyButton from "@pages/components/copy-button.jsx";
import highlightJsx from "@pages/components/highlight-jsx.js";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

/**
 * Props accepted by `<SectionField />`.
 *
 * Demo section showcasing Field component variants.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {}} SectionFieldProps
 * @function SectionField
 * @param {SectionFieldProps} props
 * @returns {JSX.Element} Rendered markup.
 * @public
 */
export function SectionField({ class: klass, className, ...rest }) {
    return (
        <Section id="field" {...rest}>
            <SectionHeading>Field</SectionHeading>
            <SectionDescription>Form field wrapper with label, hint text, error message, and required indicator.</SectionDescription>
            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview" class="pt-4 space-y-6" active>
                    <div>
                        <p class="text-sm font-medium mb-2">Basic</p>
                        <Field label="Name" hint="Enter your full name." htmlFor="name">
                            <input id="name" class="input" placeholder="John Doe" />
                        </Field>
                    </div>
                    <div>
                        <p class="text-sm font-medium mb-2">Hint</p>
                        <Field label="Email" hint="We'll never share your email." htmlFor="email">
                            <input id="email" class="input" type="email" placeholder="john@example.com" />
                        </Field>
                    </div>
                    <div>
                        <p class="text-sm font-medium mb-2">Error</p>
                        <Field label="Password" error="This field is required." htmlFor="password">
                            <input id="password" class="input" type="password" />
                        </Field>
                    </div>
                    <div>
                        <p class="text-sm font-medium mb-2">Required</p>
                        <Field label="Username" required htmlFor="username">
                            <input id="username" class="input" placeholder="johndoe" />
                        </Field>
                    </div>
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre class="jsx-highlight">
                        <code id="field-code" class="language-jsx">
                            {highlightJsx(`{/* Basic */}
<Field label="Name" hint="Enter your full name." htmlFor="name">
    <input id="name" class="input" placeholder="John Doe" />
</Field>

{/* Hint */}
<Field label="Email" hint="We'll never share your email." htmlFor="email">
    <input id="email" class="input" type="email" />
</Field>

{/* Error */}
<Field label="Password" error="This field is required." htmlFor="password">
    <input id="password" class="input" type="password" />
</Field>

{/* Required */}
<Field label="Username" required htmlFor="username">
    <input id="username" class="input" placeholder="johndoe" />
</Field>`)}
                        </code>
                    </pre>

                    <CopyButton for="field-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>Use the following primitive to build form fields:</p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>&lt;Field&gt;</strong>: Form field wrapper with <code>label</code>, <code>hint</code>,<code>error</code>
                            , and <code>required</code> props.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
