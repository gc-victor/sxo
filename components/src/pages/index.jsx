/**
 * Collection of Components — SXO)
 *
 * A comprehensive showcase of all available UI components.
 * Notes:
 * - This is NOT React. It's vanilla JSX compiled by SXO's transformer.
 * - Pages must return a full HTML document and manage their own <head>.
 * - This page demonstrates all UI components in a single view for testing and reference.
 */

/* Import UI components */
import Button from "@components/button.jsx";
import { IconExternalLink } from "@components/icon.jsx";
/* SVG sprite symbols - must be mounted once per document */
import SvgSymbols, {
    SymbolArrowRight,
    SymbolCheck,
    SymbolChevronDown,
    SymbolChevronLeft,
    SymbolChevronRight,
    SymbolChevronsVertical,
    SymbolCircleCheck,
    SymbolCircleExclamation,
    SymbolCircleInfo,
    SymbolCopy,
    SymbolCube,
    SymbolDotsHorizontal,
    SymbolExternalLink,
    SymbolGift,
    SymbolImage,
    SymbolList,
    SymbolMoon,
    SymbolSearch,
    SymbolSend,
    SymbolShieldExclamation,
    SymbolSpinner,
    SymbolSun,
    SymbolTrash,
    SymbolTriangleWarning,
    SymbolX,
} from "@components/svg-symbols.jsx";
import ThemeSelector from "@pages/components/theme-selector.jsx";
/* Import all component sections */
import { SectionAccordion } from "@pages/sections/section-accordion.jsx";
import { SectionAlert } from "@pages/sections/section-alert.jsx";
import { SectionAlertDialog } from "@pages/sections/section-alert-dialog.jsx";
import { SectionAvatar } from "@pages/sections/section-avatar.jsx";
import { SectionBadge } from "@pages/sections/section-badge.jsx";
import { SectionBreadcrumb } from "@pages/sections/section-breadcrumb.jsx";
import { SectionButton } from "@pages/sections/section-button.jsx";
import { SectionCard } from "@pages/sections/section-card.jsx";
import { SectionCheckbox } from "@pages/sections/section-checkbox.jsx";
import { SectionDialog } from "@pages/sections/section-dialog.jsx";
import { SectionDropdownMenu } from "@pages/sections/section-dropdown-menu.jsx";
import { SectionForm } from "@pages/sections/section-form.jsx";
import { SectionInput } from "@pages/sections/section-input.jsx";
import { SectionLabel } from "@pages/sections/section-label.jsx";
import { SectionPagination } from "@pages/sections/section-pagination.jsx";
import { SectionPopover } from "@pages/sections/section-popover.jsx";
import { SectionRadioGroup } from "@pages/sections/section-radio-group.jsx";
import { SectionSelect } from "@pages/sections/section-select.jsx";
import { SectionSelectMenu } from "@pages/sections/section-select-menu.jsx";
import { SectionSkeleton } from "@pages/sections/section-skeleton.jsx";
import { SectionSlider } from "@pages/sections/section-slider.jsx";
import { SectionSwitch } from "@pages/sections/section-switch.jsx";
import { SectionTable } from "@pages/sections/section-table.jsx";
import { SectionTabs } from "@pages/sections/section-tabs.jsx";
import { SectionTextarea } from "@pages/sections/section-textarea.jsx";
import { SectionToast } from "@pages/sections/section-toast.jsx";
import { SectionTooltip } from "@pages/sections/section-tooltip.jsx";
import ThemeToggle from "@/pages/components/theme-toggle.jsx";
import CopyButton from "./components/copy-button";
import InstallTabs from "./components/install-tabs";
import Sidebar from "./components/sidebar";

/**
 * SXO: Collection of Components
 *
 * Complete showcase of all the components in a single page.
 * This page serves as both a component gallery and a testing ground.
 *
 * @returns {string} Full HTML document with all UI components
 */
export default () => (
    <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta http-equiv="Content-Language" content="en" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />

            <title>SXO: Collection of Components</title>
            <meta name="title" content="SXO: Collection of Components" />
            <meta name="description" content="A complete UI component library built with SXO, Reactive Component, and Tailwind CSS." />
            <meta
                name="keywords"
                content="components,component library,component system,UI,UI kit,shadcn,shadcn/ui,Tailwind CSS,Tailwind,CSS,HTML,SXO,Reactive Component,JS,JavaScript,vanilla JS,vanilla JavaScript"
            />

            <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg" />
            <link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png" />

            <meta property="og:type" content="website" />
            <meta property="og:url" content="https://sxo.dev/" />
            <meta property="og:title" content="SXO: Collection of Components" />
            <meta property="og:description" content="A collection of SXO the components." />
            <meta property="og:image" content="https://sxo.dev/assets/social-screenshot.png" />
            <meta property="og:site_name" content="SXO" />
            <meta property="og:locale" content="en_US" />
            <meta property="og:author" content="Víctor García" />

            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:url" content="https://sxo.dev/" />
            <meta name="twitter:title" content="SXO: Collection of Components" />
            <meta name="twitter:description" content="A collection of SXO components." />
            <meta name="twitter:image" content="https://sxo.dev/assets/social-screenshot.png" />
            <meta name="twitter:creator" content="@gcv" />
        </head>
        <body>
            {/* Left Sidebar Navigation */}
            <Sidebar />

            {/* Main Content Area */}
            <main>
                <header class="bg-background sticky inset-x-0 top-0 isolate flex shrink-0 items-center gap-2 border-b z-10">
                    <div class="flex h-14 w-full items-center gap-2 px-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="mr-auto size-7 -ml-1.5"
                            onclick="document.dispatchEvent(new CustomEvent('sxo:sidebar'));"
                            aria-label="Toggle sidebar"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                class="lucide lucide-panel-left-icon lucide-panel-left"
                            >
                                <title>Toggle sidebar</title>
                                <rect width="18" height="18" x="3" y="3" rx="2" />
                                <path d="M9 3v18" />
                            </svg>
                        </Button>

                        <ThemeSelector className="h-8 leading-none" />

                        <ThemeToggle />

                        <Button href="https://github.com/gc-victor/sxo" target="_blank" rel="noopener noreferrer">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <title>GitHub</title>
                                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path>
                                <path d="M9 18c-4.51 2-5-2-7-2"></path>
                            </svg>
                        </Button>
                    </div>
                </header>
                <article class="w-full max-w-4xl">
                    <div class="flex flex-col gap-12 p-8 md:flex-row lg:gap-16 xl:gap-24">
                        <div id="introduction" class="w-full min-w-0 scroll-mt-32">
                            <header class="space-y-2 mb-12">
                                <h1 class="text-6xl md:text-8xl font-bold tracking-tight">Collection of Components</h1>
                            </header>

                            <section class="prose prose-lg max-w-none">
                                <div class="space-y-6">
                                    <p class="text-xl text-muted-foreground">
                                        A complete set of ready-to-use UI components built for{" "}
                                        <a
                                            href="https://github.com/gc-victor/sxo"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            class="hover:text-muted-foreground underline"
                                            title="Github SXO repository"
                                        >
                                            SXO
                                        </a>
                                        . Every piece works perfectly with Tailwind CSS and meets accessibility standards.
                                    </p>
                                    <div class="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <h2 class="text-lg font-semibold mb-2 mt-0">Technology Stack</h2>
                                            <ul class="space-y-1 text-sm list-disc">
                                                <li>
                                                    <a
                                                        href="https://github.com/gc-victor/sxo"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        class="flex items-center gap-2 hover:text-muted-foreground underline"
                                                        title="Github SXO repository"
                                                    >
                                                        <span>
                                                            <strong>SXO Framework:</strong> Server-side JSX with hot-reload
                                                        </span>
                                                        <IconExternalLink class="w-3 h-3" />
                                                    </a>
                                                </li>
                                                <li>
                                                    <a
                                                        href="https://github.com/gc-victor/reactive-component"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        class="flex items-center gap-2 hover:text-muted-foreground underline"
                                                        title="GitHub Reactive Component repository"
                                                    >
                                                        <span>
                                                            <strong>Reactive Component:</strong> Islands for interactivity
                                                        </span>
                                                        <IconExternalLink class="w-3 h-3" />
                                                    </a>
                                                </li>
                                                <li>
                                                    <a
                                                        href="https://basecoatui.com"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        class="flex items-center gap-2 hover:text-muted-foreground underline"
                                                        title="View Basecoat CSS documentation"
                                                    >
                                                        <span>
                                                            <strong>Basecoat CSS:</strong> Pre-built component styles
                                                        </span>
                                                        <IconExternalLink class="w-3 h-3" />
                                                    </a>
                                                </li>
                                                <li>
                                                    <a
                                                        href="https://tailwindcss.com"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        class="flex items-center gap-2 hover:text-muted-foreground underline"
                                                        title="View Tailwind CSS documentation"
                                                    >
                                                        <span>
                                                            <strong>Tailwind CSS:</strong> Utility-first styling
                                                        </span>
                                                        <IconExternalLink class="w-3 h-3" />
                                                    </a>
                                                </li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h3 class="text-lg font-semibold mb-2 mt-0">What You'll Find</h3>
                                            <ul class="space-y-1 text-sm list-disc">
                                                <li>
                                                    <mark class="bg-gray-200 dark:bg-gray-200/50 dark:text-foreground">
                                                        Complete component implementations
                                                    </mark>
                                                </li>
                                                <li>
                                                    <mark class="bg-gray-200 dark:bg-gray-200/50 dark:text-foreground">
                                                        Interactive examples and demos
                                                    </mark>
                                                </li>
                                                <li>
                                                    <mark class="bg-gray-200 dark:bg-gray-200/50 dark:text-foreground">
                                                        Accessibility-focused design patterns
                                                    </mark>
                                                </li>
                                                <li>
                                                    <mark class="bg-gray-200 dark:bg-gray-200/50 dark:text-foreground">
                                                        Copy-paste ready code snippets and installation
                                                    </mark>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section class="space-y-6 mt-12">
                                <h2
                                    id="installation"
                                    class="scroll-mt-24 mt-12 text-4xl font-semibold tracking-tight sm:text-3xl xl:text-4xl"
                                >
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
                                            pnpm: `pnpm add sxo @qery/reactive-component`,
                                            npm: `npm install sxo @qery/reactive-component`,
                                            yarn: `yarn add sxo @qery/reactive-component`,
                                            bun: `bun add sxo @qery/reactive-component`,
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
                                            pnpm: `pnpm add -D tailwindcss @tailwindcss/cli basecoat-css@0.3.3`,
                                            npm: `npm install -D tailwindcss @tailwindcss/cli basecoat-css@0.3.3`,
                                            yarn: `yarn add -D tailwindcss @tailwindcss/cli basecoat-css@0.3.3`,
                                            bun: `bun add -D tailwindcss @tailwindcss/cli basecoat-css@0.3.3`,
                                        }}
                                    />

                                    <p class="mt-4">
                                        After installing the dependencies, import Tailwind and Basecoat CSS into your main stylesheet:
                                    </p>

                                    <div className="relative">
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
                                            pnpm: `pnpx sxo add &lt;component&gt;`,
                                            npm: `npx sxo add &lt;component&gt;`,
                                            yarn: `yarn sxo add &lt;component&gt;`,
                                            bun: `bunx sxo add &lt;component&gt;`,
                                        }}
                                    />
                                </div>
                            </section>

                            <hr class="mt-20" />

                            {/* Component Sections */}
                            <div class="space-y-8 mt-20">
                                <SectionAccordion />
                                <SectionAlert />
                                <SectionAlertDialog />
                                <SectionAvatar />
                                <SectionBadge />
                                <SectionBreadcrumb />
                                <SectionButton />
                                <SectionCard />
                                <SectionCheckbox />
                                <SectionDialog />
                                <SectionDropdownMenu />
                                <SectionForm />
                                <SectionInput />
                                <SectionLabel />
                                <SectionPagination />
                                <SectionPopover />
                                <SectionRadioGroup />
                                <SectionSelect />
                                <SectionSelectMenu />
                                <SectionSkeleton />
                                <SectionSlider />
                                <SectionSwitch />
                                <SectionTable />
                                <SectionTabs />
                                <SectionTextarea />
                                <SectionToast />
                                <SectionTooltip />
                            </div>
                        </div>
                    </div>
                </article>
            </main>

            {/* Mount SVG symbol sprite for icons to work throughout the page */}
            <SvgSymbols>
                <SymbolArrowRight />
                <SymbolCheck />
                <SymbolChevronDown />
                <SymbolChevronLeft />
                <SymbolChevronRight />
                <SymbolChevronsVertical />
                <SymbolCircleCheck />
                <SymbolCircleExclamation />
                <SymbolCircleInfo />
                <SymbolCopy />
                <SymbolCube />
                <SymbolDotsHorizontal />
                <SymbolExternalLink />
                <SymbolGift />
                <SymbolImage />
                <SymbolList />
                <SymbolSearch />
                <SymbolSend />
                <SymbolShieldExclamation />
                <SymbolSpinner />
                <SymbolSun />
                <SymbolMoon />
                <SymbolTrash />
                <SymbolTriangleWarning />
                <SymbolX />
            </SvgSymbols>
        </body>
    </html>
);
