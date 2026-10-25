/**
 * @fileoverview Command palette component — basecoat-aligned.
 *
 * Renders a searchable command menu inside an <el-command> custom element.
 * Two variants: "dialog" (modal overlay via native <dialog>) and "standalone"
 * (inline, always visible).
 *
 * @license MIT
 */

import { cn } from "@utils/cn.js";

/**
 * @typedef {object} CommandItem
 * @property {string} [type] - "item" (default), "group", or "separator"
 * @property {string} [label] - Display label
 * @property {string} [filter] - data-filter value for searching
 * @property {string} [keywords] - Additional search terms
 * @property {string} [shortcut] - Keyboard shortcut hint
 * @property {boolean} [disabled] - Whether the item is disabled
 * @property {boolean} [force] - Whether the item is always visible
 * @property {boolean} [keepOpen] - Whether clicking keeps the dialog open
 * @property {JSX.Element} [icon] - Icon SVG element
 * @property {string} [url] - If set, renders as <a role="menuitem">
 * @property {CommandItem[]} [items] - Nested items for groups
 */

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

/**
 * Render a command group and its recursively nested items.
 * @param {CommandItem} item
 * @param {string} itemId
 * @returns {JSX.Element}
 */
function renderCommandGroup(item, itemId) {
    const labelId = item.id || `${itemId}-label`;
    return (
        /* biome-ignore lint/a11y/useSemanticElements: <div role="group"> is correct ARIA for command menus */
        <div role="group" aria-labelledby={labelId} key={itemId}>
            {/* biome-ignore lint/a11y/useSemanticElements: basecoat spec uses span[role=heading] */}
            <span role="heading" aria-level="2" id={labelId} class="px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                {item.label}
            </span>
            {renderCommandItems(item.items, itemId)}
        </div>
    );
}

/**
 * Render a command separator.
 * @param {string} itemId
 * @returns {JSX.Element}
 */
function renderCommandSeparator(itemId) {
    return (
        /* biome-ignore lint/a11y/noRedundantRoles: basecoat CSS selects by [role='separator'] */
        /* biome-ignore lint/a11y/useAriaPropsForRole: <hr> implies separator; aria-valuenow not needed */
        <hr role="separator" class="border-t border-border mx-2 my-1" key={itemId} />
    );
}

function getCommandItemSearchAttributes(item) {
    const attrs = {};
    if (item.filter) attrs["data-filter"] = item.filter;
    if (item.keywords) attrs["data-keywords"] = item.keywords;
    return attrs;
}

function getCommandItemStateAttributes(item) {
    const attrs = {};
    if (item.disabled) attrs["aria-disabled"] = "true";
    if (item.force) attrs["data-force"] = "";
    if (item.keepOpen) attrs["data-keep-command-open"] = "";
    return attrs;
}

function getCommandItemLinkAttributes(item) {
    return item.url ? { href: item.url } : {};
}

/**
 * Render a selectable command item.
 * @param {CommandItem} item
 * @param {string} itemId
 * @returns {JSX.Element}
 */
function renderCommandItem(item, itemId) {
    const Tag = item.url ? "a" : "div";
    const attrs = {
        ...getCommandItemSearchAttributes(item),
        ...getCommandItemStateAttributes(item),
        ...getCommandItemLinkAttributes(item),
    };

    return (
        <Tag role="menuitem" class="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer" id={itemId} key={itemId} {...attrs}>
            {item.icon || ""}
            <span>{item.label}</span>
            {item.shortcut ? (
                <span data-shortcut class="ms-auto text-xs text-muted-foreground">
                    {item.shortcut}
                </span>
            ) : (
                ""
            )}
        </Tag>
    );
}

const commandItemRenderers = new Map([
    ["group", renderCommandGroup],
    ["separator", renderCommandSeparator],
]);

function renderCommandItemByType(item, itemId) {
    const renderItem = commandItemRenderers.get(item.type) || renderCommandItem;
    return renderItem(item, itemId);
}

/**
 * Recursively render command items.
 * @param {CommandItem[]} [items]
 * @param {string} parentId
 * @returns {JSX.Element[]}
 */
function renderCommandItems(items, parentId) {
    if (!items) return [];
    return items.map((item, index) => renderCommandItemByType(item, `${parentId}-item-${index}`));
}

/**
 * Props accepted by the Command component.
 * @typedef {Object} CommandProps
 * @property {"dialog"|"standalone"} [variant="dialog"]
 * @property {string} [id]
 * @property {CommandItem[]} [items]
 * @property {string} [placeholder="Type a command or search..."]
 * @property {string} [emptyText="No results found."]
 * @property {string} [triggerLabel="Open Command Palette"]
 * @property {string} [class]
 * @property {string} [className]
 */

/**
 * Command palette component.
 * @param {CommandProps} props
 * @returns {JSX.Element}
 */
export default function Command({
    variant = "dialog",
    id,
    items,
    placeholder = "Type a command or search...",
    emptyText = "No results found.",
    triggerLabel = "Open Command Palette",
    class: klass,
    className,
    ...rest
}) {
    const cmdId = id || "command-palette";

    const headerContent = (
        <header class="flex items-center gap-2 px-3 py-2.5 border-b border-border">
            {SearchIcon}
            <input
                type="text"
                id={`${cmdId}-input`}
                role="combobox"
                class="w-full bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
                placeholder={placeholder}
                autocomplete="off"
                autocorrect="off"
                spellcheck="false"
                aria-autocomplete="list"
                aria-expanded="true"
                aria-controls={`${cmdId}-menu`}
            />
        </header>
    );

    const menuContent = (
        <div role="menu" id={`${cmdId}-menu`} class="overflow-y-auto" aria-orientation="vertical" data-empty={emptyText}>
            {renderCommandItems(items, cmdId)}
        </div>
    );

    if (variant === "dialog") {
        return (
            <el-command>
                <button type="button" class="btn" data-variant="outline" onclick={`document.getElementById('${cmdId}').showModal()`}>
                    {triggerLabel}
                </button>
                <dialog
                    id={cmdId}
                    class="command-dialog"
                    aria-label="Command menu"
                    onclick="if (event.target === this) this.close()"
                    {...rest}
                >
                    <div class="command">
                        {headerContent}
                        {menuContent}
                    </div>
                </dialog>
            </el-command>
        );
    }

    return (
        <el-command>
            {/* biome-ignore lint/a11y/useAriaPropsSupportedByRole: basecoat .command has aria-label for naming */}
            <div class={cn("command border", klass, className)} aria-label="Command menu" {...rest}>
                {headerContent}
                {menuContent}
            </div>
        </el-command>
    );
}
