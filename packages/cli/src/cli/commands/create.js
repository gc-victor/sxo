import path from "node:path";
import process from "node:process";
import readline from "node:readline";
import { askYesNo, ensureDir, pathExists } from "../cli-helpers.js";
import { log } from "../ui.js";
import { downloadTemplates } from "../utils/template-downloader.js";

/**
 * Runtime selection lookup table.
 *
 * Maps menu input values (including empty string for default) to runtime names.
 * Used by `selectRuntime()` to convert user input into runtime configuration.
 *
 * @type {Record<string, "node"|"bun"|"deno"|"workers">}
 */
const RUNTIME_LOOKUP = {
    "": "node",
    1: "node",
    2: "bun",
    3: "deno",
    4: "workers",
};

/**
 * Prompts user to select a runtime via interactive menu.
 * Non-TTY environments return "node" (default).
 *
 * @returns {Promise<"node"|"bun"|"deno"|"workers">}
 */
export async function selectRuntime() {
    if (!process.stdout.isTTY || process.env.NODE_ENV === "test") {
        return "node";
    }

    // Display menu

    log.newLine();
    log.text("Select a runtime:");
    log.text("  1) node (default)");
    log.text("  2) bun");
    log.text("  3) deno");
    log.text("  4) workers");

    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        const ask = () => {
            rl.question("\nPick a runtime (1-4): ", (answer) => {
                const input = answer.trim();
                const runtime = RUNTIME_LOOKUP[input];

                if (runtime) {
                    rl.close();
                    resolve(runtime);
                } else {
                    log.info("Invalid selection. Please choose 1-4 or press Enter for default (node).");
                    process.stdout.write("> ");
                    ask(); // Re-prompt
                }
            });
        };

        ask();
    });
}

/**
 * Checks if a directory exists and prompts user for overwrite decision.
 *
 * If directory already exists, prompts the user to confirm overwriting.
 * Uses the directory's basename in the prompt message.
 *
 * @function checkDirectoryExists
 * @param {string} projectPath - Absolute path to project directory
 * @returns {Promise<{exists: boolean, shouldProceed: boolean}>} Decision object
 *
 * @example
 * // Non-existent directory: returns immediately
 * await checkDirectoryExists('/tmp/new-app')
 * // => { exists: false, shouldProceed: true }
 *
 * // Existing directory with TTY: prompts user
 * await checkDirectoryExists('/tmp/existing')
 * // => prompts: "Create SXO template in 'existing'? (This will overwrite existing files.) (y/N)"
 * // => { exists: true, shouldProceed: true } if user answers "yes"
 */
export async function checkDirectoryExists(projectPath) {
    const exists = await pathExists(projectPath);

    if (!exists) {
        return { exists: false, shouldProceed: true };
    }

    const dirName = path.basename(projectPath);
    const message = `Create SXO template in "${dirName}"? (This will overwrite existing files.)`;
    const shouldOverwrite = await askYesNo(message);

    return { exists: true, shouldProceed: shouldOverwrite };
}

/**
 * Main create command handler.
 *
 * Orchestrates the project creation workflow:
 * 1. Check directory existence
 * 2. Select runtime (interactive or default)
 * 3. Download and write all templates
 *
 * When `projectName` is ".", creates a project in the current directory
 * (effectively using the current directory name as the project name).
 *
 * @function handleCreateCommand
 * @param {string} projectName - Name of the project to create (or "." for current directory)
 * @returns {Promise<void>}
 */
export async function handleCreateCommand(projectName) {
    try {
        const root = path.resolve(process.cwd());
        const effectiveProjectName = !projectName || projectName === "." ? path.basename(root) : projectName;

        const projectPath = projectName === "." ? root : path.join(root, effectiveProjectName);
        const { exists, shouldProceed } = await checkDirectoryExists(projectPath);

        if (exists && !shouldProceed) {
            log.info("Project creation cancelled");
            process.exitCode = 1;
            return;
        }

        const runtime = await selectRuntime();
        log.info(`Creating ${runtime} project...`);

        try {
            await ensureDir(projectPath);

            // Download templates using extracted downloader module
            await downloadTemplates(runtime, effectiveProjectName, projectPath);

            log.success("Project created!");
            log.newLine();
            log.text("Next steps:");
            if (projectName !== ".") {
                log.text(`  - cd ${effectiveProjectName}`);
            }
            if (runtime === "bun") {
                log.text("  - bun install");
                log.text("  - bun run dev");
            } else {
                log.text("  - pnpm install");
                log.text("  - pnpm run dev");
            }
        } catch (error) {
            log.error(`Failed to create project: ${error instanceof Error ? error.message : String(error)}`);
            process.exitCode = 1;
            return;
        }
    } catch (e) {
        const msg = e && typeof e === "object" && "message" in e ? e.message : String(e);
        log.error(`create failed: ${msg}`);
        process.exitCode = 1;
    }
}
