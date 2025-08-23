/**
 * Cross-platform open with readiness probe and backoff
 * Node >= 20, ESM
 *
 * Exports:
 * - openWhenReady(options): probes an HTTP endpoint until ready, then opens default browser.
 * - waitForHttp(url, options): waits until an HTTP endpoint is ready.
 * - buildUrl(options): builds a URL from parts.
 *
 * Dependencies: none (uses built-in fetch in Node >= 18).
 */

import { spawn } from "node:child_process";

/**
 * Build a URL string from parts.
 * @param {Object} opts
 * @param {"http"|"https"} [opts.protocol="http"]
 * @param {string} [opts.host="localhost"]
 * @param {number|string} [opts.port]
 * @param {string} [opts.pathname="/"]
 * @param {string} [opts.search] - optional query string (without leading '?')
 * @returns {string}
 */
export function buildUrl(opts = {}) {
    const protocol = (opts.protocol || "http").replace(/:$/, "");
    const host = opts.host || "localhost";
    const port = opts.port ? String(opts.port) : "";
    let pathname = opts.pathname || "/";
    if (!pathname.startsWith("/")) pathname = `/${pathname}`;
    const u = new URL(`${protocol}://${host}${port ? `:${port}` : ""}${pathname}`);
    if (opts.search) {
        const s = String(opts.search);
        u.search = s.startsWith("?") ? s : `?${s}`;
    }
    return u.toString();
}

/**
 * Sleep for ms; respects optional AbortSignal.
 * @param {number} ms
 * @param {AbortSignal} [signal]
 */
function sleep(ms, signal) {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            const err = new Error("Aborted");
            err.name = "AbortError";
            reject(err);
            return;
        }
        const t = setTimeout(() => {
            cleanup();
            resolve();
        }, ms);
        const onAbort = () => {
            clearTimeout(t);
            cleanup();
            const err = new Error("Aborted");
            err.name = "AbortError";
            reject(err);
        };
        const cleanup = () => {
            if (signal) signal.removeEventListener("abort", onAbort);
        };
        if (signal) signal.addEventListener("abort", onAbort, { once: true });
    });
}

/**
 * Link two abort signals (parent + timeout or similar).
 * Aborts the returned controller if either signal aborts.
 * @param {AbortSignal|undefined} a
 * @param {AbortSignal|undefined} b
 */
function anySignal(a, b) {
    const ctrl = new AbortController();
    const onAbort = () => {
        try {
            ctrl.abort();
        } catch {}
        cleanup();
    };
    const cleanup = () => {
        a?.removeEventListener("abort", onAbort);
        b?.removeEventListener("abort", onAbort);
    };
    if (a?.aborted || b?.aborted) {
        try {
            ctrl.abort();
        } catch {}
        return ctrl.signal;
    }
    a?.addEventListener("abort", onAbort, { once: true });
    b?.addEventListener("abort", onAbort, { once: true });
    return ctrl.signal;
}

/**
 * Wait for an HTTP endpoint to be ready.
 * Considered ready if status is < 500 (so 2xx/3xx/404 count as "server is up").
 *
 * @param {string} url
 * @param {Object} [opts]
 * @param {number} [opts.timeoutMs=10000] - total deadline
 * @param {number} [opts.initialDelayMs=120] - initial backoff delay
 * @param {number} [opts.maxDelayMs=1200] - backoff cap
 * @param {number} [opts.backoffFactor=1.7] - exponential factor
 * @param {boolean} [opts.headFirst=true] - try HEAD before GET
 * @param {AbortSignal} [opts.signal]
 * @param {boolean} [opts.verbose=false]
 * @returns {Promise<boolean>} true if ready, false if timed out
 */
export async function waitForHttp(url, opts = {}) {
    const timeoutMs = Math.max(1, opts.timeoutMs ?? 10000);
    const headFirst = opts.headFirst ?? true;
    const verbose = !!opts.verbose;

    const started = Date.now();
    const deadline = started + timeoutMs;

    let delay = Math.max(10, opts.initialDelayMs ?? 120);
    const maxDelay = Math.max(delay, opts.maxDelayMs ?? 1200);
    const factor = Math.max(1.01, opts.backoffFactor ?? 1.7);

    // Helper to get per-attempt timeout signal
    const attemptSignal = (ms) => {
        const ctrl = AbortSignal.timeout
            ? AbortSignal.timeout(ms)
            : (() => {
                  const c = new AbortController();
                  setTimeout(() => c.abort(), ms);
                  return c.signal;
              })();
        return anySignal(opts.signal, ctrl);
    };

    const isReadyStatus = (status) => status >= 200 && status < 500;

    while (Date.now() < deadline) {
        const remaining = Math.max(0, deadline - Date.now());
        const perAttempt = Math.min(2000, Math.max(300, remaining)); // 0.3s..2s per attempt

        try {
            let res;
            if (headFirst) {
                res = await fetch(url, { method: "HEAD", redirect: "manual", signal: attemptSignal(perAttempt) });
                if (isReadyStatus(res.status)) return true;
                // Some servers don't support HEAD; fall through to GET if 405/501
                if (res.status !== 405 && res.status !== 501) {
                    // If the server responded but not ready (e.g., 503), keep retrying
                }
            }
            // GET attempt
            res = await fetch(url, { method: "GET", redirect: "manual", signal: attemptSignal(perAttempt) });
            if (isReadyStatus(res.status)) return true;
        } catch (e) {
            // Network error or timeout -> retry
            if (verbose && e && typeof e === "object" && "name" in e) {
                // Optional debug logging; keep quiet by default
                // console.error(`[waitForHttp] attempt failed: ${e.name}`);
            }
        }

        // Backoff with light jitter
        const jitter = 1 + (Math.random() - 0.5) * 0.2; // +/-10%
        delay = Math.min(maxDelay, Math.ceil(delay * factor * jitter));
        const sleepMs = Math.min(delay, Math.max(0, deadline - Date.now()));
        if (sleepMs <= 0) break;
        await sleep(sleepMs, opts.signal);
        if (opts.signal?.aborted) break;
    }

    return false; // timed out
}

/**
 * Cross-platform URL opener (zero-dependency).
 * Returns when the opener process exits if wait=true, otherwise returns immediately.
 * @param {string} url
 * @param {{ wait?: boolean, app?: { name?: string, arguments?: string[] } }} [opts]
 */
async function openURL(url, opts = {}) {
    const { wait = false, app } = opts;
    const platform = process.platform;
    let cmd;
    let args = [];

    if (app?.name) {
        cmd = String(app.name);
        args = [...(Array.isArray(app.arguments) ? app.arguments : []), url];
    } else if (platform === "win32") {
        cmd = "cmd";
        args = ["/c", "start", "", url];
    } else if (platform === "darwin") {
        cmd = "open";
        args = [url];
    } else {
        cmd = "xdg-open";
        args = [url];
    }

    const child = spawn(cmd, args, { stdio: "ignore", detached: !wait });
    if (wait) {
        await new Promise((resolve, reject) => {
            child.once("error", reject);
            child.once("exit", () => resolve());
        });
    } else {
        child.unref?.();
    }
}

/**
 * Open a URL in the default browser after the server is reachable.
 * Times out gracefully; returns an object describing the outcome.
 *
 * @param {Object} options
 * @param {number} options.port
 * @param {string} [options.pathname="/"]
 * @param {string} [options.host="localhost"]
 * @param {"http"|"https"} [options.protocol="http"]
 * @param {number} [options.timeoutMs=10000]
 * @param {AbortSignal} [options.signal]
 * @param {boolean} [options.verbose=false]
 * @param {boolean} [options.wait=false] - whether to wait for the opened app to exit (browser)
 * @param {{name?: string, arguments?: string[]}} [options.app] - app override for `open`
 * @returns {Promise<{ opened: boolean, url: string, timedOut?: boolean, error?: string }>}
 */
export async function openWhenReady(options) {
    const {
        port,
        pathname = "/",
        host = "localhost",
        protocol = "http",
        timeoutMs = 10000,
        signal,
        verbose = false,
        wait = false,
        app,
    } = options || {};

    const url = buildUrl({ protocol, host, port, pathname });

    // Respect immediate abort
    if (signal?.aborted) {
        return { opened: false, url, timedOut: false, error: "aborted" };
    }

    const ready = await waitForHttp(url, {
        timeoutMs,
        signal,
        verbose,
        headFirst: true,
    });

    if (!ready) {
        return { opened: false, url, timedOut: true };
    }

    try {
        await openURL(url, { wait, app });
        return { opened: true, url };
    } catch (e) {
        const msg = e && typeof e === "object" && "message" in e ? String(e.message) : "failed to open";
        return { opened: false, url, error: msg };
    }
}
