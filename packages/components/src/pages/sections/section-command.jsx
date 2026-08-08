/**
 * @fileoverview Demo section for Command component — basecoat-aligned examples.
 *
 * Two variants:
 * - Dialog: `<dialog class="command-dialog">` opened via native `showModal()`
 * - Standalone: inline `<div class="command border">` always visible
 *
 * Both use the basecoat CSS structure with proper ARIA roles, groups, icons,
 * shortcuts, event delegation, and `<el-command>` enhancement.
 *
 * @license MIT
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import CopyButton from "@pages/components/copy-button.jsx";
import { highlightJsx } from "@pages/components/highlight-jsx.js";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

/* ------------------------------------------------------------------ */
/*  Code snippets for the Code tabs                                    */
/* ------------------------------------------------------------------ */

const DIALOG_CODE = `<button type="button" class="btn" data-variant="outline"
  onclick="document.getElementById('cmd-palette').showModal()">
  Open Command Palette
</button>

<dialog id="cmd-palette" class="command-dialog"
  aria-label="Command menu"
  onclick="if (event.target === this) this.close()">
  <div class="command">
    <header>
      <svg class="lucide lucide-search" ...><!-- icon --></svg>
      <input type="text" role="combobox" aria-expanded="true"
        placeholder="Type a command or search..." />
    </header>
    <div role="menu" aria-orientation="vertical"
      data-empty="No results found.">
      <div role="group" aria-labelledby="suggestions">
        <span role="heading" id="suggestions">Suggestions</span>
        <div role="menuitem" data-filter="Calendar"
          data-keywords="date event schedule">
          <svg ...><!-- icon --></svg>
          <span>Calendar</span>
        </div>
        ...
      </div>
      <hr role="separator" />
      <div role="group" aria-labelledby="settings">
        <span role="heading" id="settings">Settings</span>
        <div role="menuitem" data-filter="Profile">
          <svg ...><!-- icon --></svg>
          <span>Profile</span>
          <span data-shortcut>\u2318P</span>
        </div>
        ...
      </div>
    </div>
  </div>
</dialog>`;

const STANDALONE_CODE = `<div class="command border" aria-label="Command menu">
  <header>
    <svg class="lucide lucide-search" ...><!-- icon --></svg>
    <input type="text" role="combobox" aria-expanded="true"
      placeholder="Type a command or search..." />
  </header>
  <div role="menu" aria-orientation="vertical"
    data-empty="No results found.">
    <!-- Same menu structure as dialog -->
  </div>
</div>`;

/* ------------------------------------------------------------------ */
/*  Icon SVGs                                                          */
/* ------------------------------------------------------------------ */

const SearchIcon = (
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
        class="size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
    >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
    </svg>
);

const IconCalendar = (
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
        class="size-4 shrink-0"
        aria-hidden="true"
    >
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <rect width="18" height="18" x="3" y="4" rx="2" />
        <path d="M3 10h18" />
    </svg>
);

const IconSmile = (
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
        class="size-4 shrink-0"
        aria-hidden="true"
    >
        <circle cx="12" cy="12" r="10" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <line x1="9" x2="9.01" y1="9" y2="9" />
        <line x1="15" x2="15.01" y1="9" y2="9" />
    </svg>
);

const IconCalculator = (
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
        class="size-4 shrink-0"
        aria-hidden="true"
    >
        <rect width="16" height="20" x="4" y="2" rx="2" />
        <line x1="8" x2="16" y1="6" y2="6" />
        <line x1="16" x2="16" y1="14" y2="18" />
        <path d="M16 10h.01" />
        <path d="M12 10h.01" />
        <path d="M8 10h.01" />
        <path d="M12 14h.01" />
        <path d="M8 14h.01" />
        <path d="M12 18h.01" />
        <path d="M8 18h.01" />
    </svg>
);

const IconUser = (
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
        class="size-4 shrink-0"
        aria-hidden="true"
    >
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

const IconCreditCard = (
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
        class="size-4 shrink-0"
        aria-hidden="true"
    >
        <rect width="20" height="14" x="2" y="5" rx="2" />
        <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
);

const IconSettings = (
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
        class="size-4 shrink-0"
        aria-hidden="true"
    >
        <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

/* ------------------------------------------------------------------ */
/*  Shared local components                                            */
/* ------------------------------------------------------------------ */

/**
 * Render a command menu item.
 * No $onclick or tabindex — event delegation on the menu handles interaction.
 */
function MenuItem({ icon, label, filter, keywords, shortcut, disabled }) {
    return (
        // biome-ignore lint/a11y/useFocusableInteractive: menuitem is interactive via menu event delegation, not direct focus
        <div
            role="menuitem"
            class="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer"
            data-filter={filter}
            {...(keywords ? { "data-keywords": keywords } : {})}
            {...(disabled ? { "aria-disabled": "true" } : {})}
        >
            {icon}
            <span>{label}</span>
            {shortcut ? (
                <span data-shortcut class="ms-auto text-xs text-muted-foreground">
                    {shortcut}
                </span>
            ) : (
                ""
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Section component                                                  */
/* ------------------------------------------------------------------ */

/**
 * @function SectionCommand
 * @param {HTMLDivAttributes & ComponentProps & {}} props
 * @returns {JSX.Element}
 * @public
 */
export function SectionCommand({ class: klass, className, ...rest }) {
    return (
        <Section id="command" {...rest}>
            <SectionHeading>Command</SectionHeading>
            <SectionDescription>
                Searchable command menu with keyboard navigation. Two variants: <strong>dialog</strong> (overlay palette via native{" "}
                <code>&lt;dialog&gt;</code>) and <strong>standalone</strong> (inline, always visible).
            </SectionDescription>

            {/* ============================================================ */}
            {/*  Dialog variant                                                */}
            {/* ============================================================ */}
            <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight mt-12">Dialog</h3>
            <p class="text-sm text-muted-foreground mb-4">
                An overlay command palette using the native <code>&lt;dialog&gt;</code> element. Click the button to open, type to filter,
                use arrow keys to navigate, and click or press Enter to select.
            </p>

            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview-dlg" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code-dlg">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview-dlg" class="pt-4" active>
                    <button
                        type="button"
                        class="btn"
                        data-variant="outline"
                        onclick="document.getElementById('cmd-dialog-demo').showModal()"
                    >
                        Open Command Palette
                    </button>

                    <dialog
                        id="cmd-dialog-demo"
                        class="command-dialog"
                        aria-label="Command menu"
                        onclick="if (event.target === this) this.close()"
                    >
                        <el-command>
                            <div class="command">
                                <header class="flex items-center gap-2 px-3 py-2.5 border-b border-border">
                                    {SearchIcon}
                                    <input
                                        type="text"
                                        id="cmd-dialog-input"
                                        role="combobox"
                                        class="w-full bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
                                        placeholder="Type a command or search..."
                                        autocomplete="off"
                                        autocorrect="off"
                                        spellcheck="false"
                                        aria-autocomplete="list"
                                        aria-expanded="true"
                                        aria-controls="cmd-dialog-menu"
                                    />
                                </header>

                                <div
                                    role="menu"
                                    id="cmd-dialog-menu"
                                    class="overflow-y-auto"
                                    aria-orientation="vertical"
                                    data-empty="No results found."
                                >
                                    {/* Suggestions group */}
                                    {/* biome-ignore lint/a11y/useSemanticElements: <div role="group"> is correct ARIA for command menus */}
                                    <div role="group" aria-labelledby="cmd-dlg-suggestions">
                                        {/* biome-ignore lint/a11y/useSemanticElements: basecoat spec uses span[role=heading] */}
                                        <span
                                            role="heading"
                                            aria-level="2"
                                            id="cmd-dlg-suggestions"
                                            class="px-3 py-1.5 text-xs font-semibold text-muted-foreground"
                                        >
                                            Suggestions
                                        </span>
                                        <MenuItem icon={IconCalendar} label="Calendar" filter="Calendar" keywords="date event schedule" />
                                        <MenuItem
                                            icon={IconSmile}
                                            label="Search Emoji"
                                            filter="Search Emoji"
                                            keywords="emoji smile reaction"
                                        />
                                        <MenuItem icon={IconCalculator} label="Calculator" filter="Calculator" disabled />
                                    </div>

                                    {/* biome-ignore lint/a11y/noRedundantRoles: basecoat CSS selects by [role='separator'] */}
                                    {/* biome-ignore lint/a11y/useAriaPropsForRole: <hr> implies separator; aria-valuenow not needed */}
                                    <hr role="separator" class="border-t border-border mx-2 my-1" />

                                    {/* Settings group */}
                                    {/* biome-ignore lint/a11y/useSemanticElements: <div role="group"> is correct ARIA for command menus */}
                                    <div role="group" aria-labelledby="cmd-dlg-settings">
                                        {/* biome-ignore lint/a11y/useSemanticElements: basecoat spec uses span[role=heading] */}
                                        <span
                                            role="heading"
                                            aria-level="2"
                                            id="cmd-dlg-settings"
                                            class="px-3 py-1.5 text-xs font-semibold text-muted-foreground"
                                        >
                                            Settings
                                        </span>
                                        <MenuItem
                                            icon={IconUser}
                                            label="Profile"
                                            filter="Profile"
                                            keywords="user account"
                                            shortcut={"\u2318P"}
                                        />
                                        <MenuItem
                                            icon={IconCreditCard}
                                            label="Billing"
                                            filter="Billing"
                                            keywords="invoice payment"
                                            shortcut={"\u2318B"}
                                        />
                                        <MenuItem
                                            icon={IconSettings}
                                            label="Settings"
                                            filter="Settings"
                                            keywords="config preferences"
                                            shortcut={"\u2318S"}
                                        />
                                    </div>
                                </div>
                            </div>
                        </el-command>
                    </dialog>
                </TabsContent>

                <TabsContent name="code-dlg" class="mt-4 relative">
                    <pre class="jsx-highlight">
                        <code id="command-code-dialog" class="language-jsx">
                            {highlightJsx(DIALOG_CODE)}
                        </code>
                    </pre>
                    <CopyButton for="command-code-dialog" />
                </TabsContent>
            </Tabs>

            {/* ============================================================ */}
            {/*  Standalone variant                                            */}
            {/* ============================================================ */}
            <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight mt-16">Standalone</h3>
            <p class="text-sm text-muted-foreground mb-4">
                An inline command menu placed directly in the page. Type to filter, use arrow keys to navigate, and click or press Enter to
                select.
            </p>

            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview-std" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code-std">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview-std" class="pt-4" active>
                    <el-command>
                        <section class="command border rounded-lg" aria-label="Command menu">
                            <header class="flex items-center gap-2 px-3 py-2.5 border-b border-border">
                                {SearchIcon}
                                <input
                                    type="text"
                                    id="cmd-standalone-input"
                                    role="combobox"
                                    class="w-full bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
                                    placeholder="Type a command or search..."
                                    autocomplete="off"
                                    autocorrect="off"
                                    spellcheck="false"
                                    aria-autocomplete="list"
                                    aria-expanded="true"
                                    aria-controls="cmd-standalone-menu"
                                />
                            </header>

                            <div
                                role="menu"
                                id="cmd-standalone-menu"
                                class="overflow-y-auto"
                                aria-orientation="vertical"
                                data-empty="No results found."
                            >
                                {/* Suggestions group */}
                                {/* biome-ignore lint/a11y/useSemanticElements: <div role="group"> is correct ARIA for command menus */}
                                <div role="group" aria-labelledby="cmd-std-suggestions">
                                    {/* biome-ignore lint/a11y/useSemanticElements: basecoat spec uses span[role=heading] */}
                                    <span
                                        role="heading"
                                        aria-level="2"
                                        id="cmd-std-suggestions"
                                        class="px-3 py-1.5 text-xs font-semibold text-muted-foreground"
                                    >
                                        Suggestions
                                    </span>
                                    <MenuItem icon={IconCalendar} label="Calendar" filter="Calendar" keywords="date event schedule" />
                                    <MenuItem icon={IconSmile} label="Search Emoji" filter="Search Emoji" keywords="emoji smile reaction" />
                                    <MenuItem icon={IconCalculator} label="Calculator" filter="Calculator" disabled />
                                </div>

                                {/* biome-ignore lint/a11y/noRedundantRoles: basecoat CSS selects by [role='separator'] */}
                                {/* biome-ignore lint/a11y/useAriaPropsForRole: <hr> implies separator; aria-valuenow not needed */}
                                <hr role="separator" class="border-t border-border mx-2 my-1" />

                                {/* Settings group */}
                                {/* biome-ignore lint/a11y/useSemanticElements: <div role="group"> is correct ARIA for command menus */}
                                <div role="group" aria-labelledby="cmd-std-settings">
                                    {/* biome-ignore lint/a11y/useSemanticElements: basecoat spec uses span[role=heading] */}
                                    <span
                                        role="heading"
                                        aria-level="2"
                                        id="cmd-std-settings"
                                        class="px-3 py-1.5 text-xs font-semibold text-muted-foreground"
                                    >
                                        Settings
                                    </span>
                                    <MenuItem
                                        icon={IconUser}
                                        label="Profile"
                                        filter="Profile"
                                        keywords="user account"
                                        shortcut={"\u2318P"}
                                    />
                                    <MenuItem
                                        icon={IconCreditCard}
                                        label="Billing"
                                        filter="Billing"
                                        keywords="invoice payment"
                                        shortcut={"\u2318B"}
                                    />
                                    <MenuItem
                                        icon={IconSettings}
                                        label="Settings"
                                        filter="Settings"
                                        keywords="config preferences"
                                        shortcut={"\u2318S"}
                                    />
                                </div>
                            </div>
                        </section>
                    </el-command>
                </TabsContent>

                <TabsContent name="code-std" class="mt-4 relative">
                    <pre class="jsx-highlight">
                        <code id="command-code-standalone" class="language-jsx">
                            {highlightJsx(STANDALONE_CODE)}
                        </code>
                    </pre>
                    <CopyButton for="command-code-standalone" />
                </TabsContent>
            </Tabs>

            {/* ============================================================ */}
            {/*  Usage notes                                                   */}
            {/* ============================================================ */}
            <div class="mt-16 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">HTML structure</h3>
                <div class="prose space-y-3 text-sm">
                    <p>The command menu follows the Basecoat design system.</p>
                    <dl class="space-y-2">
                        <dt>
                            <code>&lt;div class="command"&gt;</code>
                        </dt>
                        <dd class="text-muted-foreground ml-4">
                            Root container. Use <code>class="border"</code> for standalone inline use, or nest inside{" "}
                            <code>&lt;dialog class="command-dialog"&gt;</code> for the palette.
                        </dd>
                        <dt>
                            <code>&lt;header&gt;</code>
                        </dt>
                        <dd class="text-muted-foreground ml-4">
                            Search bar with icon and <code>role="combobox"</code> input.
                        </dd>
                        <dt>
                            <code>&lt;div role="menu"&gt;</code>
                        </dt>
                        <dd class="text-muted-foreground ml-4">
                            Item list. Use <code>data-empty</code> for the empty-state message (CSS <code>::before</code>).
                        </dd>
                        <dt>
                            <code>&lt;div role="group"&gt;</code>
                        </dt>
                        <dd class="text-muted-foreground ml-4">
                            Groups related items under a heading via <code>aria-labelledby</code>.
                        </dd>
                        <dt>
                            <code>&lt;div role="menuitem"&gt;</code>
                        </dt>
                        <dd class="text-muted-foreground ml-4">
                            Selectable item. Attributes: <code>data-filter</code>, <code>data-keywords</code>,{" "}
                            <code>aria-disabled="true"</code>, <code>data-force</code>, <code>data-keep-command-open</code>.
                        </dd>
                        <dt>
                            <code>&lt;span data-shortcut&gt;</code>
                        </dt>
                        <dd class="text-muted-foreground ml-4">Keyboard shortcut hint, aligned to the inline end.</dd>
                    </dl>
                </div>
            </div>
        </Section>
    );
}
