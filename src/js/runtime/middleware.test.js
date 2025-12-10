/**
 * @fileoverview Tests for the Web Standard middleware executor.
 *
 * Tests cover:
 * - Middleware returning Response short-circuits
 * - Middleware returning void continues chain
 * - Middleware chain executes in order
 * - Middleware receives Request and env
 * - Middleware throwing returns error
 * - Async middleware supported
 * - Array of middlewares supported
 */

import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { describe, test } from "node:test";
import { executeMiddleware } from "./middleware.js";

// --- Helper to create Request ---
function createRequest(url, method = "GET") {
    return new Request(`http://localhost${url}`, { method });
}

describe("executeMiddleware", () => {
    test("returns undefined when no middlewares provided", async () => {
        const result = await executeMiddleware([], createRequest("/"));
        strictEqual(result, undefined);
    });

    test("middleware returning Response short-circuits", async () => {
        const response = new Response("Blocked", { status: 403 });
        const mw = () => response;

        const result = await executeMiddleware([mw], createRequest("/"));

        ok(result instanceof Response);
        strictEqual(result.status, 403);
    });

    test("middleware returning void continues chain", async () => {
        let mw1Called = false;
        let mw2Called = false;

        const mw1 = () => {
            mw1Called = true;
        };
        const mw2 = () => {
            mw2Called = true;
        };

        const result = await executeMiddleware([mw1, mw2], createRequest("/"));

        ok(mw1Called, "mw1 should be called");
        ok(mw2Called, "mw2 should be called");
        strictEqual(result, undefined);
    });

    test("middleware chain executes in order", async () => {
        const order = [];
        const mw1 = () => {
            order.push(1);
        };
        const mw2 = () => {
            order.push(2);
        };
        const mw3 = () => {
            order.push(3);
        };

        await executeMiddleware([mw1, mw2, mw3], createRequest("/"));

        deepStrictEqual(order, [1, 2, 3]);
    });

    test("middleware receives Request and env", async () => {
        let receivedRequest = null;
        let receivedEnv = null;

        const mw = (req, env) => {
            receivedRequest = req;
            receivedEnv = env;
        };

        const request = createRequest("/test");
        const env = { DATABASE: "mock-db" };

        await executeMiddleware([mw], request, env);

        ok(receivedRequest instanceof Request);
        strictEqual(new URL(receivedRequest.url).pathname, "/test");
        strictEqual(receivedEnv.DATABASE, "mock-db");
    });

    test("middleware throwing propagates error", async () => {
        const error = new Error("Test error");
        const mw = () => {
            throw error;
        };

        let caughtError = null;
        try {
            await executeMiddleware([mw], createRequest("/"));
        } catch (e) {
            caughtError = e;
        }

        strictEqual(caughtError, error);
    });

    test("async middleware supported", async () => {
        const asyncMw = async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            return new Response("Async Response", { status: 200 });
        };

        const result = await executeMiddleware([asyncMw], createRequest("/"));

        ok(result instanceof Response);
        const text = await result.text();
        strictEqual(text, "Async Response");
    });

    test("short-circuits on first Response", async () => {
        const order = [];
        const mw1 = () => {
            order.push(1);
            return new Response("First", { status: 200 });
        };
        const mw2 = () => {
            order.push(2);
        };

        const result = await executeMiddleware([mw1, mw2], createRequest("/"));

        deepStrictEqual(order, [1], "mw2 should not be called");
        ok(result instanceof Response);
    });

    test("skips non-function middleware entries", async () => {
        let called = false;
        const mw = () => {
            called = true;
        };

        // Include non-function entries that should be skipped
        await executeMiddleware([null, undefined, "string", 123, mw], createRequest("/"));

        ok(called, "function middleware should still be called");
    });

    test("env defaults to empty object", async () => {
        let receivedEnv = null;
        const mw = (_req, env) => {
            receivedEnv = env;
        };

        await executeMiddleware([mw], createRequest("/"));

        deepStrictEqual(receivedEnv, {});
    });
});
