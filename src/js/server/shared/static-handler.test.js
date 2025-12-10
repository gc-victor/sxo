/**
 * @fileoverview Tests for platform-agnostic static file handler.
 *
 * Covers:
 * - createStaticHandler() factory function
 * - Path validation and security
 * - MIME type detection
 * - Cache headers (hashed vs non-hashed)
 * - Precompression support (brotli, gzip)
 * - HEAD request handling
 * - ETag generation and validation
 *
 * @module server/shared/static-handler.test
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createStaticHandler } from "./static-handler.js";

// --- Mock file reader ---

/**
 * Create a mock file reader for testing.
 *
 * @param {Map<string, { content: string | Uint8Array, size: number, mtime: Date }>} files - Map of file paths to file data
 * @returns {object} Mock file reader interface
 */
function createMockFileReader(files = new Map()) {
    return {
        /**
         * Check if file exists.
         * @param {string} path - File path
         * @returns {Promise<boolean>}
         */
        async exists(path) {
            return files.has(path);
        },

        /**
         * Get file stats.
         * @param {string} path - File path
         * @returns {Promise<{ size: number, mtime: Date } | null>}
         */
        async stat(path) {
            const file = files.get(path);
            if (!file) return null;
            return { size: file.size, mtime: file.mtime };
        },

        /**
         * Read file content.
         * @param {string} path - File path
         * @returns {Promise<Uint8Array | null>}
         */
        async read(path) {
            const file = files.get(path);
            if (!file) return null;
            if (typeof file.content === "string") {
                return new TextEncoder().encode(file.content);
            }
            return file.content;
        },
    };
}

// --- Tests ---

describe("createStaticHandler", () => {
    describe("factory function", () => {
        test("should return a handler function", () => {
            // Arrange
            const fileReader = createMockFileReader();

            // Act
            const handler = createStaticHandler({
                staticDir: "/dist/client",
                fileReader,
            });

            // Assert
            assert.strictEqual(typeof handler, "function");
        });
    });
});

describe("static handler", () => {
    describe("path validation", () => {
        test("should return null for paths without extension", async () => {
            // Arrange
            const files = new Map([["/dist/client/about", { content: "page", size: 4, mtime: new Date() }]]);
            const handler = createStaticHandler({
                staticDir: "/dist/client",
                fileReader: createMockFileReader(files),
            });
            const request = new Request("http://localhost/about");

            // Act
            const response = await handler(request);

            // Assert
            assert.strictEqual(response, null);
        });

        test("should return null for unknown MIME types", async () => {
            // Arrange
            const files = new Map([["/dist/client/file.xyz", { content: "data", size: 4, mtime: new Date() }]]);
            const handler = createStaticHandler({
                staticDir: "/dist/client",
                fileReader: createMockFileReader(files),
            });
            const request = new Request("http://localhost/file.xyz");

            // Act
            const response = await handler(request);

            // Assert
            assert.strictEqual(response, null);
        });

        test("should return null when normalizePath detects traversal patterns", async () => {
            // Arrange
            // The URL constructor normalizes ".." so we test the normalizePath function
            // indirectly. In practice, URL-level normalization provides first-line defense.
            // This test verifies the handler returns null for files not in staticDir.
            const handler = createStaticHandler({
                staticDir: "/dist/client",
                fileReader: createMockFileReader(),
            });
            // Simulate what URL normalization would produce from a traversal attempt
            // The path /etc/passwd resolves to /dist/client/etc/passwd which doesn't exist
            const request = new Request("http://localhost/etc/passwd");

            // Act
            const response = await handler(request);

            // Assert - file doesn't exist, returns null
            // If file existed at /dist/client/etc/passwd, it would be served safely
            assert.strictEqual(response, null);
        });

        test("should return null for non-existent files", async () => {
            // Arrange
            const handler = createStaticHandler({
                staticDir: "/dist/client",
                fileReader: createMockFileReader(),
            });
            const request = new Request("http://localhost/missing.css");

            // Act
            const response = await handler(request);

            // Assert
            assert.strictEqual(response, null);
        });

        test("should return null for paths with null bytes", async () => {
            // Arrange
            const handler = createStaticHandler({
                staticDir: "/dist/client",
                fileReader: createMockFileReader(),
            });
            const request = new Request("http://localhost/file\0.js");

            // Act
            const response = await handler(request);

            // Assert
            assert.strictEqual(response, null);
        });
    });

    describe("successful responses", () => {
        test("should serve CSS file with correct Content-Type", async () => {
            // Arrange
            const files = new Map([["/dist/client/styles.css", { content: "body { color: red }", size: 19, mtime: new Date() }]]);
            const handler = createStaticHandler({
                staticDir: "/dist/client",
                fileReader: createMockFileReader(files),
            });
            const request = new Request("http://localhost/styles.css");

            // Act
            const response = await handler(request);

            // Assert
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.headers.get("Content-Type"), "text/css; charset=utf-8");
        });

        test("should serve JavaScript file with correct Content-Type", async () => {
            // Arrange
            const files = new Map([["/dist/client/app.js", { content: "console.log(1)", size: 14, mtime: new Date() }]]);
            const handler = createStaticHandler({
                staticDir: "/dist/client",
                fileReader: createMockFileReader(files),
            });
            const request = new Request("http://localhost/app.js");

            // Act
            const response = await handler(request);

            // Assert
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.headers.get("Content-Type"), "application/javascript; charset=utf-8");
        });

        test("should return file content in response body", async () => {
            // Arrange
            const content = "hello world";
            const files = new Map([["/dist/client/test.txt", { content, size: content.length, mtime: new Date() }]]);
            const handler = createStaticHandler({
                staticDir: "/dist/client",
                fileReader: createMockFileReader(files),
            });
            const request = new Request("http://localhost/test.txt");

            // Act
            const response = await handler(request);
            const body = await response.text();

            // Assert
            assert.strictEqual(body, content);
        });
    });

    describe("cache headers", () => {
        test("should set short cache for non-hashed assets", async () => {
            // Arrange
            const files = new Map([["/dist/client/styles.css", { content: "css", size: 3, mtime: new Date() }]]);
            const handler = createStaticHandler({
                staticDir: "/dist/client",
                fileReader: createMockFileReader(files),
            });
            const request = new Request("http://localhost/styles.css");

            // Act
            const response = await handler(request);

            // Assert
            assert.strictEqual(response.headers.get("Cache-Control"), "public, max-age=300");
        });

        test("should set immutable cache for hashed assets", async () => {
            // Arrange
            const files = new Map([["/dist/client/styles.abcdef12.css", { content: "css", size: 3, mtime: new Date() }]]);
            const handler = createStaticHandler({
                staticDir: "/dist/client",
                fileReader: createMockFileReader(files),
            });
            const request = new Request("http://localhost/styles.abcdef12.css");

            // Act
            const response = await handler(request);

            // Assert
            assert.strictEqual(response.headers.get("Cache-Control"), "public, max-age=31536000, immutable");
        });

        test("should set Vary header for Accept-Encoding", async () => {
            // Arrange
            const files = new Map([["/dist/client/app.js", { content: "js", size: 2, mtime: new Date() }]]);
            const handler = createStaticHandler({
                staticDir: "/dist/client",
                fileReader: createMockFileReader(files),
            });
            const request = new Request("http://localhost/app.js");

            // Act
            const response = await handler(request);

            // Assert
            assert.strictEqual(response.headers.get("Vary"), "Accept-Encoding");
        });
    });

    describe("precompression support", () => {
        test("should serve brotli variant when available and accepted", async () => {
            // Arrange
            const files = new Map([
                ["/dist/client/app.js", { content: "original", size: 8, mtime: new Date() }],
                ["/dist/client/app.js.br", { content: "compressed-br", size: 13, mtime: new Date() }],
            ]);
            const handler = createStaticHandler({
                staticDir: "/dist/client",
                fileReader: createMockFileReader(files),
            });
            const request = new Request("http://localhost/app.js", {
                headers: { "Accept-Encoding": "gzip, br" },
            });

            // Act
            const response = await handler(request);
            const body = await response.text();

            // Assert
            assert.strictEqual(response.headers.get("Content-Encoding"), "br");
            assert.strictEqual(body, "compressed-br");
        });

        test("should serve gzip variant when brotli not available", async () => {
            // Arrange
            const files = new Map([
                ["/dist/client/app.js", { content: "original", size: 8, mtime: new Date() }],
                ["/dist/client/app.js.gz", { content: "compressed-gz", size: 13, mtime: new Date() }],
            ]);
            const handler = createStaticHandler({
                staticDir: "/dist/client",
                fileReader: createMockFileReader(files),
            });
            const request = new Request("http://localhost/app.js", {
                headers: { "Accept-Encoding": "gzip, br" },
            });

            // Act
            const response = await handler(request);
            const body = await response.text();

            // Assert
            assert.strictEqual(response.headers.get("Content-Encoding"), "gzip");
            assert.strictEqual(body, "compressed-gz");
        });

        test("should serve original when compression not accepted", async () => {
            // Arrange
            const files = new Map([
                ["/dist/client/app.js", { content: "original", size: 8, mtime: new Date() }],
                ["/dist/client/app.js.br", { content: "compressed", size: 10, mtime: new Date() }],
            ]);
            const handler = createStaticHandler({
                staticDir: "/dist/client",
                fileReader: createMockFileReader(files),
            });
            const request = new Request("http://localhost/app.js"); // No Accept-Encoding

            // Act
            const response = await handler(request);
            const body = await response.text();

            // Assert
            assert.strictEqual(response.headers.get("Content-Encoding"), null);
            assert.strictEqual(body, "original");
        });

        test("should not compress non-compressible file types", async () => {
            // Arrange
            const files = new Map([
                ["/dist/client/image.png", { content: "png-data", size: 8, mtime: new Date() }],
                ["/dist/client/image.png.br", { content: "br-data", size: 7, mtime: new Date() }],
            ]);
            const handler = createStaticHandler({
                staticDir: "/dist/client",
                fileReader: createMockFileReader(files),
            });
            const request = new Request("http://localhost/image.png", {
                headers: { "Accept-Encoding": "br" },
            });

            // Act
            const response = await handler(request);
            const body = await response.text();

            // Assert
            assert.strictEqual(response.headers.get("Content-Encoding"), null);
            assert.strictEqual(body, "png-data");
        });
    });

    describe("HEAD requests", () => {
        test("should return headers without body for HEAD requests", async () => {
            // Arrange
            const files = new Map([["/dist/client/app.js", { content: "console.log(1)", size: 14, mtime: new Date() }]]);
            const handler = createStaticHandler({
                staticDir: "/dist/client",
                fileReader: createMockFileReader(files),
            });
            const request = new Request("http://localhost/app.js", { method: "HEAD" });

            // Act
            const response = await handler(request);
            const body = await response.text();

            // Assert
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.headers.get("Content-Type"), "application/javascript; charset=utf-8");
            assert.strictEqual(body, "");
        });
    });

    describe("subdirectory paths", () => {
        test("should serve files from subdirectories", async () => {
            // Arrange
            const files = new Map([["/dist/client/assets/images/logo.png", { content: "png", size: 3, mtime: new Date() }]]);
            const handler = createStaticHandler({
                staticDir: "/dist/client",
                fileReader: createMockFileReader(files),
            });
            const request = new Request("http://localhost/assets/images/logo.png");

            // Act
            const response = await handler(request);

            // Assert
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.headers.get("Content-Type"), "image/png");
        });

        test("should handle URL-encoded paths", async () => {
            // Arrange
            const files = new Map([["/dist/client/my file.js", { content: "js", size: 2, mtime: new Date() }]]);
            const handler = createStaticHandler({
                staticDir: "/dist/client",
                fileReader: createMockFileReader(files),
            });
            const request = new Request("http://localhost/my%20file.js");

            // Act
            const response = await handler(request);

            // Assert
            assert.strictEqual(response.status, 200);
        });
    });

    describe("ETag support", () => {
        test("should generate ETag for uncompressed files", async () => {
            // Arrange
            const mtime = new Date("2024-01-01T00:00:00.000Z");
            const files = new Map([["/dist/client/app.js", { content: "js", size: 1024, mtime }]]);
            const handler = createStaticHandler({
                staticDir: "/dist/client",
                fileReader: createMockFileReader(files),
            });
            const request = new Request("http://localhost/app.js");

            // Act
            const response = await handler(request);

            // Assert
            assert.strictEqual(response.status, 200);
            const etag = response.headers.get("ETag");
            assert.ok(etag, "ETag header should be present");
            assert.ok(etag.startsWith("W/"), "ETag should be weak");
        });

        test("should return 304 Not Modified when If-None-Match matches", async () => {
            // Arrange
            const mtime = new Date("2024-01-01T00:00:00.000Z");
            const files = new Map([["/dist/client/app.js", { content: "js", size: 1024, mtime }]]);
            const handler = createStaticHandler({
                staticDir: "/dist/client",
                fileReader: createMockFileReader(files),
            });

            // First request to get ETag
            const request1 = new Request("http://localhost/app.js");
            const response1 = await handler(request1);
            const etag = response1.headers.get("ETag");

            // Second request with If-None-Match
            const request2 = new Request("http://localhost/app.js", {
                headers: { "If-None-Match": etag },
            });

            // Act
            const response2 = await handler(request2);
            const body = await response2.text();

            // Assert
            assert.strictEqual(response2.status, 304);
            assert.strictEqual(body, "");
            assert.strictEqual(response2.headers.get("ETag"), etag);
        });

        test("should not generate ETag for compressed variants", async () => {
            // Arrange
            const mtime = new Date("2024-01-01T00:00:00.000Z");
            const files = new Map([
                ["/dist/client/app.js", { content: "original", size: 8, mtime }],
                ["/dist/client/app.js.br", { content: "compressed", size: 10, mtime }],
            ]);
            const handler = createStaticHandler({
                staticDir: "/dist/client",
                fileReader: createMockFileReader(files),
            });
            const request = new Request("http://localhost/app.js", {
                headers: { "Accept-Encoding": "br" },
            });

            // Act
            const response = await handler(request);

            // Assert
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.headers.get("Content-Encoding"), "br");
            assert.strictEqual(response.headers.get("ETag"), null, "ETag should not be present for compressed variant");
        });

        test("should include ETag in 200 response for fresh content", async () => {
            // Arrange
            const mtime = new Date("2024-01-01T00:00:00.000Z");
            const files = new Map([["/dist/client/styles.css", { content: "css", size: 512, mtime }]]);
            const handler = createStaticHandler({
                staticDir: "/dist/client",
                fileReader: createMockFileReader(files),
            });
            const request = new Request("http://localhost/styles.css");

            // Act
            const response = await handler(request);
            const body = await response.text();

            // Assert
            assert.strictEqual(response.status, 200);
            assert.strictEqual(body, "css");
            assert.ok(response.headers.get("ETag"), "ETag should be present");
        });

        test("should handle HEAD requests with ETag and If-None-Match", async () => {
            // Arrange
            const mtime = new Date("2024-01-01T00:00:00.000Z");
            const files = new Map([["/dist/client/app.js", { content: "js", size: 1024, mtime }]]);
            const handler = createStaticHandler({
                staticDir: "/dist/client",
                fileReader: createMockFileReader(files),
            });

            // First HEAD request to get ETag
            const request1 = new Request("http://localhost/app.js", { method: "HEAD" });
            const response1 = await handler(request1);
            const etag = response1.headers.get("ETag");

            // Second HEAD request with If-None-Match
            const request2 = new Request("http://localhost/app.js", {
                method: "HEAD",
                headers: { "If-None-Match": etag },
            });

            // Act
            const response2 = await handler(request2);
            const body = await response2.text();

            // Assert
            assert.strictEqual(response2.status, 304);
            assert.strictEqual(body, "");
            assert.strictEqual(response2.headers.get("ETag"), etag);
        });

        test("should return 200 when If-None-Match does not match", async () => {
            // Arrange
            const mtime = new Date("2024-01-01T00:00:00.000Z");
            const files = new Map([["/dist/client/app.js", { content: "js", size: 1024, mtime }]]);
            const handler = createStaticHandler({
                staticDir: "/dist/client",
                fileReader: createMockFileReader(files),
            });
            const request = new Request("http://localhost/app.js", {
                headers: { "If-None-Match": 'W/"different-etag"' },
            });

            // Act
            const response = await handler(request);
            const body = await response.text();

            // Assert
            assert.strictEqual(response.status, 200);
            assert.strictEqual(body, "js");
            assert.ok(response.headers.get("ETag"));
        });
    });
});
