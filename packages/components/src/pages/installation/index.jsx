import { DocLayout } from "../components/doc-layout.jsx";
import InstallTabs from "../components/install-tabs.jsx";
import CopyButton from "../components/copy-button.jsx";

export default function InstallationPage() {
    return (
        <DocLayout title="Installation" currentPage="installation">
            <section class="space-y-6 mt-12">
                <h2 class="scroll-mt-24 text-4xl font-semibold tracking-tight sm:text-3xl xl:text-4xl">
                    Installation
                </h2>

                <div>
                    <h3 class="text-xl font-semibold">Dependencies</h3>

                    <p class="mt-6">
                        Install the core dependencies for SXO and Reactive Component. SXO provides the JSX transformation
                        and server-side rendering capabilities, while Reactive Component enables client-side interactivity
                        through the islands architecture pattern.
                    </p>

                    <InstallTabs
                        componentName="install-dependencies"
                        commands={{
                            pnpm: "pnpm add sxo",
                            npm: "npm install sxo",
                            yarn: "yarn add sxo",
                            bun: "bun add sxo",
                        }}
                    />
                </div>

                <div>
                    <h3 class="text-xl font-semibold">DevDependencies</h3>

                    <p class="mt-6">
                        Install Tailwind CSS and its CLI as development dependencies. The CLI is used to process your
                        stylesheets and generate the final CSS output with all the utility classes used in your components.
                    </p>

                    <InstallTabs
                        componentName="install-dev-dependencies"
                        commands={{
                            pnpm: "pnpm add -D tailwindcss @tailwindcss/cli basecoat-css@1.0.2",
                            npm: "npm install -D tailwindcss @tailwindcss/cli basecoat-css@1.0.2",
                            yarn: "yarn add -D tailwindcss @tailwindcss/cli basecoat-css@1.0.2",
                            bun: "bun add -D tailwindcss @tailwindcss/cli basecoat-css@1.0.2",
                        }}
                    />

                    <p class="mt-4">
                        After installing the dependencies, import Tailwind and Basecoat CSS into your main stylesheet:
                    </p>

                    <div class="relative">
                        <pre class="css-highlight mt-4">
                            <code
                                id="import-css"
                                class="language-css"
                            >{`<span class="css-keyword">@import</span> <span class="css-string">"tailwindcss"</span>;\n<span class="css-keyword">@import</span> <span class="css-string">"basecoat-css"</span>;`}</code>
                        </pre>

                        <CopyButton for="import-css" />
                    </div>
                </div>

                <div>
                    <h3 class="text-xl font-semibold">Components</h3>

                    <p class="mt-6">
                        Run the following command from your project root to install a component and its associated assets
                        (styles, JSX components, and the client script).
                    </p>

                    <InstallTabs
                        componentName="install-component"
                        commands={{
                            pnpm: "pnpx sxo add <component>",
                            npm: "npx sxo add <component>",
                            yarn: "yarn sxo add <component>",
                            bun: "bunx sxo add <component>",
                        }}
                    />
                </div>
            </section>
        </DocLayout>
    );
}
