#!/usr/bin/env node

/**
 * @fileoverview Test benchmark reporter for identifying slow tests
 *
 * Usage:
 *   node scripts/test/test-benchmark.js [paths...]           # Show slowest 10 tests
 *   node scripts/test/test-benchmark.js --top=20 [paths...]  # Show slowest 20 tests
 *   node scripts/test/test-benchmark.js --threshold=100 [paths...]  # Show tests slower than 100ms
 *   node scripts/test/test-benchmark.js --top=20 --threshold=50 [paths...]  # Combined
 *
 * This script:
 * - Runs tests and tracks duration for each test
 * - Prints the slowest N tests (default: 10)
 * - Can filter by minimum threshold (e.g., only show tests > 100ms)
 * - Shows file path, test name, and duration in milliseconds
 */

import { spawn } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..", "..");

// Set test environment
process.env.NODE_ENV = "test";

/**
 * Find all .test.js files in src/
 * @param {string} dir - Directory to search
 * @param {string[]} files - Accumulator
 * @returns {string[]} Test file paths
 */
function findTestFiles(dir, files = []) {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        if (entry.name.startsWith(".") || entry.name === "node_modules") continue;

        const fullPath = resolve(dir, entry.name);

        if (entry.isDirectory()) {
            findTestFiles(fullPath, files);
        } else if (entry.name.endsWith(".test.js")) {
            files.push(fullPath);
        }
    }

    return files;
}

/**
 * Expand directories in arguments to test files.
 * Automaps source files (.js) to test files (.test.js) if they exist.
 * @param {string[]} args - File or directory paths
 * @returns {string[]} List of test files
 */
function expandArgsToTestFiles(args) {
    const files = [];

    for (const arg of args) {
        const fullPath = resolve(arg);
        const isDir = existsSync(fullPath) && statSync(fullPath).isDirectory();

        if (isDir) {
            findTestFiles(fullPath, files);
            continue;
        }

        // For .js files, prefer the corresponding .test.js if it exists
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
 * Parse CLI arguments
 * @param {string[]} args
 * @returns {{ top: number, threshold: number | null, paths: string[] }}
 */
function parseArgs(args) {
    let top = 10;
    let threshold = null;
    const paths = [];

    for (const arg of args) {
        if (arg.startsWith("--top=")) {
            top = Number.parseInt(arg.slice(6), 10);
            if (Number.isNaN(top) || top < 1) {
                console.error("Error: --top must be a positive integer");
                process.exit(1);
            }
        } else if (arg.startsWith("--threshold=")) {
            threshold = Number.parseInt(arg.slice(12), 10);
            if (Number.isNaN(threshold) || threshold < 0) {
                console.error("Error: --threshold must be a non-negative integer");
                process.exit(1);
            }
        } else if (!arg.startsWith("--")) {
            paths.push(arg);
        }
    }

    return { top, threshold, paths };
}

/**
 * Benchmark reporter generator function
 * @param {AsyncIterable<Object>} source - Test event stream
 */
async function* benchmarkReporter(source) {
    // Read options from environment variables
    const top = process.env.BENCH_TOP ? Number.parseInt(process.env.BENCH_TOP, 10) : 10;
    const threshold = process.env.BENCH_THRESHOLD ? Number.parseInt(process.env.BENCH_THRESHOLD, 10) : null;

    const testDurations = [];
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let skippedTests = 0;
    const startTime = Date.now();

    for await (const event of source) {
        switch (event.type) {
            case "test:pass": {
                totalTests++;
                passedTests++;
                const duration = event.data.details?.duration_ms ?? 0;
                testDurations.push({
                    name: event.data.name,
                    file: event.data.file ?? "<unknown>",
                    duration,
                });
                break;
            }

            case "test:skip":
                totalTests++;
                skippedTests++;
                break;

            case "test:fail": {
                totalTests++;
                failedTests++;
                const duration = event.data.details?.duration_ms ?? 0;
                testDurations.push({
                    name: event.data.name,
                    file: event.data.file ?? "<unknown>",
                    duration,
                    failed: true,
                });
                break;
            }

            default:
                // Suppress all other events
                break;
        }
    }

    const totalDuration = Date.now() - startTime;

    // Filter by threshold if specified
    let filtered = testDurations;
    if (threshold !== null) {
        filtered = testDurations.filter((t) => t.duration >= threshold);
    }

    // Sort by duration (slowest first) and take top N
    const slowest = filtered.sort((a, b) => b.duration - a.duration).slice(0, top);

    yield "\n";
    yield `${"━".repeat(80)}\n`;
    yield "Test Benchmark Report\n";
    yield `${"━".repeat(80)}\n`;
    yield `Total Tests: ${totalTests} (Passed: ${passedTests}, Failed: ${failedTests}, Skipped: ${skippedTests})\n`;
    yield `Total Duration: ${totalDuration}ms\n`;

    if (threshold !== null) {
        yield `Threshold: ${threshold}ms (showing ${filtered.length}/${testDurations.length} tests)\n`;
    }

    yield `Showing top ${slowest.length} slowest tests:\n`;
    yield `${"━".repeat(80)}\n`;

    if (slowest.length === 0) {
        yield "No tests matched the criteria.\n";
    } else {
        // Calculate column widths
        const maxDuration = Math.max(...slowest.map((t) => t.duration));
        const durationWidth = Math.max(maxDuration.toString().length, 4);

        for (const test of slowest) {
            const relativePath = relative(projectRoot, test.file);
            const durationStr = `${test.duration.toFixed(2).padStart(durationWidth + 3)}ms`;
            const failedMarker = test.failed ? " ❌" : "";
            yield `${durationStr} | ${relativePath}\n`;
            yield `${"".padStart(durationWidth + 7)}${test.name}${failedMarker}\n`;
            yield "\n";
        }
    }

    yield `${"━".repeat(80)}\n`;

    if (failedTests > 0) {
        yield `\n❌ ${failedTests} test(s) failed\n`;
    } else if (totalTests > 0) {
        yield `\n✅ All ${passedTests} test(s) passed\n`;
    }
}

/**
 * Export reporter function for use with --test-reporter
 */
export default benchmarkReporter;

/**
 * Run benchmark tests when executed directly
 */
async function main() {
    const srcDir = resolve(projectRoot, "src", "js");
    const { top, threshold, paths } = parseArgs(process.argv.slice(2));

    // Set options as environment variables for the reporter
    process.env.BENCH_TOP = top.toString();
    if (threshold !== null) {
        process.env.BENCH_THRESHOLD = threshold.toString();
    }

    // Resolve test files
    const testFiles = paths.length === 0 ? findTestFiles(srcDir) : expandArgsToTestFiles(paths);

    if (testFiles.length === 0) {
        console.error("Error: No test files found");
        process.exit(1);
    }

    // Build Node.js arguments
    const nodeArgs = ["--test", `--test-reporter=${fileURLToPath(import.meta.url)}`, ...testFiles];

    // Run tests
    const child = spawn("node", nodeArgs, {
        cwd: projectRoot,
        env: { ...process.env },
        stdio: "inherit",
    });

    const exitCode = await new Promise((resolve) => {
        child.on("close", (code) => resolve(code || 0));
        child.on("error", (err) => {
            console.error(`Error: ${err.message}`);
            resolve(1);
        });
    });

    process.exit(exitCode);
}

// Only run main if executed directly (check if this is the main module)
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
    main().catch((err) => {
        console.error("Fatal error:", err);
        process.exit(1);
    });
}
