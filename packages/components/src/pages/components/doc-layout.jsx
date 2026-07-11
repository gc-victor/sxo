/**
 * DocLayout — Shared document shell for documentation pages.
 *
 * Wraps content with full HTML document structure including
 * <html>, <head>, <body>, header bar, sidebar, footer,
 * inline blocking scripts, and SVG symbol sprite.
 *
 * @param {Object} props
 * @param {string} props.title - Page title (appended with " — SXOUI")
 * @param {string} [props.description] - Meta description (omitted if empty)
 * @param {string} props.currentPage - Sidebar key for active highlighting
 * @param {any} props.children - Page content
 */

import Button from "@components/button.jsx";
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
import ThemeSelector from "./theme-selector.jsx";
import ThemeToggle from "./theme-toggle.jsx";
import Sidebar from "./sidebar";

/** Blocking inline script: reads saved style pack from localStorage and injects stylesheet before first paint. */
const STYLE_PACK_INLINE_SCRIPT =
    "(function(){try{var s=localStorage.getItem('sxo-style-pack');if(s&&s!=='vega'){var l=document.createElement('link');l.rel='stylesheet';l.href='/styles/'+s+'.css';l.id='sxo-style-override';document.head.appendChild(l);}}catch(e){}})();";

/**
 * Full-document layout wrapper.
 *
 * Renders the HTML document shell with head meta tags, inline scripts,
 * header bar, sidebar, content slot, footer, and SVG symbols.
 */
export function DocLayout({ title, description, currentPage, children }) {
    return (
        <html lang="en">
            <head>
                <script>${STYLE_PACK_INLINE_SCRIPT}</script>
                <meta charset="UTF-8" />
                <meta http-equiv="Content-Language" content="en" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />

                <title>{title} — SXOUI</title>
                <meta name="title" content={`${title} — SXOUI`} />

                {description ? (
                    <meta name="description" content={description} />
                ) : null}

                <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg" />
                <link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png" />

                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://sxoui.com/" />
                <meta property="og:title" content={`${title} — SXOUI`} />
                {description ? (
                    <meta property="og:description" content={description} />
                ) : null}
                <meta property="og:image" content="https://sxoui.com/assets/social.png" />
                <meta property="og:site_name" content="SXOUI" />
                <meta property="og:locale" content="en_US" />
                <meta property="og:author" content="Víctor García" />

                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:url" content="https://sxoui.com/" />
                <meta name="twitter:title" content={`${title} — SXOUI`} />
                {description ? (
                    <meta name="twitter:description" content={description} />
                ) : null}
                <meta name="twitter:image" content="https://sxoui.com/assets/social.png" />
                <meta name="twitter:creator" content="@gcv" />

                <meta
                    name="keywords"
                    content="components,component library,component system,UI,UI kit,shadcn,shadcn/ui,Tailwind CSS,Tailwind,CSS,HTML,SXO,Reactive Component,JS,JavaScript,vanilla JS,vanilla JavaScript"
                />
            </head>
            <body class="antialiased">
                <Sidebar currentPage={currentPage} />

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
                                    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                                    <path d="M9 18c-4.51 2-5-2-7-2" />
                                </svg>
                            </Button>
                        </div>
                    </header>

                    <article class="w-full max-w-4xl mx-auto px-6 py-8">
                        {children}
                    </article>
                </main>

                <footer class="border-t py-8 text-center text-sm text-muted-foreground">
                    <p>
                        Built with{" "}
                        <a
                            href="https://github.com/gc-victor/sxo"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="underline hover:text-foreground"
                        >
                            SXO
                        </a>{" "}
                        and{" "}
                        <a
                            href="https://basecoatui.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="underline hover:text-foreground"
                        >
                            Basecoat CSS
                        </a>
                    </p>
                </footer>

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
}
