/**
 * @fileoverview Reusable test:fail event handler for custom test reporters
 *
 * Provides common utilities for extracting location information and formatting
 * failure output for test:fail events in Node.js test reporters.
 */

function formatDirectLocation(file, line, column) {
    const linePart = typeof line === "number" ? `:${line}` : ":1";
    const colPart = typeof column === "number" ? `:${column}` : "";
    return `${file}${linePart}${colPart}`;
}

function locationFromStack(stack) {
    if (typeof stack !== "string") return null;

    // Match: file:///path/to/file.js:line:column or /path/to/file.js:line:column
    const match = stack.match(/(file:\/\/|\/)?([^:\s()]+\.js):(\d+):(\d+)/);
    if (!match) return null;

    const [, protocol, filePath, lineNum, colNum] = match;
    const location = `${filePath}:${lineNum}:${colNum}`;
    if (protocol !== "file://") return location;

    try {
        const parsed = new URL(`file://${filePath}`);
        return `${parsed.pathname}:${lineNum}:${colNum}`;
    } catch {
        return location;
    }
}

function directLocationFromEvent(eventData, details) {
    const file = eventData.file || details.file;
    if (!file) return null;

    return formatDirectLocation(
        file,
        eventData.line ?? details.line,
        eventData.column ?? details.column,
    );
}

function stackLocationFromEvent(eventData, details) {
    const stack = eventData.error?.stack || details.error?.stack;
    return locationFromStack(stack);
}

/**
 * Extract best-effort location (file:line:column) from event data or error stack.
 * @param {unknown} eventData
 * @returns {string} Location in format "file:line:column" or "unknown.js:1:1"
 */
export function getLocation(eventData) {
    if (!eventData || typeof eventData !== "object") return "unknown.js:1:1";

    const typed =
        /** @type {{ file?: string, line?: number, column?: number, details?: { file?: string, line?: number, column?: number, error?: { stack?: string } }, error?: { stack?: string } }} */ (
            eventData
        );
    const details = typed.details || {};
    return directLocationFromEvent(typed, details) ??
        stackLocationFromEvent(typed, details) ??
        "unknown.js:1:1";
}

function* formatAssertionError(cause) {
    const message = typeof cause.message === "string" && cause.message
        ? ` - ${cause.message.split("\n")[0]}`
        : "";
    yield `\n  AssertionError: ${cause.operator || "assertion failed"}${message}\n`;

    if (cause.actual !== undefined && cause.expected !== undefined) {
        yield `    Expected: ${JSON.stringify(cause.expected)}\n`;
        yield `    Actual:   ${JSON.stringify(cause.actual)}\n`;
    }
}

function* formatErrorMessage(error) {
    const [firstLine, ...remainingLines] = error.message.split("\n");
    yield `\n  Error: ${firstLine}\n`;

    for (const line of remainingLines) {
        if (line.trim()) yield `    ${line.trim()}\n`;
    }

    if (error.code && error.code !== "ERR_TEST_FAILURE") {
        yield `    Code: ${error.code}\n`;
    }
}

function* formatFailureDetails(error) {
    if (!error) return;

    if (error.cause?.code === "ERR_ASSERTION") {
        yield* formatAssertionError(error.cause);
    } else if (error.message) {
        yield* formatErrorMessage(error);
    } else if (error.code && error.code !== "ERR_TEST_FAILURE") {
        yield `\n  Error Code: ${error.code}\n`;
    }
}

/**
 * Handle test:fail event and yield formatted output
 * @param {Object} event - Test event object
 * @param {Object} counters - Test counters object { totalTests, failedTests }
 * @returns {AsyncGenerator<string>} Formatted failure output lines
 */
export async function* handleTestFail(event, counters) {
    counters.totalTests++;
    counters.failedTests++;

    const testName = event.data?.name || "Unknown test";
    const details = event.data?.details;
    const location = getLocation({ ...event.data, details });

    yield `× ${testName}\n`;
    yield `  at ${location}\n`;
    yield* formatFailureDetails(details?.error);
    yield "\n";
}
