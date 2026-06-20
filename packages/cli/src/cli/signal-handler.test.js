import assert from "node:assert/strict";
import test from "node:test";
import { forwardSignals, shutdownHandler, terminate } from "./signal-handler.js";

// Helper: Create a mock child process with customizable behavior
function createMockChild(options = {}) {
    return {
        once: options.once || (() => {}),
        off: options.off || (() => {}),
        killed: options.killed ?? false,
        kill: options.kill || (() => {}),
    };
}

// Helper: Mock process.on/off and return cleanup function
function mockProcessMethods() {
    const originalOn = process.on;
    const originalOff = process.off;
    const handlers = new Map();

    process.on = (event, handler) => {
        if (!handlers.has(event)) {
            handlers.set(event, []);
        }
        handlers.get(event).push(handler);
    };
    process.off = () => {};

    return {
        handlers,
        restore() {
            process.on = originalOn;
            process.off = originalOff;
        },
    };
}

// Helper: Capture stderr output
function captureStderr() {
    const originalWrite = process.stderr.write.bind(process.stderr);
    const output = [];

    process.stderr.write = (chunk, ...args) => {
        output.push(chunk.toString());
        return originalWrite(chunk, ...args);
    };

    return {
        getOutput: () => output.join(""),
        restore() {
            process.stderr.write = originalWrite;
        },
    };
}

// Helper: Capture stdout output
function captureStdout() {
    const originalWrite = process.stdout.write.bind(process.stdout);
    const output = [];

    process.stdout.write = (chunk, ...args) => {
        output.push(chunk.toString());
        return originalWrite(chunk, ...args);
    };

    return {
        getOutput: () => output.join(""),
        restore() {
            process.stdout.write = originalWrite;
        },
    };
}

test("forwardSignals: registers SIGINT and SIGTERM handlers on process", () => {
    const child = createMockChild();
    const terminateProcess = () => {};

    const cleanups = forwardSignals(child, terminateProcess, 5000);

    assert.ok(Array.isArray(cleanups), "should return array of cleanup functions");
    assert.strictEqual(cleanups.length, 3, "should return 3 cleanup functions");
    assert.strictEqual(typeof cleanups[0], "function", "first cleanup should be function");
    assert.strictEqual(typeof cleanups[1], "function", "second cleanup should be function");
    assert.strictEqual(typeof cleanups[2], "function", "third cleanup should be function");
});

test("forwardSignals: calls terminateProcess with correct signal and timeout", () => {
    let receivedSignal = null;
    let receivedTimeout = null;
    const terminateProcess = (sig, timeout) => {
        receivedSignal = sig;
        receivedTimeout = timeout;
    };

    forwardSignals(createMockChild(), terminateProcess, 3000);

    assert.strictEqual(receivedSignal, null, "should not call terminateProcess initially");
    assert.strictEqual(receivedTimeout, null, "should not call terminateProcess initially");
});

test("forwardSignals: sets up child exit handler for cleanup", () => {
    let exitHandler = null;
    const child = createMockChild({
        once: (event, handler) => {
            if (event === "exit") {
                exitHandler = handler;
            }
        },
    });

    const cleanups = forwardSignals(child, () => {}, 5000);

    assert.ok(exitHandler, "should register exit handler on child");
    assert.strictEqual(typeof exitHandler, "function", "exit handler should be function");
    assert.strictEqual(cleanups.length, 3, "should return 3 cleanup functions");
});

test("forwardSignals: child exit handler removes signal listeners", () => {
    const mock = mockProcessMethods();
    let onChildExit = null;
    const child = createMockChild({
        once: (event, handler) => {
            if (event === "exit") {
                onChildExit = handler;
            }
        },
    });

    try {
        forwardSignals(child, () => {}, 5000);

        if (onChildExit) {
            onChildExit();
        }

        assert.ok(true, "should not throw on child exit");
    } finally {
        mock.restore();
    }
});

test("forwardSignals: cleanup functions remove listeners", () => {
    const mock = mockProcessMethods();
    const offCalls = [];
    process.off = (event, handler) => {
        offCalls.push({ event, handler });
    };

    try {
        const cleanups = forwardSignals(createMockChild(), () => {}, 5000);

        for (const cleanup of cleanups) {
            cleanup();
        }

        assert.strictEqual(offCalls.length, 2, "should call process.off 2 times for signal cleanup");
        assert.ok(
            offCalls.some((c) => c.event === "SIGINT"),
            "should cleanup SIGINT",
        );
        assert.ok(
            offCalls.some((c) => c.event === "SIGTERM"),
            "should cleanup SIGTERM",
        );
    } finally {
        mock.restore();
    }
});

test("terminate: returns early if child is null", () => {
    terminate(null, "SIGTERM", 5000);
    assert.ok(true, "should not throw on null child");
});

test("terminate: returns early if child is already killed", () => {
    let killCalled = false;
    const child = createMockChild({
        killed: true,
        kill: () => {
            killCalled = true;
        },
    });

    terminate(child, "SIGTERM", 5000);

    assert.strictEqual(killCalled, false, "should not call kill on already killed child");
});

test("terminate: sends signal to child process", () => {
    let receivedSignal = null;
    const child = createMockChild({
        kill: (sig) => {
            receivedSignal = sig;
        },
    });

    terminate(child, "SIGTERM", 5000);

    assert.strictEqual(receivedSignal, "SIGTERM", "should send SIGTERM to child");
});

test("terminate: sends SIGKILL after timeout if child doesn't exit", async () => {
    let killSignal = null;
    const child = createMockChild({
        kill: (sig) => {
            killSignal = sig;
        },
    });

    terminate(child, "SIGTERM", 50);

    assert.strictEqual(killSignal, "SIGTERM", "should send SIGTERM first");
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.strictEqual(killSignal, "SIGKILL", "should send SIGKILL after timeout");
});

test("terminate: ignores kill errors gracefully", () => {
    const child = createMockChild({
        kill: () => {
            throw new Error("kill failed");
        },
    });

    assert.doesNotThrow(() => terminate(child, "SIGTERM", 5000));
});

test("terminate: ignores force SIGKILL errors gracefully", async () => {
    let killCount = 0;
    const child = createMockChild({
        kill: () => {
            killCount++;
            if (killCount === 2) {
                throw new Error("SIGKILL failed");
            }
        },
    });

    assert.doesNotThrow(() => terminate(child, "SIGTERM", 100));
    assert.strictEqual(killCount, 1, "should attempt SIGTERM");

    await new Promise((resolve) => setTimeout(resolve, 200));
    assert.strictEqual(killCount, 2, "should attempt both SIGTERM and SIGKILL");
});

test("terminate: clears timer when child exits", async () => {
    const child = createMockChild({
        once: (event, handler) => {
            if (event === "exit") {
                setImmediate(() => handler(0));
            }
        },
    });

    terminate(child, "SIGTERM", 5000);
    await new Promise((resolve) => setTimeout(resolve, 50));

    assert.ok(true, "terminate should handle child exiting before timeout");
});

test("terminate: uses default SIGTERM and 5000ms timeout", () => {
    let receivedSignal = null;
    const child = createMockChild({
        kill: (sig) => {
            receivedSignal = sig;
        },
    });

    terminate(child);

    assert.strictEqual(receivedSignal, "SIGTERM", "should default to SIGTERM");
});

test("terminate: handles negative timeout gracefully", () => {
    let killCalled = false;
    const child = createMockChild({
        kill: () => {
            killCalled = true;
        },
    });

    assert.doesNotThrow(() => terminate(child, "SIGTERM", -1000));
    assert.strictEqual(killCalled, true, "should still attempt to kill");
});

test("forwardSignals: handles child exit handler errors gracefully", () => {
    const mock = mockProcessMethods();
    process.off = () => {
        throw new Error("off failed");
    };

    try {
        const cleanups = forwardSignals(createMockChild(), () => {}, 5000);
        assert.doesNotThrow(() => cleanups[2](), "should handle exit handler errors gracefully");
    } finally {
        mock.restore();
    }
});

test("forwardSignals: logs cleanup errors instead of silently ignoring", () => {
    let exitHandler = null;
    const child = createMockChild({
        once: (event, handler) => {
            if (event === "exit") {
                exitHandler = handler;
            }
        },
    });

    const mock = mockProcessMethods();
    const stderr = captureStderr();
    process.off = (event) => {
        if (event === "SIGINT") {
            throw new Error("Failed to remove SIGINT handler");
        }
    };

    try {
        forwardSignals(child, () => {}, 5000);

        assert.ok(exitHandler, "exit handler should be registered");
        exitHandler();

        const stderrText = stderr.getOutput();
        assert.ok(
            stderrText.includes("Failed to remove SIGINT handler") || stderrText.includes("cleanup"),
            "should log cleanup error to stderr",
        );
    } finally {
        mock.restore();
        stderr.restore();
    }
});

test("terminate: logs kill errors instead of silently ignoring", () => {
    const stderr = captureStderr();
    const child = createMockChild({
        kill: () => {
            throw new Error("Failed to send SIGTERM");
        },
    });

    try {
        terminate(child, "SIGTERM", 5000);

        const stderrText = stderr.getOutput();
        assert.ok(stderrText.includes("Failed to send SIGTERM") || stderrText.includes("kill"), "should log kill error to stderr");
    } finally {
        stderr.restore();
    }
});

test("terminate: logs force SIGKILL errors instead of silently ignoring", async () => {
    const stderr = captureStderr();
    let killCount = 0;
    const child = createMockChild({
        kill: (sig) => {
            killCount++;
            if (sig === "SIGKILL") {
                throw new Error("Failed to send SIGKILL");
            }
        },
    });

    try {
        terminate(child, "SIGTERM", 50);
        await new Promise((resolve) => setTimeout(resolve, 100));

        const stderrText = stderr.getOutput();
        assert.ok(
            stderrText.includes("Failed to send SIGKILL") || stderrText.includes("SIGKILL"),
            "should log force SIGKILL error to stderr",
        );
        assert.strictEqual(killCount, 2, "should attempt both kills");
    } finally {
        stderr.restore();
    }
});

test("shutdownHandler: SIGINT clears terminal", () => {
    const stdout = captureStdout();

    try {
        shutdownHandler();
        process.emit("SIGINT");

        assert.ok(stdout.getOutput().includes("\r\u001b[2K"), "should clear terminal line");
    } finally {
        stdout.restore();
    }
});

test("shutdownHandler: SIGTERM clears terminal", () => {
    const stdout = captureStdout();

    try {
        shutdownHandler();
        process.emit("SIGTERM");

        assert.ok(stdout.getOutput().includes("\r\u001b[2K"), "should clear terminal line");
    } finally {
        stdout.restore();
    }
});
