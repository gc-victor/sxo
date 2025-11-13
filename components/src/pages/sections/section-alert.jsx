import { Alert, AlertDescription, AlertTitle } from "@components/alert.jsx";
import { IconCircleCheck, IconCircleExclamation, IconGift, IconShieldExclamation } from "@components/icon.jsx";
import Tabs, { TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import CopyButton from "@pages/components/copy-button.jsx";
import highlightJsx from "@pages/components/highlight-jsx.js";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

export function SectionAlert() {
    return (
        <Section id="alert">
            <SectionHeading>Alert</SectionHeading>
            <SectionDescription>Displays a callout for user attention.</SectionDescription>
            {/* NOTE: Tabs show Preview and Code; code snippet excludes SectionHeading/SectionDescription — including various icon usages */}
            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview" class="pt-4" active>
                    <div class="grid gap-3">
                        <Alert>
                            <AlertTitle level={3}>This is an alert with only a title.</AlertTitle>
                        </Alert>

                        <Alert>
                            <IconGift />
                            <AlertDescription>
                                <p>This is an alert with icon, description and no title.</p>
                            </AlertDescription>
                        </Alert>

                        <Alert>
                            <IconShieldExclamation />
                            <AlertTitle level={3}>Alert Title</AlertTitle>
                            <AlertDescription>
                                <p class="text-muted-foreground">This is an alert with both a title and a description.</p>
                            </AlertDescription>
                        </Alert>

                        <Alert className="bg-sky-50 border-sky-500 text-sky-700 dark:bg-sky-900 dark:border-sky-700 dark:text-sky-50">
                            <AlertDescription>
                                <p>This one has a description only. No title. No icon.</p>
                            </AlertDescription>
                        </Alert>

                        <Alert class="bg-green-50 border-green-500 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-50">
                            <IconCircleCheck />
                            <AlertTitle level={3}>Success! Your changes have been saved</AlertTitle>
                            <AlertDescription>
                                <p class="text-green-700/70 dark:text-green-50/70">This is an alert with icon, title and description.</p>
                            </AlertDescription>
                        </Alert>

                        <Alert className="bg-red-50 border-red-500 text-red-700 dark:bg-red-900 dark:border-red-700 dark:text-red-50">
                            <IconCircleExclamation />
                            <AlertTitle level={3}>Something went wrong!</AlertTitle>
                            <AlertDescription class="text-red-700/70 dark:text-red-50/70">
                                <p>Please verify your billing information and try again.</p>
                                <ul class="list-disc list-inside">
                                    <li>Check your card details</li>
                                    <li>Ensure sufficient funds</li>
                                    <li>Verify billing address</li>
                                </ul>
                            </AlertDescription>
                        </Alert>

                        <Alert className="bg-amber-50 border-amber-500 text-amber-700 dark:bg-amber-900 dark:border-amber-700 dark:text-amber-50">
                            <IconShieldExclamation />
                            <AlertTitle level={3}>Plot Twist: This Alert is Actually Amber!</AlertTitle>
                            <AlertDescription>
                                <p class="text-amber-700/70 dark:text-amber-50/70">This one has custom colors for light and dark mode.</p>
                            </AlertDescription>
                        </Alert>
                    </div>
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre className="jsx-highlight">
                        <code id="alert-code" class="language-jsx">
                            {highlightJsx(`<div class="grid gap-3">
    {/* Case 1: Title only */}
    <Alert>
        <AlertTitle level={3}>This is an alert with only a title.</AlertTitle>
    </Alert>

    {/* Case 2: Icon and description, no title */}
    <Alert>
        <IconGift />
        <AlertDescription>
            <p>This is an alert with icon, description and no title.</p>
        </AlertDescription>
    </Alert>

    {/* Case 3: Icon, title, and description */}
    <Alert>
        <IconShieldExclamation />
        <AlertTitle level={3}>Alert Title</AlertTitle>
        <AlertDescription>
            <p class="text-muted-foreground">This is an alert with both a title and a description.</p>
        </AlertDescription>
    </Alert>

    {/* Case 4: Description only with custom sky blue styling */}
    <Alert className="bg-sky-50 border-sky-500 text-sky-700 dark:bg-sky-900 dark:border-sky-700 dark:text-sky-50">
        <AlertDescription>
            <p>This one has a description only. No title. No icon.</p>
        </AlertDescription>
    </Alert>

    {/* Case 5: Success state with green styling, icon, title, and description */}
    <Alert class="bg-green-50 border-green-500 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-50">
        <IconCircleCheck />
        <AlertTitle level={3}>Success! Your changes have been saved</AlertTitle>
        <AlertDescription>
            <p class="text-green-700/70 dark:text-green-50/70">This is an alert with icon, title and description.</p>
        </AlertDescription>
    </Alert>

    {/* Case 6: Error state with red styling, icon, title, and complex description with list */}
    <Alert className="bg-red-50 border-red-500 text-red-700 dark:bg-red-900 dark:border-red-700 dark:text-red-50">
        <IconCircleExclamation />
        <AlertTitle level={3}>Something went wrong!</AlertTitle>
        <AlertDescription class="text-red-700/70 dark:text-red-50/70">
            <p>Please verify your billing information and try again.</p>
            <ul class="list-disc list-inside">
                <li>Check your card details</li>
                <li>Ensure sufficient funds</li>
                <li>Verify billing address</li>
            </ul>
        </AlertDescription>
    </Alert>

    {/* Case 7: Warning state with amber styling and dark mode support */}
    <Alert className="bg-amber-50 border-amber-500 text-amber-700 dark:bg-amber-900 dark:border-amber-700 dark:text-amber-50">
        <IconShieldExclamation />
        <AlertTitle level={3}>Plot Twist: This Alert is Actually Amber!</AlertTitle>
        <AlertDescription>
            <p class="text-amber-700/70 dark:text-amber-50/70">This one has custom colors for light and dark mode.</p>
        </AlertDescription>
    </Alert>
</div>`)}
                        </code>
                    </pre>

                    <CopyButton for="alert-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>Use the following primitives to build an alert:</p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>Alert</strong>: The main container for the alert message, supporting optional className for styling.
                        </li>
                        <li>
                            <strong>AlertTitle</strong>: Displays the title of the alert, with a level prop for semantic heading.
                        </li>
                        <li>
                            <strong>AlertDescription</strong>: Contains the description text, which can include paragraphs, lists, etc.
                        </li>
                        <li>
                            <strong>Icon components</strong>: Optional icons like <code>IconCircleCheck</code>,{" "}
                            <code>IconCircleExclamation</code>, etc., placed before the title or description for visual emphasis.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
