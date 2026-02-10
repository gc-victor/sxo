import assert from "node:assert";
import { describe, mock, test } from "node:test";
import { createSpinner } from "./spinners.js";

describe("spinners", () => {
    test("createSpinner fallback mode (non-TTY)", () => {
        const writeMock = mock.method(process.stdout, "write", () => {});

        try {
            const spinner = createSpinner("Testing", { enabled: false, color: false });
            spinner.start();
            spinner.info("info msg");
            spinner.warn("warn msg");
            spinner.update("updated");
            spinner.succeed("done");
            spinner.stop();

            // Check output
            const calls = writeMock.mock.calls.map((c) => c.arguments[0]);
            assert.ok(calls.some((c) => c.includes("Testing")));
            assert.ok(calls.some((c) => c.includes("info msg")));
            assert.ok(calls.some((c) => c.includes("warn msg")));
            assert.ok(calls.some((c) => c.includes("updated")));
            assert.ok(calls.some((c) => c.includes("done")));

            // Test fail when active
            const spinner2 = createSpinner("Fail test", { enabled: false, color: false });
            spinner2.start();
            spinner2.fail("failed");
            assert.ok(writeMock.mock.calls.some((c) => c.arguments[0].includes("failed")));

            // Test methods when not active (should not write)
            const spinner3 = createSpinner("Inactive test", { enabled: false });
            const countBefore = writeMock.mock.callCount();
            spinner3.succeed("should not show");
            spinner3.fail("should not show");
            spinner3.warn("should not show");
            spinner3.info("should not show");
            assert.strictEqual(writeMock.mock.callCount(), countBefore);

            // Test empty/undefined initial text (branch: text || "")
            const spinner4 = createSpinner(undefined, { enabled: false, color: false });
            spinner4.start();
            assert.ok(writeMock.mock.calls[writeMock.mock.callCount() - 1].arguments[0].endsWith(" \n"));

            // Test undefined message parameter (branch: msg ?? current)
            const spinner5 = createSpinner("Default Msg", { enabled: false, color: false });
            spinner5.start();
            spinner5.succeed();
            assert.ok(writeMock.mock.calls[writeMock.mock.callCount() - 1].arguments[0].includes("Default Msg"));
        } finally {
            writeMock.mock.restore();
        }
    });

    test("createSpinner TTY mode", () => {
        const writeMock = mock.method(process.stdout, "write", () => {});

        try {
            const spinner = createSpinner("TTY Testing", { enabled: true, color: false });
            spinner.start();
            spinner.update("new text");
            spinner.info("info");
            spinner.warn("warn");
            spinner.succeed("succeeded");

            assert.ok(writeMock.mock.callCount() > 0);

            // Test fail
            const spinner2 = createSpinner("TTY Fail", { enabled: true, color: false });
            spinner2.start();
            spinner2.fail("failed");

            // Test stop
            const spinner3 = createSpinner("TTY Stop", { enabled: true, color: false });
            spinner3.start();
            spinner3.stop();

            // Test methods when not active
            const spinner4 = createSpinner("Inactive TTY", { enabled: true });
            const countBefore = writeMock.mock.callCount();
            spinner4.succeed("no");
            spinner4.fail("no");
            spinner4.warn("no");
            spinner4.info("no");
            spinner4.stop();
            assert.strictEqual(writeMock.mock.callCount(), countBefore);

            // Test empty/undefined initial text (branch: text || "")
            const spinner5 = createSpinner(undefined, { enabled: true, color: false });
            spinner5.start();
            spinner5.succeed();
            const calls = writeMock.mock.calls.map((c) => c.arguments[0]);
            // The finalize call should have empty string if msg is undefined and text was undefined
            assert.ok(calls[calls.length - 1].endsWith(" \n"));

            // Test undefined message parameter (branch: msg ?? current)
            const spinner6 = createSpinner("Default TTY Msg", { enabled: true, color: false });
            spinner6.start();
            spinner6.info();
            spinner6.warn();
            spinner6.succeed();
            const calls2 = writeMock.mock.calls.map((c) => c.arguments[0]);
            assert.ok(calls2.some((c) => c.includes("Default TTY Msg")));
        } finally {
            writeMock.mock.restore();
        }
    });

    test("createSpinner Windows platform detection", () => {
        const writeMock = mock.method(process.stdout, "write", () => {});
        try {
            // Using mock.property as a fallback if mock.method doesn't work for non-getters
            // but the prompt asked for mock.method. Let's try to make mock.method work.
            // We can redefine the property as a getter first.
            const originalPlatform = process.platform;
            Object.defineProperty(process, "platform", {
                get: () => originalPlatform,
                configurable: true,
            });

            const platformMock = mock.method(process, "platform", () => "win32", { getter: true });

            try {
                const spinner = createSpinner("Windows Test", { enabled: true, color: false });
                spinner.start();
                spinner.update("frame test");

                const calls = writeMock.mock.calls.map((c) => c.arguments[0]);
                // Windows uses fallbackFrames: ["-", "\\", "|", "/"]
                // The frame is rendered with \r at the end
                assert.ok(calls.some((c) => c.includes("- Windows Test") || c.includes("- frame test")));
                spinner.stop();
            } finally {
                platformMock.mock.restore();
                // Restore original property
                Object.defineProperty(process, "platform", {
                    value: originalPlatform,
                    writable: false,
                    enumerable: true,
                    configurable: true,
                });
            }
        } finally {
            writeMock.mock.restore();
        }
    });

    test("createSpinner options (color and prefix)", () => {
        const writeMock = mock.method(process.stdout, "write", () => {});

        try {
            // Test prefix in TTY mode
            const spinner = createSpinner("Prefix Test", { enabled: true, color: false, prefix: "[PRE]" });
            spinner.start();
            spinner.succeed("done");
            assert.ok(writeMock.mock.calls.some((c) => c.arguments[0].includes("[PRE] ")));

            // Test color enabled
            const spinner2 = createSpinner("Color Test", { enabled: false, color: true });
            spinner2.start();
            // ANSI escape for gray is \x1b[90m
            assert.ok(writeMock.mock.calls[writeMock.mock.callCount() - 1].arguments[0].includes("\x1b["));
        } finally {
            writeMock.mock.restore();
        }
    });

    test("createSpinner handles unref error", () => {
        const originalSetInterval = global.setInterval;
        // @ts-expect-error
        global.setInterval = (fn, delay) => {
            const timer = originalSetInterval(fn, delay);
            timer.unref = () => {
                throw new Error("unref failed");
            };
            return timer;
        };

        const writeMock = mock.method(process.stdout, "write", () => {});

        try {
            const spinner = createSpinner("Error test", { enabled: true });
            spinner.start(); // This calls ensureTimer -> unref
            spinner.stop();

            // Test when unref is missing
            // @ts-expect-error
            global.setInterval = (fn, delay) => {
                const timer = originalSetInterval(fn, delay);
                // @ts-expect-error
                delete timer.unref;
                return timer;
            };
            const spinner2 = createSpinner("No unref test", { enabled: true });
            spinner2.start();
            spinner2.stop();
        } finally {
            global.setInterval = originalSetInterval;
            writeMock.mock.restore();
        }
    });
});
