/**
 * @fileoverview Section showcasing the Tabs component (vanilla JSX)
 *
 * @module ui/SectionTabs
 * @description
 * This section demonstrates various Tabs component usages, including
 * a tabbed interface for account and password settings with actual form inputs.
 * It showcases nested TabsList, TabsTrigger, and TabsContent components
 * with functional forms inside each tab panel.
 *
 * Exports:
 * - `SectionTabs`: Displays different Tabs component examples.
 *
 * @author Víctor García
 * @license MIT
 * @version 1.0.0
 */

import Button from "@components/button.jsx";
import Input from "@components/input.jsx";
import Label from "@components/label.jsx";
import Tabs, { TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import CopyButton from "@pages/components/copy-button.jsx";
import highlightJsx from "@pages/components/highlight-jsx.js";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

/**
 * Props accepted by `<SectionTabs />`.
 *
 * This component does not accept any custom props.
 * It primarily serves as a container for Tabs examples.
 *
 * @typedef {HTMLElementAttributes & ComponentProps & {}} SectionTabsProps
 * @function SectionTabs
 * @param {SectionTabsProps} props
 * @returns {JSX.Element} Rendered markup for the Tabs section.
 * @example
 * <SectionTabs />
 * @public
 * @since 1.0.0
 */
export function SectionTabs(props) {
    return (
        <Section id="tabs" {...props}>
            <SectionHeading>Tabs</SectionHeading>
            <SectionDescription>
                A set of layered sections of content—known as tab panels—that are displayed one at a time.
            </SectionDescription>
            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview" class="pt-4" active>
                    <Tabs variant="default">
                        <TabsList>
                            <TabsTrigger name="tab-account" active>
                                Account
                            </TabsTrigger>
                            <TabsTrigger name="tab-password">Password</TabsTrigger>
                        </TabsList>
                        <TabsContent name="tab-account" class="pt-4">
                            <div class="grid gap-4 max-w-sm">
                                <Label variant="stacked">
                                    <span class="text-sm font-medium leading-none">Name</span>
                                    <Input name="tab-account-name" placeholder="Jane Doe" />
                                </Label>
                                <Label variant="stacked">
                                    <span class="text-sm font-medium leading-none">Username</span>
                                    <Input name="tab-account-username" placeholder="@jdoe" />
                                </Label>
                                <Button>Save changes</Button>
                            </div>
                        </TabsContent>
                        <TabsContent name="tab-password" class="pt-4">
                            <div class="grid gap-4 max-w-sm">
                                <Label variant="stacked">
                                    <span class="text-sm font-medium leading-none">Current password</span>
                                    <Input name="tab-password-current" type="password" />
                                </Label>
                                <Label variant="stacked">
                                    <span class="text-sm font-medium leading-none">New password</span>
                                    <Input name="tab-password-new" type="password" />
                                </Label>
                                <Button>Save Password</Button>
                            </div>
                        </TabsContent>
                    </Tabs>
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre class="jsx-highlight">
                        <code id="tabs-code" class="language-jsx">
                            {highlightJsx(`<Tabs variant="default">
    <TabsList>
        <TabsTrigger name="tab-account" active>Account</TabsTrigger>
        <TabsTrigger name="tab-password">Password</TabsTrigger>
    </TabsList>
    <TabsContent name="tab-account" class="pt-4">
        <div class="grid gap-4 max-w-sm">
            <Label variant="stacked">
                <span class="text-sm font-medium leading-none">Name</span>
                <Input name="tab-account-name" placeholder="Jane Doe" />
            </Label>
            <Label variant="stacked">
                <span class="text-sm font-medium leading-none">Username</span>
                <Input name="tab-account-username" placeholder="@jdoe" />
            </Label>
            <Button>Save changes</Button>
        </div>
    </TabsContent>
    <TabsContent name="tab-password" class="pt-4" active>
        <div class="grid gap-4 max-w-sm">
            <Label variant="stacked">
                <span class="text-sm font-medium leading-none">Current password</span>
                <Input name="tab-password-current" type="password" />
            </Label>
            <Label variant="stacked">
                <span class="text-sm font-medium leading-none">New password</span>
                <Input name="tab-password-new" type="password" />
            </Label>
            <Button>Save Password</Button>
        </div>
    </TabsContent>
</Tabs>`)}
                        </code>
                    </pre>

                    <CopyButton for="tabs-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>Use the following primitives to build tabbed interfaces:</p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>&lt;Tabs&gt;</strong>: The root container that manages tab state and provides context for other tab
                            components.
                        </li>
                        <li>
                            <strong>&lt;TabsList&gt;</strong>: Contains the tab trigger buttons and provides navigation between tab panels.
                        </li>
                        <li>
                            <strong>&lt;TabsTrigger&gt;</strong>: Individual tab buttons that activate their corresponding content panels.
                        </li>
                        <li>
                            <strong>&lt;TabsContent&gt;</strong>: The content panels that are shown/hidden based on the active tab.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
