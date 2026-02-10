import { detectTTY, makeColors } from "./format.js";

const baseSymbols = {
    info: "■",
    success: "■",
    warning: "■",
    error: "■",
};

/**
 * Log info message.
 *
 * @param {string} msg - Message to log
 */
export function info(msg) {
    if (process.env.NODE_ENV === "test") return;
    const { noColor, isTTY } = detectTTY();
    const c = makeColors(isTTY && !noColor);
    process.stdout.write(`${c.cyan(baseSymbols.info)} ${msg}\n`);
}

/**
 * Log success message.
 *
 * @param {string} msg - Message to log
 */
export function success(msg) {
    if (process.env.NODE_ENV === "test") return;
    const { noColor, isTTY } = detectTTY();
    const c = makeColors(isTTY && !noColor);
    process.stdout.write(`${c.green(baseSymbols.success)} ${msg}\n`);
}

/**
 * Log warning message.
 *
 * @param {string} msg - Message to log
 */
export function warn(msg) {
    if (process.env.NODE_ENV === "test") return;
    const { noColor, isTTY } = detectTTY();
    const c = makeColors(isTTY && !noColor);
    process.stdout.write(`${c.yellow(baseSymbols.warning)} ${msg}\n`);
}

/**
 * Log error message.
 *
 * @param {string} msg - Message to log
 */
export function error(msg) {
    if (process.env.NODE_ENV === "test") return;
    const { noColor, isTTY } = detectTTY();
    const c = makeColors(isTTY && !noColor);
    process.stderr.write(`${c.red(baseSymbols.error)} ${msg}\n`);
}

/**
 * Log dimmed message.
 *
 * @param {unknown} msg - Message to log
 */
export function dim(msg) {
    if (process.env.NODE_ENV === "test") return;
    const { noColor, isTTY } = detectTTY();
    const c = makeColors(isTTY && !noColor);
    process.stdout.write(`${c.dim(String(msg))}\n`);
}

/**
 * Log plain text message.
 *
 * @param {unknown} msg - Message to log
 */
export function text(msg) {
    if (process.env.NODE_ENV === "test") return;
    if (msg === undefined || msg === null) return;
    process.stdout.write(`${String(msg)}\n`);
}

/**
 * Log a newline.
 */
export function newLine() {
    if (process.env.NODE_ENV === "test") return;
    process.stdout.write("\n");
}

/**
 * Logging utilities with TTY-aware formatting.
 *
 * @namespace log
 */
export const log = {
    info,
    success,
    warn,
    error,
    dim,
    text,
    newLine,
};
