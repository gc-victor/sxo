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
import { Buffer } from "node:buffer";
import { EventEmitter } from "node:events";
import { Readable } from "node:stream"; // Used in createMockReq
import { describe, test } from "node:test";

// These imports will fail initially (RED phase) until implementation exists
import {
    fromWebResponse,
    isHeadRequest,
    maybeHeadResponse,
    notFoundResponse,
    serverErrorResponse,
    toHeadResponse,
    toWebRequest,
} from "./http-adapters.js";

// --- Mock helpers ---

/**
 * Create a mock Node.js IncomingMessage.
 * @param {object} options - Options for the mock
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
    describe("URL construction", () => {
        test("should construct correct URL from HTTP request", () => {
            // Arrange
            const req = createMockReq({
                url: "/api/users",
                headers: { host: "example.com:8080" },
            });

            // Act
            const webRequest = toWebRequest(req, 8080);

            // Assert
            assert.strictEqual(webRequest.url, "http://example.com:8080/api/users");
        });

        test("should construct HTTPS URL when socket is encrypted", () => {
            // Arrange
            const req = createMockReq({
                url: "/secure",
                headers: { host: "secure.example.com" },
                encrypted: true,
            });

            // Act
            const webRequest = toWebRequest(req, 443);

            // Assert
            assert.ok(webRequest.url.startsWith("https://"));
        });

        test("should fall back to localhost when host header missing", () => {
            // Arrange
            const req = createMockReq({ url: "/test" });
            delete req.headers.host;

            // Act
            const webRequest = toWebRequest(req, 3000);

            // Assert
            assert.ok(webRequest.url.includes("localhost:3000"));
        });

        test("should preserve query string from original URL", () => {
            // Arrange
            const req = createMockReq({
                url: "/search?q=test&page=2",
                headers: { host: "example.com" },
            });

            // Act
            const webRequest = toWebRequest(req, 80);

            // Assert
            const url = new URL(webRequest.url);
            assert.strictEqual(url.searchParams.get("q"), "test");
            assert.strictEqual(url.searchParams.get("page"), "2");
        });
    });

    describe("HTTP method handling", () => {
        test("should preserve GET method", () => {
            // Arrange
            const req = createMockReq({ method: "GET" });

            // Act
            const webRequest = toWebRequest(req, 3000);

            // Assert
            assert.strictEqual(webRequest.method, "GET");
        });

        test("should preserve POST method", () => {
            // Arrange
            const req = createMockReq({ method: "POST" });

            // Act
            const webRequest = toWebRequest(req, 3000);

            // Assert
            assert.strictEqual(webRequest.method, "POST");
        });

        test("should preserve HEAD method", () => {
            // Arrange
            const req = createMockReq({ method: "HEAD" });

            // Act
            const webRequest = toWebRequest(req, 3000);

            // Assert
            assert.strictEqual(webRequest.method, "HEAD");
        });
    });

    describe("header conversion", () => {
        test("should convert all headers to Web Standard Headers", () => {
            // Arrange
            const req = createMockReq({
                headers: {
                    host: "example.com",
                    "content-type": "application/json",
                    "x-custom-header": "custom-value",
                },
            });

            // Act
            const webRequest = toWebRequest(req, 3000);

            // Assert
            assert.strictEqual(webRequest.headers.get("content-type"), "application/json");
            assert.strictEqual(webRequest.headers.get("x-custom-header"), "custom-value");
        });

        test("should handle array header values", () => {
            // Arrange
            const req = createMockReq({
                headers: {
                    host: "example.com",
                    "set-cookie": ["a=1", "b=2"],
                },
            });

            // Act
            const webRequest = toWebRequest(req, 3000);

            // Assert
            // Web Standard Headers joins array values with ", "
            const cookie = webRequest.headers.get("set-cookie");
            assert.ok(cookie.includes("a=1"));
        });
    });

    describe("request body handling", () => {
        test("should not include body for GET requests", () => {
            // Arrange
            const req = createMockReq({ method: "GET" });

            // Act
            const webRequest = toWebRequest(req, 3000);

            // Assert
            assert.strictEqual(webRequest.body, null);
        });

        test("should not include body for HEAD requests", () => {
            // Arrange
            const req = createMockReq({ method: "HEAD" });

            // Act
            const webRequest = toWebRequest(req, 3000);

            // Assert
            assert.strictEqual(webRequest.body, null);
        });

        test("should include readable stream body for POST requests", () => {
            // Arrange
            const req = createMockReq({
                method: "POST",
                body: JSON.stringify({ name: "test" }),
                headers: { "content-type": "application/json" },
            });

            // Act
            const webRequest = toWebRequest(req, 3000);

            // Assert
            assert.ok(webRequest.body !== null, "POST request should have body");
        });

        test("should allow reading body as text for POST", async () => {
            // Arrange
            const bodyContent = JSON.stringify({ name: "test" });
            const req = createMockReq({
                method: "POST",
                body: bodyContent,
                headers: { "content-type": "application/json" },
            });

            // Act
            const webRequest = toWebRequest(req, 3000);
            const text = await webRequest.text();

            // Assert
            assert.strictEqual(text, bodyContent);
        });

        test("should include body for PUT requests", async () => {
            // Arrange
            const bodyContent = "update data";
            const req = createMockReq({
                method: "PUT",
                body: bodyContent,
            });

            // Act
            const webRequest = toWebRequest(req, 3000);
            const text = await webRequest.text();

            // Assert
            assert.strictEqual(text, bodyContent);
        });
    });
});

// --- fromWebResponse() tests ---

describe("fromWebResponse", () => {
    describe("status code handling", () => {
        test("should write status code from Web Response to Node.js response", async () => {
            // Arrange
            const webResponse = new Response("OK", { status: 200 });
            const req = createMockReq({ method: "GET" });
            const { res, getOutput } = createMockRes();

            // Act
            await fromWebResponse(webResponse, req, res);

            // Assert
            assert.strictEqual(getOutput().status, 200);
        });

        test("should preserve 404 status code", async () => {
            // Arrange
            const webResponse = new Response("Not Found", { status: 404 });
            const req = createMockReq({ method: "GET" });
            const { res, getOutput } = createMockRes();

            // Act
            await fromWebResponse(webResponse, req, res);

            // Assert
            assert.strictEqual(getOutput().status, 404);
        });

        test("should preserve 500 status code", async () => {
            // Arrange
            const webResponse = new Response("Error", { status: 500 });
            const req = createMockReq({ method: "GET" });
            const { res, getOutput } = createMockRes();

            // Act
            await fromWebResponse(webResponse, req, res);

            // Assert
            assert.strictEqual(getOutput().status, 500);
        });
    });

    describe("header conversion", () => {
        test("should convert Web Response headers to Node.js response", async () => {
            // Arrange
            const webResponse = new Response("Content", {
                status: 200,
                headers: {
                    "Content-Type": "text/html; charset=utf-8",
                    "Cache-Control": "no-cache",
                },
            });
            const req = createMockReq({ method: "GET" });
            const { res, getOutput } = createMockRes();

            // Act
            await fromWebResponse(webResponse, req, res);

            // Assert
            const output = getOutput();
            assert.strictEqual(output.headers["content-type"], "text/html; charset=utf-8");
            assert.strictEqual(output.headers["cache-control"], "no-cache");
        });
    });

    describe("body handling", () => {
        test("should write response body to Node.js response", async () => {
            // Arrange
            const webResponse = new Response("Hello World", { status: 200 });
            const req = createMockReq({ method: "GET" });
            const { res, getOutput } = createMockRes();

            // Act
            await fromWebResponse(webResponse, req, res);

            // Assert
            assert.strictEqual(getOutput().body, "Hello World");
        });

        test("should not write body for HEAD requests", async () => {
            // Arrange
            const webResponse = new Response("Body Content", { status: 200 });
            const req = createMockReq({ method: "HEAD" });
            const { res, getOutput } = createMockRes();

            // Act
            await fromWebResponse(webResponse, req, res);

            // Assert
            assert.strictEqual(getOutput().body, "");
        });

        test("should handle empty body responses", async () => {
            // Arrange
            const webResponse = new Response(null, { status: 204 });
            const req = createMockReq({ method: "GET" });
            const { res, getOutput } = createMockRes();

            // Act
            await fromWebResponse(webResponse, req, res);

            // Assert
            assert.strictEqual(getOutput().status, 204);
            assert.strictEqual(getOutput().body, "");
        });
    });

    describe("streaming responses", () => {
        test("should handle text response body", async () => {
            // Arrange
            const webResponse = new Response("Streaming text content", { status: 200 });
            const req = createMockReq({ method: "GET" });
            const { res, getOutput } = createMockRes();

            // Act
            await fromWebResponse(webResponse, req, res);

            // Assert
            assert.strictEqual(getOutput().body, "Streaming text content");
        });

        test("should handle ReadableStream body", async () => {
            // Arrange
            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode("chunk1"));
                    controller.enqueue(encoder.encode("chunk2"));
                    controller.close();
                },
            });
            const webResponse = new Response(stream, {
                status: 200,
                headers: { "Content-Type": "text/plain" },
            });
            const req = createMockReq({ method: "GET" });
            const { res, getOutput } = createMockRes();

            // Act
            await fromWebResponse(webResponse, req, res);

            // Assert
            assert.strictEqual(getOutput().body, "chunk1chunk2");
        });

        test("should not corrupt binary ReadableStream bodies", async () => {
            // Arrange
            const bytes = new Uint8Array([0x77, 0x4f, 0x46, 0x32, 0x00, 0x01, 0x02, 0xff]); // "wOF2" ...
            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(bytes);
                    controller.close();
                },
            });

            const webResponse = new Response(stream, {
                status: 200,
                headers: { "Content-Type": "font/woff2" },
            });
            const req = createMockReq({ method: "GET" });
            const { res, getOutput } = createMockRes();

            // Act
            await fromWebResponse(webResponse, req, res);

            // Assert
            assert.deepStrictEqual(new Uint8Array(getOutput().bytes), bytes);
        });
    });

    describe("null response handling", () => {
        test("should return 404 when webResponse is null", async () => {
            // Arrange
            const req = createMockReq({ method: "GET" });
            const { res, getOutput } = createMockRes();

            // Act
            await fromWebResponse(null, req, res);

            // Assert
            assert.strictEqual(getOutput().status, 404);
            assert.strictEqual(getOutput().body, "Not found");
        });
    });
});

// --- isHeadRequest() tests ---

describe("isHeadRequest", () => {
    describe("with Web Standard Request", () => {
        test("should return true for HEAD Request", () => {
            // Arrange
            const request = new Request("http://localhost/", { method: "HEAD" });

            // Act
            const result = isHeadRequest(request);

            // Assert
            assert.strictEqual(result, true);
        });

        test("should return false for GET Request", () => {
            // Arrange
            const request = new Request("http://localhost/", { method: "GET" });

            // Act
            const result = isHeadRequest(request);

            // Assert
            assert.strictEqual(result, false);
        });

        test("should return false for POST Request", () => {
            // Arrange
            const request = new Request("http://localhost/", { method: "POST" });

            // Act
            const result = isHeadRequest(request);

            // Assert
            assert.strictEqual(result, false);
        });
    });

    describe("with Node.js IncomingMessage", () => {
        test("should return true for HEAD IncomingMessage", () => {
            // Arrange
            const req = createMockReq({ method: "HEAD" });

            // Act
            const result = isHeadRequest(req);

            // Assert
            assert.strictEqual(result, true);
        });

        test("should return false for GET IncomingMessage", () => {
            // Arrange
            const req = createMockReq({ method: "GET" });

            // Act
            const result = isHeadRequest(req);

            // Assert
            assert.strictEqual(result, false);
        });
    });

    describe("edge cases", () => {
        test("should be case-insensitive for method comparison", () => {
            // Arrange
            const req = { method: "head" }; // lowercase

            // Act
            const result = isHeadRequest(req);

            // Assert
            assert.strictEqual(result, true);
        });
    });
});

// --- toHeadResponse() tests ---

describe("toHeadResponse", () => {
    test("should strip body but preserve status code", () => {
        // Arrange
        const originalResponse = new Response("Body content", { status: 200 });

        // Act
        const headResponse = toHeadResponse(originalResponse);

        // Assert
        assert.strictEqual(headResponse.status, 200);
        assert.strictEqual(headResponse.body, null);
    });

    test("should preserve all headers from original response", () => {
        // Arrange
        const originalResponse = new Response("Content", {
            status: 200,
            headers: {
                "Content-Type": "text/html; charset=utf-8",
                "Cache-Control": "no-cache",
                "X-Custom-Header": "custom-value",
            },
        });

        // Act
        const headResponse = toHeadResponse(originalResponse);

        // Assert
        assert.strictEqual(headResponse.headers.get("Content-Type"), "text/html; charset=utf-8");
        assert.strictEqual(headResponse.headers.get("Cache-Control"), "no-cache");
        assert.strictEqual(headResponse.headers.get("X-Custom-Header"), "custom-value");
    });

    test("should work with different status codes", () => {
        // Arrange & Act
        const response404 = toHeadResponse(new Response("Not Found", { status: 404 }));
        const response500 = toHeadResponse(new Response("Error", { status: 500 }));
        const response201 = toHeadResponse(new Response("Created", { status: 201 }));

        // Assert
        assert.strictEqual(response404.status, 404);
        assert.strictEqual(response500.status, 500);
        assert.strictEqual(response201.status, 201);
        assert.strictEqual(response404.body, null);
        assert.strictEqual(response500.body, null);
        assert.strictEqual(response201.body, null);
    });
});

// --- maybeHeadResponse() tests ---

describe("maybeHeadResponse", () => {
    test("should strip body for HEAD requests", () => {
        // Arrange
        const response = new Response("Body content", { status: 200 });
        const headRequest = new Request("http://localhost/", { method: "HEAD" });

        // Act
        const result = maybeHeadResponse(response, headRequest);

        // Assert
        assert.strictEqual(result.status, 200);
        assert.strictEqual(result.body, null);
    });

    test("should preserve body for GET requests", async () => {
        // Arrange
        const response = new Response("Body content", { status: 200 });
        const getRequest = new Request("http://localhost/", { method: "GET" });

        // Act
        const result = maybeHeadResponse(response, getRequest);

        // Assert
        assert.strictEqual(result.status, 200);
        const text = await result.text();
        assert.strictEqual(text, "Body content");
    });

    test("should preserve body for POST requests", async () => {
        // Arrange
        const response = new Response("Body content", { status: 200 });
        const postRequest = new Request("http://localhost/", { method: "POST" });

        // Act
        const result = maybeHeadResponse(response, postRequest);

        // Assert
        assert.strictEqual(result.status, 200);
        const text = await result.text();
        assert.strictEqual(text, "Body content");
    });

    test("should work with Node.js IncomingMessage for HEAD", () => {
        // Arrange
        const response = new Response("Body content", { status: 200 });
        const headReq = createMockReq({ method: "HEAD" });

        // Act
        const result = maybeHeadResponse(response, headReq);

        // Assert
        assert.strictEqual(result.status, 200);
        assert.strictEqual(result.body, null);
    });

    test("should preserve headers in both cases", () => {
        // Arrange
        const response = new Response("Content", {
            status: 200,
            headers: { "Cache-Control": "no-cache" },
        });
        const headRequest = new Request("http://localhost/", { method: "HEAD" });
        const getRequest = new Request("http://localhost/", { method: "GET" });

        // Act
        const headResult = maybeHeadResponse(response, headRequest);
        const getResult = maybeHeadResponse(response, getRequest);

        // Assert
        assert.strictEqual(headResult.headers.get("Cache-Control"), "no-cache");
        assert.strictEqual(getResult.headers.get("Cache-Control"), "no-cache");
    });
});

// --- notFoundResponse() tests ---

describe("notFoundResponse", () => {
    test("should return 404 status code", () => {
        // Act
        const response = notFoundResponse();

        // Assert
        assert.strictEqual(response.status, 404);
    });

    test("should return plain text Not Found body", async () => {
        // Act
        const response = notFoundResponse();
        const text = await response.text();

        // Assert
        assert.strictEqual(text, "Not Found");
    });

    test("should have correct Content-Type header", () => {
        // Act
        const response = notFoundResponse();

        // Assert
        assert.strictEqual(response.headers.get("Content-Type"), "text/plain; charset=utf-8");
    });

    test("should have must-revalidate Cache-Control header", () => {
        // Act
        const response = notFoundResponse();

        // Assert
        assert.strictEqual(response.headers.get("Cache-Control"), "public, max-age=0, must-revalidate");
    });

    test("should strip body when request is HEAD", () => {
        // Arrange
        const headRequest = new Request("http://localhost/", { method: "HEAD" });

        // Act
        const response = notFoundResponse(headRequest);

        // Assert
        assert.strictEqual(response.status, 404);
        assert.strictEqual(response.body, null);
        assert.strictEqual(response.headers.get("Content-Type"), "text/plain; charset=utf-8");
    });

    test("should preserve body when request is GET", async () => {
        // Arrange
        const getRequest = new Request("http://localhost/", { method: "GET" });

        // Act
        const response = notFoundResponse(getRequest);
        const text = await response.text();

        // Assert
        assert.strictEqual(response.status, 404);
        assert.strictEqual(text, "Not Found");
    });

    test("should work with Node.js IncomingMessage HEAD request", () => {
        // Arrange
        const headReq = createMockReq({ method: "HEAD" });

        // Act
        const response = notFoundResponse(headReq);

        // Assert
        assert.strictEqual(response.status, 404);
        assert.strictEqual(response.body, null);
    });
});

// --- serverErrorResponse() tests ---

describe("serverErrorResponse", () => {
    test("should return 500 status code", () => {
        // Act
        const response = serverErrorResponse();

        // Assert
        assert.strictEqual(response.status, 500);
    });

    test("should return plain text Internal Server Error body", async () => {
        // Act
        const response = serverErrorResponse();
        const text = await response.text();

        // Assert
        assert.strictEqual(text, "Internal Server Error");
    });

    test("should have correct Content-Type header", () => {
        // Act
        const response = serverErrorResponse();

        // Assert
        assert.strictEqual(response.headers.get("Content-Type"), "text/plain; charset=utf-8");
    });

    test("should have no-store Cache-Control header", () => {
        // Act
        const response = serverErrorResponse();

        // Assert
        assert.strictEqual(response.headers.get("Cache-Control"), "no-store");
    });

    test("should strip body when request is HEAD", () => {
        // Arrange
        const headRequest = new Request("http://localhost/", { method: "HEAD" });

        // Act
        const response = serverErrorResponse(headRequest);

        // Assert
        assert.strictEqual(response.status, 500);
        assert.strictEqual(response.body, null);
        assert.strictEqual(response.headers.get("Content-Type"), "text/plain; charset=utf-8");
    });

    test("should preserve body when request is GET", async () => {
        // Arrange
        const getRequest = new Request("http://localhost/", { method: "GET" });

        // Act
        const response = serverErrorResponse(getRequest);
        const text = await response.text();

        // Assert
        assert.strictEqual(response.status, 500);
        assert.strictEqual(text, "Internal Server Error");
    });

    test("should work with Node.js IncomingMessage HEAD request", () => {
        // Arrange
        const headReq = createMockReq({ method: "HEAD" });

        // Act
        const response = serverErrorResponse(headReq);

        // Assert
        assert.strictEqual(response.status, 500);
        assert.strictEqual(response.body, null);
    });
});
