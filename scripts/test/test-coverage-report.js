/**
 * @fileoverview Custom test reporter that shows only ℹ lines (test statistics and coverage)
 *
 * Usage:
 *   node --test --test-reporter=./scripts/test-report.js src/api/logger.test.js
 *   node --test --experimental-test-coverage --test-reporter=./scripts/test-report.js src/api/logger.test.js
 *
 * This reporter passes through only diagnostic messages (lines starting with ℹ),
 * suppressing all other test output (✔, ✖, etc.)
 */

import { handleTestFail } from "./test-fail.js";

/**
 * Parse TEST_FILTERS environment variable with resilience to malformed input.
 * @returns {string[]} Array of filter strings, or empty array if invalid/missing
 */
function parseTestFilters() {
    const raw = process.env.TEST_FILTERS;
    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw);
        // Validate that it's an array of strings
        if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
            return parsed;
        }
        // Emit diagnostic when filters are ignored due to invalid format
        // eslint-disable-next-line no-console
        console.log("ℹ TEST_FILTERS ignored: expected array of strings");
    } catch {
        // Emit diagnostic when filters are ignored due to parse error
        // eslint-disable-next-line no-console
        console.log("ℹ TEST_FILTERS ignored: invalid JSON");
    }

    return [];
}

/**
 * Compute uncovered line ranges from line execution data
 * @param {Array<{line: number, count: number}>} lines - Line execution data
 * @returns {string} Formatted uncovered line ranges (e.g., "10-15 20-25")
 */
function computeUncoveredLines(lines) {
    const uncoveredLines = lines.filter((l) => l.count === 0).map((l) => l.line);

    if (uncoveredLines.length === 0) return "";

    // Group consecutive lines into ranges
    const ranges = [];
    let start = uncoveredLines[0];
    let end = uncoveredLines[0];

    for (let i = 1; i < uncoveredLines.length; i++) {
        if (uncoveredLines[i] === end + 1) {
            end = uncoveredLines[i];
        } else {
            ranges.push(start === end ? `${start}` : `${start}-${end}`);
            start = uncoveredLines[i];
            end = uncoveredLines[i];
        }
    }

    ranges.push(start === end ? `${start}` : `${start}-${end}`);
    return ranges.join(" ");
}

/**
 * Format coverage data as native table with ℹ prefix
 * @param {Object} coverageData - Coverage data from test:coverage event
 * @returns {string}
 */
function formatCoverageTable(coverageData) {
    const output = [];
    const { summary } = coverageData;
    const files = summary.files || [];

    output.push("ℹ start of coverage report");
    output.push(
        "ℹ ------------------------------------------------------------------------------------------------------------------------------------------",
    );
    output.push("ℹ file                                | line %  | branch % | funcs % | uncovered lines");
    output.push(
        "ℹ ------------------------------------------------------------------------------------------------------------------------------------------",
    );

    // Extract base path (working directory)
    const workingDir = summary.workingDirectory || "";

    // Parse filters
    const testFilters = parseTestFilters();

    // Group files by directory structure
    const fileTree = new Map();

    for (const file of files) {
        // Remove working directory prefix
        let relativePath = file.path;
        if (workingDir && file.path.startsWith(workingDir)) {
            relativePath = file.path.slice(workingDir.length + 1);
        }

        // Filter to only src/js files
        if (!relativePath.startsWith("src/js")) continue;

        // Apply user filters
        if (testFilters.length > 0) {
            const matched = testFilters.some((f) => relativePath.startsWith(f));
            if (!matched) continue;
        }

        const parts = relativePath.split("/");
        let currentPath = "";

        // Add directory entries
        for (let i = 0; i < parts.length - 1; i++) {
            const parent = currentPath;
            currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];

            if (!fileTree.has(currentPath)) {
                fileTree.set(currentPath, {
                    isDir: true,
                    name: parts[i],
                    path: currentPath,
                    parent,
                    indent: i,
                });
            }
        }

        // Add file entry
        fileTree.set(relativePath, {
            isDir: false,
            name: parts[parts.length - 1],
            path: relativePath,
            parent: currentPath,
            indent: parts.length - 1,
            data: file,
        });
    }

    // Sort entries by path
    const sortedEntries = Array.from(fileTree.values()).sort((a, b) => a.path.localeCompare(b.path));

    // Format and output
    for (const entry of sortedEntries) {
        const indent = "  ".repeat(entry.indent);

        if (entry.isDir) {
            output.push(`ℹ ${indent}${entry.name}`);
        } else {
            const fileData = entry.data;
            const fileCol = `${indent}${entry.name}`.padEnd(38);
            const lineCol = fileData.coveredLinePercent.toFixed(2).padStart(6);
            const branchCol = fileData.coveredBranchPercent.toFixed(2).padStart(8);
            const funcCol = fileData.coveredFunctionPercent.toFixed(2).padStart(7);

            const uncoveredStr = computeUncoveredLines(fileData.lines || []);

            output.push(`ℹ ${fileCol} | ${lineCol} | ${branchCol} | ${funcCol} | ${uncoveredStr}`);
        }
    }

    output.push(
        "ℹ ------------------------------------------------------------------------------------------------------------------------------------------",
    );

    const totals = summary.totals;
    const totalLine = totals.coveredLinePercent.toFixed(2).padStart(6);
    const totalBranch = totals.coveredBranchPercent.toFixed(2).padStart(8);
    const totalFunc = totals.coveredFunctionPercent.toFixed(2).padStart(7);

    output.push(`ℹ all files${" ".repeat(27)} | ${totalLine} | ${totalBranch} | ${totalFunc} |`);
    output.push(
        "ℹ ------------------------------------------------------------------------------------------------------------------------------------------",
    );
    output.push("ℹ end of coverage report");

    return output.join("\n");
}

/**
 * Custom reporter generator function
 * @param {AsyncIterable<Object>} source - Test event stream
 */
export default async function* customReporter(source) {
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let skippedTests = 0;
    const startTime = Date.now();

    for await (const event of source) {
        switch (event.type) {
            case "test:diagnostic": {
                if (event.data.message) {
                    const msg = event.data.message;
                    const isRedundantStat = ["tests ", "suites ", "pass ", "fail ", "cancelled ", "skipped ", "todo ", "duration_ms"].some(
                        (prefix) => msg.startsWith(prefix),
                    );

                    if (!isRedundantStat) {
                        yield `ℹ ${msg}\n`;
                    }
                }
                break;
            }

            case "test:coverage": {
                // Output test summary first
                yield "\n";
                yield `${"━".repeat(60)}\n`;
                yield "Test Summary\n";
                yield `${"━".repeat(60)}\n`;
                yield `Total:   ${totalTests}\n`;
                yield `Passed:  ${passedTests}\n`;
                yield `Failed:  ${failedTests}\n`;
                yield `Skipped: ${skippedTests}\n`;
                const duration = Date.now() - startTime;
                yield `Duration: ${duration}ms\n`;
                yield `${"━".repeat(60)}\n`;

                if (failedTests > 0) {
                    yield `\n❌ ${failedTests} test(s) failed\n`;
                } else if (totalTests > 0) {
                    yield `\n✅ All ${passedTests} test(s) passed\n`;
                }
                yield "\n";

                // Format and output coverage table
                yield `${formatCoverageTable(event.data)}\n`;
                break;
            }

            case "test:fail": {
                const counters = { totalTests, failedTests };
                for await (const output of handleTestFail(event, counters)) {
                    yield output;
                }
                totalTests = counters.totalTests;
                failedTests = counters.failedTests;
                break;
            }

            case "test:pass":
                totalTests++;
                passedTests++;
                break;

            case "test:skip":
                totalTests++;
                skippedTests++;
                break;

            case "test:stderr":
            case "test:stdout":
                // Suppress other output
                break;

            default:
                // Ignore other events
                break;
        }
    }
}
