import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const projectRoot = resolve(__dirname, "..", "..");

/**
 * Find all .test.js files in a directory tree, skipping hidden and dependency directories.
 * @param {string} dir - Directory to search
 * @param {string[]} files - Accumulator
 * @returns {string[]} Test file paths
 */
export function findTestFiles(dir, files = []) {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        if (entry.name.startsWith(".") || entry.name === "node_modules") continue;

        const fullPath = resolve(dir, entry.name);
        if (entry.isDirectory()) findTestFiles(fullPath, files);
        else if (entry.name.endsWith(".test.js")) files.push(fullPath);
    }

    return files;
}

/**
 * Expand directories and source paths to their test files, preserving input order.
 * @param {string[]} args - File or directory paths
 * @returns {string[]} Test file paths
 */
export function expandArgsToTestFiles(args) {
    const files = [];

    for (const arg of args) {
        const fullPath = resolve(arg);
        if (existsSync(fullPath) && statSync(fullPath).isDirectory()) {
            findTestFiles(fullPath, files);
            continue;
        }

        if (fullPath.endsWith(".js") && !fullPath.endsWith(".test.js")) {
            const testFile = fullPath.replace(/\.js$/, ".test.js");
            files.push(existsSync(testFile) ? testFile : fullPath);
        } else {
            files.push(fullPath);
        }
    }

    return [...new Set(files)];
}

/**
 * Format the shared test summary used by the custom reporters.
 * @param {{ totalTests: number, passedTests: number, failedTests: number, skippedTests: number }} summary
 * @param {number} startTime - Timestamp when test events began
 * @param {boolean} blankLineAfterSummary - Whether to end the summary with a blank line
 */
export async function* formatTestSummary(summary, startTime, blankLineAfterSummary = false) {
    yield "\n";
    yield `${"━".repeat(60)}\n`;
    yield "Test Summary\n";
    yield `${"━".repeat(60)}\n`;
    yield `Total:   ${summary.totalTests}\n`;
    yield `Passed:  ${summary.passedTests}\n`;
    yield `Failed:  ${summary.failedTests}\n`;
    yield `Skipped: ${summary.skippedTests}\n`;
    yield `Duration: ${Date.now() - startTime}ms\n`;
    yield `${"━".repeat(60)}\n`;

    if (summary.failedTests > 0) {
        yield `\n❌ ${summary.failedTests} test(s) failed\n`;
    } else if (summary.totalTests > 0) {
        yield `\n✅ All ${summary.passedTests} test(s) passed\n`;
    }
    if (blankLineAfterSummary) yield "\n";
}

/**
 * Resolve a child process to its exit code and report spawn errors consistently.
 * @param {import("node:child_process").ChildProcess} child
 * @returns {Promise<number>}
 */
export function waitForChild(child) {
    return new Promise((resolve) => {
        child.on("close", (code) => resolve(code ?? 1));
        child.on("error", (err) => {
            console.error(`Error: ${err.message}`);
            resolve(1);
        });
    });
}
