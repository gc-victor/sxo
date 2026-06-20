// Utility helpers extracted from sxo.js for reuse and testability.

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import readline from "node:readline";

import { convertToPosixSlashes } from "../shared/path-utils.js";

/**
 * Resolve an absolute path to a script relative to repo root.
 * @param {string} root
 * @param {string} rel
 * @returns {string}
 */
export function absoluteScript(root, rel) {
    return path.resolve(root, rel);
}

/**
 * Build a localhost HTTP URL for a given port.
 * @param {number|string} port
 * @returns {string}
 */
export function getUrl(port) {
    return `http://localhost:${port}/`;
}

/**
 * Ensure a directory exists (mkdir -p).
 * @param {string} dir
 */
export async function ensureDir(dir) {
    await fsp.mkdir(dir, { recursive: true });
}

/**
 * Test path existence.
 * @param {string} p
 * @returns {Promise<boolean>}
 */
export async function pathExists(p) {
    try {
        await fsp.access(p, fs.constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

/**
 * Register common CLI options shared by all subcommands.
 * (Mutates and returns the provided cac command.)
 * @param {import('cac').Command} cmd
 * @returns {import('cac').Command}
 */
export function registerCommonOptions(cmd) {
    return cmd
        .option("--port <number>", "Port")
        .option("--pages-dir <dir>", "Pages directory (default: src/pages)")
        .option("--out-dir <dir>", "Output directory (default: dist)")
        .option("--public-path <path>", "Public base URL for assets (default: /)")
        .option("--client-dir <name>", "Per-route client subdirectory (default: client)")
        .option("--open", "Open the browser")
        .option("--no-open", "Do not open the browser")
        .option("--verbose", "Verbose output")
        .option("--no-color", "Disable colors");
}

/**
 * Detect if a flag (or its negated form) was explicitly passed on the raw argv.
 * @param {string[]} argv
 * @param {string} name dashed flag name (without leading --)
 * @returns {boolean}
 */
export function wasFlagExplicit(argv, name) {
    const long = `--${name}`;
    const neg = `--no-${name}`;
    return argv.some((a) => a === long || a.startsWith(`${long}=`) || a === neg);
}

/**
 * Convert dashed CLI option names to camelCase.
 * @param {string} s
 * @returns {string}
 */
export function dashToCamel(s) {
    return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * Convert camelCase to dashed (inverse of dashToCamel) for deletion.
 * @param {string} s
 * @returns {string}
 */
export function camelToDash(s) {
    return s.replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`);
}

/**
 * Restore empty string flag value.
 *
 * Cac parser may coerce an empty string "" to 0.
 * This function checks if a flag was explicitly set and restores the empty string value.
 *
 * @param {Record<string,any>} flagsForConfig - Copy of raw flags from config
 * @param {Record<string,boolean>} flagsExplicit - Map of which flags are explicitly set
 * @param {string[]} argv - Command line arguments
 * @param {string} flagName - Dashed flag name (without leading --)
 */
function restoreEmptyStringFlag(flagsForConfig, flagsExplicit, argv, flagName) {
    const camelName = dashToCamel(flagName);
    if (flagsForConfig[camelName] !== 0 || !flagsExplicit[camelName]) {
        return;
    }

    const dashedName = `--${flagName}`;
    const index = argv.findIndex((a) => a === dashedName || a.startsWith(`${dashedName}=`));
    if (index === -1) {
        return;
    }

    const arg = argv[index];
    const nextArg = argv[index + 1];
    let isEmptyValue = false;

    if (arg.includes("=")) {
        const val = arg.split("=", 2)[1] ?? "";
        const trimmed = val.trim();
        isEmptyValue = trimmed === "" || trimmed === '""' || trimmed === "''";
    } else if (nextArg === "") {
        isEmptyValue = true;
    }

    if (isEmptyValue) {
        flagsForConfig[camelName] = "";
    }
}

/**
 * Centralized explicit flag filtering.
 * Returns { flagsForConfig, flagsExplicit } where:
 *  - flagsExplicit: { normalizedKey: boolean }
 *  - flagsForConfig: copy of rawFlags with non-explicit keys removed
 * @param {"dev"|"build"|"start"|"clean"|"add"|"generate"} command
 * @param {Record<string,any>} rawFlags
 */
export function prepareFlags(command, rawFlags) {
    const argv = process.argv.slice(2);
    /** @type {Record<string,string[]>} */
    const commandFlagMap = {
        dev: ["open", "verbose", "color", "port", "pages-dir", "out-dir", "public-path", "client-dir", "loaders"],
        build: ["open", "verbose", "color", "port", "pages-dir", "out-dir", "public-path", "client-dir", "loaders"],
        start: ["open", "verbose", "color", "port", "pages-dir", "out-dir", "public-path", "client-dir"],
        clean: ["verbose", "color", "port", "pages-dir", "out-dir"],
        add: ["verbose", "color", "components-dir"],
        generate: ["verbose", "color", "out-dir", "public-path", "client-dir"],
    };
    const relevant = commandFlagMap[command] || [];
    /** @type {Record<string, boolean>} */
    const flagsExplicit = {};
    for (const dashed of relevant) {
        const camel = dashToCamel(dashed);
        flagsExplicit[camel] = wasFlagExplicit(argv, dashed);
    }
    const flagsForConfig = { ...rawFlags };

    // Normalize empty string flags (cac may coerce "" to 0); currently used for --public-path
    restoreEmptyStringFlag(flagsForConfig, flagsExplicit, argv, "public-path");

    for (const [camel, explicit] of Object.entries(flagsExplicit)) {
        if (!explicit) {
            delete flagsForConfig[camel];
            delete flagsForConfig[camelToDash(camel)];
        }
    }
    return { flagsForConfig, flagsExplicit };
}

/**
 * Prompt for a yes/no answer (default: No).
 * Non-TTY environments always resolve false.
 * @param {string} question
 * @returns {Promise<boolean>}
 */
export async function askYesNo(question) {
    if (!process.stdout.isTTY) return false;
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(`${question} (y/N) `, (answer) => {
            rl.close();
            const s = String(answer || "")
                .trim()
                .toLowerCase();
            resolve(s === "y" || s === "yes");
        });
    });
}

/**
 * Validates that the pages directory exists and is a directory.
 * Throws an error if validation fails.
 *
 * @param {string} pagesDir - Absolute path to pages directory
 * @throws {Error} If pages directory doesn't exist or is not a directory
 * @returns {Promise<void>}
 */
export async function validatePagesFolder(pagesDir) {
    const exists = await pathExists(pagesDir);

    if (!exists) {
        throw new Error(
            `Pages directory does not exist: ${convertToPosixSlashes(pagesDir)} (default)\n` +
                `Hint: create folder or use --pages-dir or set PAGES_DIR.`,
        );
    }

    const stat = await fsp.stat(pagesDir);
    if (!stat.isDirectory()) {
        throw new Error(`Pages path is not a directory: ${convertToPosixSlashes(pagesDir)}`);
    }
}

/**
 * Print a concise build summary (output dir, pages dir, route count).
 * @param {string} outDir absolute path
 * @param {string} pagesDir original pages dir (may be relative)
 */
export async function printBuildSummary(outDir, pagesDir) {
    const summary = { routes: 0 };
    try {
        const routesFile = path.join(outDir, "server", "routes.json");
        const txt = await fsp.readFile(routesFile, "utf8");
        const arr = JSON.parse(txt);
        summary.routes = Array.isArray(arr) ? arr.length : 0;
    } catch {
        // ignore JSON parse / fs errors; treat as zero
    }

    const relativeOut = convertToPosixSlashes(path.relative(process.cwd(), outDir));
    const infoLines = [`  - Output: ${relativeOut}`, `  - Pages: ${convertToPosixSlashes(pagesDir)}`, `  - Routes: ${summary.routes}`];

    process.stdout.write(`${infoLines.join("\n")}\n`);
}
