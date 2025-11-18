/**
 * @fileoverview Homepage - vanilla JSX example with Basecoat components.
 */

import Button from "../components/button.jsx";
import Card, { CardHeader, CardHeaderTitle, CardHeaderDescription, CardSection, CardFooter } from "../components/card.jsx";

export default function HomePage() {
    return (
        <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>project_name</title>
                <meta name="description" content="Welcome to project_name - built with SXO" />
            </head>
            <body class="min-h-screen bg-slate-50">
                <main class="container mx-auto px-4 py-12">
                    <div class="max-w-5xl mx-auto space-y-10">
                        <section class="text-center md:text-left space-y-4">
                            <h1 class="text-4xl font-bold text-slate-900">Welcome to project_name</h1>
                            <p class="text-xl text-slate-600">
                                A minimal SXO project with server-side JSX, hot reload, and Basecoat components.
                            </p>
                            <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
                                <Button variant="primary" href="/about" target="_blank" rel="noopener noreferrer">
                                    Visit About Page
                                </Button>
                                <Button variant="outline" href="https://github.com/gc-victor/sxo" target="_blank" rel="noopener noreferrer">
                                    View on GitHub
                                </Button>
                            </div>
                        </section>

                        <div class="grid gap-6 md:grid-cols-2">
                            <Card class="bg-white rounded-lg shadow-sm">
                                <CardHeader class="border-b border-slate-100">
                                    <CardHeaderTitle level={2}>Quick Start</CardHeaderTitle>
                                    <CardHeaderDescription>
                                        Follow these steps to begin customizing project_name.
                                    </CardHeaderDescription>
                                </CardHeader>
                                <CardSection class="space-y-3 text-slate-700">
                                    <ol class="list-decimal list-inside space-y-2">
                                        <li>
                                            Edit <code>src/pages/index.jsx</code> to see instant updates.
                                        </li>
                                        <li>Explore Basecoat components to build rich layouts.</li>
                                        <li>
                                            Run <code>pnpm test</code> to keep everything green.
                                        </li>
                                    </ol>
                                </CardSection>
                            </Card>

                            <Card class="bg-white rounded-lg shadow-sm">
                                <CardHeader class="border-b border-slate-100">
                                    <CardHeaderTitle level={2}>Documentation & Resources</CardHeaderTitle>
                                    <CardHeaderDescription>
                                        Learn how SXO works with Basecoat.
                                    </CardHeaderDescription>
                                </CardHeader>
                                <CardSection class="space-y-3 text-slate-700">
                                    <ul class="space-y-2">
                                        <li>Review the project README for architecture notes.</li>
                                        <li>
                                            Browse <code>templates/src/components</code> for UI primitives.
                                        </li>
                                        <li>
                                            Inspect <code>templates/src/pages</code> for route-driven layouts.
                                        </li>
                                    </ul>
                                </CardSection>
                            </Card>
                        </div>

                        <Card class="bg-white rounded-lg shadow-sm">
                            <CardHeader class="border-b border-slate-100">
                                <CardHeaderTitle level={2}>Key Features</CardHeaderTitle>
                                <CardHeaderDescription>
                                    Build modern experiences with zero client-side framework overhead.
                                </CardHeaderDescription>
                            </CardHeader>
                            <CardSection class="grid gap-6 text-slate-700 md:grid-cols-2">
                                <ul class="space-y-2">
                                    <li>✓ Server-side JSX rendering</li>
                                    <li>✓ Hot reload with state preservation</li>
                                    <li>✓ Directory-based routing</li>
                                </ul>
                                <ul class="space-y-2">
                                    <li>✓ Tailwind CSS with Basecoat presets</li>
                                    <li>✓ Client islands for interactivity</li>
                                    <li>✓ TypeScript support via JSDoc</li>
                                </ul>
                            </CardSection>
                            <CardFooter class="border-t border-slate-100 text-center text-slate-500">
                                 Experiment with new cards and sections to tailor project_name to your product.
                             </CardFooter>
                        </Card>
                    </div>
                </main>
            </body>
        </html>
    );
}
