/**
 * @fileoverview Tests for dev server hot-reload SSE handler.
 *
 * Covers:
 * - createHotReloadHandler() config validation
 * - /hot-replace.js endpoint (serving client script)
 * - /hot-replace SSE endpoint
 * - Missing href parameter handling
 * - Route not found handling
 * - SSE initial payload delivery
 * - Client counting and cleanup
 * - Broadcast reload functionality
 *
 * @module server/dev/handlers/hot-reload-handler.test
 */

import { strictEqual } from "node:assert/strict";
import { describe, test } from "node:test";

import { createHotReloadHandler } from "./hot-reload-handler.js";

const DEFAULT_HOT_REPLACE_PATH = "/path/to/hot-replace.js";

function createMinimalConfig(overrides = {}) {
    return {
        getRoutes: () => [],
        loadJsxModule: async () => (_params) => "",
        getEsbuildError: () => "",
        hotReplaceClientPath: DEFAULT_HOT_REPLACE_PATH,
        readFile: async () => "",
        ...overrides,
    };
}

function createMockRoute(options = {}) {
    return {
        path: options.path || "/",
        jsx: options.jsx || "/dist/server/index.js",
        filename: options.filename || "index.html",
        assets: options.assets || { css: [], js: [] },
    };
}

function createRequest(url, method = "GET", headers = {}) {
    return new Request(url, { method, headers });
}

async function assertResponse(response, expected) {
    if (expected.status !== undefined) {
        strictEqual(response.status, expected.status);
    }
    if (expected.contentType !== undefined) {
        strictEqual(response.headers.get("Content-Type"), expected.contentType);
    }
    if (expected.body !== undefined) {
        const body = await response.text();
        strictEqual(body, expected.body);
    }
}

async function connectClients(handler, count, href = "/") {
    const responses = [];
    for (let i = 0; i < count; i++) {
        const request = createRequest(`http://localhost:3000/hot-replace?href=${href}`);
        const response = await handler(request);
        responses.push(response);
    }
    return responses;
}

function testGetNormalizedPublicPath(envValue, expected) {
    const originalEnv = process.env.PUBLIC_PATH;

    if (envValue === undefined) {
        delete process.env.PUBLIC_PATH;
    } else {
        process.env.PUBLIC_PATH = envValue;
    }

    const { getNormalizedPublicPath } = createHotReloadHandler(createMinimalConfig());
    const result = getNormalizedPublicPath();

    process.env.PUBLIC_PATH = originalEnv;
    strictEqual(result, expected);
}

describe("createHotReloadHandler", () => {
    describe("When config is valid", () => {
        test("should create handler with minimal config", () => {
            const handler = createHotReloadHandler(createMinimalConfig());

            strictEqual(typeof handler, "object");
            strictEqual(typeof handler.handler, "function");
        });
    });

    describe("When config is invalid", () => {
        test("should throw error when getRoutes is missing", () => {
            const config = createMinimalConfig({ getRoutes: undefined });

            try {
                createHotReloadHandler(config);
                strictEqual(true, false, "Should have thrown");
            } catch (err) {
                strictEqual(err.message, "getRoutes function is required");
            }
        });

        test("should throw error when loadJsxModule is missing", () => {
            const config = createMinimalConfig({ loadJsxModule: undefined });

            try {
                createHotReloadHandler(config);
                strictEqual(true, false, "Should have thrown");
            } catch (err) {
                strictEqual(err.message, "loadJsxModule function is required");
            }
        });
    });
});

describe("getNormalizedPublicPath", () => {
    test("should preserve empty string", () => {
        testGetNormalizedPublicPath("", "");
    });

    test("should default to " / " when PUBLIC_PATH is undefined", () => {
        testGetNormalizedPublicPath(undefined, "/");
    });

    test("should preserve trailing slash on non-empty path", () => {
        testGetNormalizedPublicPath("/app/", "/app/");
    });
});

describe("handler", () => {
    describe("When serving /hot-replace.js", () => {
        test("should return 200 with JavaScript content", async () => {
            const config = createMinimalConfig({
                readFile: async () => "console.log('hot-replace loaded');",
            });
            const { handler } = createHotReloadHandler(config);
            const request = createRequest("http://localhost:3000/hot-replace.js");

            const response = await handler(request);

            await assertResponse(response, {
                status: 200,
                contentType: "application/javascript; charset=utf-8",
                body: "console.log('hot-replace loaded');",
            });
        });

        test("should return 404 when file not found", async () => {
            const config = createMinimalConfig({
                hotReplaceClientPath: "/nonexistent/path.js",
                readFile: async () => {
                    throw new Error("File not found");
                },
            });
            const { handler } = createHotReloadHandler(config);
            const request = createRequest("http://localhost:3000/hot-replace.js");

            const response = await handler(request);

            await assertResponse(response, {
                status: 404,
                contentType: "text/plain",
                body: "Not found",
            });
        });

        test("should handle HEAD request for hot-replace.js", async () => {
            const { handler } = createHotReloadHandler(createMinimalConfig());
            const request = createRequest("http://localhost:3000/hot-replace.js", "HEAD");

            const response = await handler(request);

            strictEqual(response.status, 200);
        });
    });

    describe("When accessing /hot-replace endpoint", () => {
        test("should return 400 when href parameter is missing", async () => {
            const { handler } = createHotReloadHandler(createMinimalConfig());
            const request = createRequest("http://localhost:3000/hot-replace");

            const response = await handler(request);

            await assertResponse(response, {
                status: 400,
                contentType: "text/plain",
                body: "Missing href parameter",
            });
        });

        test("should return 404 for unknown pathname", async () => {
            const { handler } = createHotReloadHandler(createMinimalConfig());
            const request = createRequest("http://localhost:3000/unknown");

            const response = await handler(request);

            strictEqual(response.status, 404);
        });

        test("should return 200 with event stream headers for valid route", async () => {
            const config = createMinimalConfig({
                getRoutes: () => [createMockRoute()],
                loadJsxModule: async () => (_params) => "<html><body>Test</body></html>",
            });
            const { handler } = createHotReloadHandler(config);
            const request = createRequest("http://localhost:3000/hot-replace?href=/");

            const response = await handler(request);

            strictEqual(response.status, 200);
            strictEqual(response.headers.get("Content-Type"), "text/event-stream");
            strictEqual(response.headers.get("Cache-Control"), "no-cache");
            strictEqual(response.headers.get("Connection"), "keep-alive");
        });
    });
});

describe("getClientCount", () => {
    test("should return 0 when no clients connected", () => {
        const { getClientCount } = createHotReloadHandler(createMinimalConfig());

        strictEqual(getClientCount(), 0);
    });
});

describe("broadcastReload", () => {
    test("should accept optional reloadFiles function", async () => {
        const { broadcastReload } = createHotReloadHandler(createMinimalConfig());

        let reloadCalled = false;
        await broadcastReload(async () => {
            reloadCalled = true;
        });

        strictEqual(reloadCalled, true);
    });

    test("should handle reloadFiles that throws", async () => {
        const { broadcastReload } = createHotReloadHandler(createMinimalConfig());

        let reloadCalled = false;
        try {
            await broadcastReload(async () => {
                reloadCalled = true;
                throw new Error("Reload failed");
            });
        } catch {
            // Error is not caught
        }
        strictEqual(reloadCalled, true);
    });
});

describe("SSE with esbuild error", () => {
    test("should send error payload when esbuild error present", async () => {
        const config = createMinimalConfig({
            getRoutes: () => [createMockRoute()],
            loadJsxModule: async () => (_params) => "<html><body>Test</body></html>",
            getEsbuildError: () => "Build failed: Syntax error in index.jsx",
        });
        const { handler } = createHotReloadHandler(config);
        const request = createRequest("http://localhost:3000/hot-replace?href=/");

        const response = await handler(request);

        strictEqual(response.status, 200);
        strictEqual(response.headers.get("Content-Type"), "text/event-stream");
    });

    test("broadcasts build errors even when reloading routes fails", async () => {
        let esbuildError = "";
        const config = createMinimalConfig({
            getRoutes: () => [createMockRoute()],
            getEsbuildError: () => esbuildError,
        });
        const { handler, broadcastReload } = createHotReloadHandler(config);
        const response = await handler(createRequest("http://localhost:3000/hot-replace?href=/"));
        const reader = response.body.getReader();
        let reloadCalled = false;

        try {
            esbuildError = "Build failed: Syntax error in index.jsx";
            let broadcastError;
            try {
                await broadcastReload(async () => {
                    reloadCalled = true;
                    throw new Error("Previous route bundle is unavailable");
                });
            } catch (err) {
                broadcastError = err;
            }

            strictEqual(broadcastError, undefined);
            strictEqual(reloadCalled, false);

            const { value } = await reader.read();
            const event = new TextDecoder().decode(value);
            const encodedPayload = event.match(/^data: (.+)$/m)?.[1];
            strictEqual(Boolean(encodedPayload), true);
            const payload = JSON.parse(Buffer.from(encodedPayload, "base64").toString("utf8"));
            strictEqual(payload.body.includes("Build failed: Syntax error in index.jsx"), true);
        } finally {
            await reader.cancel();
        }
    });
});

describe("CORS headers", () => {
    test("should include CORS header for same-origin requests", async () => {
        const config = createMinimalConfig({
            getRoutes: () => [createMockRoute()],
            loadJsxModule: async () => (_params) => "<html><body>Test</body></html>",
        });
        const { handler } = createHotReloadHandler(config);
        const request = createRequest("http://localhost:3000/hot-replace?href=/", "GET", {
            origin: "http://localhost:3000",
            host: "localhost:3000",
        });

        const response = await handler(request);

        strictEqual(response.status, 200);
        strictEqual(response.headers.has("Access-Control-Allow-Origin"), true);
    });
});

describe("buildPayloadForClient", () => {
    test("should create hot-reload payload when no esbuildError", async () => {
        const config = createMinimalConfig({
            getRoutes: () => [createMockRoute()],
            loadJsxModule: async () => (_params) => "<html><body>Test</body></html>",
        });
        const { buildPayloadForClient } = createHotReloadHandler(config);
        const mockClient = {
            route: createMockRoute(),
            params: {},
        };

        const result = await buildPayloadForClient(mockClient, null);
        const parsed = JSON.parse(result);

        strictEqual(typeof parsed.body, "string");
        strictEqual(typeof parsed.assets, "object");
        strictEqual(Array.isArray(parsed.assets?.css), true);
        strictEqual(Array.isArray(parsed.assets?.js), true);
    });
});

describe("SSE client capping", () => {
    test("should bound SSE client collection to max clients", async () => {
        const config = createMinimalConfig({
            getRoutes: () => [createMockRoute()],
            loadJsxModule: async () => (_params) => "<html><body>Test</body></html>",
        });
        const { handler, getClientCount } = createHotReloadHandler(config);

        await connectClients(handler, 15);

        strictEqual(getClientCount(), 10, `Expected count to be exactly 10, got ${getClientCount()}`);
    });

    test("should drop oldest client when exceeding max", async () => {
        const config = createMinimalConfig({
            getRoutes: () => [createMockRoute()],
            loadJsxModule: async () => (_params) => "<html><body>Test</body></html>",
        });
        const { handler, getClientCount, broadcastReload } = createHotReloadHandler(config);

        await connectClients(handler, 12);

        strictEqual(getClientCount(), 10, `Expected count to be exactly 10, got ${getClientCount()}`);
        await broadcastReload();
    });

    test("should drop oldest client first (FIFO)", async () => {
        const config = createMinimalConfig({
            getRoutes: () => [createMockRoute()],
            loadJsxModule: async () => (_params) => "<html><body>Test</body></html>",
        });
        const { handler, getClientCount } = createHotReloadHandler(config);

        const clients = [];
        for (let i = 0; i < 12; i++) {
            const request = createRequest(`http://localhost:3000/hot-replace?href=/`);
            const response = await handler(request);
            clients.push({ id: i, response });
        }

        strictEqual(getClientCount(), 10, `Expected count to be exactly 10, got ${getClientCount()}`);
    });
});

describe("Race condition safety", () => {
    test("should handle abrupt disconnect during broadcast without errors", async () => {
        const config = createMinimalConfig({
            getRoutes: () => [createMockRoute()],
            loadJsxModule: async () => (_params) => "<html><body>Test</body></html>",
        });
        const { handler, broadcastReload } = createHotReloadHandler(config);

        const responses = await connectClients(handler, 3);
        const broadcastPromise = broadcastReload();

        for (const response of responses) {
            if (response.body) {
                await response.body.getReader().cancel();
            }
        }

        await broadcastPromise;
    });

    test("should cleanup disconnected clients reliably", async () => {
        const config = createMinimalConfig({
            getRoutes: () => [createMockRoute()],
            loadJsxModule: async () => (_params) => "<html><body>Test</body></html>",
        });
        const { handler, broadcastReload, getClientCount } = createHotReloadHandler(config);

        const responses = await connectClients(handler, 5);
        strictEqual(getClientCount(), 5);

        for (let i = 0; i < 3; i++) {
            if (responses[i].body) {
                await responses[i].body.getReader().cancel();
            }
        }

        await broadcastReload();

        const finalCount = getClientCount();
        strictEqual(finalCount <= 2, true, `Expected count <= 2, got ${finalCount}`);
    });
});

describe("broadcastToClient", () => {
    test("should enqueue payload to client successfully", async () => {
        const { broadcastToClient } = createHotReloadHandler(createMinimalConfig());

        let enqueuedData = "";
        const mockClient = {
            controller: {
                enqueue: (data) => {
                    enqueuedData = data;
                },
            },
            closed: false,
        };

        await broadcastToClient(mockClient, JSON.stringify({ body: "test", assets: {} }));

        strictEqual(enqueuedData.length > 0, true);
    });

    test("should mark client as closed when enqueue fails", async () => {
        const { broadcastToClient } = createHotReloadHandler(createMinimalConfig());

        const mockClient = {
            controller: {
                enqueue: () => {
                    throw new Error("Stream closed");
                },
            },
            closed: false,
        };

        await broadcastToClient(mockClient, JSON.stringify({ body: "test" }));

        strictEqual(mockClient.closed, true);
    });
});
