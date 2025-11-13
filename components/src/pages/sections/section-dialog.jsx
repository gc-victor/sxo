/**
 * @fileoverview Section showcasing the Dialog component (vanilla JSX)
 *
 * @module ui/SectionDialog
 * @description
 * This section demonstrates various Dialog component usages,
 * including an edit profile dialog and a dialog with scrollable content.
 * It showcases nested DialogTrigger, DialogContent, DialogHeader,
 * DialogTitle, DialogDescription, DialogFooter, and DialogClose components.
 *
 * Exports:
 * - `SectionDialog`: Displays different Dialog component examples.
 *
 * @author Víctor García
 * @license MIT
 * @version 1.0.0
 */

import Button from "@components/button.jsx";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@components/dialog.jsx";
import Input from "@components/input.jsx";
import Label from "@components/label.jsx";
import Tabs, { TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import CopyButton from "@pages/components/copy-button.jsx";
import highlightJsx from "@pages/components/highlight-jsx.js";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

/**
 * Props accepted by `<SectionDialog />`.
 *
 * This component does not accept any custom props.
 * It primarily serves as a container for Dialog examples.
 *
 * @typedef {HTMLElementAttributes & ComponentProps & {}} SectionDialogProps
 * @function SectionDialog
 * @param {SectionDialogProps} props
 * @returns {JSX.Element} Rendered markup for the Dialog section.
 * @example
 * <SectionDialog />
 * @public
 * @since 1.0.0
 */
export function SectionDialog(props) {
    return (
        <Section id="dialog" {...props}>
            <SectionHeading>Dialog</SectionHeading>
            <SectionDescription>
                A window overlaid on either the primary window or another dialog window, rendering the content underneath inert.
            </SectionDescription>
            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview" class="pt-4" active>
                    <div class="grid gap-4">
                        {/* Example 1: Edit Profile (always open for demo) */}
                        <Dialog class="space-y-4">
                            <DialogTrigger variant="outline">Edit Profile</DialogTrigger>
                            <DialogContent class="relative mx-auto w-full max-w-md rounded-lg border shadow-lg p-0">
                                <DialogHeader>
                                    <DialogTitle>Edit profile</DialogTitle>
                                    <DialogDescription>Make changes to your profile here. Click save when you're done.</DialogDescription>
                                </DialogHeader>
                                <div class="grid gap-3">
                                    <Label variant="stacked">
                                        <span class="text-sm font-medium leading-none">Name</span>
                                        <Input id="dialog-name" placeholder="Jane Doe" />
                                    </Label>
                                    <Label variant="stacked">
                                        <span class="text-sm font-medium leading-none">Username</span>
                                        <Input id="dialog-username" placeholder="@jdoe" />
                                    </Label>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" type="button" $onclick="closeDialog">
                                        Cancel
                                    </Button>
                                    <Button type="button">Save changes</Button>
                                </DialogFooter>
                                <DialogClose aria-label="Close dialog" class="absolute top-3 right-3" />
                            </DialogContent>
                        </Dialog>

                        {/* Example 2: Scrollable Content */}
                        <Dialog class="space-y-4">
                            <DialogTrigger variant="outline">Scrollable Content</DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Scrollable Content</DialogTitle>
                                    <DialogDescription>This is a dialog with scrollable content.</DialogDescription>
                                </DialogHeader>
                                <div class="flex flex-col gap-3 text-sm leading-relaxed max-h-64 overflow-y-auto">
                                    <p>
                                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore
                                        et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
                                        aliquip ex ea commodo consequat.
                                    </p>
                                    <p>
                                        Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
                                        pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit
                                        anim id est laborum.
                                    </p>
                                    <p>
                                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore
                                        et dolore magna aliqua. Ut enim ad minim veniam.
                                    </p>
                                    <p>
                                        Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
                                        pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit
                                        anim id est laborum.
                                    </p>
                                    <p>
                                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore
                                        et dolore magna aliqua. Ut enim ad minim veniam.
                                    </p>
                                </div>
                                <DialogClose aria-label="Close dialog" />
                            </DialogContent>
                        </Dialog>
                    </div>
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre class="jsx-highlight">
                        <code id="dialog-code" class="language-jsx">
                            {highlightJsx(`<div class="grid gap-4">
    {/* Example 1: Edit Profile (always open for demo) */}
    <Dialog class="space-y-4">
        <DialogTrigger variant="outline">Edit Profile</DialogTrigger>
        <DialogContent class="relative mx-auto w-full max-w-md rounded-lg border shadow-lg p-0">
            <DialogHeader>
                <DialogTitle>Edit profile</DialogTitle>
                <DialogDescription>Make changes to your profile here. Click save when you're done.</DialogDescription>
            </DialogHeader>
            <div class="grid gap-3">
                <Label variant="stacked">
                    <span class="text-sm font-medium leading-none">Name</span>
                    <Input id="dialog-name" placeholder="Jane Doe" />
                </Label>
                <Label variant="stacked">
                    <span class="text-sm font-medium leading-none">Username</span>
                    <Input id="dialog-username" placeholder="@jdoe" />
                </Label>
            </div>
            <DialogFooter>
                <Button variant="outline" type="button" $onclick="closeDialog">
                    Cancel
                </Button>
                <Button type="button">Save changes</Button>
            </DialogFooter>
            <DialogClose aria-label="Close dialog" class="absolute top-3 right-3" />
        </DialogContent>
    </Dialog>

    {/* Example 2: Scrollable Content */}
    <Dialog class="space-y-4">
        <DialogTrigger variant="outline">Scrollable Content</DialogTrigger>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Scrollable Content</DialogTitle>
                <DialogDescription>This is a dialog with scrollable content.</DialogDescription>
            </DialogHeader>
            <div class="flex flex-col gap-3 text-sm leading-relaxed max-h-64 overflow-y-auto">
                <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et
                    dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex
                    ea commodo consequat.
                </p>
                <p>
                    Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
                    Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est
                    laborum.
                </p>
                <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et
                    dolore magna aliqua. Ut enim ad minim veniam.
                </p>
                <p>
                    Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
                    Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est
                    laborum.
                </p>
                <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et
                    dolore magna aliqua. Ut enim ad minim veniam.
                </p>
            </div>
            <DialogClose aria-label="Close dialog" />
        </DialogContent>
    </Dialog>
</div>`)}
                        </code>
                    </pre>

                    <CopyButton for="dialog-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>Use the following primitives to build dialogs:</p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>&lt;Dialog&gt;</strong>: The root container that manages dialog state and provides context for other
                            dialog components.
                        </li>
                        <li>
                            <strong>&lt;DialogTrigger&gt;</strong>: The button that opens the dialog, can be any interactive element.
                        </li>
                        <li>
                            <strong>&lt;DialogContent&gt;</strong>: The modal content container that renders the dialog overlay and content.
                        </li>
                        <li>
                            <strong>&lt;DialogHeader&gt;</strong>: The header section containing title and description.
                        </li>
                        <li>
                            <strong>&lt;DialogTitle&gt;</strong>: The title text within the dialog header.
                        </li>
                        <li>
                            <strong>&lt;DialogDescription&gt;</strong>: The description text within the dialog header.
                        </li>
                        <li>
                            <strong>&lt;DialogFooter&gt;</strong>: The footer section for action buttons.
                        </li>
                        <li>
                            <strong>&lt;DialogClose&gt;</strong>: A button that closes the dialog, typically used for close icons or cancel
                            buttons.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
