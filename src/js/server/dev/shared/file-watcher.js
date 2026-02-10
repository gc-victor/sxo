/**
 * @fileoverview Platform-agnostic file watching for dev server.
 *
 * Provides a factory function for creating file watchers that work
 * across Node.js, Bun, and Deno runtimes.
 *
 * @module server/dev/shared/file-watcher
 */

import fs from "node:fs";
import { logger } from "../../utils/logger.js";
import { getWatcherErrorHandler } from "../core.js";

/**
 * @typedef {object} FSWatcher
 * @property {() => void} close - Stop watching for file changes
 * @property {(event: string, filename: string | null) => void} on - Attach event listener
 */

/**
 * @typedef {object} Logger
 * @property {(msg: string) => void} warn - Log warning message
 * @property {(msg: string) => void} error - Log error message
 * @property {(msg: string) => void} info - Log info message
 * @property {(msg: string) => void} debug - Log debug message
 * @property {(...args: unknown[]) => void} trace - Log trace message
 * @property {(...args: unknown[]) => void} fatal - Log fatal message
 */

/**
 * Create a file watcher for dev server hot-reload.
 *
 * Returns a watcher that monitors a directory for file changes
 * and triggers debounced rebuilds. Handles watcher errors gracefully
 * without crashing dev server.
 *
 * @param {object} options - Watcher configuration
 * @param {string} options.watchDir - Directory to watch
 * @param {Function} options.onChange - Callback for file changes (receives filename)
 * @returns {FSWatcher | {close: () => void, on: (event: string, listener: (...args: any[]) => void) => void}} File watcher instance (varies by platform)
 * @throws {Error} If watcher creation fails (only thrown during initial setup)
 * @public
 * @example
 * const watcher = createFileWatcher({
 *     watchDir: './src',
 *     onChange: (filename) => {
 *         console.log(`Changed: ${filename}`);
 *     },
 * });
 *
 * // Cleanup on shutdown
 * watcher.close();
 */
export function createFileWatcher({ watchDir, onChange }) {
    try {
        // All platforms use Node.js fs.watch() for compatibility
        const watcher = fs.watch(watchDir, { recursive: true }, (_, filename) => {
            onChange(filename);
        });

        // Attach error handler for graceful degradation
        watcher.on("error", getWatcherErrorHandler(watchDir));

        return watcher;
    } catch (/** @type {unknown} */ err) {
        const error = /** @type {Error} */ (err);
        logger.warn(`Failed to watch ${watchDir}: ${error.message}. Hot-reload disabled.`);
        return /** @type {FSWatcher | {close: () => void, on: (event: string, listener: (...args: any[]) => void) => void}} */ ({
            close() {},
            on() {},
        });
    }
}
