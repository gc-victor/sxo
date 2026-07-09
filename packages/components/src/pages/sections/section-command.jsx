/**
 * @fileoverview Demo section for Command component (vanilla JSX + reactive client island)
 *
 * @module ui/sections/command
 * @description
 * Showcases the Command palette component with keyboard shortcut, search filtering, and item selection.
 *
 * Exports:
 * - `<SectionCommand>`: Demo section for Command.
 *
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 */

import Command from "@components/command.jsx";
import Tabs, { TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import CopyButton from "@pages/components/copy-button.jsx";
import highlightJsx from "@pages/components/highlight-jsx.js";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

/**
 * Props accepted by `<SectionCommand />`.
 *
 * Demo section showcasing Command palette.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {}} SectionCommandProps
 * @function SectionCommand
 * @param {SectionCommandProps} props
 * @returns {JSX.Element} Rendered markup.
 * @public
 */
export function SectionCommand({ class: klass, className, ...rest }) {
    return (
        <Section id="command" {...rest}>
            <SectionHeading>Command</SectionHeading>
            <SectionDescription>
                Keyboard-driven command palette with search filtering and item selection. Press <kbd class="kbd">⌘K</kbd> to open.
            </SectionDescription>
            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview" class="pt-4" active>
                    <p class="text-sm text-muted-foreground mb-4">
                        Press <kbd class="kbd">⌘K</kbd> or <kbd class="kbd">Ctrl+K</kbd> to open the command palette.
                    </p>
                    <Command />
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre class="jsx-highlight">
                        <code id="command-code" class="language-jsx">
                            {highlightJsx(`<Command />`)}
                        </code>
                    </pre>

                    <CopyButton for="command-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>Use the following primitive to build command palettes:</p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>&lt;Command&gt;</strong>: Command palette with keyboard shortcut (Meta+K / Ctrl+K), search filtering,
                            and item selection.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
