/**
 * @fileoverview Tests for HTTP adapter utilities.
 *
 * Covers:
 * - toWebRequest() - Convert Node.js IncomingMessage to Web Standard Request
 * - fromWebResponse() - Convert Web Standard Response to Node.js response
 * - isHeadRequest() - Check if request is HEAD method
 *
 * @module server/shared/http-adapters.test
 */

import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import { describe, test } from "node:test";

import { fromWebResponse, isHeadRequest, maybeHeadResponse, optionsResponse, toHeadResponse, toWebRequest } from "./http-adapters.js";

// --- Mock helpers ---

/**
 * Create a mock Node.js IncomingMessage.
 * @param {object} options - Options for mock
 * @returns {object} Mock IncomingMessage
 */
function createMockReq(options = {}) {
    const { method = "GET", url = "/", headers = {}, body = null, encrypted = false } = options;

    const req = new Readable({
        read() {
            if (body) {
                this.push(body);
            }
            this.push(null);
        },
    });

    req.method = method;
    req.url = url;
    req.headers = { host: "localhost:3000", ...headers };
    req.socket = { encrypted };

    return req;
}

/**
 * Create a mock Node.js ServerResponse.
 * @returns {{res: object, getOutput: () => {status: number, headers: object, body: string}}}
 */
function createMockRes() {
    let status = 200;
    let headers = {};
    /** @type {Buffer[]} */
    const chunks = [];
    let ended = false;

    const res = new EventEmitter();

    res.writeHead = (s, h = {}) => {
        status = s;
        headers = { ...headers, ...h };
    };

    res.setHeader = (key, value) => {
        headers[key] = value;
    };

    res.write = (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    };

    res.end = (chunk) => {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        ended = true;
    };

    res.writableEnded = false;
    Object.defineProperty(res, "writableEnded", {
        get: () => ended,
    });

    const getOutput = () => {
        const buffer = Buffer.concat(chunks);
        return {
            status,
            headers,
            body: buffer.toString("utf8"),
            bytes: buffer,
        };
    };

    return { res, getOutput };
}

// --- toWebRequest() tests ---

describe("toWebRequest", () => {
    test("should construct correct URL from various request options", () => {
        const urlTests = [
            {
                name: "standard HTTP",
                options: { url: "/api/users", headers: { host: "example.com:8080" } },
                port: 8080,
                expected: "http://example.com:8080/api/users",
            },
            {
                name: "with query params",
                options: { url: "/search?q=test&page=2", headers: { host: "example.com" } },
                port: 80,
                expected: "http://example.com/search?q=test&page=2",
            },
            {
                name: "HTTPS when encrypted",
                options: { url: "/secure", headers: { host: "secure.example.com" }, encrypted: true },
                port: 443,
                expected: "https://secure.example.com/secure",
            },
            {
                name: "fallback to localhost when host header missing",
                options: { url: "/test" },
                port: 3000,
                expected: "http://localhost:3000/test",
                before: (req) => delete req.headers.host,
            },
        ];

        for (const { name, options, port, expected, before } of urlTests) {
            const req = createMockReq(options);
            if (before) before(req);
            const webRequest = toWebRequest(req, port);
            assert.strictEqual(webRequest.url, expected, `Failed: ${name}`);
        }
    });

    test("should preserve HTTP methods", () => {
        const methods = ["GET", "POST", "HEAD", "PUT", "DELETE"];
        for (const method of methods) {
            const req = createMockReq({ method });
            const webRequest = toWebRequest(req, 3000);
            assert.strictEqual(webRequest.method, method);
        }
    });

    test("should convert headers to Web Standard Headers", () => {
        const req = createMockReq({
            headers: {
                host: "example.com",
                "content-type": "application/json",
                "x-custom-header": "custom-value",
                "set-cookie": ["a=1", "b=2"],
            },
        });

        const webRequest = toWebRequest(req, 3000);

        assert.strictEqual(webRequest.headers.get("content-type"), "application/json");
        assert.strictEqual(webRequest.headers.get("x-custom-header"), "custom-value");
        assert.ok(webRequest.headers.get("set-cookie").includes("a=1"));
    });

    test("should handle body based on method", async () => {
        const bodyContent = JSON.stringify({ name: "test" });

        // Methods without body
        for (const method of ["GET", "HEAD"]) {
            const req = createMockReq({ method });
            const webRequest = toWebRequest(req, 3000);
            assert.strictEqual(webRequest.body, null);
        }

        // Methods with body
        for (const method of ["POST", "PUT"]) {
            const req = createMockReq({
                method,
                body: bodyContent,
                headers: { "content-type": "application/json" },
            });
            const webRequest = toWebRequest(req, 3000);
            assert.ok(webRequest.body !== null);
            const text = await webRequest.text();
            assert.strictEqual(text, bodyContent);
        }
    });
});

// --- fromWebResponse() tests ---

describe("fromWebResponse", () => {
    test("should write status code, headers, and body", async () => {
        const statusCodes = [200, 404, 500];
        for (const status of statusCodes) {
            const webResponse = new Response("Content", {
                status,
                headers: {
                    "Content-Type": "text/html; charset=utf-8",
                    "Cache-Control": "no-cache",
                },
            });
            const req = createMockReq({ method: "GET" });
            const { res, getOutput } = createMockRes();

            await fromWebResponse(webResponse, req, res);

            assert.strictEqual(getOutput().status, status);
            assert.strictEqual(getOutput().headers["content-type"], "text/html; charset=utf-8");
            assert.strictEqual(getOutput().headers["cache-control"], "no-cache");
            assert.strictEqual(getOutput().body, "Content");
        }
    });

    test("should not write body for HEAD requests", async () => {
        const webResponse = new Response("Body Content", { status: 200 });
        const req = createMockReq({ method: "HEAD" });
        const { res, getOutput } = createMockRes();

        await fromWebResponse(webResponse, req, res);

        assert.strictEqual(getOutput().body, "");
    });

    test("should handle empty body responses", async () => {
        const webResponse = new Response(null, { status: 204 });
        const req = createMockReq({ method: "GET" });
        const { res, getOutput } = createMockRes();

        await fromWebResponse(webResponse, req, res);

        assert.strictEqual(getOutput().status, 204);
        assert.strictEqual(getOutput().body, "");
    });

    test("should handle ReadableStream bodies", async () => {
        // Text stream
        const encoder = new TextEncoder();
        const textStream = new ReadableStream({
            start(controller) {
                controller.enqueue(encoder.encode("chunk1"));
                controller.enqueue(encoder.encode("chunk2"));
                controller.close();
            },
        });
        const textResponse = new Response(textStream, {
            status: 200,
            headers: { "Content-Type": "text/plain" },
        });
        const req = createMockReq({ method: "GET" });
        const { res, getOutput } = createMockRes();

        await fromWebResponse(textResponse, req, res);
        assert.strictEqual(getOutput().body, "chunk1chunk2");

        // Binary stream
        const bytes = new Uint8Array([0x77, 0x4f, 0x46, 0x32, 0x00, 0x01, 0x02, 0xff]);
        const binaryStream = new ReadableStream({
            start(controller) {
                controller.enqueue(bytes);
                controller.close();
            },
        });
        const binaryResponse = new Response(binaryStream, {
            status: 200,
            headers: { "Content-Type": "font/woff2" },
        });
        const { res: res2, getOutput: getOutput2 } = createMockRes();

        await fromWebResponse(binaryResponse, req, res2);
        assert.deepStrictEqual(new Uint8Array(getOutput2().bytes), bytes);
    });

    test("should return 404 when webResponse is null", async () => {
        const req = createMockReq({ method: "GET" });
        const { res, getOutput } = createMockRes();

        await fromWebResponse(null, req, res);

        assert.strictEqual(getOutput().status, 404);
        assert.strictEqual(getOutput().body, "Not found");
    });
});

// --- isHeadRequest() tests ---

describe("isHeadRequest", () => {
    test("should detect HEAD method for various request types", () => {
        const cases = [
            { name: "Web Request HEAD", req: new Request("http://localhost/", { method: "HEAD" }), expected: true },
            { name: "Web Request GET", req: new Request("http://localhost/", { method: "GET" }), expected: false },
            { name: "Node.js MockReq HEAD", req: createMockReq({ method: "HEAD" }), expected: true },
            { name: "Node.js MockReq GET", req: createMockReq({ method: "GET" }), expected: false },
            { name: "Case-insensitive lowercase head", req: { method: "head" }, expected: true },
            { name: "Case-insensitive uppercase HEAD", req: { method: "HEAD" }, expected: true },
        ];

        for (const { name, req, expected } of cases) {
            assert.strictEqual(isHeadRequest(req), expected, `Failed: ${name}`);
        }
    });
});

// --- toHeadResponse() tests ---

describe("toHeadResponse", () => {
    test("should strip body and preserve metadata", () => {
        const testCases = [
            {
                status: 200,
                headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache", "X-Custom": "val" },
            },
            { status: 404 },
            { status: 500 },
            { status: 201 },
        ];

        for (const { status, headers = {} } of testCases) {
            const original = new Response("Body content", { status, headers });
            const headResponse = toHeadResponse(original);

            assert.strictEqual(headResponse.status, status);
            assert.strictEqual(headResponse.body, null);
            for (const [key, value] of Object.entries(headers)) {
                assert.strictEqual(headResponse.headers.get(key), value);
            }
        }
    });
});

// --- maybeHeadResponse() tests ---

describe("maybeHeadResponse", () => {
    test("should handle body based on request method", async () => {
        const testCases = [
            { name: "Web Request HEAD", method: "HEAD", isWeb: true, expectBody: false },
            { name: "Web Request GET", method: "GET", isWeb: true, expectBody: true },
            { name: "Web Request POST", method: "POST", isWeb: true, expectBody: true },
            { name: "Node.js MockReq HEAD", method: "HEAD", isWeb: false, expectBody: false },
        ];

        for (const { name, method, isWeb, expectBody } of testCases) {
            const baseResponse = new Response("Body content", {
                status: 200,
                headers: { "Cache-Control": "no-cache" },
            });
            const req = isWeb ? new Request("http://localhost/", { method }) : createMockReq({ method });

            const result = maybeHeadResponse(baseResponse, req);
            assert.strictEqual(result.status, 200, `Status mismatch in: ${name}`);
            assert.strictEqual(result.headers.get("Cache-Control"), "no-cache", `Header mismatch in: ${name}`);

            if (expectBody) {
                assert.strictEqual(await result.text(), "Body content", `Body should be present in: ${name}`);
            } else {
                assert.strictEqual(result.body, null, `Body should be null in: ${name}`);
            }
        }
    });
});

// --- optionsResponse() tests ---

describe("optionsResponse", () => {
    test("should return 204 No Content with no body", () => {
        const response = optionsResponse();
        assert.strictEqual(response.status, 204);
        assert.strictEqual(response.body, null);
    });
});
