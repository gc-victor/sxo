import assert from "node:assert/strict";
import test from "node:test";
import { buildUrl, openURL, openWhenReady, waitForHttp } from "./open.js";

/**
 * Creates a mock fetch function that returns responses from a sequence.
 * @param {Array<{status?: number, reject?: boolean, rejectMessage?: string}>} sequence
 * @param {Array<{url: string, method: string}>} [calls]
 * @returns {Function}
 */
function createFetchMock(sequence, calls) {
    let i = 0;
    return async (url, opts = {}) => {
        const method = (opts.method || "GET").toUpperCase();
        calls?.push({ url: String(url), method });

        const step = sequence[i] ?? sequence[sequence.length - 1] ?? { status: 200 };
        i += 1;

        if (step.reject) {
            throw new Error(step.rejectMessage || "network error");
        }
        return { status: step.status ?? 200 };
    };
}

/**
 * Executes a test function with a mocked globalThis.fetch, restoring it after.
 * @param {Function} fn - Async test function receiving the mock
 * @param {Array<{url: string, method: string}>} [calls]
 * @param {Array<{status?: number, reject?: boolean, rejectMessage?: string}>} [sequence]
 */
async function withMockedFetch(fn, calls, sequence) {
    const originalFetch = globalThis.fetch;
    try {
        if (sequence) {
            globalThis.fetch = createFetchMock(sequence, calls);
        }
        await fn();
    } finally {
        globalThis.fetch = originalFetch;
    }
}

/**
 * Executes a test function with a mocked process.platform, restoring it after.
 * @param {string} platform
 * @param {Function} fn
 */
async function withMockedPlatform(platform, fn) {
    const originalPlatform = process.platform;
    try {
        Object.defineProperty(process, "platform", { value: platform, writable: false });
        await fn();
    } finally {
        Object.defineProperty(process, "platform", { value: originalPlatform, writable: false });
    }
}

/**
 * Creates a mock spawn function that captures arguments and returns a mock child process.
 * @param {Object} capture - Object to populate with captured values
 * @param {Object} [behavior] - Optional behavior overrides
 * @returns {Function}
 */
function createMockSpawn(capture, behavior = {}) {
    return (cmd, args, opts) => {
        capture.cmd = cmd;
        capture.args = args;
        capture.opts = opts;
        return {
            unref: () => {},
            once: behavior.onOnce || (() => {}),
        };
    };
}

test("waitForHttp: becomes ready after transient 503 followed by 200", async () => {
    const calls = [];
    await withMockedFetch(
        async () => {
            const url = buildUrl({ port: 12349, pathname: "/" });
            const ok = await waitForHttp(url, {
                timeoutMs: 1000,
                initialDelayMs: 5,
                maxDelayMs: 5,
                backoffFactor: 1,
                headFirst: true,
            });

            assert.equal(ok, true, "should become ready after GET returns 200");
            assert.equal(calls.length, 2);
            assert.equal(calls[0].method, "HEAD");
            assert.equal(calls[1].method, "GET");
        },
        calls,
        [{ status: 503 }, { status: 200 }],
    );
});

test("openWhenReady: abort signal returns immediately and does not call fetch", async () => {
    await withMockedFetch(async () => {
        let called = 0;
        globalThis.fetch = async () => {
            called += 1;
            return { status: 200 };
        };

        const ctrl = new AbortController();
        ctrl.abort();

        const res = await openWhenReady({
            port: 12350,
            pathname: "/",
            timeoutMs: 5000,
            signal: ctrl.signal,
            verbose: true,
        });

        assert.equal(res.opened, false);
        assert.equal(res.timedOut, false);
        assert.equal(res.error, "aborted");
        assert.equal(called, 0, "fetch should not be called on immediate abort");
    });
});

test("buildUrl: throws on invalid protocol", () => {
    assert.throws(() => buildUrl({ protocol: "ftp" }), /Invalid protocol/, "should reject ftp protocol");
});

test("buildUrl: handles query strings with and without leading ?", () => {
    const url1 = buildUrl({ protocol: "http", host: "example.com", search: "?key=value" });
    assert.ok(url1.includes("?key=value"), "should preserve leading ?");

    const url2 = buildUrl({ protocol: "http", host: "example.com", search: "key=value" });
    assert.ok(url2.includes("?key=value"), "should add ? if missing");
});

test("buildUrl: handles pathname without leading slash", () => {
    const url = buildUrl({ pathname: "path/to/page" });
    assert.ok(url.includes("/path/to/page"), "should add leading slash to pathname");
});

test("waitForHttp: skips HEAD when headFirst is false", async () => {
    const calls = [];
    await withMockedFetch(
        async () => {
            const url = buildUrl({ port: 12351, pathname: "/" });
            const ok = await waitForHttp(url, {
                timeoutMs: 500,
                initialDelayMs: 5,
                maxDelayMs: 5,
                backoffFactor: 1,
                headFirst: false,
            });

            assert.equal(ok, true);
            assert.equal(calls.length, 1);
            assert.equal(calls[0].method, "GET");
        },
        calls,
        [{ status: 200 }],
    );
});

test("openWhenReady: returns timedOut when server never ready", async () => {
    await withMockedFetch(async () => {
        globalThis.fetch = async () => {
            throw new Error("ECONNREFUSED");
        };

        const res = await openWhenReady({
            port: 12357,
            pathname: "/",
            timeoutMs: 50,
            initialDelayMs: 10,
            maxDelayMs: 10,
        });

        assert.equal(res.opened, false);
        assert.equal(res.timedOut, true);
        assert.ok(!res.error, "should not have error message on timeout");
    });
});

test("openWhenReady: builds correct URL with all options", async () => {
    await withMockedFetch(async () => {
        let capturedUrl = "";
        globalThis.fetch = async (url) => {
            capturedUrl = String(url);
            return { status: 200 };
        };

        const opener = { called: false, url: "", opts: null };
        const mockOpener = async (url, opts) => {
            opener.called = true;
            opener.url = url;
            opener.opts = opts;
        };

        const res = await openWhenReady({
            port: 12358,
            pathname: "/api/users",
            host: "0.0.0.0",
            protocol: "http",
            timeoutMs: 500,
            initialDelayMs: 5,
            maxDelayMs: 5,
            opener: mockOpener,
        });

        assert.equal(res.opened, true);
        assert.ok(capturedUrl.includes("0.0.0.0:12358"), "should include host and port");
        assert.ok(capturedUrl.includes("/api/users"), "should include pathname");
        assert.equal(opener.called, true, "should attempt to open browser");
        assert.equal(opener.url, capturedUrl, "should open the same URL as probed");
        assert.deepEqual(opener.opts, { wait: false, app: undefined });
    });
});

test("waitForHttp: verbose mode logs error name", async () => {
    await withMockedFetch(
        async () => {
            const url = buildUrl({ port: 12359, pathname: "/" });
            const ok = await waitForHttp(url, {
                timeoutMs: 100,
                initialDelayMs: 10,
                maxDelayMs: 10,
                backoffFactor: 1,
                verbose: true,
            });
            assert.equal(ok, false, "should return false on timeout");
        },
        [],
        [{ reject: true, rejectMessage: "Connection refused" }],
    );
});

test("openWhenReady: handles opener error gracefully", async () => {
    await withMockedFetch(async () => {
        globalThis.fetch = async () => ({ status: 200 });

        const mockOpener = async () => {
            throw new Error("Failed to open");
        };

        const res = await openWhenReady({
            port: 12360,
            pathname: "/",
            timeoutMs: 500,
            opener: mockOpener,
        });

        assert.equal(res.opened, false);
        assert.ok(res.error, "should have error message");
        assert.ok(res.error.includes("Failed to open"), "should include error message");
    });
});

const platformTests = [
    {
        platform: "win32",
        expectedCmd: "cmd",
        expectedArgs: ["/c", "start", "", "http://localhost:3000/"],
    },
    {
        platform: "darwin",
        expectedCmd: "open",
        expectedArgs: ["--", "http://localhost:3000/"],
    },
    {
        platform: "linux",
        expectedCmd: "xdg-open",
        expectedArgs: ["http://localhost:3000/"],
    },
];

for (const { platform, expectedCmd, expectedArgs } of platformTests) {
    test(`openURL: spawns correct command for ${platform}`, async () => {
        await withMockedPlatform(platform, async () => {
            const capture = {};
            await openURL("http://localhost:3000/", { wait: false, spawnFn: createMockSpawn(capture) });

            assert.equal(capture.cmd, expectedCmd);
            assert.deepEqual(capture.args, expectedArgs);
            assert.equal(capture.opts.stdio, "ignore");
            assert.equal(capture.opts.detached, true);
        });
    });
}

test("openURL: uses custom app when provided", async () => {
    await withMockedPlatform("darwin", async () => {
        const capture = {};
        await openURL("http://localhost:3000/", {
            wait: false,
            app: { name: "firefox", arguments: ["--new-window"] },
            spawnFn: createMockSpawn(capture),
        });

        assert.equal(capture.cmd, "firefox");
        assert.deepEqual(capture.args, ["--new-window", "http://localhost:3000/"]);
    });
});

test("openURL: waits for exit when wait=true", async () => {
    await withMockedPlatform("linux", async () => {
        let exitCallback = null;
        const capture = {};
        const mockSpawn = createMockSpawn(capture, {
            onOnce: (event, callback) => {
                if (event === "exit") exitCallback = callback;
            },
        });

        const promise = openURL("http://localhost:3000/", { wait: true, spawnFn: mockSpawn });
        setTimeout(() => exitCallback?.(), 10);
        await promise;

        assert.equal(capture.opts.detached, false);
    });
});

test("openURL: throws on non-http URL", async () => {
    const originalSpawn = globalThis.spawn;
    try {
        globalThis.spawn = () => ({});
        await assert.rejects(() => openURL("ftp://example.com"), /Invalid URL.*http or https/);
        await assert.rejects(() => openURL("file:///path/to/file"), /Invalid URL.*http or https/);
    } finally {
        globalThis.spawn = originalSpawn;
    }
});

test("openURL: throws on URL with control characters", async () => {
    const originalSpawn = globalThis.spawn;
    try {
        globalThis.spawn = () => ({});
        await assert.rejects(() => openURL("http://localhost:3000/\r\nmalicious"), /Invalid URL.*control characters/);
    } finally {
        globalThis.spawn = originalSpawn;
    }
});

test("waitForHttp: handles 405/501 fallthrough and signal abort", async () => {
    const originalFetch = globalThis.fetch;
    let callCount = 0;
    globalThis.fetch = async (_url, opts) => {
        if (opts.signal?.aborted) {
            const err = new Error("Aborted");
            err.name = "AbortError";
            throw err;
        }
        callCount++;
        return { status: opts.method === "HEAD" ? 501 : 200 };
    };

    try {
        const ready = await waitForHttp("http://localhost:3000");
        assert.strictEqual(ready, true);
        assert.ok(callCount >= 2, "Should have called HEAD then GET");

        const ctrl = new AbortController();
        ctrl.abort();
        const aborted = await waitForHttp("http://localhost:3000", { signal: ctrl.signal });
        assert.strictEqual(aborted, false);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("openWhenReady: handles aborted signal and opener errors", async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    const res1 = await openWhenReady({ port: 3000, signal: ctrl.signal });
    assert.strictEqual(res1.error, "aborted");

    await withMockedFetch(async () => {
        globalThis.fetch = async () => ({ status: 200 });
        const res2 = await openWhenReady({
            port: 3000,
            opener: () => {
                throw new Error("Opener failed");
            },
        });
        assert.strictEqual(res2.opened, false);
        assert.strictEqual(res2.error, "Opener failed");
    });
});

test("waitForHttp: aborts during sleep between retries", async () => {
    await withMockedFetch(async () => {
        globalThis.fetch = async () => ({ status: 503 });

        const ctrl = new AbortController();
        const promise = waitForHttp("http://localhost:3000", {
            initialDelayMs: 100,
            timeoutMs: 1000,
            signal: ctrl.signal,
        });

        await new Promise((r) => setTimeout(r, 50));
        ctrl.abort();

        const result = await promise;
        assert.strictEqual(result, false, "should return false when aborted during sleep");
    });
});

test("waitForHttp: uses fallback when AbortSignal.timeout is missing", async () => {
    const originalTimeout = AbortSignal.timeout;
    // @ts-expect-error - purposefully removing for test
    delete AbortSignal.timeout;

    await withMockedFetch(
        async () => {
            const ready = await waitForHttp("http://localhost:3000", { timeoutMs: 100 });
            assert.strictEqual(ready, true);
        },
        [],
        [{ status: 200 }],
    );

    if (originalTimeout) {
        AbortSignal.timeout = originalTimeout;
    }
});
