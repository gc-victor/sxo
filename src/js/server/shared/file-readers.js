/**
 * @fileoverview Unified file reader using node:fs/promises.
 *
 * node:fs/promises is fully supported across Node.js, Bun, and Deno
 * (both runtimes treat it as a bug if Node.js code doesn't work).
 *
 * @module server/shared/file-readers
 */

import fsp from "node:fs/promises";

/**
 * @typedef {object} FileReader
 * @property {(filePath: string) => Promise<boolean>} exists - Check if file exists
 * @property {(filePath: string) => Promise<{ size: number, mtime: Date } | null>} stat - Get file stats
 * @property {(filePath: string) => Promise<Uint8Array | null>} read - Read file as binary
 * @property {(filePath: string) => Promise<string | null>} readText - Read file as UTF-8 text
 */

/**
 * Create a file reader using node:fs/promises.
 *
 * Works across all supported runtimes (Node.js, Bun, Deno).
 *
 * @returns {FileReader} File reader implementation
 *
 * @example
 * ```javascript
 * import { createFileReader } from "./file-readers.js";
 * const fileReader = createFileReader();
 * const content = await fileReader.readText("path/to/file.txt");
 * ```
 */
export function createFileReader() {
    return {
        async exists(filePath) {
            try {
                await fsp.access(filePath);
                return true;
            } catch {
                return false;
            }
        },

        async stat(filePath) {
            try {
                const stat = await fsp.stat(filePath);
                if (!stat.isFile()) return null;
                return { size: stat.size, mtime: new Date(stat.mtimeMs) };
            } catch {
                return null;
            }
        },

        async read(filePath) {
            try {
                const buffer = await fsp.readFile(filePath);
                return new Uint8Array(buffer);
            } catch {
                return null;
            }
        },

        async readText(filePath) {
            try {
                return await fsp.readFile(filePath, "utf-8");
            } catch {
                return null;
            }
        },
    };
}

/**
 * Create a text file reader that throws on errors.
 *
 * Bridges fileReader abstraction (returns string|null) with code expecting
 * string (or throws). Useful for routes loading and dev server operations.
 *
 * @param {FileReader} fileReader - File reader instance
 * @returns {(filePath: string) => Promise<string>} Text reader that throws on error
 *
 * @example
 * ```javascript
 * import { createFileReader, createTextReader } from "./file-readers.js";
 *
 * const fileReader = createFileReader();
 * const readText = createTextReader(fileReader);
 *
 * const content = await readText("routes.json"); // throws if file missing
 * ```
 */
export function createTextReader(fileReader) {
    return async (filePath) => {
        const content = await fileReader.readText(filePath);
        if (content === null) {
            throw new Error(`Failed to read file: ${filePath}`);
        }
        return content;
    };
}
