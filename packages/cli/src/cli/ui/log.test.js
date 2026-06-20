import assert from "node:assert";
import { describe, mock, test } from "node:test";
import { dim, error, info, log, newLine, success, text, warn } from "./log.js";

describe("cli/ui/log", () => {
    /**
     * Helper to capture stdout/stderr output.
     * @param {Function} fn - Function to execute
     * @returns {{ stdout: string[], stderr: string[] }}
     */
    const captureOutput = (fn) => {
        const stdoutMock = mock.method(process.stdout, "write", () => {});
        const stderrMock = mock.method(process.stderr, "write", () => {});
        try {
            fn();
            return {
                stdout: stdoutMock.mock.calls.map((c) => c.arguments[0]),
                stderr: stderrMock.mock.calls.map((c) => c.arguments[0]),
            };
        } finally {
            stdoutMock.mock.restore();
            stderrMock.mock.restore();
        }
    };

    /**
     * Helper to run a function with a modified environment.
     * @param {Record<string, string|undefined>} env - Environment variables to set
     * @param {Function} fn - Function to execute
     */
    const withEnv = (env, fn) => {
        const originalEnv = { ...process.env };
        for (const [key, value] of Object.entries(env)) {
            if (value === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = value;
            }
        }
        try {
            fn();
        } finally {
            // Restore
            for (const key in process.env) {
                if (!(key in originalEnv)) {
                    delete process.env[key];
                }
            }
            for (const [key, value] of Object.entries(originalEnv)) {
                process.env[key] = value;
            }
        }
    };

    /**
     * Helper to run a function with a modified TTY state.
     * @param {boolean} isTTY - Whether stdout should be TTY
     * @param {Function} fn - Function to execute
     */
    const withTTY = (isTTY, fn) => {
        const originalIsTTY = process.stdout.isTTY;
        Object.defineProperty(process.stdout, "isTTY", {
            value: isTTY,
            configurable: true,
        });
        try {
            fn();
        } finally {
            Object.defineProperty(process.stdout, "isTTY", {
                value: originalIsTTY,
                configurable: true,
            });
        }
    };

    test("skips output in test environment", () => {
        withEnv({ NODE_ENV: "test" }, () => {
            const { stdout, stderr } = captureOutput(() => {
                info("test info");
                success("test success");
                warn("test warn");
                error("test error");
                dim("test dim");
                text("test text");
                newLine();
            });

            assert.strictEqual(stdout.length, 0, "stdout should be empty in test mode");
            assert.strictEqual(stderr.length, 0, "stderr should be empty in test mode");
        });
    });

    test("info() logs with colors in TTY", () => {
        withEnv({ NODE_ENV: "development", NO_COLOR: undefined }, () => {
            withTTY(true, () => {
                const { stdout } = captureOutput(() => info("info message"));
                assert.ok(stdout[0].includes("\x1b[36m"), "should use cyan color");
                assert.ok(stdout[0].includes("info message"), "should contain message");
            });
        });
    });

    test("success() logs with colors in TTY", () => {
        withEnv({ NODE_ENV: "development", NO_COLOR: undefined }, () => {
            withTTY(true, () => {
                const { stdout } = captureOutput(() => success("success message"));
                assert.ok(stdout[0].includes("\x1b[32m"), "should use green color");
                assert.ok(stdout[0].includes("success message"), "should contain message");
            });
        });
    });

    test("success() skips colors in non-TTY", () => {
        withEnv({ NODE_ENV: "development", NO_COLOR: undefined }, () => {
            withTTY(false, () => {
                const { stdout } = captureOutput(() => success("no color"));
                assert.ok(!stdout[0].includes("\x1b["), "should not use ANSI codes");
                assert.ok(stdout[0].includes("no color"), "should contain message");
            });
        });
    });

    test("warn() logs with colors in TTY", () => {
        withEnv({ NODE_ENV: "development", NO_COLOR: undefined }, () => {
            withTTY(true, () => {
                const { stdout } = captureOutput(() => warn("warning message"));
                assert.ok(stdout[0].includes("\x1b[33m"), "should use yellow color");
                assert.ok(stdout[0].includes("warning message"), "should contain message");
            });
        });
    });

    test("error() logs to stderr with colors in TTY", () => {
        withEnv({ NODE_ENV: "development", NO_COLOR: undefined }, () => {
            withTTY(true, () => {
                const { stdout, stderr } = captureOutput(() => error("error message"));
                assert.strictEqual(stdout.length, 0, "stdout should be empty");
                assert.ok(stderr[0].includes("\x1b[31m"), "should use red color in stderr");
                assert.ok(stderr[0].includes("error message"), "should contain message in stderr");
            });
        });
    });

    test("dim() logs with dim formatting in TTY", () => {
        withEnv({ NODE_ENV: "development", NO_COLOR: undefined }, () => {
            withTTY(true, () => {
                const { stdout } = captureOutput(() => dim("dim message"));
                assert.ok(stdout[0].includes("\x1b[2m"), "should use dim escape code");
                assert.ok(stdout[0].includes("dim message"), "should contain message");
            });
        });
    });

    test("text() logs plain text", () => {
        withEnv({ NODE_ENV: "development" }, () => {
            const { stdout } = captureOutput(() => text("plain text"));
            assert.strictEqual(stdout[0], "plain text\n", "should log plain text with newline");
        });
    });

    test("text() handles null/undefined", () => {
        withEnv({ NODE_ENV: "development" }, () => {
            const { stdout } = captureOutput(() => {
                text(null);
                text(undefined);
            });
            assert.strictEqual(stdout.length, 0, "should not log for null or undefined");
        });
    });

    test("newLine() logs a newline", () => {
        withEnv({ NODE_ENV: "development" }, () => {
            const { stdout } = captureOutput(() => newLine());
            assert.strictEqual(stdout[0], "\n", "should log exactly a newline");
        });
    });

    test("text() handles non-string values", () => {
        withEnv({ NODE_ENV: "development" }, () => {
            const { stdout } = captureOutput(() => {
                text(123);
                text(true);
                text({ a: 1 });
            });
            assert.strictEqual(stdout[0], "123\n");
            assert.strictEqual(stdout[1], "true\n");
            assert.strictEqual(stdout[2], "[object Object]\n");
        });
    });

    test("dim() handles non-string values", () => {
        withEnv({ NODE_ENV: "development", NO_COLOR: "1" }, () => {
            const { stdout } = captureOutput(() => dim(123));
            assert.strictEqual(stdout[0], "123\n");
        });
    });

    test("respects NO_COLOR environment variable", () => {
        withEnv({ NODE_ENV: "development", NO_COLOR: "1" }, () => {
            withTTY(true, () => {
                const { stdout } = captureOutput(() => info("no colors here"));
                assert.ok(!stdout[0].includes("\x1b["), "should not use ANSI codes when NO_COLOR is set");
                assert.ok(stdout[0].includes("no colors here"), "should contain message");
            });
        });
    });

    test("log object contains all functions", () => {
        assert.strictEqual(log.info, info);
        assert.strictEqual(log.success, success);
        assert.strictEqual(log.warn, warn);
        assert.strictEqual(log.error, error);
        assert.strictEqual(log.dim, dim);
        assert.strictEqual(log.text, text);
        assert.strictEqual(log.newLine, newLine);
    });
});
