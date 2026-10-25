/**
 * @fileoverview Silent test reporter that shows only errors and a minimal summary
 *
 * Usage:
 *   node --test --test-reporter=./scripts/test-silent-report.js src/api/logger.test.js
 *   node --test --experimental-test-coverage --test-reporter=./scripts/test-silent-report.js src/api/logger.test.js
 *
 * This reporter:
 * - Suppresses output for passing, skipped, and diagnostic events
 * - Prints failing tests with file path, line, and error details
 * - Emits a final summary showing total, passed, failed, and skipped counts
 * - Does not emit coverage details (use test-coverage-report.js for coverage)
 */

import { handleTestFail } from "./test-fail.js";
import { formatTestSummary } from "./test-helpers.js";

/**
 * Custom silent reporter generator function
 * @param {AsyncIterable<Object>} source - Test event stream
 */
export default async function* silentReporter(source) {
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let skippedTests = 0;
    const startTime = Date.now();

    for await (const event of source) {
        switch (event.type) {
            case "test:pass":
                totalTests++;
                passedTests++;
                break;

            case "test:skip":
                totalTests++;
                skippedTests++;
                break;

            case "test:fail": {
                const counters = { totalTests, failedTests };
                for await (const output of handleTestFail(event, counters)) {
                    yield output;
                }
                totalTests = counters.totalTests;
                failedTests = counters.failedTests;
                break;
            }

            default:
                // Suppress all other events
                break;
        }
    }

    yield* formatTestSummary({ totalTests, passedTests, failedTests, skippedTests }, startTime);
}
