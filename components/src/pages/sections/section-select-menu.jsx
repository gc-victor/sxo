import { IconSearch } from "@components/icon.jsx";
import {
    SelectMenu,
    SelectMenuGroup,
    SelectMenuList,
    SelectMenuOption,
    SelectMenuPopover,
    SelectMenuSearch,
    SelectMenuTrigger,
} from "@components/select-menu.jsx";
import Tabs, { TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import highlightJsx from "@utils/highlight-jsx.js";
import CopyButton from "../components/copy-button.jsx";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

/**
 * Props accepted by `<SectionSelectMenu />`.
 *
 * Demonstration section for the `SelectMenu` component family. Renders a static example of
 * the trigger, search input, grouped options, and popover structure. Inherits native div
 * attributes and forwards them via `...rest`.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {}} SectionSelectMenuProps
 * @function SectionSelectMenu
 * @param {SectionSelectMenuProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <SectionSelectMenu />
 * @public
 * @since 1.0.0
 */
export function SectionSelectMenu(props) {
    return (
        <Section id="select-menu" {...props}>
            <SectionHeading>Select Menu</SectionHeading>
            <SectionDescription>Displays a list of options for the user to pick from—triggered by a button.</SectionDescription>

            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview" class="pt-4" active>
                    <div class="grid gap-4 sm:grid-cols-2">
                        <SelectMenu id="select-445592" name="select-445592-value" value="apple" class="max-w-[220px]">
                            <SelectMenuTrigger
                                id="select-445592-trigger"
                                aria-controls="select-445592-listbox"
                                ariaExpanded="false"
                                class="btn-outline justify-between font-normal w-[180px]"
                            >
                                <span class="truncate">Apple</span>
                            </SelectMenuTrigger>
                            <SelectMenuPopover id="select-445592-popover">
                                <header class="flex h-9 items-center gap-2 border-b px-3 -mx-1 -mt-1 mb-1">
                                    <IconSearch aria-hidden="true" class="size-4 shrink-0 opacity-50" width="16" height="16" />
                                    <SelectMenuSearch
                                        className="placeholder:text-muted-foreground flex h-10 flex-1 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50 min-w-0"
                                        placeholder="Search entries..."
                                        aria-autocomplete="list"
                                        aria-controls="select-445592-listbox"
                                        aria-labelledby="select-445592-trigger"
                                        role="combobox"
                                    />
                                </header>
                                <SelectMenuList id="select-445592-listbox" ariaLabelledby="select-445592-trigger">
                                    <SelectMenuGroup label="Fruits">
                                        <SelectMenuOption id="select-445592-items-1-1" value="apple" selected>
                                            Apple
                                        </SelectMenuOption>
                                        <SelectMenuOption id="select-445592-items-1-2" value="banana">
                                            Banana
                                        </SelectMenuOption>
                                        <SelectMenuOption id="select-445592-items-1-3" value="blueberry">
                                            Blueberry
                                        </SelectMenuOption>
                                        <SelectMenuOption id="select-445592-items-1-4" value="grapes">
                                            Grapes
                                        </SelectMenuOption>
                                        <SelectMenuOption id="select-445592-items-1-5" value="pineapple">
                                            Pineapple
                                        </SelectMenuOption>
                                    </SelectMenuGroup>
                                </SelectMenuList>
                            </SelectMenuPopover>
                        </SelectMenu>
                    </div>
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre class="jsx-highlight">
                        <code id="select-menu-code" class="language-jsx">
                            {highlightJsx(`<div class="grid gap-4 sm:grid-cols-2">
    <SelectMenu id="select-445592" name="select-445592-value" value="apple" class="max-w-[220px]">
        <SelectMenuTrigger
            id="select-445592-trigger"
            aria-controls="select-445592-listbox"
            ariaExpanded="false"
            class="btn-outline justify-between font-normal w-[180px]"
        >
            <span class="truncate">Apple</span>
        </SelectMenuTrigger>
        <SelectMenuPopover id="select-445592-popover">
            <header class="flex h-9 items-center gap-2 border-b px-3 -mx-1 -mt-1 mb-1">
                <IconSearch aria-hidden="true" class="size-4 shrink-0 opacity-50" width="16" height="16" />
                <SelectMenuSearch
                    className="placeholder:text-muted-foreground flex h-10 flex-1 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50 min-w-0"
                    placeholder="Search entries..."
                    aria-autocomplete="list"
                    aria-controls="select-445592-listbox"
                    aria-labelledby="select-445592-trigger"
                    role="combobox"
                />
            </header>
            <SelectMenuList id="select-445592-listbox" ariaLabelledby="select-445592-trigger">
                <SelectMenuGroup label="Fruits">
                    <SelectMenuOption id="select-445592-items-1-1" value="apple" selected>
                        Apple
                    </SelectMenuOption>
                    <SelectMenuOption id="select-445592-items-1-2" value="banana">
                        Banana
                    </SelectMenuOption>
                    <SelectMenuOption id="select-445592-items-1-3" value="blueberry">
                        Blueberry
                    </SelectMenuOption>
                    <SelectMenuOption id="select-445592-items-1-4" value="grapes">
                        Grapes
                    </SelectMenuOption>
                    <SelectMenuOption id="select-445592-items-1-5" value="pineapple">
                        Pineapple
                    </SelectMenuOption>
                </SelectMenuGroup>
            </SelectMenuList>
        </SelectMenuPopover>
    </SelectMenu>
</div>`)}
                        </code>
                    </pre>

                    <CopyButton for="select-menu-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>Use the following primitives to build a select menu:</p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>&lt;SelectMenu&gt;</strong>: The root component that manages selection state and accessibility.
                        </li>
                        <li>
                            <strong>&lt;SelectMenuTrigger&gt;</strong>: The button that opens the menu.
                        </li>
                        <li>
                            <strong>&lt;SelectMenuPopover&gt;</strong>: The container for the menu options.
                        </li>
                        <li>
                            <strong>&lt;SelectMenuList&gt;</strong>: The list of options.
                        </li>
                        <li>
                            <strong>&lt;SelectMenuGroup&gt;</strong>: Groups options with a label.
                        </li>
                        <li>
                            <strong>&lt;SelectMenuOption&gt;</strong>: Individual selectable options.
                        </li>
                        <li>
                            <strong>&lt;SelectMenuSearch&gt;</strong>: Search input within the menu.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
