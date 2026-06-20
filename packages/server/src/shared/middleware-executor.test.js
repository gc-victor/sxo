/**
 * @fileoverview Tests for middleware executor utility.
 *
 * @module shared/middleware-executor.test
 */

import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { executeMiddleware } from "./middleware-executor.js";

describe("executeMiddleware", () => {
    it("returns null for empty middleware array", async () => {
        const request = new Request("http://example.com");
        const result = await executeMiddleware(request, []);

        assert.strictEqual(result, null);
    });

    it("returns null for undefined middleware array", async () => {
        const request = new Request("http://example.com");
        const result = await executeMiddleware(request, undefined);

        assert.strictEqual(result, null);
    });

    it("returns null for missing middleware array", async () => {
        const request = new Request("http://example.com");
        const result = await executeMiddleware(request);

        assert.strictEqual(result, null);
    });

    it("short-circuits on first middleware returning Response", async () => {
        const request = new Request("http://example.com");
        const response = new Response("Middleware handled");
        const middleware1 = mock.fn(() => response);
        const middleware2 = mock.fn();

        const result = await executeMiddleware(request, [middleware1, middleware2]);

        assert.ok(result instanceof Response);
        assert.strictEqual(await result.text(), "Middleware handled");
        assert.strictEqual(middleware1.mock.callCount(), 1);
        assert.strictEqual(middleware2.mock.callCount(), 0);
    });

    it("executes middleware in order", async () => {
        const request = new Request("http://example.com");
        const order = [];
        const middleware1 = mock.fn(async () => {
            order.push(1);
            return undefined;
        });
        const middleware2 = mock.fn(async () => {
            order.push(2);
            return undefined;
        });
        const middleware3 = mock.fn(async () => {
            order.push(3);
            return new Response("Third");
        });

        const result = await executeMiddleware(request, [middleware1, middleware2, middleware3]);

        assert.ok(result instanceof Response);
        assert.deepStrictEqual(order, [1, 2, 3]);
    });

    it("continues to next middleware when middleware returns void", async () => {
        const request = new Request("http://example.com");
        const middleware1 = mock.fn(() => undefined);
        const middleware2 = mock.fn(() => new Response("Second"));
        const middleware3 = mock.fn();

        const result = await executeMiddleware(request, [middleware1, middleware2, middleware3]);

        assert.ok(result instanceof Response);
        assert.strictEqual(middleware1.mock.callCount(), 1);
        assert.strictEqual(middleware2.mock.callCount(), 1);
        assert.strictEqual(middleware3.mock.callCount(), 0);
    });

    it("propagates error when middleware throws synchronously", async () => {
        const request = new Request("http://example.com");
        const middleware1 = mock.fn(() => {
            throw new Error("Middleware error");
        });
        const middleware2 = mock.fn(() => new Response("Second"));

        await assert.rejects(() => executeMiddleware(request, [middleware1, middleware2]), /Middleware error/);
        assert.strictEqual(middleware1.mock.callCount(), 1);
        assert.strictEqual(middleware2.mock.callCount(), 0);
    });

    it("skips non-function middleware", async () => {
        const request = new Request("http://example.com");
        const middleware = mock.fn(() => new Response("Middleware"));

        const result = await executeMiddleware(request, [null, undefined, "string", 123, middleware]);

        assert.ok(result instanceof Response);
        assert.strictEqual(middleware.mock.callCount(), 1);
    });

    it("passes request and env to middleware", async () => {
        const request = new Request("http://example.com");
        const env = { key: "value" };
        const middleware = mock.fn((req, envParam) => {
            assert.strictEqual(req, request);
            assert.strictEqual(envParam, env);
            return undefined;
        });

        await executeMiddleware(request, [middleware], env);

        assert.strictEqual(middleware.mock.callCount(), 1);
    });

    it("continues when middleware returns non-Response value", async () => {
        const request = new Request("http://example.com");
        const middleware1 = mock.fn(() => "string");
        const middleware2 = mock.fn(() => 123);
        const middleware3 = mock.fn(() => {});
        const middleware4 = mock.fn(() => new Response("Fourth"));

        const result = await executeMiddleware(request, [middleware1, middleware2, middleware3, middleware4]);

        assert.ok(result instanceof Response);
        assert.strictEqual(middleware1.mock.callCount(), 1);
        assert.strictEqual(middleware2.mock.callCount(), 1);
        assert.strictEqual(middleware3.mock.callCount(), 1);
        assert.strictEqual(middleware4.mock.callCount(), 1);
    });

    it("propagates error when async middleware throws", async () => {
        const request = new Request("http://example.com");
        const middleware1 = mock.fn(async () => {
            await Promise.resolve();
            throw new Error("Async error");
        });
        const middleware2 = mock.fn(() => new Response("Second"));

        await assert.rejects(() => executeMiddleware(request, [middleware1, middleware2]), /Async error/);
        assert.strictEqual(middleware1.mock.callCount(), 1);
        assert.strictEqual(middleware2.mock.callCount(), 0);
    });

    it("defaults env to empty object", async () => {
        const request = new Request("http://example.com");
        const middleware = mock.fn((_req, env) => {
            assert.deepStrictEqual(env, {});
            return undefined;
        });

        await executeMiddleware(request, [middleware]);

        assert.strictEqual(middleware.mock.callCount(), 1);
    });

    it("applies default security headers to middleware response", async () => {
        const request = new Request("http://example.com");
        const middleware = mock.fn(() => new Response("OK", { status: 200 }));

        const result = await executeMiddleware(request, [middleware]);

        assert.ok(result instanceof Response);
        assert.strictEqual(result.headers.get("X-Content-Type-Options"), "nosniff");
        assert.strictEqual(result.headers.get("X-Frame-Options"), "DENY");
        assert.strictEqual(await result.text(), "OK");
    });

    it("applies custom security headers over defaults", async () => {
        const request = new Request("http://example.com");
        const middleware = mock.fn(() => new Response("OK", { status: 200 }));

        const result = await executeMiddleware(
            request,
            [middleware],
            {},
            {
                securityHeaders: { "X-Frame-Options": "SAMEORIGIN" },
            },
        );

        assert.ok(result instanceof Response);
        assert.strictEqual(result.headers.get("X-Frame-Options"), "SAMEORIGIN");
        assert.strictEqual(result.headers.get("X-Content-Type-Options"), "nosniff");
    });

    it("blocks middleware from overriding protected headers by default", async () => {
        const request = new Request("http://example.com");
        const middleware = mock.fn(
            () =>
                new Response("OK", {
                    headers: { "X-Frame-Options": "SAMEORIGIN" },
                }),
        );

        const result = await executeMiddleware(request, [middleware]);

        assert.strictEqual(result.headers.get("X-Frame-Options"), "DENY");
    });

    it("allows middleware to override protected headers when allowOverride is true", async () => {
        const request = new Request("http://example.com");
        const middleware = mock.fn(
            () =>
                new Response("OK", {
                    headers: { "X-Frame-Options": "SAMEORIGIN" },
                }),
        );

        const result = await executeMiddleware(request, [middleware], {}, { allowOverride: true });

        assert.strictEqual(result.headers.get("X-Frame-Options"), "SAMEORIGIN");
    });

    it("strips body for HEAD requests", async () => {
        const request = new Request("http://example.com", { method: "HEAD" });
        const middleware = mock.fn(() => new Response("Body content", { status: 200 }));

        const result = await executeMiddleware(request, [middleware]);

        assert.ok(result instanceof Response);
        assert.strictEqual(result.body, null);
        assert.strictEqual(result.status, 200);
    });

    it("passes context as third argument to middleware", async () => {
        const request = new Request("http://example.com");
        const context = { render: async () => "<html><body>rendered</body></html>" };
        const middleware = mock.fn((_req, _env, ctx) => {
            assert.ok(ctx, "context should be defined");
            assert.strictEqual(ctx, context);
            return undefined;
        });

        const result = await executeMiddleware(request, [middleware], {}, {}, context);

        assert.strictEqual(result, null);
        assert.strictEqual(middleware.mock.callCount(), 1);
    });

    it("passes empty context when context is omitted", async () => {
        const request = new Request("http://example.com");
        const middleware = mock.fn((_req, _env, ctx) => {
            assert.ok(ctx, "context should be defined");
            assert.deepStrictEqual(ctx, {});
            return undefined;
        });

        const result = await executeMiddleware(request, [middleware]);

        assert.strictEqual(result, null);
        assert.strictEqual(middleware.mock.callCount(), 1);
    });

    it("backward compat: middleware ignoring third argument still works", async () => {
        const _request = new Request("http://example.com");
        // Middleware that only uses request and env (no third param)
        const middleware = mock.fn((req) => {
            if (req.url.includes("/block")) {
                return new Response("Blocked", { status: 403 });
            }
            return undefined;
        });

        // Should short-circuit for /block
        const result = await executeMiddleware(new Request("http://example.com/block"), [middleware]);
        assert.ok(result instanceof Response);
        assert.strictEqual(result.status, 403);
        assert.strictEqual(await result.text(), "Blocked");

        // Should pass through for other paths
        const result2 = await executeMiddleware(new Request("http://example.com/pass"), [middleware]);
        assert.strictEqual(result2, null);

        assert.strictEqual(middleware.mock.callCount(), 2);
    });
});
