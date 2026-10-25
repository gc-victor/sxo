#!/usr/bin/env node

/**
 * @fileoverview Test runner for the goallet project
 *
 * Usage:
 *   node scripts/test.js [paths...]             # Run tests (all or specific files/dirs)
 *   node scripts/test.js coverage [paths...]    # Run with coverage
 *   node scripts/test.js lcov [paths...]        # Run with LCOV format coverage
 */

import { spawn } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import { expandArgsToTestFiles, findTestFiles, projectRoot, waitForChild } from "./test-helpers.js";

// Set test environment
process.env.NODE_ENV = "test";

/**
 * Run command and return exit code
 */
function runCommand(command, args) {
    const child = spawn(command, args, {
        cwd: projectRoot,
        stdio: "inherit",
        env: process.env,
    });
    return waitForChild(child);
}

/**
 * Validate user-supplied test paths for security.
 * Ensures paths are safe and within expected boundaries.
 * @param {string[]} args - User-supplied paths
 * @returns {{ ok: true, normalized: string[] } | { ok: false, reason: string }}
 */
export function validateUserPaths(args) {
    for (const arg of args) {
        // Reject non-string inputs
        if (typeof arg !== "string") {
            return { ok: false, reason: `Invalid path: expected string, got ${typeof arg}` };
        }

        // Reject null bytes (null byte injection attack)
        if (arg.includes("\0")) {
            return { ok: false, reason: "Invalid path: contains null byte" };
        }

        // Reject absolute paths (should be relative to project root)
        if (arg.startsWith("/")) {
            return { ok: false, reason: "Invalid path: must be relative, not absolute" };
        }

        // Resolve the path and check it stays within project root
        const resolved = resolve(projectRoot, arg);
        const relativeToRoot = relative(projectRoot, resolved);

        // Check if resolved path escapes the project root
        // relative() returns ".." segments if path escapes root
        if (relativeToRoot.startsWith("..")) {
            return { ok: false, reason: "Invalid path: resolves outside project root" };
        }
    }

    // Normalize paths by resolving them (removes ./, //, etc.)
    const normalized = args.map((arg) => relative(projectRoot, resolve(projectRoot, arg)));

    return { ok: true, normalized };
}

/**
 * Parse CLI arguments into mode and paths.
 * @param {string[]} args
 * @returns {{ mode: "lcov" | "coverage" | "test", paths: string[] }}
 */
function parseArgs(args) {
    const [first, ...rest] = args;
    if (first === "lcov") return { mode: "lcov", paths: rest };
    if (first === "coverage") return { mode: "coverage", paths: rest };
    return { mode: "test", paths: args };
}

/**
 * Build coverage include flags for Node test runner.
 * @param {string[]} filters
 * @returns {string[]}
 */
function buildCoverageIncludes(filters) {
    return filters.map((filter) => {
        const fullPath = resolve(projectRoot, filter);
        const isDir = existsSync(fullPath) && statSync(fullPath).isDirectory();
        const pattern = isDir ? `${filter}/**` : filter;
        return `--test-coverage-include=${pattern}`;
    });
}

/** @type {Record<string, string>} */
const REPORTERS = {
    lcov: "lcov",
    coverage: "./scripts/test/test-coverage-report.js",
    test: "./scripts/test/test-silent-report.js",
};

async function main() {
    const testDirs = [
        resolve(projectRoot, "packages", "cli", "src"),
        resolve(projectRoot, "packages", "server", "src"),
        resolve(projectRoot, "packages", "client", "src"),
        resolve(projectRoot, "scripts", "test"),
    ];
    const { mode, paths } = parseArgs(process.argv.slice(2));

    // Validate paths before any processing
    const validation = validateUserPaths(paths);
    if (!validation.ok) {
        console.error(`Error: ${validation.reason}`);
        process.exit(1);
    }
    const validPaths = validation.normalized;

    // Convert paths to coverage filters (relative, pointing to source files)
    const filters = validPaths.map((p) => p.replace(/\.test\.js$/, ".js"));
    if (filters.length > 0) {
        process.env.TEST_FILTERS = JSON.stringify(filters);
    }

    // Resolve test files
    const testFiles = validPaths.length === 0
        ? testDirs.flatMap((dir) => findTestFiles(dir))
        : expandArgsToTestFiles(validPaths);
    if (testFiles.length === 0) {
        console.error("Error: No test files found");
        process.exit(1);
    }

    // Build Node.js arguments
    const nodeArgs = [
        "--test",
        ...(mode !== "test" ? ["--experimental-test-coverage", ...buildCoverageIncludes(filters)] : []),
        `--test-reporter=${REPORTERS[mode]}`,
        ...testFiles,
    ];

    process.exit(await runCommand("node", nodeArgs));
}

main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
