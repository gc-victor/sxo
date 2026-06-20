/**
 * Icon ID → <symbol> element ID mapping used by the sprite.
 * @type {Record<string, string>}
 */
export const ICON_SYMBOL_MAP = {
    "chevron-down": "icon-chevron-down",
    "chevron-right": "icon-chevron-right",
    "chevron-left": "icon-chevron-left",
    "circle-exclamation": "icon-circle-exclamation",
    "circle-check": "icon-circle-check",
    "triangle-warning": "icon-triangle-warning",
    "circle-info": "icon-circle-info",
    send: "icon-send",
    "arrow-right": "icon-arrow-right",
    "dots-horizontal": "icon-dots-horizontal",
    ellipsis: "icon-dots-horizontal",
    trash: "icon-trash",
    spinner: "icon-spinner",
    list: "icon-list",
    gift: "icon-gift",
    image: "icon-image",
    cube: "icon-cube",
    "chevrons-vertical": "icon-chevrons-vertical",
    search: "icon-search",
    x: "icon-x",
    close: "icon-x",
    check: "icon-check",
    "shield-exclamation": "icon-shield-exclamation",
    copy: "icon-copy",
    sun: "icon-sun",
    moon: "icon-moon",
    "external-link": "icon-external-link",
};

// Individual symbol components

/**
 * Chevron-down <symbol> definition.
 * @returns {JSX.Element}
 */
export function SymbolChevronDown() {
    return (
        <symbol id="icon-chevron-down" viewBox="0 0 24 24">
            <path d="m6 9 6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"></path>
        </symbol>
    );
}

/**
 * Chevron-right <symbol> definition.
 * @returns {JSX.Element}
 */
export function SymbolChevronRight() {
    return (
        <symbol id="icon-chevron-right" viewBox="0 0 24 24">
            <path
                d="m9 18 6-6-6-6"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
            ></path>
        </symbol>
    );
}

/**
 * Chevron-left <symbol> definition.
 * @returns {JSX.Element}
 */
export function SymbolChevronLeft() {
    return (
        <symbol id="icon-chevron-left" viewBox="0 0 24 24">
            <path
                d="m15 18-6-6 6-6"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
            ></path>
        </symbol>
    );
}

/**
 * Circle-exclamation <symbol> definition.
 * @returns {JSX.Element}
 */
export function SymbolCircleExclamation() {
    return (
        <symbol id="icon-circle-exclamation" viewBox="0 0 24 24">
            <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
            ></circle>
            <line
                x1="12"
                x2="12"
                y1="8"
                y2="12"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            ></line>
            <line
                x1="12"
                x2="12.01"
                y1="16"
                y2="16"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            ></line>
        </symbol>
    );
}

/**
 * Circle-check <symbol> definition.
 * @returns {JSX.Element}
 */
export function SymbolCircleCheck() {
    return (
        <symbol id="icon-circle-check" viewBox="0 0 24 24">
            <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
            ></circle>
            <path
                d="m9 12 2 2 4-4"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
            ></path>
        </symbol>
    );
}

/**
 * Triangle-warning <symbol> definition.
 * @returns {JSX.Element}
 */
export function SymbolTriangleWarning() {
    return (
        <symbol id="icon-triangle-warning" viewBox="0 0 24 24">
            <path
                d="M12 2 2 20h20L12 2z"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
            ></path>
            <path d="M12 9v5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"></path>
            <path d="M12 17h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"></path>
        </symbol>
    );
}

/**
 * Send (paper-plane) <symbol> definition.
 * @returns {JSX.Element}
 */
export function SymbolSend() {
    return (
        <symbol id="icon-send" viewBox="0 0 24 24">
            <path
                d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
            ></path>
            <path
                d="m21.854 2.147-10.94 10.939"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
            ></path>
        </symbol>
    );
}

/**
 * Arrow-right <symbol> definition.
 * @returns {JSX.Element}
 */
export function SymbolArrowRight() {
    return (
        <symbol id="icon-arrow-right" viewBox="0 0 24 24">
            <path d="M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"></path>
            <path
                d="m12 5 7 7-7 7"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
            ></path>
        </symbol>
    );
}

/**
 * Dots-horizontal (ellipsis) <symbol> definition.
 * @returns {JSX.Element}
 */
export function SymbolDotsHorizontal() {
    return (
        <symbol id="icon-dots-horizontal" viewBox="0 0 24 24">
            <circle
                cx="12"
                cy="12"
                r="1"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
            ></circle>
            <circle
                cx="19"
                cy="12"
                r="1"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
            ></circle>
            <circle
                cx="5"
                cy="12"
                r="1"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
            ></circle>
        </symbol>
    );
}

/**
 * Trash <symbol> definition.
 * @returns {JSX.Element}
 */
export function SymbolTrash() {
    return (
        <symbol id="icon-trash" viewBox="0 0 24 24">
            <path d="M3 6h18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"></path>
            <path
                d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
            ></path>
            <path
                d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
            ></path>
            <line
                x1="10"
                x2="10"
                y1="11"
                y2="17"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            ></line>
            <line
                x1="14"
                x2="14"
                y1="11"
                y2="17"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            ></line>
        </symbol>
    );
}

/**
 * Spinner <symbol> definition.
 * @returns {JSX.Element}
 */
export function SymbolSpinner() {
    return (
        <symbol id="icon-spinner" viewBox="0 0 24 24">
            <path d="M12 2v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="m16.2 7.8 2.9-2.9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M18 12h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="m16.2 16.2 2.9 2.9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M12 18v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="m4.9 19.1 2.9-2.9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M2 12h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="m4.9 4.9 2.9 2.9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
        </symbol>
    );
}

/**
 * List <symbol> definition.
 * @returns {JSX.Element}
 */
export function SymbolList() {
    return (
        <symbol id="icon-list" viewBox="0 0 24 24">
            <path d="M2 6h20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"></path>
            <path d="M2 12h20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"></path>
            <path d="M2 18h20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"></path>
        </symbol>
    );
}

/**
 * Gift <symbol> definition.
 * @returns {JSX.Element}
 */
export function SymbolGift() {
    return (
        <symbol id="icon-gift" viewBox="0 0 24 24">
            <rect
                x="3"
                y="8"
                width="18"
                height="4"
                rx="1"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
            ></rect>
            <path d="M12 8v13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"></path>
            <path
                d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
            ></path>
            <path
                d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
            ></path>
        </symbol>
    );
}

/**
 * Image <symbol> definition.
 * @returns {JSX.Element}
 */
export function SymbolImage() {
    return (
        <symbol id="icon-image" viewBox="0 0 24 24">
            <rect
                x="3"
                y="5"
                width="18"
                height="14"
                rx="2"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
            ></rect>
            <circle
                cx="8.5"
                cy="10.5"
                r="1.5"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
            ></circle>
            <path
                d="m21 15-5-5L5 21"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
            ></path>
        </symbol>
    );
}

/**
 * Cube <symbol> definition.
 * @returns {JSX.Element}
 */
export function SymbolCube() {
    return (
        <symbol id="icon-cube" viewBox="0 0 24 24">
            <path
                d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
            ></path>
            <path
                d="m3.3 7 8.7 5 8.7-5"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
            ></path>
            <path d="M12 22V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"></path>
        </symbol>
    );
}

/**
 * Chevrons-vertical <symbol> definition.
 * @returns {JSX.Element}
 */
export function SymbolChevronsVertical() {
    return (
        <symbol id="icon-chevrons-vertical" viewBox="0 0 24 24">
            <path
                d="m7 15 5 5 5-5"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
            ></path>
            <path d="m7 9 5-5 5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"></path>
        </symbol>
    );
}

/**
 * Search <symbol> definition.
 * @returns {JSX.Element}
 */
export function SymbolSearch() {
    return (
        <symbol id="icon-search" viewBox="0 0 24 24">
            <circle
                cx="11"
                cy="11"
                r="8"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
            ></circle>
            <path
                d="m21 21-4.3-4.3"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
            ></path>
        </symbol>
    );
}

/**
 * X (close) <symbol> definition.
 * @returns {JSX.Element}
 */
export function SymbolX() {
    return (
        <symbol id="icon-x" viewBox="0 0 24 24">
            <path d="M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"></path>
            <path d="m6 6 12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"></path>
        </symbol>
    );
}

/**
 * Check <symbol> definition.
 * @returns {JSX.Element}
 */
export function SymbolCheck() {
    return (
        <symbol id="icon-check" viewBox="0 0 24 24">
            <path
                d="M20 6 9 17l-5-5"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
            ></path>
        </symbol>
    );
}

/**
 * Circle-info <symbol> definition.
 * @returns {JSX.Element}
 */
export function SymbolCircleInfo() {
    return (
        <symbol id="icon-circle-info" viewBox="0 0 24 24">
            <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
            ></circle>
            <line
                x1="12"
                x2="12"
                y1="10"
                y2="16"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            ></line>
            <line
                x1="12"
                x2="12.01"
                y1="8"
                y2="8"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            ></line>
        </symbol>
    );
}

/**
 * Shield-exclamation <symbol> definition.
 * @returns {JSX.Element}
 */
export function SymbolShieldExclamation() {
    return (
        <symbol id="icon-shield-exclamation" viewBox="0 0 24 24">
            <path
                d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
            ></path>
            <path d="M12 8v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"></path>
            <path d="M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"></path>
        </symbol>
    );
}

/**
 * Copy <symbol> definition.
 * @returns {JSX.Element}
 */
export function SymbolCopy() {
    return (
        <symbol id="icon-copy" viewBox="0 0 24 24">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </symbol>
    );
}

/**
 * Sun <symbol> definition.
 * @returns {JSX.Element}
 */
export function SymbolSun() {
    return (
        <symbol
            id="icon-sun"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
        </symbol>
    );
}

/**
 * Moon <symbol> definition.
 * @returns {JSX.Element}
 */
export function SymbolMoon() {
    return (
        <symbol id="icon-moon" viewBox="0 0 24 24">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </symbol>
    );
}

/**
 * External link <symbol> definition.
 * @returns {JSX.Element} Symbol element with paths for external link icon.
 */
export function SymbolExternalLink() {
    return (
        <symbol id="icon-external-link" viewBox="0 0 24 24">
            <path d="M15 3h6v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
            <path d="M10 14 21 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
            <path
                d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
            />
        </symbol>
    );
}

// SvgSymbols wrapper

/**
 * Sprite container for all icon <symbol> definitions.
 * Include this once per document (for example, near the end of <body>).
 * @param {Object} props
 * @param {JSX.Element} [props.children]
 * @returns {JSX.Element}
 */
export default function SvgSymbols({ children }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden;display:none;" aria-hidden="true">
            {children}
        </svg>
    );
}
