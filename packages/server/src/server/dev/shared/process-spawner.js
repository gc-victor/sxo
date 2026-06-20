/**
 * @fileoverview Platform-specific esbuild process spawning.
 *
 * Provides a factory function for creating platform-appropriate
 * esbuild spawn implementations that all return stderr output
 * as a Promise<string> with consistent error handling.
 *
 * @module server/dev/shared/process-spawner
 */

/**
 * Spawn esbuild for Node.js runtime.
 *
 * Uses child_process.spawn() and captures stderr output.
 *
 * @param {string} execPath - Node.js executable path
 * @param {string} configPath - Path to esbuild config file
 * @param {string} pagesDir - Path to pages directory
 * @param {object} env - Environment variables
 * @param {string} cwd - Current working directory
 * @returns {Promise<string>} Stderr output (empty string if no errors)
 * @private
 */
async function spawnNodeEsbuild(execPath, configPath, pagesDir, env, cwd) {
    const { spawn } = await import("node:child_process");
    let stderr = "";

    const child = spawn(execPath, [configPath, pagesDir], {
        env: { ...env, DEV: "true" },
        stdio: ["inherit", "inherit", "pipe"],
        cwd,
    });

    if (child.stderr) {
        child.stderr.on("data", (data) => {
            stderr += data.toString();
        });
    }

    return new Promise((resolve) => {
        child.on("close", () => resolve(stderr));
    });
}

/**
 * Spawn esbuild for Bun runtime.
 *
 * Uses Bun.spawn() and captures stderr via ReadableStream.
 *
 * @param {string} execPath - Bun executable path
 * @param {string} configPath - Path to esbuild config file
 * @param {string} pagesDir - Path to pages directory
 * @param {object} env - Environment variables
 * @param {string} cwd - Current working directory
 * @returns {Promise<string>} Stderr output (empty string if no errors)
 * @private
 */
async function spawnBunEsbuild(execPath, configPath, pagesDir, env, cwd) {
    const proc = Bun.spawn([execPath, configPath, pagesDir], {
        env: { ...env, DEV: "true" },
        cwd,
        stdout: "inherit",
        stderr: "pipe",
    });

    /** @type {Uint8Array[]} */
    const stderrChunks = [];

    if (proc.stderr) {
        const reader = proc.stderr.getReader();
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (value) stderrChunks.push(value);
            }
        } catch {
            // Ignore read errors
        } finally {
            reader.releaseLock();
        }
    }

    await proc.exited;

    if (stderrChunks.length > 0) {
        const decoder = new TextDecoder();
        let errorStr = "";
        for (const chunk of stderrChunks) {
            errorStr += decoder.decode(chunk);
        }
        return errorStr;
    }

    return "";
}

/**
 * Spawn esbuild for Deno runtime.
 *
 * Uses Deno.Command() and captures stderr via ReadableStream.
 *
 * @param {string} execPath - Deno executable path
 * @param {string} configPath - Path to esbuild config file
 * @param {string} pagesDir - Path to pages directory
 * @param {object} env - Environment variables
 * @param {string} cwd - Current working directory
 * @returns {Promise<string>} Stderr output (empty string if no errors)
 * @private
 */
async function spawnDenoEsbuild(execPath, configPath, pagesDir, env, cwd) {
    const command = new Deno.Command(execPath, {
        args: ["run", "--allow-all", configPath, pagesDir],
        env: { ...env, DEV: "true" },
        stdout: "inherit",
        stderr: "piped",
        cwd,
    });

    const child = command.spawn();
    /** @type {Uint8Array[]} */
    const stderrChunks = [];

    if (child.stderr) {
        const reader = child.stderr.getReader();
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (value) stderrChunks.push(value);
            }
        } catch {
            // Ignore read errors
        } finally {
            reader.releaseLock();
        }
    }

    await child.status;

    if (stderrChunks.length > 0) {
        const decoder = new TextDecoder();
        let stderr = "";
        for (const chunk of stderrChunks) {
            stderr += decoder.decode(chunk);
        }
        return stderr;
    }

    return "";
}

/**
 * Platform-specific spawn implementations.
 * @type {Record<string, Function>}
 */
const SPAWNERS = {
    node: spawnNodeEsbuild,
    bun: spawnBunEsbuild,
    deno: spawnDenoEsbuild,
};

/**
 * Create a platform-appropriate esbuild spawner.
 *
 * Returns a function that when called spawns esbuild and returns
 * stderr output. The spawner handles all platform-specific
 * process management and returns a consistent Promise<string> interface.
 *
 * @param {'node' | 'bun' | 'deno'} platform - Target platform
 * @param {string} execPath - Executable path
 * @param {string} configPath - Path to esbuild config file
 * @param {string} pagesDir - Path to pages directory
 * @param {object} [env=process.env] - Environment variables
 * @param {string} [cwd=process.cwd()] - Current working directory
 * @returns {() => Promise<string>} Esbuild spawn function
 * @throws {Error} If platform is not supported
 * @public
 * @example
 * // Node.js
 * const spawnEsbuild = createEsbuildSpawner('node', process.execPath, '/path/to/config', '/pages');
 * const stderr = await spawnEsbuild();
 *
 * // Bun
 * const spawnEsbuild = createEsbuildSpawner('bun', process.execPath, '/path/to/config', '/pages');
 * const stderr = await spawnEsbuild();
 */
export function createEsbuildSpawner(platform, execPath, configPath, pagesDir, env = process.env, cwd = process.cwd()) {
    const spawner = SPAWNERS[platform];
    if (!spawner) {
        throw new Error(`Unsupported platform for esbuild spawning: ${platform}`);
    }

    return () => spawner(execPath, configPath, pagesDir, env, cwd);
}
