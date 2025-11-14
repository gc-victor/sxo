/**
 * @fileoverview Install tabs component for displaying package manager install commands (vanilla JSX).
 *
 * Exports:
 * - InstallTabs: Component for tabbed install commands
 *
 * Design notes:
 * - Uses tabs primitives for accessibility and keyboard navigation
 * - Supports custom component name and per-manager commands
 * - Copy functionality via existing CopyButton component
 *
 * Accessibility:
 * - Follows ARIA tab patterns
 * - Keyboard navigation supported
 * - Copy button provides feedback
 *
 * @module components/install-tabs
 * @author Víctor García
 * @license MIT
 * @version 1.0.0
 * @since 1.0.0
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import { cn } from "@utils/cn.js";
import CopyButton from "./copy-button.jsx";

/**
 * Props accepted by `<InstallTabs />`.
 *
 * Component for displaying install commands in tabbed interface.
 * Supports customization of component name and specific commands per package manager.
 *
 * @typedef {HTMLElementAttributes & {
 *   componentName?: string,
 *   commands?: {
 *     pnpm?: string,
 *     npm?: string,
 *     yarn?: string,
 *     bun?: string
 *   },
 *   className?: string
 * }} InstallTabsProps
 * @since 1.0.0
 */

/**
 * Install tabs component.
 *
 * Renders tabbed interface for package manager install commands.
 * Each tab shows the command and a copy button.
 *
 * @param {InstallTabsProps} props
 * @returns {string} Rendered HTML string
 * @public
 * @since 1.0.0
 */
export default /**
 * @param {InstallTabsProps} props
 * @param {string} [props.componentName="sxo"] - The component name to use in install commands
 * @param {Object} [props.commands={}] - Custom commands per package manager
 * @param {string} [props.commands.pnpm] - Custom pnpm install command
 * @param {string} [props.commands.npm] - Custom npm install command
 * @param {string} [props.commands.yarn] - Custom yarn install command
 * @param {string} [props.commands.bun] - Custom bun install command
 * @param {string} [props.className] - Additional CSS classes
 * @returns {string} Rendered HTML string
 */
function InstallTabs({ componentName = "sxo", commands = {}, className, ...rest }) {
    /** @type {Array<string>} */
    const managers = ["pnpm", "npm", "yarn", "bun"];

    /** @type {Object<string, string>} */
    const defaultCommands = {
        pnpm: `pnpm add @sxo/${componentName}`,
        npm: `npm install @sxo/${componentName}`,
        yarn: `yarn add @sxo/${componentName}`,
        bun: `bun add @sxo/${componentName}`,
    };

    /** @type {Object<string, string>} */
    const finalCommands = { ...defaultCommands, ...commands };

    return (
        <div class={cn("mt-6", className)} {...rest}>
            <Tabs variant="none" class="rounded bg-muted dark:bg-muted/75">
                <TabsList class="border-b rounded-t-lg p-0">
                    <div class="flex gap-2 h-8 px-4 items-center">
                        <div className="h-4 w-4 mr-4 flex items-center justify-center rounded-xs bg-accent-foreground/80 text-accent">
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
                                class="h-3 w-3"
                                aria-hidden="true"
                            >
                                <path d="M12 19h8" />
                                <path d="m4 17 6-6-6-6" />
                            </svg>
                        </div>
                        {managers.map((manager, index) => (
                            <TabsTrigger
                                name={manager}
                                active={index === 0}
                                class="rounded-md py-px px-1 text-sm font-sm outline-0 text-foreground/75 aria-selected:bg-accent-foreground/10 aria-selected:text-foreground"
                            >
                                {manager}
                            </TabsTrigger>
                        ))}
                    </div>
                </TabsList>
                {managers.map((manager, index) => (
                    <TabsContent name={manager} active={index === 0} class="relative">
                        <code id={`install-code-${manager}-${componentName}`} class="block p-4 font-sm">
                            {finalCommands[manager]}
                        </code>
                        <div className="absolute -top-8 right-0">
                            <CopyButton for={`install-code-${manager}-${componentName}`} />
                        </div>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}
