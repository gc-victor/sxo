/**
 * @fileoverview SXO CLI add command implementation.
 *
 * Provides functionality to fetch and install components from the basecoat library.
 *
 * @module cli/commands/add
 */

import fsp from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { resolveConfig } from "../../config.js";
import { ensureDir, prepareFlags } from "../cli-helpers.js";
import { log } from "../ui.js";

/**
 * Fetches a component from GitHub or local fallback and installs it to the components directory.
 *
 * Attempts to fetch component files (.jsx, .client.js, .css, .script.js) from GitHub raw URLs first,
 * falling back to local components/src/components if GitHub is unavailable.
 *
 * @function addComponent
 * @param {string} component - Component name (e.g., 'button')
 * @param {string} componentsDir - Absolute path to components directory
 * @returns {Promise<boolean>} True if at least one file was installed, false otherwise
 * @throws {Error} If file operations fail
 */
export async function addComponent(component, componentsDir) {
    const baseUrl = "https://raw.githubusercontent.com/gc-victor/sxo/main/components/src/components/";
    const baseDir = path.join(process.cwd(), "components/src/components"); // fallback
    const extensions = [".jsx", ".client.js", ".css"];
    let installed = false;

    for (const ext of extensions) {
        let content = null;
        let source = "";

        // Try GitHub first
        try {
            const response = await fetch(`${baseUrl}${component}${ext}`);
            if (response.ok) {
                content = await response.text();
                source = "GitHub";
            }
        } catch (_e) {
            // Network error, try local fallback
        }

        // If not from GitHub, try local fallback
        if (!content) {
            try {
                const localPath = path.join(baseDir, `${component}${ext}`);
                await fsp.access(localPath);
                content = await fsp.readFile(localPath, "utf8");
                source = "local basecoat";
            } catch (_e) {
                // Not available locally either
                continue;
            }
        }

        // Write to destination
        const destPath = path.join(componentsDir, `${component}${ext}`);
        await fsp.writeFile(destPath, content, "utf8");
        log.info(`Installed ${component}${ext} from ${source} to ${path.relative(process.cwd(), destPath)}`);
        installed = true;
    }

    return installed;
}

/**
 * Main add command handler.
 *
 * Resolves the components directory path, ensures it exists, and installs the component.
 * Logs progress and errors to the console.
 *
 * @function handleAddCommand
 * @param {string} component - Component name to install
 * @param {object} flags - Command flags
 * @returns {Promise<void>}
 */
export async function handleAddCommand(component, flags) {
    try {
        const root = path.resolve(process.cwd());
        const { flagsForConfig, flagsExplicit } = prepareFlags("add", flags);
        const cfg = await resolveConfig({ cwd: root, flags: flagsForConfig, flagsExplicit, command: "add" });

        const destDir = path.resolve(root, cfg.componentsDir);
        await ensureDir(destDir);

        log.info(`Adding component '${component}' to ${cfg.componentsDir}`);

        const success = await addComponent(component, destDir);

        if (!success) {
            log.error(`Component '${component}' not found in basecoat.`);
            process.exitCode = 1;
            return;
        }

        log.info("Component added successfully.");
    } catch (e) {
        const msg = e && typeof e === "object" && "message" in e ? e.message : String(e);
        log.error(`add failed: ${msg}`);
        process.exitCode = 1;
    }
}
