import { loadConfigFile } from "./loaders.js";

/**
 * Find config file path in cwd.
 *
 * Searches for sxo.config.mjs, sxo.config.js, sxo.config.cjs,
 * or sxo.config.json. Returns first match or null if none found.
 *
 * @param {string} cwd - Current working directory
 * @returns {Promise<string | null>} Config file path or null
 */
export async function findConfigFilePath(cwd) {
    for (const ext of [".mjs", ".js", ".cjs", ".json"]) {
        const cp = `${cwd}/sxo.config${ext}`;
        const fs = await import("node:fs");
        if (fs.existsSync(cp)) {
            return cp;
        }
    }
    return null;
}

/**
 * Load config file if present.
 *
 * Loads sxo.config file using loaders.js module.
 *
 * @param {string} cwd - Current working directory
 * @returns {Promise<object>} Loaded config object or empty object
 */
export async function loadFileConfig(cwd) {
    return (await loadConfigFile(cwd)) || {};
}
