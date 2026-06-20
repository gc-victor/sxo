import {
    AlertDialog,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogTitle,
    AlertDialogTrigger,
    AlertDialogWindow,
} from "@components/alert-dialog.jsx";
import Button from "@components/button.jsx";
import Tabs, { TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import CopyButton from "@pages/components/copy-button.jsx";
import highlightJsx from "@pages/components/highlight-jsx.js";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

export function SectionAlertDialog() {
    return (
        <Section id="alert-dialog">
            <SectionHeading>Alert Dialog</SectionHeading>
            <SectionDescription>A modal dialog that interrupts the user with important content and expects a response.</SectionDescription>

            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview" class="pt-4" active>
                    <AlertDialog>
                        <AlertDialogTrigger variant="outline">Open dialog</AlertDialogTrigger>
                        <AlertDialogWindow>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete your account and remove your data from our
                                servers.
                            </AlertDialogDescription>
                            <AlertDialogFooter>
                                <Button variant="outline" $onclick="closeDialog">
                                    Cancel
                                </Button>
                                <Button>Continue</Button>
                            </AlertDialogFooter>
                        </AlertDialogWindow>
                    </AlertDialog>
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre className="jsx-highlight">
                        <code id="alert-dialog-code" class="language-jsx">
                            {highlightJsx(`<AlertDialog>
    <AlertDialogTrigger variant="outline">Open dialog</AlertDialogTrigger>
    <AlertDialogWindow>
        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
        <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your account and remove your data from our servers.
        </AlertDialogDescription>
        <AlertDialogFooter>
            <Button variant="outline" $onclick="closeDialog">
                Cancel
            </Button>
            <Button>Continue</Button>
        </AlertDialogFooter>
    </AlertDialogWindow>
</AlertDialog>`)}
                        </code>
                    </pre>

                    <CopyButton for="alert-dialog-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>Use the following primitives to build an alert dialog:</p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>&lt;AlertDialog&gt;</strong>: The root container for the alert dialog.
                        </li>
                        <li>
                            <strong>&lt;AlertDialogTrigger&gt;</strong>: A button that opens the dialog.
                        </li>
                        <li>
                            <strong>&lt;AlertDialogWindow&gt;</strong>: The modal window containing the dialog content.
                        </li>
                        <li>
                            <strong>&lt;AlertDialogTitle&gt;</strong>: The title of the dialog.
                        </li>
                        <li>
                            <strong>&lt;AlertDialogDescription&gt;</strong>: The description text explaining the action.
                        </li>
                        <li>
                            <strong>&lt;AlertDialogFooter&gt;</strong>: The footer with action buttons.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
