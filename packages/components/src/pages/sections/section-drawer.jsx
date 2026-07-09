/**
 * @fileoverview Demo section for Drawer component (vanilla JSX + reactive client island)
 *
 * @module ui/sections/drawer
 * @description
 * Showcases the Drawer component with left/right placement, backdrop, and close behavior.
 *
 * Exports:
 * - `<SectionDrawer>`: Demo section for Drawer.
 *
 * @license MIT
 */

import Button from "@components/button.jsx";
import Drawer from "@components/drawer.jsx";
import Tabs, { TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import CopyButton from "@pages/components/copy-button.jsx";
import highlightJsx from "@pages/components/highlight-jsx.js";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

/**
 * Props accepted by `<SectionDrawer />`.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {}} SectionDrawerProps
 * @function SectionDrawer
 * @param {SectionDrawerProps} props
 * @returns {JSX.Element} Rendered markup.
 * @public
 */
export function SectionDrawer({ class: klass, className, ...rest }) {
    return (
        <Section id="drawer" {...rest}>
            <SectionHeading>Drawer</SectionHeading>
            <SectionDescription>
                Animated side sheet that slides in from the left or right edge. Supports backdrop click and Escape key to close.
            </SectionDescription>
            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview" class="pt-4 flex gap-4" active>
                    <Drawer side="left" title="Navigation">
                        <p class="text-sm text-muted-foreground mb-4">
                            This drawer slides in from the left side. Click the backdrop or press Escape to close.
                        </p>
                        <nav class="flex flex-col gap-2">
                            <Button variant="ghost">Dashboard</Button>
                            <Button variant="ghost">Settings</Button>
                            <Button variant="ghost">Profile</Button>
                            <Button variant="ghost">Help</Button>
                        </nav>
                    </Drawer>

                    <Drawer side="right" title="Notifications">
                        <p class="text-sm text-muted-foreground mb-4">
                            This drawer slides in from the right side. Click the backdrop or press Escape to close.
                        </p>
                        <div class="flex flex-col gap-3">
                            <div class="p-3 rounded-lg bg-muted">
                                <p class="text-sm font-medium">New update available</p>
                                <p class="text-xs text-muted-foreground">2 minutes ago</p>
                            </div>
                            <div class="p-3 rounded-lg bg-muted">
                                <p class="text-sm font-medium">Your report is ready</p>
                                <p class="text-xs text-muted-foreground">1 hour ago</p>
                            </div>
                            <div class="p-3 rounded-lg bg-muted">
                                <p class="text-sm font-medium">Team meeting at 3pm</p>
                                <p class="text-xs text-muted-foreground">3 hours ago</p>
                            </div>
                        </div>
                    </Drawer>
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre class="jsx-highlight">
                        <code id="drawer-code" class="language-jsx">
                            {highlightJsx(`<Drawer side="right" title="Notifications">
    <p>Content goes here.</p>
</Drawer>`)}
                        </code>
                    </pre>
                    <CopyButton for="drawer-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>Use the following primitives to build side sheet drawers:</p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>&lt;Drawer&gt;</strong>: The root drawer component. Accepts <code>side</code> ("left" | "right", default
                            "right"),
                            <code>title</code>, and <code>className</code>.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
