/**
 * @fileoverview Section showcasing the DropdownMenu component (vanilla JSX)
 *
 * @module ui/SectionDropdownMenu
 * @description
 * This section demonstrates various DropdownMenu component usages,
 * including grouped menu items, labels, separators, and keyboard shortcuts.
 * It showcases nested DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup,
 * DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, and DropdownMenuShortcut components.
 *
 * Exports:
 * - `SectionDropdownMenu`: Displays different DropdownMenu component examples.
 *
 * @author Víctor García
 * @license MIT
 * @version 1.0.0
 */

import DropdownMenu, {
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from "@components/dropdown-menu.jsx";
import Tabs, { TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import CopyButton from "@pages/components/copy-button.jsx";
import highlightJsx from "@pages/components/highlight-jsx.js";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

/**
 * Props accepted by `<SectionDropdownMenu />`.
 *
 * This component does not accept any custom props.
 * It primarily serves as a container for DropdownMenu examples.
 *
 * @typedef {HTMLElementAttributes & ComponentProps & {}} SectionDropdownMenuProps
 * @function SectionDropdownMenu
 * @param {SectionDropdownMenuProps} props
 * @returns {JSX.Element} Rendered markup for the DropdownMenu section.
 * @example
 * <SectionDropdownMenu />
 * @public
 * @since 1.0.0
 */
export function SectionDropdownMenu(props) {
    return (
        <Section id="dropdown-menu" {...props}>
            <SectionHeading>Dropdown Menu</SectionHeading>
            <SectionDescription>
                Displays a menu to the user — such as a set of actions or functions — triggered by a button.
            </SectionDescription>
            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview" class="pt-4" active>
                    <div class="flex flex-wrap gap-4">
                        <DropdownMenu>
                            <DropdownMenuTrigger class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90">
                                Open
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuGroup label="My Account">
                                    <DropdownMenuItem>
                                        Profile
                                        <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        Billing
                                        <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        Settings
                                        <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        Keyboard shortcuts
                                        <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>Appearance</DropdownMenuLabel>
                                <DropdownMenuItem>Status Bar</DropdownMenuItem>
                                <DropdownMenuItem>Activity Bar</DropdownMenuItem>
                                <DropdownMenuItem>Panel</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>Panel Position</DropdownMenuLabel>
                                <DropdownMenuItem>Left</DropdownMenuItem>
                                <DropdownMenuItem>Right</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre class="jsx-highlight">
                        <code id="dropdown-menu-code" class="language-jsx">
                            {highlightJsx(`<div class="flex flex-wrap gap-4">
    <DropdownMenu>
        <DropdownMenuTrigger class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90">
            Open
        </DropdownMenuTrigger>
        <DropdownMenuContent>
            <DropdownMenuGroup label="My Account">
                <DropdownMenuItem>
                    Profile
                    <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem>
                    Billing
                    <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem>
                    Settings
                    <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem>
                    Keyboard shortcuts
                    <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
                </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Appearance</DropdownMenuLabel>
            <DropdownMenuItem>Status Bar</DropdownMenuItem>
            <DropdownMenuItem>Activity Bar</DropdownMenuItem>
            <DropdownMenuItem>Panel</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Panel Position</DropdownMenuLabel>
            <DropdownMenuItem>Left</DropdownMenuItem>
            <DropdownMenuItem>Right</DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
</div>`)}
                        </code>
                    </pre>

                    <CopyButton for="dropdown-menu-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>Use the following primitives to build dropdown menus:</p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>&lt;DropdownMenu&gt;</strong>: The root dropdown menu component.
                        </li>
                        <li>
                            <strong>&lt;DropdownMenuTrigger&gt;</strong>: The button that opens the menu.
                        </li>
                        <li>
                            <strong>&lt;DropdownMenuContent&gt;</strong>: The container for menu items.
                        </li>
                        <li>
                            <strong>&lt;DropdownMenuGroup&gt;</strong>: Groups menu items with a label.
                        </li>
                        <li>
                            <strong>&lt;DropdownMenuItem&gt;</strong>: Individual menu items.
                        </li>
                        <li>
                            <strong>&lt;DropdownMenuLabel&gt;</strong>: Labels for sections.
                        </li>
                        <li>
                            <strong>&lt;DropdownMenuSeparator&gt;</strong>: Separators between sections.
                        </li>
                        <li>
                            <strong>&lt;DropdownMenuShortcut&gt;</strong>: Keyboard shortcut hints.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
