/**
 * @fileoverview Section showcasing the Input component (vanilla JSX)
 *
 * @module ui/SectionInput
 * @description
 * This section demonstrates various Input component usages, including
 * text, email, password, search, number, and date inputs with proper labels.
 *
 * Exports:
 * - `SectionInput`: Displays different Input component examples.
 *
 * @author Víctor García
 * @license MIT
 * @version 1.0.0
 */

import Input from "@components/input.jsx";
import Label from "@components/label.jsx";
import Tabs, { TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import CopyButton from "@pages/components/copy-button.jsx";
import highlightJsx from "@pages/components/highlight-jsx.js";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

/**
 * Props accepted by `<SectionInput />`.
 *
 * This component does not accept any custom props.
 * It primarily serves as a container for Input examples.
 *
 * @typedef {HTMLElementAttributes & ComponentProps & {}} SectionInputProps
 * @function SectionInput
 * @param {SectionInputProps} props
 * @returns {JSX.Element} Rendered markup for the Input section.
 * @example
 * <SectionInput />
 * @public
 * @since 1.0.0
 */
export function SectionInput(props) {
    return (
        <Section id="input" {...props}>
            <SectionHeading>Input</SectionHeading>
            <SectionDescription>Displays a form input field or a component that looks like an input field.</SectionDescription>
            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview" class="pt-4" active>
                    <div class="grid gap-4 sm:grid-cols-2">
                        <Label variant="stacked">
                            <span class="text-sm font-medium leading-none">Text</span>
                            <Input placeholder="Type here…" />
                        </Label>
                        <Label variant="stacked">
                            <span class="text-sm font-medium leading-none">Email</span>
                            <Input id="input-email" type="email" placeholder="you@example.com" />
                        </Label>
                        <Label variant="stacked">
                            <span class="text-sm font-medium leading-none">Password</span>
                            <Input id="input-password" type="password" placeholder="••••••••" />
                        </Label>
                        <Label variant="stacked">
                            <span class="text-sm font-medium leading-none">Search</span>
                            <Input id="input-search" type="search" placeholder="Search…" />
                        </Label>
                        <Label variant="stacked">
                            <span class="text-sm font-medium leading-none">Number</span>
                            <Input id="input-number" type="number" placeholder="0" />
                        </Label>
                        <Label variant="stacked">
                            <span class="text-sm font-medium leading-none">Date</span>
                            <Input id="input-date" type="date" />
                        </Label>
                    </div>
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre class="jsx-highlight">
                        <code id="input-code" class="language-jsx">
                            {highlightJsx(`<div class="grid gap-4 sm:grid-cols-2">
    <Label variant="stacked">
        <span class="text-sm font-medium leading-none">Text</span>
        <Input placeholder="Type here…" />
    </Label>
    <Label variant="stacked">
        <span class="text-sm font-medium leading-none">Email</span>
        <Input id="input-email" type="email" placeholder="you@example.com" />
    </Label>
    <Label variant="stacked">
        <span class="text-sm font-medium leading-none">Password</span>
        <Input id="input-password" type="password" placeholder="••••••••" />
    </Label>
    <Label variant="stacked">
        <span class="text-sm font-medium leading-none">Search</span>
        <Input id="input-search" type="search" placeholder="Search…" />
    </Label>
    <Label variant="stacked">
        <span class="text-sm font-medium leading-none">Number</span>
        <Input id="input-number" type="number" placeholder="0" />
    </Label>
    <Label variant="stacked">
        <span class="text-sm font-medium leading-none">Date</span>
        <Input id="input-date" type="date" />
    </Label>
</div>`)}
                        </code>
                    </pre>

                    <CopyButton for="input-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>Use the following primitive to build form inputs:</p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>&lt;Input&gt;</strong>: A form input field that supports various HTML input types (text, email,
                            password, search, number, date) with proper styling and accessibility.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
