/**
 * @fileoverview Command palette component (vanilla JSX + reactive client island)
 *
 * @module ui/command
 * @description
 * Keyboard-driven command palette with search filtering and item selection.
 * SSR renders the markup; client island handles open/close, filtering, and keyboard nav.
 *
 * Exports:
 * - `Command` (default): Command palette overlay.
 *
 * Design notes:
 * - Uses `<el-command>` custom element for client enhancement.
 * - All items SSR-rendered; client JS filters by `data-search`.
 * - Keyboard shortcut: Meta+K / Ctrl+K to open, Escape to close.
 * - Arrow keys navigate, Enter selects.
 *
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 */

import { cn } from "@utils/cn.js";

/**
 * @typedef {{ value: string, label: string, action?: string }} CommandItem
 */

/**
 * Default command items.
 * @type {CommandItem[]}
 */
const DEFAULT_ITEMS = [
    { value: "profile", label: "Profile Settings", action: "navigateProfile" },
    { value: "theme", label: "Toggle Theme", action: "toggleTheme" },
    { value: "notifications", label: "Notifications", action: "navigateNotifications" },
    { value: "billing", label: "Billing", action: "navigateBilling" },
    { value: "security", label: "Security", action: "navigateSecurity" },
    { value: "help", label: "Help & Support", action: "navigateHelp" },
    { value: "shortcuts", label: "Keyboard Shortcuts", action: "showShortcuts" },
    { value: "about", label: "About", action: "navigateAbout" },
];

/**
 * Props accepted by `<Command />`.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {
 *   items?: CommandItem[],
 *   placeholder?: string,
 * }} CommandProps
 * @function Command
 * @param {CommandProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <Command />
 * @public
 */
export default function Command({ class: klass, className, items = DEFAULT_ITEMS, placeholder = "Type a command...", ...rest }) {
    return (
        <el-command>
            <div class={cn("command", klass, className)} {...rest}>
                <button type="button" class="btn btn-outline w-full justify-start gap-2" data-command-trigger $onclick="openCommand">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                    >
                        <path d="m21 21-6-6" />
                        <path d="M17 10a7 7 0 1 0-14 0 7 7 0 0 0 14 0z" />
                    </svg>
                    <span>Search...</span>
                    <kbd class="kbd ml-auto">⌘K</kbd>
                </button>

                {/* Command Overlay */}
                <div class="command-overlay">
                    <div class="command-dialog" role="dialog" aria-label="Command">
                        <div class="command-input-wrapper">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                class="search-icon"
                                aria-hidden="true"
                            >
                                <path d="m21 21-6-6" />
                                <path d="M17 10a7 7 0 1 0-14 0 7 7 0 0 0 14 0z" />
                            </svg>
                            <input
                                role="combobox"
                                class="command-input"
                                placeholder={placeholder}
                                aria-expanded="true"
                                aria-controls="command-list"
                                $oninput="onInput"
                            />
                        </div>
                        <div id="command-list" class="command-list">
                            {items.map((item) => (
                                <button
                                    type="button"
                                    key={item.value}
                                    class="command-item"
                                    role="option"
                                    data-search={item.label}
                                    data-action={item.action}
                                    $onclick="selectItem"
                                >
                                    {item.label}
                                </button>
                            ))}
                            <div class="command-empty" hidden>
                                No results found.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </el-command>
    );
}
