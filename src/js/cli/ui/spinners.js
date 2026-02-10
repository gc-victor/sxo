import { detectTTY, makeColors } from "./format.js";

const baseSymbols = {
    info: "■",
    success: "■",
    warning: "■",
    error: "■",
    dot: "•",
};

const spinnerFrames = ["⠋", "⠙", "⠚", "⠞", "⠖", "⠦", "⠴", "⠲", "⠳", "⠓"];
const fallbackFrames = ["-", "\\", "|", "/"];

/**
 * Create a spinner. Falls back to plain, single-line logging when TTY is unavailable.
 *
 * @param {string} text - Initial spinner text
 * @param {Object} [opts] - Spinner options
 * @param {boolean} [opts.enabled] - Force enable spinner (default: TTY)
 * @param {boolean} [opts.color] - Force colors (default: TTY && !NO_COLOR)
 * @param {string} [opts.prefix] - Text prefix for each message in fallback mode
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
    const prefix = opts.prefix ? `${opts.prefix} ` : "";

    if (!enabled) {
        // Fallback spinner: simple logging without animation
        let current = text || "";
        let active = false;

        const write = (
            /** @type {string} */ icon,
            /** @type {string | undefined} */ msg,
            /** @type {(s: unknown) => unknown} */ paint = (/** @type {unknown} */ s) => s,
        ) => {
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
    /** @type {NodeJS.Timeout | null} */
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
        } catch {
            // Best-effort cleanup: ignore unref errors (API unavailable in older Node).
        }
    };
    const stopTimer = () => {
        if (timer !== null) {
            clearInterval(timer);
            timer = null;
        }
    };

    const finalize = (
        /** @type {string} */ icon,
        /** @type {string | undefined} */ msg,
        /** @type {(s: unknown) => unknown} */ paint = (/** @type {unknown} */ s) => s,
    ) => {
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
