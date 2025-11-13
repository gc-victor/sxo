/**
 * @fileoverview Section showcasing the Card component (vanilla JSX)
 *
 * @module ui/SectionCard
 * @description
 * This section demonstrates various Card component usages,
 * including a login form card and a card with a large image.
 * It showcases nested CardHeader, CardHeaderTitle, CardHeaderDescription,
 * CardSection, and CardFooter components with real-world examples.
 *
 * Exports:
 * - `SectionCard`: Displays different Card component examples.
 *
 * @author Víctor García
 * @license MIT
 * @version 1.0.0
 */

import Badge from "@components/badge.jsx";
import Button from "@components/button.jsx";
import Card, { CardFooter, CardHeader, CardHeaderDescription, CardHeaderTitle, CardSection } from "@components/card.jsx";
import Tabs, { TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import CopyButton from "@pages/components/copy-button.jsx";
import highlightJsx from "@pages/components/highlight-jsx.js";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

/**
 * Props accepted by `<SectionCard />`.
 *
 * This component does not accept any custom props.
 * It primarily serves as a container for Card examples.
 *
 * @typedef {HTMLElementAttributes & ComponentProps & {}} SectionCardProps
 * @function SectionCard
 * @param {SectionCardProps} props
 * @returns {JSX.Element} Rendered markup for the Card section.
 * @example
 * <SectionCard />
 * @public
 * @since 1.0.0
 */
export function SectionCard(props) {
    return (
        <Section id="card" {...props}>
            <SectionHeading>Card</SectionHeading>
            <SectionDescription>Displays a card with header, content, and footer.</SectionDescription>
            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview" class="pt-4" active>
                    <div class="grid gap-6 md:grid-cols-2">
                        {/* Case 1: Login card */}
                        <Card class="card">
                            <CardHeader>
                                <CardHeaderTitle level={2}>Login to your account</CardHeaderTitle>
                                <CardHeaderDescription>Enter your details below to login to your account</CardHeaderDescription>
                            </CardHeader>
                            <CardSection>
                                <form class="form grid gap-6">
                                    <div class="grid gap-2">
                                        <label for="email1">Email</label>
                                        <input id="email1" class="input" type="email" placeholder="you@example.com" />
                                    </div>
                                    <div class="grid gap-2">
                                        <label for="pass1">Password</label>
                                        <input id="pass1" class="input" type="password" placeholder="••••••••" />
                                    </div>
                                    <div class="flex items-center justify-between">
                                        <label class="label gap-3">
                                            <input class="input" type="checkbox" />
                                            <span>Remember me</span>
                                        </label>
                                        <span class="text-sm underline opacity-80" aria-disabled="true">
                                            Forgot your password?
                                        </span>
                                    </div>
                                </form>
                            </CardSection>
                            <CardFooter class="flex flex-col gap-2">
                                <Button type="submit" class="w-full">
                                    Login
                                </Button>
                                <Button variant="outline" type="button" class="w-full">
                                    Login with Google
                                </Button>
                            </CardFooter>
                        </Card>

                        {/* Case 2: Image card */}
                        <Card class="card">
                            <CardHeader>
                                <CardHeaderTitle level={2}>Is this an image?</CardHeaderTitle>
                                <CardHeaderDescription>This is a card with an image.</CardHeaderDescription>
                            </CardHeader>
                            <CardSection class="px-0">
                                <img
                                    alt="A modern house with large windows and contemporary architecture"
                                    loading="lazy"
                                    class="aspect-video object-cover"
                                    src="https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=800&dpr=2&q=80&w=1080&q=75"
                                    style="color: transparent"
                                />
                            </CardSection>
                            <CardFooter class="flex items-center gap-2">
                                <Badge variant="outline">
                                    <svg
                                        aria-hidden="true"
                                        class="h-3 w-3 -translate-x-1 animate-pulse fill-green-300 text-green-300"
                                        fill="currentColor"
                                        viewBox="0 0 8 8"
                                    >
                                        <circle cx={4} cy={4} r={3} />
                                    </svg>
                                    Live
                                </Badge>
                                <p class="text-xs text-muted-foreground">Built with SXO and Tailwind CSS</p>
                            </CardFooter>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre class="jsx-highlight">
                        <code id="card-code" class="language-jsx">
                            {highlightJsx(`<div class="grid gap-6 md:grid-cols-2">
    {/* Case 1: Login card */}
    <Card class="card">
        <CardHeader>
            <CardHeaderTitle level={2}>Login to your account</CardHeaderTitle>
            <CardHeaderDescription>Enter your details below to login to your account</CardHeaderDescription>
        </CardHeader>
        <CardSection>
            <form class="form grid gap-6">
                <div class="grid gap-2">
                    <label for="email1">Email</label>
                    <input id="email1" class="input" type="email" placeholder="you@example.com" />
                </div>
                <div class="grid gap-2">
                    <label for="pass1">Password</label>
                    <input id="pass1" class="input" type="password" placeholder="••••••••" />
                </div>
                <div class="flex items-center justify-between">
                    <label class="label gap-3">
                        <input class="input" type="checkbox" />
                        <span>Remember me</span>
                    </label>
                    <span class="text-sm underline opacity-80" aria-disabled="true">
                        Forgot your password?
                    </span>
                </div>
            </form>
        </CardSection>
        <CardFooter class="flex flex-col gap-2">
            <Button type="submit" class="w-full">
                Login
            </Button>
            <Button variant="outline" type="button" class="w-full">
                Login with Google
            </Button>
        </CardFooter>
    </Card>

    {/* Case 2: Image card */}
    <Card class="card">
        <CardHeader>
            <CardHeaderTitle level={2}>Is this an image?</CardHeaderTitle>
            <CardHeaderDescription>This is a card with an image.</CardHeaderDescription>
        </CardHeader>
        <CardSection class="px-0">
            <img
                alt="A modern house with large windows and contemporary architecture"
                loading="lazy"
                class="aspect-video object-cover"
                src="https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=800&dpr=2&q=80&w=1080&q=75"
                style="color: transparent"
            />
        </CardSection>
        <CardFooter class="flex items-center gap-2">
            <Badge variant="outline">
                <svg
                    aria-hidden="true"
                    class="h-3 w-3 -translate-x-1 animate-pulse fill-green-300 text-green-300"
                    fill="currentColor"
                    viewBox="0 0 8 8"
                >
                    <circle cx={4} cy={4} r={3} />
                </svg>
                Live
            </Badge>
            <p class="text-xs text-muted-foreground">Built with SXO and Tailwind CSS</p>
        </CardFooter>
    </Card>
</div>`)}
                        </code>
                    </pre>

                    <CopyButton for="card-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>Use the following primitives to build cards:</p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>&lt;Card&gt;</strong>: The root card component.
                        </li>
                        <li>
                            <strong>&lt;CardHeader&gt;</strong>: The header section of the card.
                        </li>
                        <li>
                            <strong>&lt;CardHeaderTitle&gt;</strong>: The title in the header.
                        </li>
                        <li>
                            <strong>&lt;CardHeaderDescription&gt;</strong>: The description in the header.
                        </li>
                        <li>
                            <strong>&lt;CardSection&gt;</strong>: The main content section.
                        </li>
                        <li>
                            <strong>&lt;CardFooter&gt;</strong>: The footer section.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
