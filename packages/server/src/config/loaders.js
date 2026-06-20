import fs from "node:fs";
import * as nodeModule from "node:module";
import { pathToFileURL } from "node:url";

/**
 * Loads project configuration file.
 *
 * Tries files in precedence order: .mjs, .js, .cjs, .json
 * Stops at first file found. Returns parsed config object or undefined
 * if no config file exists.
 *
 * @param {string} root - Root directory containing config file
 * @returns {Promise<object|undefined>} Parsed config object or undefined
 * @throws {Error} If config file exists but fails to parse
 *
 * @example
 * ```js
 * const config = await loadConfigFile("/project");
 * // Returns parsed config from /project/sxo.config.mjs (or .js, .cjs, .json)
 * // Returns undefined if no config file exists
 * ```
 */
export async function loadConfigFile(root) {
    const extensions = [".mjs", ".js", ".cjs", ".json"];
    const configName = "sxo.config";

    for (const ext of extensions) {
        const configPath = `${root}/${configName}${ext}`;

        if (fs.existsSync(configPath)) {
            const content = await fs.promises.readFile(configPath, "utf8");

            try {
                if (ext === ".json") {
                    return JSON.parse(content);
                }
                if (ext === ".mjs") {
                    // Dynamic import of ESM module
                    const loadedModule = await import(pathToFileURL(configPath).href);
                    return loadedModule.default;
                }
                if (ext === ".js") {
                    // Dynamic import of ESM module
                    const loadedModule = await import(pathToFileURL(configPath).href);
                    return loadedModule.default;
                }
                if (ext === ".cjs") {
                    // CommonJS file - use interop via createRequire
                    // Node.js provides createRequire to load CJS from ESM context
                    // Extract default export if present, otherwise use module.exports directly
                    const require = nodeModule.createRequire(import.meta.url);
                    const loadedConfig = require(configPath);
                    return loadedConfig.default || loadedConfig;
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                throw new Error(`Failed to parse config file ${configPath}: ${message}`);
            }
        }
    }

    // No config file found
    return undefined;
}
