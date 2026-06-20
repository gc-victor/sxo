// Re-export all formatting utilities
// biome-ignore lint/performance/noBarrelFile: Intentional façade pattern for API compatibility
export { detectTTY, formatBanner, makeColors, printBanner, renderBox, stripAnsi } from "./ui/format.js";
// Re-export logging utilities
export { log } from "./ui/log.js";
// Re-export spinner utilities
export { createSpinner } from "./ui/spinners.js";

// Provide a named aggregate for API compatibility
import { formatBanner, printBanner } from "./ui/format.js";
import { log } from "./ui/log.js";
import { createSpinner } from "./ui/spinners.js";

/**
 * Named aggregate of the CLI UI utilities.
 */
export const ui = {
    formatBanner,
    printBanner,
    createSpinner,
    log,
};
