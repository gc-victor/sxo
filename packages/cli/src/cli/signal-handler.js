import process from "node:process";

/**
 * Forward SIGINT and SIGTERM from parent to child with forced kill timeout.
 *
 * Creates handlers that terminate child when signals are received,
 * and cleans up listeners on child exit. Cleanup errors are logged to
 * stderr but do not cause failures (graceful degradation).
 *
 * @param {import('node:child_process').ChildProcess} child - Child process
 * @param {(signal: NodeJS.Signals | number, timeout: number) => void} terminateProcess - Termination function
 * @param {number} forceKillAfterMs - Force SIGKILL timeout in ms
 * @returns {Array<() => void>} Array of cleanup functions
 */
export function forwardSignals(child, terminateProcess, forceKillAfterMs) {
    const cleanups = [];

    /**
     * Create signal handler that terminates child.
     * @param {NodeJS.Signals} sig - Signal name
     * @returns {() => void} Handler function
     */
    const makeHandler = (sig) => {
        return () => {
            terminateProcess(sig, forceKillAfterMs);
        };
    };

    const onSigint = makeHandler("SIGINT");
    const onSigterm = makeHandler("SIGTERM");

    process.on("SIGINT", onSigint);
    process.on("SIGTERM", onSigterm);

    cleanups.push(() => process.off("SIGINT", onSigint));
    cleanups.push(() => process.off("SIGTERM", onSigterm));

    // Clean these on child exit
    const onChildExit = () => {
        try {
            process.off("SIGINT", onSigint);
            process.off("SIGTERM", onSigterm);
        } catch (err) {
            process.stderr.write(`Signal cleanup error: ${/** @type {Error} */ (err).message}\n`);
        }
    };
    child.once("exit", onChildExit);
    cleanups.push(() => child.off("exit", onChildExit));

    return cleanups;
}

/**
 * Attempt graceful termination, then force kill after timeout.
 *
 * Works cross-platform; on Windows, signals are emulated by Node.
 * Logs kill errors to stderr but continues gracefully (cleanup is not critical).
 *
 * @param {import('node:child_process').ChildProcess} child - Child process
 * @param {NodeJS.Signals|number} signal - Signal to send (default: SIGTERM)
 * @param {number} forceAfterMs - Force kill timeout in ms (default: 5000)
 */
export function terminate(child, signal = "SIGTERM", forceAfterMs = 5000) {
    if (!child || child.killed) return;

    try {
        child.kill(signal);
    } catch (err) {
        process.stderr.write(`Failed to kill child process with ${signal}: ${/** @type {Error} */ (err).message}\n`);
    }

    // If process doesn't exit in time, force kill
    const timer = setTimeout(
        () => {
            if (!child.killed) {
                try {
                    child.kill("SIGKILL");
                } catch (err) {
                    process.stderr.write(`Failed to force kill child process with SIGKILL: ${/** @type {Error} */ (err).message}\n`);
                }
            }
        },
        Math.max(0, forceAfterMs),
    );

    // Clear timer when child exits
    child.once("exit", () => clearTimeout(timer));
}

/**
 * Graceful shutdown handler for CLI processes.
 *
 * Registers SIGINT/SIGTERM handlers that:
 * - Clear the current line (^C artifact) from terminal
 */
export function shutdownHandler() {
    const shutdown = () => {
        // Clear the ^C and move cursor to beginning of line
        process.stdout.write("\r\u001b[2K");
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}
