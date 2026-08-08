/**
 * @fileoverview Tests for server logger.
 *
 * @module server/utils/logger.test
 */

import assert from "node:assert/strict";
import { describe, mock, test } from "node:test";
import {
    createDestination,
    createLogger,
    customErrorMessage,
    customLogLevel,
    customSuccessMessage,
    httpDenoLogger,
    ignorePath,
    levelLabel,
    logger,
    messageFormat,
    reqSerializer,
    resSerializer,
} from "./logger.js";

describe("logger utilities", () => {
    test("createDestination returns pretty in dev and stdout in prod", () => {
        const prodDest = createDestination(false, process.stdout);
        assert.strictEqual(prodDest, process.stdout);

        const devDest = createDestination(true, process.stdout);
        assert.ok(devDest !== process.stdout);
    });

    test("messageFormat handles various log formats", () => {
        // Log with req and responseTime
        const log1 = { req: { url: "/test" }, responseTime: 100 };
        const result1 = messageFormat(log1, "msg");
        assert.ok(result1.includes("/test"));
        assert.ok(result1.includes("100ms"));

        // Log with message key
        const log2 = { msg: "Hello World" };
        const result2 = messageFormat(log2, "msg");
        assert.strictEqual(result2, "Hello World");

        // Log with missing message key
        const result3 = messageFormat({}, "msg");
        assert.strictEqual(result3, "");

        // Partial req object
        assert.strictEqual(messageFormat({ req: {} }, "msg"), "");
        assert.strictEqual(messageFormat({ req: { url: "/test" } }, "msg"), "");
        assert.strictEqual(messageFormat({ responseTime: 100 }, "msg"), "");
    });

    test("levelLabel prettifier", () => {
        assert.strictEqual(levelLabel(null, null, { level: 30 }), "INFO");
        assert.strictEqual(levelLabel(null, null, { level: 40 }), "40");
    });

    test("ignorePath for well-known and others", () => {
        assert.strictEqual(ignorePath({ url: "/.well-known/test" }), true);
        assert.strictEqual(ignorePath({ url: "/api/test" }), false);
        assert.strictEqual(ignorePath({}), false);
    });

    test("customLogLevel based on status code and error", () => {
        assert.strictEqual(customLogLevel(null, { statusCode: 200 }), "info");
        assert.strictEqual(customLogLevel(null, { statusCode: 404 }), "warn");
        assert.strictEqual(customLogLevel(null, { statusCode: 500 }), "error");
        assert.strictEqual(customLogLevel(null, { statusCode: 501 }), "error");
        assert.strictEqual(customLogLevel(null, { statusCode: 200 }, new Error()), "error");
    });

    test("customSuccessMessage format", () => {
        const msg = customSuccessMessage({ method: "GET", url: "/foo" }, null, 10);
        assert.strictEqual(msg, "[GET /foo] (10ms)");
    });

    test("customErrorMessage format", () => {
        const msg = customErrorMessage({ method: "POST", url: "/bar" }, null, new Error("Boom"));
        assert.strictEqual(msg, "[POST /bar] (Boom)");
    });

    test("reqSerializer", () => {
        const req = { method: "GET", url: "/baz", socket: { remoteAddress: "1.1.1.1" } };
        const serialized = reqSerializer(req);
        assert.strictEqual(serialized.method, "GET");
        assert.strictEqual(serialized.url, "/baz");
        assert.strictEqual(serialized.remoteAddress, "1.1.1.1");

        const emptyReq = {};
        const emptySerialized = reqSerializer(emptyReq);
        assert.strictEqual(emptySerialized.method, "");
        assert.strictEqual(emptySerialized.url, "");
        assert.strictEqual(emptySerialized.remoteAddress, undefined);

        assert.strictEqual(reqSerializer({ socket: {} }).remoteAddress, undefined);
    });

    test("resSerializer", () => {
        const serialized = resSerializer({ statusCode: 201 });
        assert.strictEqual(serialized.statusCode, 201);
    });

    test("should skip logging for /.well-known/ paths", () => {
        const request = new Request("https://example.com/.well-known/test");

        const log = httpDenoLogger(request);

        // Mock logger to verify it's NOT called
        const infoMock = mock.method(logger, "info", () => {});
        log.finish(new Response("OK"));

        assert.strictEqual(infoMock.mock.callCount(), 0);
        infoMock.mock.restore();
    });

    test("should log for regular paths", () => {
        const request = new Request("https://example.com/api/test");
        const log = httpDenoLogger(request);

        const infoMock = mock.method(logger, "info", () => {});
        log.finish(new Response("OK", { status: 200 }));

        assert.strictEqual(infoMock.mock.callCount(), 1);
        infoMock.mock.restore();
    });

    test("should use error level for 5xx status codes", () => {
        const request = new Request("https://example.com/error");
        const log = httpDenoLogger(request);

        const errorMock = mock.method(logger, "error", () => {});
        log.finish(new Response("Error", { status: 500 }));

        assert.strictEqual(errorMock.mock.callCount(), 1);
        errorMock.mock.restore();
    });

    test("should use warn level for 4xx status codes", () => {
        const request = new Request("https://example.com/missing");
        const log = httpDenoLogger(request);

        const warnMock = mock.method(logger, "warn", () => {});
        log.finish(new Response("Not Found", { status: 404 }));

        assert.strictEqual(warnMock.mock.callCount(), 1);
        warnMock.mock.restore();
    });

    test("httpDenoLogger handles remote address from info", () => {
        const request = new Request("https://example.com/test");
        const info = {
            remoteAddr: { hostname: "1.2.3.4" },
        };

        const log = httpDenoLogger(request, info);
        const infoMock = mock.method(logger, "info", () => {});
        log.finish(new Response("OK"));

        assert.strictEqual(infoMock.mock.calls[0].arguments[0].req.remoteAddress, "1.2.3.4");
        infoMock.mock.restore();

        // Edge case: info without remoteAddr
        const log2 = httpDenoLogger(request, {});
        const infoMock2 = mock.method(logger, "info", () => {});
        log2.finish(new Response("OK"));
        assert.strictEqual(infoMock2.mock.calls[0].arguments[0].req.remoteAddress, undefined);
        infoMock2.mock.restore();
    });

    test("createLogger handles different environments and levels", () => {
        // Dev mode (default)
        const devLogger = createLogger({ isDev: true });
        assert.strictEqual(devLogger.level, "debug");

        // Prod mode
        const prodLogger = createLogger({ isDev: false });
        assert.strictEqual(prodLogger.level, "info");

        // Explicit level
        const customLogger = createLogger({ logLevel: "error" });
        assert.strictEqual(customLogger.level, "error");

        // Explicit level with prod mode
        const prodErrorLogger = createLogger({ isDev: false, logLevel: "error" });
        assert.strictEqual(prodErrorLogger.level, "error");
    });
});
