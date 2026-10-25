import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createEsbuildSpawner } from "./process-spawner.js";

function setRuntimeMock(t, runtime, mock) {
    const original = globalThis[runtime];
    globalThis[runtime] = mock;
    t.after(() => {
        if (original === undefined) delete globalThis[runtime];
        else globalThis[runtime] = original;
    });
}

function createReader(results, onRelease = () => {}) {
    return {
        getReader() {
            return {
                async read() {
                    return results.shift();
                },
                releaseLock: onRelease,
            };
        },
    };
}

function createDeferred() {
    let resolve;
    const promise = new Promise((resolvePromise) => {
        resolve = resolvePromise;
    });
    return { promise, resolve };
}

const encoder = new TextEncoder();

describe("createEsbuildSpawner", () => {
    test("Bun spawner captures stderr chunks and waits for the process", async (t) => {
        const exited = createDeferred();
        const streamsSettled = createDeferred();
        let completed = false;
        let released = false;
        const options = { PATH: "/bin" };
        setRuntimeMock(t, "Bun", {
            spawn(args, spawnOptions) {
                assert.deepEqual(args, ["bun", "/config.js", "/pages"]);
                assert.deepEqual(spawnOptions, {
                    env: { PATH: "/bin", DEV: "true" },
                    cwd: "/project",
                    stdout: "inherit",
                    stderr: "pipe",
                });
                return {
                    stderr: createReader(
                        [
                            { done: false, value: null },
                            { done: false, value: encoder.encode("warning ") },
                            { done: false, value: encoder.encode("details") },
                            { done: true },
                        ],
                        () => {
                            released = true;
                            streamsSettled.resolve();
                        },
                    ),
                    exited: exited.promise,
                };
            },
        });

        const spawn = createEsbuildSpawner("bun", "bun", "/config.js", "/pages", options, "/project");
        const result = spawn().finally(() => {
            completed = true;
        });
        await streamsSettled.promise;
        await new Promise((resolve) => setImmediate(resolve));
        assert.equal(completed, false);

        exited.resolve(0);
        assert.equal(await result, "warning details");
        assert.equal(completed, true);
        assert.equal(released, true);
    });

    test("Bun spawner returns empty stderr when no pipe is available", async (t) => {
        setRuntimeMock(t, "Bun", {
            spawn() {
                return { stderr: null, exited: Promise.resolve(0) };
            },
        });

        const spawn = createEsbuildSpawner("bun", "bun", "/config.js", "/pages");
        assert.equal(await spawn(), "");
    });

    test("Bun spawner releases the reader after a read failure", async (t) => {
        let released = false;
        const reader = {
            async read() {
                throw new Error("stream closed");
            },
            releaseLock() {
                released = true;
            },
        };
        setRuntimeMock(t, "Bun", {
            spawn() {
                return { stderr: { getReader: () => reader }, exited: Promise.resolve(0) };
            },
        });

        const spawn = createEsbuildSpawner("bun", "bun", "/config.js", "/pages");
        assert.equal(await spawn(), "");
        assert.equal(released, true);
    });

    test("Deno spawner captures stderr chunks and waits for the command", async (t) => {
        const status = createDeferred();
        const streamsSettled = createDeferred();
        let completed = false;
        let released = false;
        setRuntimeMock(t, "Deno", {
            Command: class {
                constructor(execPath, options) {
                    assert.equal(execPath, "deno");
                    assert.deepEqual(options, {
                        args: ["run", "--allow-all", "/config.js", "/pages"],
                        env: { DEV: "true" },
                        stdout: "inherit",
                        stderr: "piped",
                        cwd: "/project",
                    });
                }

                spawn() {
                    return {
                        stderr: createReader(
                            [
                                { done: false, value: null },
                                { done: false, value: encoder.encode("error ") },
                                { done: false, value: encoder.encode("details") },
                                { done: true },
                            ],
                            () => {
                                released = true;
                                streamsSettled.resolve();
                            },
                        ),
                        status: status.promise,
                    };
                }
            },
        });

        const spawn = createEsbuildSpawner("deno", "deno", "/config.js", "/pages", {}, "/project");
        const result = spawn().finally(() => {
            completed = true;
        });
        await streamsSettled.promise;
        await new Promise((resolve) => setImmediate(resolve));
        assert.equal(completed, false);

        status.resolve({ success: true });
        assert.equal(await result, "error details");
        assert.equal(completed, true);
        assert.equal(released, true);
    });

    test("Deno spawner returns empty stderr when no pipe is available", async (t) => {
        setRuntimeMock(t, "Deno", {
            Command: class {
                spawn() {
                    return { stderr: null, status: Promise.resolve(0) };
                }
            },
        });

        const spawn = createEsbuildSpawner("deno", "deno", "/config.js", "/pages");
        assert.equal(await spawn(), "");
    });

    test("Deno spawner releases the reader after a read failure", async (t) => {
        let released = false;
        const reader = {
            async read() {
                throw new Error("stream closed");
            },
            releaseLock() {
                released = true;
            },
        };
        setRuntimeMock(t, "Deno", {
            Command: class {
                spawn() {
                    return { stderr: { getReader: () => reader }, status: Promise.resolve(0) };
                }
            },
        });

        const spawn = createEsbuildSpawner("deno", "deno", "/config.js", "/pages");
        assert.equal(await spawn(), "");
        assert.equal(released, true);
    });
});
