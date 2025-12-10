/**
 * @fileoverview Platform-specific file reader implementations for static-handler.
 *
 * Each function creates a FileReader that satisfies the interface required
 * by createStaticHandler. These are separated to allow tree-shaking and
 * avoid importing platform-specific modules in the wrong runtime.
 *
 * @module server/shared/file-readers
 * @since 1.0.0
 */

/**
 * @typedef {import("./static-handler.js").FileReader} FileReader
 */

/**
 * @typedef {object} TextFileReader
 * @property {(filePath: string) => Promise<boolean>} exists - Check if file exists
 * @property {(filePath: string) => Promise<{ size: number, mtime: Date } | null>} stat - Get file stats
 * @property {(filePath: string) => Promise<Uint8Array | null>} read - Read file as binary
 * @property {(filePath: string) => Promise<string | null>} readText - Read file as UTF-8 text
 */

/**
 * Create a Node.js file reader using fs.promises.
 *
 * @param {typeof import("node:fs").promises} fsPromises - Node.js fs.promises module
 * @returns {TextFileReader} File reader implementation
 *
 * @example
 * ```javascript
 * import fs from "node:fs";
 * const fileReader = nodeFileReader(fs.promises);
 * ```
 */
export function nodeFileReader(fsPromises) {
    return {
        async exists(filePath) {
            try {
                await fsPromises.access(filePath);
                return true;
            } catch {
                return false;
            }
        },
        async stat(filePath) {
            try {
                const stat = await fsPromises.stat(filePath);
                if (!stat.isFile()) return null;
                return { size: stat.size, mtime: new Date(stat.mtimeMs) };
            } catch {
                return null;
            }
        },
        async read(filePath) {
            try {
                const buffer = await fsPromises.readFile(filePath);
                return new Uint8Array(buffer);
            } catch {
                return null;
            }
        },
        async readText(filePath) {
            try {
                return await fsPromises.readFile(filePath, "utf-8");
            } catch {
                return null;
            }
        },
    };
}

/**
 * Create a Bun file reader using Bun.file().
 *
 * @returns {TextFileReader} File reader implementation
 *
 * @example
 * ```javascript
 * const fileReader = bunFileReader();
 * ```
 */
export function bunFileReader() {
    return {
        async exists(filePath) {
            // @ts-expect-error - Bun global
            const file = Bun.file(filePath);
            return file.exists();
        },
        async stat(filePath) {
            try {
                // @ts-expect-error - Bun global
                const file = Bun.file(filePath);
                if (!(await file.exists())) return null;
                // Bun.file() returns size and lastModified
                return { size: file.size, mtime: new Date(file.lastModified) };
            } catch {
                return null;
            }
        },
        async read(filePath) {
            try {
                // @ts-expect-error - Bun global
                const file = Bun.file(filePath);
                if (!(await file.exists())) return null;
                const buffer = await file.arrayBuffer();
                return new Uint8Array(buffer);
            } catch {
                return null;
            }
        },
        async readText(filePath) {
            try {
                // @ts-expect-error - Bun global
                const file = Bun.file(filePath);
                if (!(await file.exists())) return null;
                return await file.text();
            } catch {
                return null;
            }
        },
    };
}

/**
 * Create a Deno file reader using Deno APIs.
 *
 * @returns {TextFileReader} File reader implementation
 *
 * @example
 * ```javascript
 * const fileReader = denoFileReader();
 * ```
 */
export function denoFileReader() {
    return {
        async exists(filePath) {
            try {
                // @ts-expect-error - Deno global
                await Deno.stat(filePath);
                return true;
            } catch {
                return false;
            }
        },
        async stat(filePath) {
            try {
                // @ts-expect-error - Deno global
                const stat = await Deno.stat(filePath);
                if (!stat.isFile) return null;
                return { size: stat.size, mtime: stat.mtime };
            } catch {
                return null;
            }
        },
        async read(filePath) {
            try {
                // @ts-expect-error - Deno global
                return await Deno.readFile(filePath);
            } catch {
                return null;
            }
        },
        async readText(filePath) {
            try {
                // @ts-expect-error - Deno global
                return await Deno.readTextFile(filePath);
            } catch {
                return null;
            }
        },
    };
}
