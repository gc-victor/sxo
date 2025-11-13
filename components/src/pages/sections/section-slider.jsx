import Slider from "@components/slider.jsx";
import Tabs, { TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import CopyButton from "@pages/components/copy-button.jsx";
import highlightJsx from "@pages/components/highlight-jsx.js";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

/**
 * Props accepted by `<SectionSlider />`.
 *
 * Demo section showcasing the Slider component variants and usage examples.
 * Renders a simple wrapper with labelled examples and inherits native div attributes.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {}} SectionSliderProps
 * @function SectionSlider
 * @param {SectionSliderProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <SectionSlider />
 * @public
 * @since 1.0.0
 */
export function SectionSlider(props) {
    return (
        <Section id="slider" {...props}>
            <SectionHeading>Slider</SectionHeading>
            <SectionDescription>An input where the user selects a value from within a given range.</SectionDescription>

            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview" class="pt-4" active>
                    <div class="max-w-md">
                        <Slider min={0} max={100} step={1} value="35" />
                    </div>
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre class="jsx-highlight">
                        <code id="slider-code" class="language-jsx">
                            {highlightJsx(`<div class="max-w-md">
    <Slider min={0} max={100} step={1} value="35" />
</div>`)}
                        </code>
                    </pre>

                    <CopyButton for="slider-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>Use the following primitives to build a slider:</p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>&lt;Slider&gt;</strong>: An input component for selecting a value within a range, with props like{" "}
                            <code>min</code>, <code>max</code>, <code>step</code>, and <code>value</code>.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
