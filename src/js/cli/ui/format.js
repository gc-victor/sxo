/**
 * Detect TTY and NO_COLOR environment settings.
 *
 * @returns {{ isTTY: boolean, noColor: boolean }}
 */
export function detectTTY() {
    const isTTY = Boolean(process.stdout?.isTTY);
    const noColor = "NO_COLOR" in process.env;
    return { isTTY, noColor };
}

/**
 * Create ANSI color wrapper functions.
 *
 * When disabled, returns identity functions that strip formatting.
 *
 * @param {boolean} enabled - Whether to enable color output
 * @returns {{
 *   enabled: boolean,
 *   bold: (s: unknown) => string,
 *   dim: (s: unknown) => string,
 *   underline: (s: unknown) => string,
 *   red: (s: unknown) => string,
 *   green: (s: unknown) => string,
 *   yellow: (s: unknown) => string,
 *   blue: (s: unknown) => string,
 *   magenta: (s: unknown) => string,
 *   cyan: (s: unknown) => string,
 *   gray: (s: unknown) => string
 * }}
 */
export function makeColors(enabled) {
    const wrap = (/** @type {number | string} */ code) => (/** @type {unknown} */ s) => `\x1b[${code}m${String(s)}\x1b[0m`;

    if (!enabled) {
        const id = (/** @type {unknown} */ x) => String(x);
        return {
            enabled: false,
            bold: id,
            dim: id,
            underline: id,
            red: id,
            green: id,
            yellow: id,
            blue: id,
            magenta: id,
            cyan: id,
            gray: id,
        };
    }

    return {
        enabled: true,
        bold: wrap(1),
        dim: wrap(2),
        underline: wrap(4),
        red: wrap(31),
        green: wrap(32),
        yellow: wrap(33),
        blue: wrap(34),
        magenta: wrap(35),
        cyan: wrap(36),
        gray: wrap(90),
    };
}

/**
 * Strip ANSI escape codes from string.
 *
 * @param {unknown} s - String to strip
 * @returns {string}
 */
export function stripAnsi(s) {
    const str = String(s);
    const esc = String.fromCharCode(27);
    const re = new RegExp(`${esc}\\[[0-9;]*m`, "g");
    return str.replace(re, "");
}

const borderStyles = {
    single: { tl: "┌", tr: "┐", bl: "└", br: "┘", h: "─", v: "│" },
    double: { tl: "╔", tr: "╗", bl: "╚", br: "╝", h: "═", v: "║" },
    round: { tl: "╭", tr: "╮", bl: "╰", br: "╯", h: "─", v: "│" },
};

/**
 * Render a simple box around given lines.
 *
 * @param {string[]} lines - Lines to render inside the box
 * @param {Object} [opts] - Rendering options
 * @param {number} [opts.padding] - Horizontal padding (default: 1)
 * @param {number} [opts.width] - Unused (kept for compatibility)
 * @param {string} [opts.borderColor] - Border color name (default: cyan)
 * @param {"single"|"double"|"round"} [opts.borderStyle] - Border style (default: round)
 * @param {boolean} [opts.colorEnabled] - Force color enabled/disabled
 * @returns {string}
 */
export function renderBox(lines, opts = {}) {
    const { isTTY, noColor } = detectTTY();
    const colorEnabled = opts.colorEnabled ?? (isTTY && !noColor);
    const c = makeColors(colorEnabled);

    const pad = Math.max(0, opts.padding ?? 1);
    const style = borderStyles[opts.borderStyle ?? "round"] || borderStyles.round;

    const termWidth = Math.max(1, process.stdout.columns || 80);
    // The box should span the full terminal width
    const boxWidth = termWidth;
    const innerWidth = boxWidth - 2 - pad * 2; // 2 for borders, pad*2 for spaces

    const colorMap = {
        red: c.red,
        green: c.green,
        yellow: c.yellow,
        magenta: c.magenta,
        gray: c.gray,
        cyan: c.cyan,
    };
    const borderPaint =
        (opts.borderColor ? /** @type {Record<string, (s: unknown) => string>} */ (colorMap)[opts.borderColor] : undefined) ?? c.cyan;

    const top = borderPaint(style.tl + style.h.repeat(boxWidth - 2) + style.tr);
    const bottom = borderPaint(style.bl + style.h.repeat(boxWidth - 2) + style.br);

    const body = lines.map((raw) => {
        const visibleLen = stripAnsi(raw).length;
        const padded = raw + " ".repeat(Math.max(0, innerWidth - visibleLen));
        return borderPaint(style.v) + " ".repeat(pad) + padded + " ".repeat(pad) + borderPaint(style.v);
    });

    return [top, ...body, bottom].join("\n");
}

/**
 * Format a fancy banner (boxed when TTY), or plain text otherwise.
 *
 * @param {string} name - Application name
 * @param {string} version - Application version
 * @param {Object} [opts] - Formatting options
 * @param {boolean} [opts.useBox] - Force box usage (default: TTY)
 * @param {boolean} [opts.color] - Force colors (default: TTY && !NO_COLOR)
 * @param {string} [opts.subtitle] - Optional subtitle under the title
 * @param {string} [opts.tagline] - Optional extra line
 * @param {string} [opts.borderColor] - Box border color (default: cyan)
 * @param {"single"|"double"|"round"} [opts.borderStyle] - Box border style
 * @param {number} [opts.padding] - Box padding
 * @returns {string}
 */
export function formatBanner(name, version, opts = {}) {
    const { isTTY, noColor } = detectTTY();
    const colorEnabled = opts.color ?? (isTTY && !noColor);
    const c = makeColors(colorEnabled);
    const useBox = opts.useBox ?? isTTY;

    const title = `${c.bold(c.cyan(name))} v${version}`;
    const lines = [title];

    if (opts.subtitle) lines.push(String(opts.subtitle));
    if (opts.tagline) lines.push(String(opts.tagline));

    const content = lines.join("\n");
    if (!useBox) return content;

    return renderBox(lines, {
        padding: opts.padding ?? 1,
        borderStyle: opts.borderStyle ?? "round",
        borderColor: opts.borderColor ?? "cyan",
        colorEnabled,
    });
}

/**
 * Print a banner to stdout.
 *
 * @param {string} name - Application name
 * @param {string} version - Application version
 * @param {Object} [opts] - Same as formatBanner options
 */
export function printBanner(name, version, opts = {}) {
    process.stdout.write(`${formatBanner(name, version, opts)}\n`);
}
