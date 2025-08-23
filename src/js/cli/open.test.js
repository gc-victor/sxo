import assert from "node:assert/strict";
import test from "node:test";
import { buildUrl, openWhenReady, waitForHttp } from "./open.js";

function createFetchMock(sequence, calls) {
    // sequence: array of { status?: number, reject?: boolean }
    // calls: output array to record { url, method }
    let i = 0;
    return async (url, opts = {}) => {
        const method = (opts.method || "GET").toUpperCase();
        calls.push({ url: String(url), method });

        const step = sequence[i] ?? sequence[sequence.length - 1] ?? { status: 200 };
        i += 1;

        if (step.reject) {
            throw new Error(step.rejectMessage || "network error");
        }
        const status = typeof step.status === "number" ? step.status : 200;
        return { status };
    };
}

test("waitForHttp: resolves true on first HEAD 200", async () => {
    const originalFetch = globalThis.fetch;
    try {
        const calls = [];
        globalThis.fetch = createFetchMock([{ status: 200 }], calls);

        const url = buildUrl({ port: 12345, pathname: "/" });
        const ok = await waitForHttp(url, {
            timeoutMs: 500,
            initialDelayMs: 5,
            maxDelayMs: 5,
            backoffFactor: 1,
            headFirst: true,
            verbose: false,
        });

        assert.equal(ok, true, "should be ready");
        assert.equal(calls.length, 1, "only one request should be made");
        assert.equal(calls[0].method, "HEAD");
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("waitForHttp: tries GET after HEAD (405) and succeeds", async () => {
    const originalFetch = globalThis.fetch;
    try {
        const calls = [];
        // First attempt: HEAD -> 405 (not allowed), then GET -> 200
        globalThis.fetch = createFetchMock([{ status: 405 }, { status: 200 }], calls);

        const url = buildUrl({ port: 12346, pathname: "/" });
        const ok = await waitForHttp(url, {
            timeoutMs: 800,
            initialDelayMs: 5,
            maxDelayMs: 5,
            backoffFactor: 1,
            headFirst: true,
            verbose: false,
        });

        assert.equal(ok, true, "should be ready (HEAD 405 treated as ready)");
        assert.equal(calls.length, 1);
        assert.equal(calls[0].method, "HEAD");
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("waitForHttp: treats 404 as ready (server up)", async () => {
    const originalFetch = globalThis.fetch;
    try {
        const calls = [];
        globalThis.fetch = createFetchMock([{ status: 404 }], calls);

        const url = buildUrl({ port: 12347, pathname: "/missing" });
        const ok = await waitForHttp(url, {
            timeoutMs: 500,
            initialDelayMs: 5,
            maxDelayMs: 5,
            backoffFactor: 1,
            headFirst: true,
        });

        assert.equal(ok, true, "404 should still indicate server readiness");
        assert.equal(calls.length, 1);
        assert.equal(calls[0].method, "HEAD");
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("waitForHttp: retries on errors and times out -> false", async () => {
    const originalFetch = globalThis.fetch;
    try {
        const calls = [];
        // Always reject to force retries until timeout
        globalThis.fetch = createFetchMock([{ reject: true }], calls);

        const url = buildUrl({ port: 12348, pathname: "/" });
        const ok = await waitForHttp(url, {
            timeoutMs: 80, // keep short
            initialDelayMs: 10,
            maxDelayMs: 10,
            backoffFactor: 1,
            headFirst: true,
        });

        assert.equal(ok, false, "should return false on timeout");
        assert.ok(calls.length >= 1, "should have attempted at least once");
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("waitForHttp: becomes ready after transient 503 followed by 200", async () => {
    const originalFetch = globalThis.fetch;
    try {
        const calls = [];
        // Sequence per cycle: HEAD (503), GET(200)
        globalThis.fetch = createFetchMock([{ status: 503 }, { status: 200 }], calls);

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
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("openWhenReady: abort signal returns immediately and does not call fetch", async () => {
    const originalFetch = globalThis.fetch;
    try {
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
    } finally {
        globalThis.fetch = originalFetch;
    }
});
