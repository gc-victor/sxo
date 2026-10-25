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
            if (file.readError) return null;
            if (typeof file.content === "string") {
                return new TextEncoder().encode(file.content);
            }
            return file.content;
        },
    };
}

/**
 * Create a static handler with the specified files.
 * @param {Map<string, object>} files - Map of file paths to file data
 * @param {object} [options] - Additional handler options
 * @returns {Function} Static handler function
 */
function createHandlerWithFiles(files, options = {}) {
    return createStaticHandler({
        staticDir: "/dist/client",
        fileReader: createMockFileReader(files),
        ...options,
    });
}

/**
 * Create file map entries for common test scenarios.
 * @param {Array<{path: string, content?: string, size?: number, mtime?: Date, readError?: boolean}>} entries
 * @returns {Map<string, object>}
 */
function createFileMap(entries) {
    const map = new Map();
    for (const entry of entries) {
        map.set(entry.path, {
            content: entry.content ?? "",
            size: entry.size ?? entry.content?.length ?? 0,
            mtime: entry.mtime ?? new Date(),
            ...(entry.readError && { readError: true }),
        });
    }
    return map;
}

/**
 * Create a request with optional method and headers.
 * @param {string} url - Request URL
 * @param {object} [options] - Request options
 * @param {string} [options.method] - HTTP method (default: "GET")
 * @param {object} [options.headers] - Request headers
 * @returns {Request} Request object
 */
function createRequest(url, options = {}) {
    const { method = "GET", headers = {} } = options;
    return new Request(url, { method, headers });
}

/**
 * Get ETag from an initial request.
 * @param {Function} handler - Static handler
 * @param {string} url - Request URL
 * @param {object} [headers] - Optional request headers
 * @returns {Promise<string>} ETag value
 */
async function getEtag(handler, url, headers = {}) {
    const response = await handler(createRequest(url, { headers }));
    return response.headers.get("ETag");
}

describe("createStaticHandler", () => {
    describe("factory function", () => {
        test("should return a handler function", () => {
            const handler = createStaticHandler({
                staticDir: "/dist/client",
                fileReader: createMockFileReader(),
            });

            assert.strictEqual(typeof handler, "function");
        });
    });
});

describe("static handler", () => {
    describe("successful responses", () => {
        test("should return file content in response body", async () => {
            const files = createFileMap([{ path: "/dist/client/test.txt", content: "hello world" }]);
            const handler = createHandlerWithFiles(files);
            const response = await handler(createRequest("http://localhost/test.txt"));

            assert.strictEqual(await response.text(), "hello world");
        });
    });

    describe("HEAD requests", () => {
        test("should return headers without body for HEAD requests", async () => {
            const files = createFileMap([{ path: "/dist/client/app.js", content: "console.log(1)" }]);
            const handler = createHandlerWithFiles(files);
            const response = await handler(createRequest("http://localhost/app.js", { method: "HEAD" }));

            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.headers.get("Content-Type"), "application/javascript; charset=utf-8");
            assert.strictEqual(await response.text(), "");
        });
    });

    describe("subdirectory paths", () => {
        test("should serve files from subdirectories", async () => {
            const files = createFileMap([{ path: "/dist/client/assets/images/logo.png", content: "png" }]);
            const handler = createHandlerWithFiles(files);
            const response = await handler(createRequest("http://localhost/assets/images/logo.png"));

            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.headers.get("Content-Type"), "image/png");
        });

        test("should handle URL-encoded paths", async () => {
            const files = createFileMap([{ path: "/dist/client/my file.js", content: "js" }]);
            const handler = createHandlerWithFiles(files);
            const response = await handler(createRequest("http://localhost/my%20file.js"));

            assert.strictEqual(response.status, 200);
        });
    });
});

describe("static handler (Parameterized Tests)", () => {
    describe("ETag conditional requests", () => {
        const etagScenarios = [
            { name: "GET - fresh content", method: "GET", ifNoneMatch: null, expectedStatus: 200 },
            { name: "GET - not modified", method: "GET", ifNoneMatch: "matching", expectedStatus: 304 },
            { name: "GET - modified", method: "GET", ifNoneMatch: "different", expectedStatus: 200 },
            { name: "HEAD - fresh", method: "HEAD", ifNoneMatch: null, expectedStatus: 200 },
            { name: "HEAD - not modified", method: "HEAD", ifNoneMatch: "matching", expectedStatus: 304 },
        ];

        for (const scenario of etagScenarios) {
            test(scenario.name, async () => {
                const { method, ifNoneMatch, expectedStatus } = scenario;
                const mtime = new Date("2024-01-01T00:00:00.000Z");
                const files = createFileMap([{ path: "/dist/client/app.js", content: "js", mtime }]);
                const handler = createHandlerWithFiles(files);

                let etag = null;
                if (ifNoneMatch === "matching") {
                    etag = await getEtag(handler, "http://localhost/app.js", { method });
                } else if (ifNoneMatch === "different") {
                    etag = 'W/"different-etag"';
                }

                const headers = etag ? { "If-None-Match": etag } : {};
                const response = await handler(createRequest("http://localhost/app.js", { method, headers }));
                const body = await response.text();

                assert.strictEqual(response.status, expectedStatus);
                assert.strictEqual(body, method === "HEAD" || expectedStatus === 304 ? "" : "js");

                if (expectedStatus === 304 && ifNoneMatch === "matching") {
                    assert.strictEqual(response.headers.get("ETag"), etag);
                }
            });
        }

        test("should treat weak and strong forms of the same ETag as matching for GET", async () => {
            const mtime = new Date("2024-01-01T00:00:00.000Z");
            const files = createFileMap([{ path: "/dist/client/app.js", content: "js", mtime }]);
            const handler = createHandlerWithFiles(files);
            const etag = await getEtag(handler, "http://localhost/app.js");

            assert.ok(etag);

            const response = await handler(
                createRequest("http://localhost/app.js", {
                    headers: { "If-None-Match": /** @type {string} */ (etag).replace(/^W\//, "") },
                }),
            );

            assert.strictEqual(response.status, 304);
            assert.strictEqual(response.headers.get("ETag"), etag);
        });

        test("should treat weak and strong forms of the same ETag as matching for HEAD", async () => {
            const mtime = new Date("2024-01-01T00:00:00.000Z");
            const files = createFileMap([{ path: "/dist/client/app.js", content: "js", mtime }]);
            const handler = createHandlerWithFiles(files);
            const etag = await getEtag(handler, "http://localhost/app.js");

            assert.ok(etag);

            const response = await handler(
                createRequest("http://localhost/app.js", {
                    method: "HEAD",
                    headers: { "If-None-Match": /** @type {string} */ (etag).replace(/^W\//, "") },
                }),
            );

            assert.strictEqual(response.status, 304);
            assert.strictEqual(await response.text(), "");
            assert.strictEqual(response.headers.get("ETag"), etag);
        });

        test("should ignore If-None-Match for methods other than GET and HEAD", async () => {
            const mtime = new Date("2024-01-01T00:00:00.000Z");
            const files = createFileMap([{ path: "/dist/client/app.js", content: "js", mtime }]);
            const handler = createHandlerWithFiles(files);
            const response = await handler(
                createRequest("http://localhost/app.js", {
                    method: "POST",
                    headers: { "If-None-Match": "*" },
                }),
            );

            assert.strictEqual(response.status, 200);
            assert.strictEqual(await response.text(), "js");
        });

        test("should return 304 for If-None-Match wildcard", async () => {
            const mtime = new Date("2024-01-01T00:00:00.000Z");
            const files = createFileMap([{ path: "/dist/client/app.js", content: "js", mtime }]);
            const handler = createHandlerWithFiles(files);

            const response = await handler(
                createRequest("http://localhost/app.js", {
                    headers: { "If-None-Match": "*" },
                }),
            );

            assert.strictEqual(response.status, 304);
            assert.ok(response.headers.get("ETag"));
        });

        test("should return 304 when a comma-separated If-None-Match list contains a matching ETag", async () => {
            const mtime = new Date("2024-01-01T00:00:00.000Z");
            const files = createFileMap([{ path: "/dist/client/app.js", content: "js", mtime }]);
            const handler = createHandlerWithFiles(files);
            const etag = await getEtag(handler, "http://localhost/app.js");

            assert.ok(etag);

            const response = await handler(
                createRequest("http://localhost/app.js", {
                    headers: { "If-None-Match": `"other", W/"different", ${etag}` },
                }),
            );

            assert.strictEqual(response.status, 304);
            assert.strictEqual(response.headers.get("ETag"), etag);
        });

        test("should return 200 when no comma-separated If-None-Match tags match", async () => {
            const mtime = new Date("2024-01-01T00:00:00.000Z");
            const files = createFileMap([{ path: "/dist/client/app.js", content: "js", mtime }]);
            const handler = createHandlerWithFiles(files);

            const response = await handler(
                createRequest("http://localhost/app.js", {
                    headers: { "If-None-Match": '"other", W/"different"' },
                }),
            );

            assert.strictEqual(response.status, 200);
            assert.strictEqual(await response.text(), "js");
        });
    });

    test("should keep ETag stable for unchanged assets in dev mode", async () => {
        const mtime = new Date("2024-01-01T00:00:00.000Z");
        const files = createFileMap([{ path: "/dist/client/app.js", content: "console.log(1)", mtime }]);
        const handler = createHandlerWithFiles(files, {
            cacheControl: "no-cache",
            skipCompression: true,
        });

        const firstResponse = await handler(createRequest("http://localhost/app.js"));
        const secondResponse = await handler(createRequest("http://localhost/app.js"));
        const etag = firstResponse.headers.get("ETag");

        assert.strictEqual(firstResponse.status, 200);
        assert.strictEqual(secondResponse.status, 200);
        assert.strictEqual(firstResponse.headers.get("Cache-Control"), "no-cache");
        assert.strictEqual(secondResponse.headers.get("Cache-Control"), "no-cache");
        assert.ok(etag);
        assert.strictEqual(secondResponse.headers.get("ETag"), etag);

        const notModifiedResponse = await handler(
            createRequest("http://localhost/app.js", {
                headers: { "If-None-Match": /** @type {string} */ (etag) },
            }),
        );

        assert.strictEqual(notModifiedResponse.status, 304);
        assert.strictEqual(notModifiedResponse.headers.get("ETag"), etag);
    });

    const pathValidationScenarios = [
        { name: "path validation: about (no extension)", path: "about", files: [{ path: "/dist/client/about", content: "page" }] },
        {
            name: "path validation: file.xyz (unknown MIME type)",
            path: "file.xyz",
            files: [{ path: "/dist/client/file.xyz", content: "data" }],
        },
        { name: "path validation: /etc/passwd (path traversal)", path: "/etc/passwd" },
        { name: "path validation: missing.css (non-existent)", path: "missing.css" },
        { name: "path validation: file\\0.js (null bytes)", path: "file\0.js", expectedStatus: 403 },
        { name: "path validation: %252e%252e/bar (encoded traversal)", path: "%252e%252e/bar", expectedStatus: 403 },
    ];

    for (const scenario of pathValidationScenarios) {
        test(scenario.name, async () => {
            const { path, files = [], expectedStatus } = scenario;
            const fileMap = createFileMap(files);
            const handler = createHandlerWithFiles(fileMap);
            const response = await handler(createRequest(`http://localhost/${path}`));

            if (expectedStatus === 403) {
                assert.notStrictEqual(response, null);
                assert.strictEqual(response.status, 403);
            } else {
                assert.strictEqual(response, null);
            }
        });
    }

    test("should return 403 Forbidden when custom resolver returns null", async () => {
        const handler = createStaticHandler({
            staticDir: "/dist/client",
            fileReader: createMockFileReader(),
            resolveSafePath: () => null,
        });
        const response = await handler(createRequest("http://localhost/test.js"));

        assert.notStrictEqual(response, null);
        assert.strictEqual(response.status, 403);
        assert.strictEqual(await response.text(), "Forbidden");
    });

    const contentTypeScenarios = [
        { file: "styles.css", content: "body { color: red }", expectedType: "text/css; charset=utf-8" },
        { file: "app.js", content: "console.log(1)", expectedType: "application/javascript; charset=utf-8" },
    ];

    for (const scenario of contentTypeScenarios) {
        test(`serves files with correct Content-Type: ${scenario.file}`, async () => {
            const { file, content, expectedType } = scenario;
            const files = createFileMap([{ path: `/dist/client/${file}`, content }]);
            const handler = createHandlerWithFiles(files);
            const response = await handler(createRequest(`http://localhost/${file}`));

            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.headers.get("Content-Type"), expectedType);
        });
    }

    const cacheHeaderScenarios = [
        { file: "styles.css", expectedCache: "public, max-age=300" },
        { file: "styles.abcdef12.css", expectedCache: "public, max-age=31536000, immutable" },
    ];

    for (const scenario of cacheHeaderScenarios) {
        test(`sets appropriate cache headers for ${scenario.file}`, async () => {
            const { file, expectedCache } = scenario;
            const files = createFileMap([{ path: `/dist/client/${file}`, content: "css" }]);
            const handler = createHandlerWithFiles(files);
            const response = await handler(createRequest(`http://localhost/${file}`));

            assert.strictEqual(response.headers.get("Cache-Control"), expectedCache);
        });
    }

    test("should set Vary header for compressible files", async () => {
        const files = createFileMap([{ path: "/dist/client/app.js", content: "js" }]);
        const handler = createHandlerWithFiles(files);
        const response = await handler(createRequest("http://localhost/app.js"));

        assert.strictEqual(response.headers.get("Vary"), "Accept-Encoding");
    });

    test("should include Vary: Accept-Encoding on 304 responses for compressible files", async () => {
        const mtime = new Date("2024-01-01T00:00:00.000Z");
        const files = createFileMap([{ path: "/dist/client/app.js", content: "js", mtime }]);
        const handler = createHandlerWithFiles(files);
        const etag = await getEtag(handler, "http://localhost/app.js");

        const response = await handler(createRequest("http://localhost/app.js", { headers: { "If-None-Match": etag } }));

        assert.strictEqual(response.status, 304);
        assert.strictEqual(response.headers.get("Vary"), "Accept-Encoding");
        assert.strictEqual(response.headers.get("ETag"), etag);
    });

    describe("Accept-Encoding q-value handling", () => {
        test("should NOT serve Brotli when br;q=0", async () => {
            const mtime = new Date("2024-01-01T00:00:00.000Z");
            const files = createFileMap([
                { path: "/dist/client/app.js", content: "original", mtime },
                { path: "/dist/client/app.js.br", content: "compressed", mtime },
            ]);
            const handler = createHandlerWithFiles(files);
            const response = await handler(
                createRequest("http://localhost/app.js", {
                    headers: { "Accept-Encoding": "br;q=0" },
                }),
            );

            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.headers.get("Content-Encoding"), null);
            assert.strictEqual(await response.text(), "original");
        });

        test("should NOT serve gzip when gzip;q=0", async () => {
            const mtime = new Date("2024-01-01T00:00:00.000Z");
            const files = createFileMap([
                { path: "/dist/client/app.js", content: "original", mtime },
                { path: "/dist/client/app.js.gz", content: "compressed", mtime },
            ]);
            const handler = createHandlerWithFiles(files);
            const response = await handler(
                createRequest("http://localhost/app.js", {
                    headers: { "Accept-Encoding": "gzip;q=0" },
                }),
            );

            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.headers.get("Content-Encoding"), null);
            assert.strictEqual(await response.text(), "original");
        });

        test("should serve Brotli with positive q-value", async () => {
            const mtime = new Date("2024-01-01T00:00:00.000Z");
            const files = createFileMap([
                { path: "/dist/client/app.js", content: "original", mtime },
                { path: "/dist/client/app.js.br", content: "compressed", mtime },
            ]);
            const handler = createHandlerWithFiles(files);
            const response = await handler(
                createRequest("http://localhost/app.js", {
                    headers: { "Accept-Encoding": "br;q=0.8" },
                }),
            );

            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.headers.get("Content-Encoding"), "br");
            assert.strictEqual(await response.text(), "compressed");
        });

        test("should prefer Brotli over gzip with mixed positive q-values when both exist", async () => {
            const mtime = new Date("2024-01-01T00:00:00.000Z");
            const files = createFileMap([
                { path: "/dist/client/app.js", content: "original", mtime },
                { path: "/dist/client/app.js.br", content: "brotli-compressed", mtime },
                { path: "/dist/client/app.js.gz", content: "gzip-compressed", mtime },
            ]);
            const handler = createHandlerWithFiles(files);
            const response = await handler(
                createRequest("http://localhost/app.js", {
                    headers: { "Accept-Encoding": "br;q=0.9, gzip;q=0.8" },
                }),
            );

            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.headers.get("Content-Encoding"), "br");
            assert.strictEqual(await response.text(), "brotli-compressed");
        });

        test("should serve gzip when only gzip has positive q-value", async () => {
            const mtime = new Date("2024-01-01T00:00:00.000Z");
            const files = createFileMap([
                { path: "/dist/client/app.js", content: "original", mtime },
                { path: "/dist/client/app.js.br", content: "brotli-compressed", mtime },
                { path: "/dist/client/app.js.gz", content: "gzip-compressed", mtime },
            ]);
            const handler = createHandlerWithFiles(files);
            const response = await handler(
                createRequest("http://localhost/app.js", {
                    headers: { "Accept-Encoding": "br;q=0, gzip;q=0.8" },
                }),
            );

            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.headers.get("Content-Encoding"), "gzip");
            assert.strictEqual(await response.text(), "gzip-compressed");
        });

        test("should handle missing q-value as acceptable (q=1)", async () => {
            const mtime = new Date("2024-01-01T00:00:00.000Z");
            const files = createFileMap([
                { path: "/dist/client/app.js", content: "original", mtime },
                { path: "/dist/client/app.js.br", content: "compressed", mtime },
            ]);
            const handler = createHandlerWithFiles(files);
            const response = await handler(
                createRequest("http://localhost/app.js", {
                    headers: { "Accept-Encoding": "br" },
                }),
            );

            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.headers.get("Content-Encoding"), "br");
            assert.strictEqual(await response.text(), "compressed");
        });

        test("should handle empty Accept-Encoding", async () => {
            const mtime = new Date("2024-01-01T00:00:00.000Z");
            const files = createFileMap([
                { path: "/dist/client/app.js", content: "original", mtime },
                { path: "/dist/client/app.js.br", content: "compressed", mtime },
            ]);
            const handler = createHandlerWithFiles(files);
            const response = await handler(
                createRequest("http://localhost/app.js", {
                    headers: { "Accept-Encoding": "" },
                }),
            );

            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.headers.get("Content-Encoding"), null);
            assert.strictEqual(await response.text(), "original");
        });
    });

    describe("compression handling", () => {
        test("should include Content-Encoding on 304 responses for compressed variants", async () => {
            const mtime = new Date("2024-01-01T00:00:00.000Z");
            const files = createFileMap([
                { path: "/dist/client/app.js", content: "js", mtime },
                { path: "/dist/client/app.js.br", content: "compressed", mtime },
            ]);
            const handler = createHandlerWithFiles(files);
            const etag = await getEtag(handler, "http://localhost/app.js", { "Accept-Encoding": "br" });

            const response = await handler(
                createRequest("http://localhost/app.js", {
                    headers: { "If-None-Match": etag, "Accept-Encoding": "br" },
                }),
            );

            assert.strictEqual(response.status, 304);
            assert.strictEqual(response.headers.get("Content-Encoding"), "br");
            assert.strictEqual(response.headers.get("Vary"), "Accept-Encoding");
            assert.strictEqual(response.headers.get("ETag"), etag);
        });

        test("should generate ETag for compressed variants", async () => {
            const mtime = new Date("2024-01-01T00:00:00.000Z");
            const files = createFileMap([
                { path: "/dist/client/app.js", content: "original", mtime },
                { path: "/dist/client/app.js.br", content: "compressed", mtime },
            ]);
            const handler = createHandlerWithFiles(files);
            const response = await handler(
                createRequest("http://localhost/app.js", {
                    headers: { "Accept-Encoding": "br" },
                }),
            );

            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.headers.get("Content-Encoding"), "br");
            const etag = response.headers.get("ETag");
            assert.ok(etag?.startsWith("W/"), "ETag should be weak");
        });

        const compressionFallbackScenarios = [
            { encoding: "br", ext: ".br", name: "brotli" },
            { encoding: "gzip", ext: ".gz", name: "gzip" },
        ];

        for (const { encoding, ext, name } of compressionFallbackScenarios) {
            test(`should fall back to uncompressed when ${name} read fails`, async () => {
                const mtime = new Date();
                const files = createFileMap([
                    { path: "/dist/client/app.js", content: "original", mtime },
                    { path: `/dist/client/app.js${ext}`, content: "compressed", mtime, readError: true },
                ]);
                const handler = createHandlerWithFiles(files);
                const response = await handler(
                    createRequest("http://localhost/app.js", {
                        headers: { "Accept-Encoding": encoding },
                    }),
                );

                assert.notStrictEqual(response, null);
                assert.strictEqual(response.status, 200);
                assert.strictEqual(response.headers.get("Content-Encoding"), null);
                assert.strictEqual(await response.text(), "original");
            });
        }

        test("should return null when both compressed and uncompressed read fails", async () => {
            const mtime = new Date();
            const files = createFileMap([
                { path: "/dist/client/app.js", content: "original", mtime, readError: true },
                { path: "/dist/client/app.js.br", content: "compressed", mtime, readError: true },
            ]);
            const handler = createHandlerWithFiles(files);
            const response = await handler(
                createRequest("http://localhost/app.js", {
                    headers: { "Accept-Encoding": "br" },
                }),
            );

            assert.strictEqual(response, null);
        });
    });

    describe("read failures", () => {
        test("falls back to uncompressed when compressed read fails and uncompressed exists", async () => {
            const mtime = new Date();
            const files = createFileMap([
                { path: "/dist/client/app.js", content: "uncompressed", mtime },
                { path: "/dist/client/app.js.br", content: "compressed", mtime, readError: true },
            ]);
            const handler = createHandlerWithFiles(files);
            const response = await handler(
                createRequest("http://localhost/app.js", {
                    headers: { "Accept-Encoding": "br" },
                }),
            );

            assert.notStrictEqual(response, null);
            assert.strictEqual(response.status, 200);
            assert.strictEqual(await response.text(), "uncompressed");
        });

        test("returns null when direct read fails (no compression)", async () => {
            const mtime = new Date();
            const files = createFileMap([{ path: "/dist/client/test.txt", content: "test", mtime, readError: true }]);
            const handler = createHandlerWithFiles(files, { skipCompression: true });
            const response = await handler(createRequest("http://localhost/test.txt"));

            assert.strictEqual(response, null);
        });
    });
});
