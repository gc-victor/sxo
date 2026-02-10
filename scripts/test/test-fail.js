/**
 * @fileoverview Reusable test:fail event handler for custom test reporters
 *
 * Provides common utilities for extracting location information and formatting
 * failure output for test:fail events in Node.js test reporters.
 */

/**
 * Extract best-effort location (file:line:column) from event data or error stack.
 * @param {unknown} eventData
 * @returns {string} Location in format "file:line:column" or "unknown.js:1:1"
 */
export function getLocation(eventData) {
    if (!eventData || typeof eventData !== "object") {
        return "unknown.js:1:1";
    }

    const typed =
        /** @type {{ file?: string, line?: number, column?: number, details?: { file?: string, line?: number, column?: number, error?: { stack?: string } }, error?: { stack?: string } }} */ (
            eventData
        );

    // Try direct properties first
    const file = typed.file || typed.details?.file;
    const line = typed.line ?? typed.details?.line;
    const column = typed.column ?? typed.details?.column;

    if (file) {
        const linePart = typeof line === "number" ? `:${line}` : ":1";
        const colPart = typeof column === "number" ? `:${column}` : "";
        return `${file}${linePart}${colPart}`;
    }

    // Fall back to parsing stack trace
    const stack = typed.error?.stack || typed.details?.error?.stack;
    if (typeof stack === "string") {
        // Match: file:///path/to/file.js:line:column or /path/to/file.js:line:column
        const match = stack.match(/(file:\/\/|\/)?([^:\s()]+\.js):(\d+):(\d+)/);
        if (match) {
            const [, protocol, filePath, lineNum, colNum] = match;
            // Convert file:// URL to path if needed
            if (protocol === "file://") {
                try {
                    const parsed = new URL(`file://${filePath}`);
                    return `${parsed.pathname}:${lineNum}:${colNum}`;
                } catch {
                    return `${filePath}:${lineNum}:${colNum}`;
                }
            }
            return `${filePath}:${lineNum}:${colNum}`;
        }
    }

    return "unknown.js:1:1";
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

    const error = details?.error;
    if (error) {
        const cause = error.cause;

        if (cause?.code === "ERR_ASSERTION") {
            let message = "";
            if (typeof cause.message === "string" && cause.message) {
                const lines = cause.message.split("\n");
                message = ` - ${lines[0]}`;
            }
            yield `\n  AssertionError: ${cause.operator || "assertion failed"}${message}\n`;
            if (cause.actual !== undefined && cause.expected !== undefined) {
                yield `    Expected: ${JSON.stringify(cause.expected)}\n`;
                yield `    Actual:   ${JSON.stringify(cause.actual)}\n`;
            }
        } else if (error.message) {
            const lines = error.message.split("\n");
            yield `\n  Error: ${lines[0]}\n`;
            for (let i = 1; i < lines.length; i++) {
                if (lines[i].trim()) {
                    yield `    ${lines[i].trim()}\n`;
                }
            }
            if (error.code && error.code !== "ERR_TEST_FAILURE") {
                yield `    Code: ${error.code}\n`;
            }
        } else if (error.code && error.code !== "ERR_TEST_FAILURE") {
            yield `\n  Error Code: ${error.code}\n`;
        }
    }

    yield "\n";
}
