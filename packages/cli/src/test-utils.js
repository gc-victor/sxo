import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/**
 * Creates a temporary project directory, runs `fn(tmpDir)`, then cleans up.
 *
 * @template T
 * @param {(tmpDir: string) => Promise<T>} fn - Async function receiving temp dir path
 * @returns {Promise<T>}
 */
export async function withTempProject(fn) {
    const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), "sxo-test-"));
    try {
        return await fn(tmp);
    } finally {
        try {
            await fsp.rm(tmp, { recursive: true, force: true, maxRetries: 2 });
        } catch {
            // ignore
        }
    }
}

/**
 * Writes a text file, ensuring parent directories exist.
 *
 * @param {string} dir - Base directory path
 * @param {string} rel - Relative path from dir (e.g., "subdir/file.txt")
 * @param {string} content - File content to write
 * @returns {Promise<string>} Absolute path to the written file
 */
export async function writeFile(dir, rel, content) {
    const abs = path.join(dir, rel);
    await fsp.mkdir(path.dirname(abs), { recursive: true });
    await fsp.writeFile(abs, content, "utf8");
    return abs;
}
