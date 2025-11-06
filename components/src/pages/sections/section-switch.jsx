import Label from "@components/label.jsx";
import Switch from "@components/switch.jsx";
import Tabs, { TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import highlightJsx from "@utils/highlight-jsx.js";
import CopyButton from "../components/copy-button.jsx";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

/**
 * Props accepted by `<SectionSwitch />`.
 *
 * Demo section showing switch examples (checked/unchecked).
 * Inherits native div attributes for the outer wrapper.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {}} SectionSwitchProps
 * @function SectionSwitch
 * @param {SectionSwitchProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <SectionSwitch />
 * @public
 * @since 1.0.0
 */
export function SectionSwitch(props) {
    return (
        <Section id="switch" {...props}>
            <SectionHeading>Switch</SectionHeading>
            <SectionDescription>A control that allows the user to toggle between checked and not checked.</SectionDescription>

            {/* NOTE: Tabs show Preview and Code; code snippet excludes SectionHeading/SectionDescription */}
            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview" class="pt-4" active>
                    <div class="grid gap-3">
                        <Label>
                            <Switch /> Airplane Mode
                        </Label>
                        <Label>
                            <Switch checked /> Bluetooth
                        </Label>
                    </div>
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre class="jsx-highlight">
                        <code id="switch-code" class="language-jsx">
                            {highlightJsx(`<div class="grid gap-3">
    <Label>
        <Switch /> Airplane Mode
    </Label>
    <Label>
        <Switch checked /> Bluetooth
    </Label>
</div>`)}
                        </code>
                    </pre>

                    <CopyButton for="switch-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>Use the following primitives to build a switch:</p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>&lt;Switch&gt;</strong>: A toggle control for on/off states.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
