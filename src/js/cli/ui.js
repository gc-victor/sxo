/**
 * CLI UI helpers for banner and spinners with graceful TTY fallback
 * Node >= 20, ESM
 *
 * Zero-dependency ANSI-based implementation:
 * - Colors via ANSI escape codes (auto-disabled with NO_COLOR or when not TTY)
 * - Simple boxed banner (TTY only), plain text otherwise
 * - Lightweight spinner with start/succeed/fail/warn/info/update/stop API
 */

/* ---------------------------- color utilities ---------------------------- */

function detectTTY() {
    const isTTY = !!process.stdout?.isTTY;
    const noColor = "NO_COLOR" in process.env;
    return { isTTY, noColor };
}

function makeColors(enabled) {
    const wrap = (code) => (s) => `\x1b[${code}m${String(s)}\x1b[0m`;

    if (!enabled) {
        const id = (x) => String(x);
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

const baseSymbols = {
    info: "■",
    success: "■",
    warning: "■",
    error: "■",
    dot: "•",
};

/* ------------------------------- banner box ------------------------------ */

const borderStyles = {
    single: { tl: "┌", tr: "┐", bl: "└", br: "┘", h: "─", v: "│" },
    double: { tl: "╔", tr: "╗", bl: "╚", br: "╝", h: "═", v: "║" },
    round: { tl: "╭", tr: "╮", bl: "╰", br: "╯", h: "─", v: "│" },
};

/**
 * Render a simple box around given lines.
 * @param {string[]} lines
 * @param {{ padding?: number, width?: number, borderColor?: string, borderStyle?: "single"|"double"|"round", colorEnabled?: boolean }} [opts]
 */
function renderBox(lines, opts = {}) {
    const { isTTY, noColor } = detectTTY();
    const colorEnabled = opts.colorEnabled ?? (isTTY && !noColor);
    const c = makeColors(colorEnabled);

    const pad = Math.max(0, opts.padding ?? 1);
    const style = borderStyles[opts.borderStyle ?? "round"] || borderStyles.round;

    const termWidth = Math.max(1, process.stdout.columns || 80);
    // The box should span the full terminal width
    const boxWidth = termWidth;
    const innerWidth = boxWidth - 2 - pad * 2; // 2 for borders, pad*2 for spaces

    const borderPaint =
        opts.borderColor === "red"
            ? c.red
            : opts.borderColor === "green"
              ? c.green
              : opts.borderColor === "yellow"
                ? c.yellow
                : opts.borderColor === "magenta"
                  ? c.magenta
                  : opts.borderColor === "gray"
                    ? c.gray
                    : c.cyan;

    const top = borderPaint(style.tl + style.h.repeat(boxWidth - 2) + style.tr);
    const bottom = borderPaint(style.bl + style.h.repeat(boxWidth - 2) + style.br);

    const body = lines.map((raw) => {
        const visibleLen = stripAnsi(raw).length;
        const padded = raw + " ".repeat(Math.max(0, innerWidth - visibleLen));
        return borderPaint(style.v) + " ".repeat(pad) + padded + " ".repeat(pad) + borderPaint(style.v);
    });

    return [top, ...body, bottom].join("\n");
}

function stripAnsi(s) {
    const str = String(s);
    const esc = String.fromCharCode(27);
    const re = new RegExp(`${esc}\\[[0-9;]*m`, "g");
    return str.replace(re, "");
}

/* -------------------------------- banner -------------------------------- */

/**
 * Format a fancy banner (boxed when TTY), or plain text otherwise.
 * @param {string} name
 * @param {string} version
 * @param {Object} [opts]
 * @param {boolean} [opts.useBox]       - force box usage (default: TTY)
 * @param {boolean} [opts.color]        - force colors (default: TTY && !NO_COLOR)
 * @param {string}  [opts.subtitle]     - optional subtitle under the title
 * @param {string}  [opts.tagline]      - optional extra line
 * @param {string}  [opts.borderColor]  - box border color (default: cyan)
 * @param {"single"|"double"|"round"} [opts.borderStyle] - box border style
 * @param {number}  [opts.padding]      - box padding
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
 * @param {string} name
 * @param {string} version
 * @param {Object} [opts] - same as formatBanner
 */
export function printBanner(name, version, opts = {}) {
    process.stdout.write(`${formatBanner(name, version, opts)}\n`);
}

/* -------------------------------- spinner -------------------------------- */

const spinnerFrames = ["⠋", "⠙", "⠚", "⠞", "⠖", "⠦", "⠴", "⠲", "⠳", "⠓"];
const fallbackFrames = ["-", "\\", "|", "/"];

/**
 * Create a spinner. Falls back to plain, single-line logging when TTY is unavailable.
 *
 * @param {string} text
 * @param {Object} [opts]
 * @param {boolean} [opts.enabled]   - force enable spinner (default: TTY)
 * @param {boolean} [opts.color]     - force colors (default: TTY && !NO_COLOR)
 * @param {string}  [opts.prefix]    - text prefix for each message in fallback mode
 * @returns {{
 *   start: () => void,
 *   succeed: (msg?: string) => void,
 *   fail: (msg?: string) => void,
 *   warn: (msg?: string) => void,
 *   info: (msg?: string) => void,
 *   update: (msg: string) => void,
 *   stop: () => void
 * }}
 */
export function createSpinner(text, opts = {}) {
    const { isTTY, noColor } = detectTTY();
    const enabled = opts.enabled ?? isTTY;
    const colorEnabled = opts.color ?? (isTTY && !noColor);
    const c = makeColors(colorEnabled);
    const prefix = opts.prefix ? `${String(opts.prefix)} ` : "";

    if (!enabled) {
        // Fallback spinner: simple logging without animation
        let current = text || "";
        let active = false;

        const write = (icon, msg, paint = (s) => s) => {
            const line = `${prefix}${paint(icon)} ${msg ?? current}`;
            process.stdout.write(`${line}\n`);
        };

        return {
            start() {
                active = true;
                write(baseSymbols.dot, current, c.gray);
            },
            succeed(msg) {
                if (!active) return;
                write(baseSymbols.success, msg, c.green);
                active = false;
            },
            fail(msg) {
                if (!active) return;
                write(baseSymbols.error, msg, c.red);
                active = false;
            },
            warn(msg) {
                if (!active) return;
                write(baseSymbols.warning, msg, c.yellow);
            },
            info(msg) {
                if (!active) return;
                write(baseSymbols.info, msg, c.cyan);
            },
            update(msg) {
                current = msg;
                if (active) write(baseSymbols.dot, current, c.gray);
            },
            stop() {
                active = false;
            },
        };
    }

    // Animated spinner for TTY
    let current = text || "";
    let i = 0;
    let timer = null;
    let active = false;
    const frames = process.platform === "win32" ? fallbackFrames : spinnerFrames;
    const intervalMs = 80;

    const clearLine = () => {
        process.stdout.write("\x1b[2K\r");
    };
    const renderFrame = () => {
        const frame = frames[i % frames.length];
        i += 1;
        const line = `${prefix}${c.cyan(frame)} ${current}`;
        process.stdout.write(`${line}\r`);
    };
    const ensureTimer = () => {
        if (timer !== null) return;
        timer = setInterval(renderFrame, intervalMs);
        // Node < 20: timer.unref exists; safe to try-catch
        try {
            timer.unref?.();
        } catch {}
    };
    const stopTimer = () => {
        if (timer !== null) {
            clearInterval(timer);
            timer = null;
        }
    };

    const finalize = (icon, msg, paint = (s) => s) => {
        stopTimer();
        clearLine();
        const line = `${prefix}${paint(icon)} ${msg ?? current}`;
        process.stdout.write(`${line}\n`);
        active = false;
    };

    return {
        start() {
            if (active) return;
            active = true;
            ensureTimer();
        },
        succeed(msg) {
            if (!active) return;
            finalize(baseSymbols.success, msg, c.green);
        },
        fail(msg) {
            if (!active) return;
            finalize(baseSymbols.error, msg, c.red);
        },
        warn(msg) {
            if (!active) return;
            stopTimer();
            clearLine();
            const line = `${prefix}${c.yellow(baseSymbols.warning)} ${msg ?? current}`;
            process.stdout.write(`${line}\n`);
            // Keep spinner active (like an info/warn update) unless explicitly stopped
            ensureTimer();
        },
        info(msg) {
            if (!active) return;
            stopTimer();
            clearLine();
            const line = `${prefix}${c.cyan(baseSymbols.info)} ${msg ?? current}`;
            process.stdout.write(`${line}\n`);
            ensureTimer();
        },
        update(msg) {
            current = msg;
            if (active) {
                clearLine();
                renderFrame();
            }
        },
        stop() {
            if (!active) return;
            stopTimer();
            clearLine();
            active = false;
        },
    };
}

/* ------------------------------ info grid ------------------------------- */

/**
 * Render a label-value grid (aligned) as a string.
 * @param {Array<[string, string|number|boolean|undefined|null]>|Record<string, any>} rows
 * @param {Object} [opts]
 * @param {boolean} [opts.color]    - force colors (default: TTY && !NO_COLOR)
 * @param {number}  [opts.padding]  - spaces after label column (default: 2)
 * @param {string}  [opts.labelColor="dim"] - "dim" | "bold" | "gray"
 * @returns {string}
 */
export function formatInfoGrid(rows, opts = {}) {
    const { isTTY, noColor } = detectTTY();
    const colorEnabled = opts.color ?? (isTTY && !noColor);
    const c = makeColors(colorEnabled);

    /** @type {Array<[string, string]>} */
    const pairs = Array.isArray(rows)
        ? rows.map(([k, v]) => [String(k), toStringValue(v)])
        : Object.entries(rows).map(([k, v]) => [String(k), toStringValue(v)]);

    const padding = Math.max(0, opts.padding ?? 2);
    const maxLabel = pairs.reduce((m, [k]) => Math.max(m, stripAnsi(k).length), 0);

    const paintLabel = opts.labelColor === "bold" ? (s) => c.bold(s) : opts.labelColor === "gray" ? (s) => c.gray(s) : (s) => c.dim(s);

    const lines = pairs.map(([k, v]) => {
        const label = paintLabel(k.padEnd(maxLabel, " "));
        return `${label}${" ".repeat(padding)}${v}`;
    });

    return lines.join("\n");
}

/**
 * Print a label-value grid to stdout.
 * @param {Array<[string, string|number|boolean|undefined|null]>|Record<string, any>} rows
 * @param {Object} [opts] - see formatInfoGrid
 */
export function printInfoGrid(rows, opts = {}) {
    process.stdout.write(`${formatInfoGrid(rows, opts)}\n`);
}

/* --------------------------------- log ---------------------------------- */

export const log = {
    info(msg) {
        const { noColor, isTTY } = detectTTY();
        const c = makeColors(isTTY && !noColor);
        process.stdout.write(`${c.cyan(baseSymbols.info)} ${msg}\n`);
    },
    success(msg) {
        const { noColor, isTTY } = detectTTY();
        const c = makeColors(isTTY && !noColor);
        process.stdout.write(`${c.green(baseSymbols.success)} ${msg}\n`);
    },
    warn(msg) {
        const { noColor, isTTY } = detectTTY();
        const c = makeColors(isTTY && !noColor);
        process.stdout.write(`${c.yellow(baseSymbols.warning)} ${msg}\n`);
    },
    error(msg) {
        const { noColor, isTTY } = detectTTY();
        const c = makeColors(isTTY && !noColor);
        process.stderr.write(`${c.red(baseSymbols.error)} ${msg}\n`);
    },
    dim(msg) {
        const { noColor, isTTY } = detectTTY();
        const c = makeColors(isTTY && !noColor);
        process.stdout.write(`${c.dim(String(msg))}\n`);
    },
};

/* -------------------------------- utils --------------------------------- */

function toStringValue(v) {
    if (v === null || v === undefined) return "";
    if (typeof v === "boolean") return v ? "true" : "false";
    if (typeof v === "number") return String(v);
    return String(v);
}

/* -------------------------------- export -------------------------------- */

export const ui = {
    formatBanner,
    printBanner,
    createSpinner,
    formatInfoGrid,
    printInfoGrid,
    log,
};

export default ui;
