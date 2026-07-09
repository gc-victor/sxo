/**
 * @fileoverview Demo section for Progress component (vanilla JSX)
 *
 * @module ui/sections/progress
 * @description
 * Showcases the Progress component with determinate, indeterminate, and custom max variants.
 *
 * Exports:
 * - `<SectionProgress>`: Demo section for Progress.
 *
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 */

import Progress from "@components/progress.jsx";
import Tabs, { TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import CopyButton from "@pages/components/copy-button.jsx";
import highlightJsx from "@pages/components/highlight-jsx.js";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

/**
 * Props accepted by `<SectionProgress />`.
 *
 * Demo section showcasing Progress component variants.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {}} SectionProgressProps
 * @function SectionProgress
 * @param {SectionProgressProps} props
 * @returns {JSX.Element} Rendered markup.
 * @public
 */
export function SectionProgress({ class: klass, className, ...rest }) {
    return (
        <Section id="progress" {...rest}>
            <SectionHeading>Progress</SectionHeading>
            <SectionDescription>Displays a progress bar indicating the completion progress of a task.</SectionDescription>
            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview" class="pt-4 space-y-6" active>
                    <div>
                        <p class="text-sm font-medium mb-2">Determinate</p>
                        <Progress value={60} max={100} />
                    </div>
                    <div>
                        <p class="text-sm font-medium mb-2">Indeterminate</p>
                        <Progress indeterminate />
                    </div>
                    <div>
                        <p class="text-sm font-medium mb-2">Custom Max</p>
                        <Progress value={5} max={10} />
                    </div>
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre class="jsx-highlight">
                        <code id="progress-code" class="language-jsx">
                            {highlightJsx(`{/* Determinate */}
<Progress value={60} max={100} />

{/* Indeterminate */}
<Progress indeterminate />

{/* Custom Max */}
<Progress value={5} max={10} />`)}
                        </code>
                    </pre>

                    <CopyButton for="progress-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>Use the following primitive to build progress bars:</p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>&lt;Progress&gt;</strong>: Native progress bar with <code>value</code>, <code>max</code>, and
                            <code>indeterminate</code> props.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
