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
import { formatTestSummary } from "./test-helpers.js";

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

function addCoverageFile(fileTree, relativePath, data) {
    const parts = relativePath.split("/");
    let currentPath = "";

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

    fileTree.set(relativePath, {
        isDir: false,
        name: parts[parts.length - 1],
        path: relativePath,
        parent: currentPath,
        indent: parts.length - 1,
        data,
    });
}

function buildCoverageEntries(files, workingDir, testFilters) {
    const fileTree = new Map();

    for (const file of files) {
        const relativePath = workingDir && file.path.startsWith(workingDir)
            ? file.path.slice(workingDir.length + 1)
            : file.path;
        if (!relativePath.startsWith("packages/")) continue;
        if (testFilters.length > 0 && !testFilters.some((filter) => relativePath.startsWith(filter))) continue;
        addCoverageFile(fileTree, relativePath, file);
    }

    return Array.from(fileTree.values()).sort((a, b) => a.path.localeCompare(b.path));
}

function formatCoverageEntry(entry) {
    const indent = "  ".repeat(entry.indent);
    if (entry.isDir) return `ℹ ${indent}${entry.name}`;

    const fileData = entry.data;
    const fileCol = `${indent}${entry.name}`.padEnd(38);
    const lineCol = fileData.coveredLinePercent.toFixed(2).padStart(6);
    const branchCol = fileData.coveredBranchPercent.toFixed(2).padStart(8);
    const funcCol = fileData.coveredFunctionPercent.toFixed(2).padStart(7);
    const uncoveredStr = computeUncoveredLines(fileData.lines || []);
    return `ℹ ${fileCol} | ${lineCol} | ${branchCol} | ${funcCol} | ${uncoveredStr}`;
}

/**
 * Format coverage data as native table with ℹ prefix
 * @param {Object} coverageData - Coverage data from test:coverage event
 * @returns {string}
 */
function formatCoverageTable(coverageData) {
    const { summary } = coverageData;
    const output = [
        "ℹ start of coverage report",
        "ℹ ------------------------------------------------------------------------------------------------------------------------------------------",
        "ℹ file                                | line %  | branch % | funcs % | uncovered lines",
        "ℹ ------------------------------------------------------------------------------------------------------------------------------------------",
    ];
    const files = summary.files || [];
    const entries = buildCoverageEntries(
        files,
        summary.workingDirectory || "",
        parseTestFilters(),
    );

    for (const entry of entries) output.push(formatCoverageEntry(entry));

    output.push("ℹ ------------------------------------------------------------------------------------------------------------------------------------------");
    const totals = summary.totals;
    const totalLine = totals.coveredLinePercent.toFixed(2).padStart(6);
    const totalBranch = totals.coveredBranchPercent.toFixed(2).padStart(8);
    const totalFunc = totals.coveredFunctionPercent.toFixed(2).padStart(7);
    output.push(`ℹ all files${" ".repeat(27)} | ${totalLine} | ${totalBranch} | ${totalFunc} |`);
    output.push("ℹ ------------------------------------------------------------------------------------------------------------------------------------------");
    output.push("ℹ end of coverage report");
    return output.join("\n");
}

const redundantStatPrefixes = [
    "tests ",
    "suites ",
    "pass ",
    "fail ",
    "cancelled ",
    "skipped ",
    "todo ",
    "duration_ms",
];

function* formatDiagnostic(message) {
    if (!message) return;
    const isRedundantStat = redundantStatPrefixes.some((prefix) => message.startsWith(prefix));
    if (!isRedundantStat) yield `ℹ ${message}\n`;
}

async function* formatFailureEvent(event, summary) {
    const counters = { totalTests: summary.totalTests, failedTests: summary.failedTests };
    yield* handleTestFail(event, counters);
    summary.totalTests = counters.totalTests;
    summary.failedTests = counters.failedTests;
}

/**
 * Custom reporter generator function
 * @param {AsyncIterable<Object>} source - Test event stream
 */
export default async function* customReporter(source) {
    const summary = { totalTests: 0, passedTests: 0, failedTests: 0, skippedTests: 0 };
    const startTime = Date.now();

    for await (const event of source) {
        switch (event.type) {
            case "test:diagnostic":
                yield* formatDiagnostic(event.data.message);
                break;
            case "test:coverage":
                yield* formatTestSummary(summary, startTime, true);
                yield `${formatCoverageTable(event.data)}\n`;
                break;
            case "test:fail":
                yield* formatFailureEvent(event, summary);
                break;
            case "test:pass":
                summary.totalTests++;
                summary.passedTests++;
                break;
            case "test:skip":
                summary.totalTests++;
                summary.skippedTests++;
                break;
            case "test:stderr":
            case "test:stdout":
            default:
                break;
        }
    }
}
