// AIDEV-NOTE: Utility helpers extracted from sxo.js for reuse and testability.

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import readline from "node:readline";

import { ROUTES_FILE } from "../constants.js";
import { log } from "./ui.js";

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
 * Normalize a path to POSIX separators (useful for logs and route keys).
 * @param {string} p
 * @returns {string}
 */
export function toPosixPath(p) {
    return String(p).replace(/\\/g, "/");
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
 * @param {import('cac').CACCommand} cmd
 * @returns {import('cac').CACCommand}
 */
export function registerCommonOptions(cmd) {
    return cmd
        .option("--config <file>", "Path to sxo.config.(mjs|js|cjs|json)")
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
 * Restore empty string for a dashed flag when the parser coerced it to 0.
 * Handles both assignment (--flag=) and separated value (--flag "") forms.
 * @param {Record<string,any>} flagsForConfig
 * @param {Record<string,boolean>} flagsExplicit
 * @param {string[]} argv
 * @param {string} flagName dashed flag name (without leading --)
 */
function restoreEmptyStringFlag(flagsForConfig, flagsExplicit, argv, flagName) {
    const camelName = dashToCamel(flagName);
    if (flagsForConfig[camelName] === 0 && flagsExplicit[camelName]) {
        const dashedName = `--${flagName}`;
        const index = argv.findIndex((a) => a === dashedName || a.startsWith(`${dashedName}=`));
        if (index !== -1) {
            const arg = argv[index];
            const nextArg = argv[index + 1];
            let isEmptyValue = false;
            if (arg.includes("=")) {
                const val = arg.split("=", 2)[1] ?? "";
                const trimmed = val.trim();
                // Treat assignment with empty value or quoted empty value as empty
                if (trimmed === "" || trimmed === '""' || trimmed === "''") {
                    isEmptyValue = true;
                }
            } else {
                if (nextArg === "") {
                    isEmptyValue = true;
                }
            }
            if (isEmptyValue) {
                flagsForConfig[camelName] = "";
            }
        }
    }
}

/**
 * Centralized explicit flag filtering.
 * Returns { flagsForConfig, flagsExplicit } where:
 *  - flagsExplicit: { normalizedKey: boolean }
 *  - flagsForConfig: copy of rawFlags with non-explicit keys removed
 * @param {"dev"|"build"|"start"|"clean"} command
 * @param {Record<string,any>} rawFlags
 */
export function prepareFlags(command, rawFlags) {
    const argv = process.argv.slice(2);
    /** @type {Record<string,string[]>} */
    const commandFlagMap = {
        dev: ["open", "minify", "sourcemap", "verbose", "color", "port", "pages-dir", "out-dir", "public-path", "client-dir"],
        build: ["open", "minify", "sourcemap", "verbose", "color", "port", "pages-dir", "out-dir", "public-path", "client-dir"],
        start: ["open", "verbose", "color", "port", "pages-dir", "out-dir", "public-path", "client-dir"],
        clean: ["verbose", "color", "port", "pages-dir", "out-dir"],
    };
    const relevant = commandFlagMap[command] || [];
    const flagsExplicit = {};
    for (const dashed of relevant) {
        const camel = dashToCamel(dashed);
        flagsExplicit[camel] = wasFlagExplicit(argv, dashed);
    }
    const flagsForConfig = { ...rawFlags };

    // AIDEV-NOTE: Normalize empty string flags (cac may coerce "" to 0); currently used for --public-path
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
        rl.question(`${question} ${"(y/N)"} `, (answer) => {
            rl.close();
            const s = String(answer || "")
                .trim()
                .toLowerCase();
            resolve(s === "y" || s === "yes");
        });
    });
}

/**
 * Check that the build produced the expected routes manifest.
 * @returns {Promise<boolean>}
 */
export async function ensureBuiltRoutesJson() {
    return await pathExists(ROUTES_FILE);
}

/**
 * Validate that the pages directory and its index.html exist; exit(1) with helpful
 * messages if not. Mirrors behavior in original CLI.
 * @param {string} pagesDir
 */
export async function validatePagesFolder(pagesDir) {
    const pagesDirExists = (await pathExists(pagesDir)) && (await fsp.stat(pagesDir)).isDirectory();
    if (!pagesDirExists) {
        log.error("Prebuild failed:");
        log.error(`Pages directory does not exist: ${toPosixPath(pagesDir)} (default)`);
        log.info("Hint: create the folder or use --pages-dir or set PAGES_DIR.");
        process.exit(1);
        return;
    }

    const indexHtmlPath = path.join(pagesDir, "index.html");
    const indexHtmlExists = (await pathExists(indexHtmlPath)) && (await fsp.stat(indexHtmlPath)).isFile();
    if (!indexHtmlExists) {
        log.error(`Missing index.html in pages directory: ${toPosixPath(indexHtmlPath)} (default)`);
        log.info("Hint: Add index.html to your pages directory.");
        process.exit(1);
        return;
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
        const txt = await fsp.readFile(ROUTES_FILE, "utf8");
        const arr = JSON.parse(txt);
        summary.routes = Array.isArray(arr) ? arr.length : 0;
    } catch {
        // ignore JSON parse / fs errors; treat as zero
    }

    const label = (s) => String(s);
    const val = (s) => String(s);
    const infoLines = [
        [label("Output"), val(toPosixPath(path.relative(process.cwd(), outDir)))],
        [label("Pages"), val(toPosixPath(pagesDir))],
        [label("Routes"), val(summary.routes)],
    ].map(([l, v]) => `  - ${l}: ${v}`);

    process.stdout.write(`${infoLines.join("\n")}\n`);
}
