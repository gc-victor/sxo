/**
 * @fileoverview About page - demonstrates nested routing.
 */

import Button from "../../components/button.jsx";
import Card, { CardHeader, CardHeaderTitle, CardSection } from "../../components/card.jsx";

/**
 * @param {Record<string, string>} _params
 */

export default function AboutPage(_params) {
    return (
        <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>About - project_name</title>
                <meta name="description" content="Learn more about project_name" />
            </head>
            <body class="min-h-screen bg-slate-50">
                <main class="container mx-auto px-4 py-12">
                    <div class="max-w-4xl mx-auto space-y-8">
                        <h1 class="text-4xl font-bold text-slate-900 mb-6">About project_name</h1>

                        <Card>
                            <CardSection>
                                <p class="text-lg mb-4">
                                    This project was built with SXO, a minimal server-side JSX framework focused on simplicity and
                                    performance.
                                </p>
                                <p class="text-slate-600">
                                    SXO combines the developer experience of modern frameworks with the simplicity of server-side rendering.
                                    No complex build configurations, no virtual DOM overhead—just clean, performant web applications.
                                </p>
                            </CardSection>
                        </Card>

                        <Card>
                            <CardHeader class="pb-0">
                                <CardHeaderTitle level={2} class="text-2xl font-bold text-slate-900">
                                    Tech Stack
                                </CardHeaderTitle>
                            </CardHeader>
                            <CardSection>
                                <ul class="space-y-2 text-slate-700 list-disc list-inside">
                                    <li>
                                        <strong>SXO:</strong> Server-side JSX framework
                                    </li>
                                    <li>
                                        <strong>Tailwind CSS:</strong> Utility-first CSS framework
                                    </li>
                                    <li>
                                        <strong>basecoat-css:</strong> Accessible component presets
                                    </li>
                                    <li>
                                        <strong>@qery/reactive-component:</strong> Client-side interactivity
                                    </li>
                                    <li>
                                        <strong>esbuild:</strong> Fast JavaScript bundler
                                    </li>
                                </ul>
                            </CardSection>
                        </Card>
                        <footer class="flex gap-4">
                            <Button href="/" variant="primary">
                                ← Back to Home
                            </Button>
                            <Button href="https://github.com/gc-victor/sxo" target="_blank" rel="noopener noreferrer" variant="outline">
                                View SXO on GitHub
                            </Button>
                        </footer>
                    </div>
                </main>
            </body>
        </html>
    );
}
