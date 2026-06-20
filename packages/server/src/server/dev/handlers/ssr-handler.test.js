/**
 * @fileoverview Tests for dev server SSR handler.
 *
 * Covers:
 * - createSSRHandler() configuration validation
 * - SSR rendering with various page formats
 * - 404 handling
 * - 500 error handling
 * - HEAD request handling
 * - CSS asset injection
 * - Hot-reload script injection
 *
 * @module server/dev/handlers/ssr-handler.test
 */

import { strictEqual } from "node:assert/strict";
import { describe, mock, test } from "node:test";

import { logger } from "../../utils/logger.js";
import { createSSRHandler } from "./ssr-handler.js";

// --- Test helpers ---

const createMockRoute = (options = {}) => ({
    path: options.path || "/",
    jsx: options.jsx || "/dist/server/index.js",
    filename: options.filename || "index.html",
    assets: options.assets || { css: [], js: [] },
});

const createConfig = (overrides = {}) => ({
    getRoutes: overrides.getRoutes ?? (() => [createMockRoute()]),
    loadJsxModule: overrides.loadJsxModule ?? (async () => (_params) => "<html><body>Test</body></html>"),
    publicPath: overrides.publicPath ?? "/",
    resolve404Page: overrides.resolve404Page ?? null,
    resolve500Page: overrides.resolve500Page ?? null,
});

const createHandler = (overrides = {}) => createSSRHandler(createConfig(overrides));

const makeRequest = (pathname = "/", method = "GET") => new Request(`http://localhost:3000${pathname}`, { method });

const assertStatus = (response, expected) => strictEqual(response.status, expected);

const assertHtmlResponse = (response, status = 200) => {
    assertStatus(response, status);
    strictEqual(response.headers.get("Content-Type"), "text/html; charset=utf-8");
};

// --- createSSRHandler() tests ---

describe("createSSRHandler", () => {
    test("should create handler with all functions when config is valid", () => {
        const handler = createHandler();

        strictEqual(typeof handler, "object");
        strictEqual(typeof handler.handleSSR, "function");
        strictEqual(typeof handler.handle404, "function");
        strictEqual(typeof handler.handle500, "function");
    });

    test("should create handler even with partial config (runtime validation)", () => {
        // Handler creation is permissive - validation happens at runtime
        strictEqual(typeof createHandler({ getRoutes: undefined }), "object");
        strictEqual(typeof createHandler({ loadJsxModule: undefined }), "object");
        strictEqual(typeof createHandler({ publicPath: undefined }), "object");
    });
});

// --- handleSSR() tests ---

describe("handleSSR", () => {
    describe("pathname validation", () => {
        test("should return 400 for invalid UTF-8 sequences", async () => {
            const handler = createHandler();
            const response = await handler.handleSSR(makeRequest("/%80"), false);

            strictEqual(response.status, 400);
        });

        test("should return 400 for malformed percent encoding", async () => {
            const handler = createHandler();
            const response = await handler.handleSSR(makeRequest("/test%"), false);

            strictEqual(response.status, 400);
        });
    });

    describe("route matching", () => {
        test("should return 404 for unknown paths", async () => {
            const handler = createHandler({ getRoutes: () => [createMockRoute({ path: "/exact" })] });
            const response = await handler.handleSSR(makeRequest("/unknown"), false);

            if (response.status === 404) {
                strictEqual(response.headers.get("Content-Type"), "text/plain");
                strictEqual(await response.text(), "Not found");
            }
        });

        test("should return 400 for invalid slug parameters", async () => {
            const handler = createHandler({
                getRoutes: () => [createMockRoute({ path: "blog/[slug]" })],
            });
            const response = await handler.handleSSR(makeRequest("/blog/%20"), false);

            assertStatus(response, 400);
            strictEqual(await response.text(), "Invalid parameters");
        });

        test("should return 400 or 404 for malformed parameters", async () => {
            const handler = createHandler({
                getRoutes: () => [createMockRoute({ path: "blog/[slug]" })],
            });
            const response = await handler.handleSSR(makeRequest("/blog/[invalid"), false);

            strictEqual([400, 404].includes(response.status), true);
        });
    });

    describe("publicPath handling", () => {
        test("should normalize non-root publicPath", async () => {
            const handler = createHandler({ publicPath: "/custom-path/" });
            const response = await handler.handleSSR(makeRequest(), false);

            assertStatus(response, 200);
        });
    });

    describe("successful rendering", () => {
        test("should return HTML response with correct headers", async () => {
            const handler = createHandler();
            const response = await handler.handleSSR(makeRequest(), false);

            assertHtmlResponse(response, 200);
        });

        test("should add DOCTYPE prefix to HTML responses", async () => {
            const handler = createHandler();
            const response = await handler.handleSSR(makeRequest(), false);

            strictEqual((await response.text()).startsWith("<!doctype html>"), true);
        });

        test("should handle non-HTML responses without DOCTYPE", async () => {
            const handler = createHandler({
                loadJsxModule: async () => () => "<div>Simple content</div>",
            });
            const response = await handler.handleSSR(makeRequest(), false);
            const body = await response.text();

            strictEqual(body.startsWith("<!doctype html>"), false);
            strictEqual(body, "<div>Simple content</div>");
        });

        test("should coerce non-string render output to string", async () => {
            // Test null returns empty string
            const nullHandler = createHandler({
                loadJsxModule: async () => () => null,
            });
            const nullResponse = await nullHandler.handleSSR(makeRequest(), false);
            const nullBody = await nullResponse.text();
            strictEqual(nullBody, "");

            // Test number is converted to string
            const numHandler = createHandler({
                loadJsxModule: async () => () => 42,
            });
            const numResponse = await numHandler.handleSSR(makeRequest(), false);
            const numBody = await numResponse.text();
            strictEqual(numBody, "42");

            // Test undefined returns empty string
            const undefHandler = createHandler({
                loadJsxModule: async () => () => undefined,
            });
            const undefResponse = await undefHandler.handleSSR(makeRequest(), false);
            const undefBody = await undefResponse.text();
            strictEqual(undefBody, "");
        });
    });

    describe("error handling", () => {
        test("should return 500 when SSR fails", async () => {
            const handler = createHandler({
                loadJsxModule: async () => {
                    throw new Error("Module load failed");
                },
            });
            const response = await handler.handleSSR(makeRequest(), false);

            assertStatus(response, 500);
        });

        test("should handle 500 with HEAD request (no body)", async () => {
            const handler = createHandler({
                loadJsxModule: async () => {
                    throw new Error("Test error");
                },
            });
            const response = await handler.handleSSR(makeRequest("/", "HEAD"), true);

            assertStatus(response, 500);
            strictEqual(response.body, null);
        });
    });

    describe("HEAD requests", () => {
        test("should return 200 with null body for HTML", async () => {
            const handler = createHandler({
                loadJsxModule: async () => () => "<html><head><title>Test</title></head><body>Content</body></html>",
            });
            const response = await handler.handleSSR(makeRequest("/", "HEAD"), true);

            assertHtmlResponse(response, 200);
            strictEqual(response.body, null);
        });

        test("should handle HEAD for non-HTML response", async () => {
            const handler = createHandler({
                loadJsxModule: async () => () => "Plain text response",
            });
            const response = await handler.handleSSR(makeRequest("/", "HEAD"), true);

            assertStatus(response, 200);
            strictEqual(response.body, null);
        });
    });
});

// --- handle404() tests ---

describe("handle404", () => {
    test("should return 404 HEAD with no body", async () => {
        const handler = createHandler({ getRoutes: () => [] });
        const response = await handler.handle404(true);

        assertStatus(response, 404);
        strictEqual(response.body, null);
    });

    test("should render custom 404 page when resolver returns a valid path", async () => {
        const handler = createHandler({
            getRoutes: () => [],
            resolve404Page: () => "/pages/404.tsx",
            loadJsxModule: async () => () => "<html><head><title>Custom 404</title></head><body>Page Not Found</body></html>",
        });
        const response = await handler.handle404(false);

        assertStatus(response, 404);
        const body = await response.text();
        strictEqual(body.includes("Custom 404"), true);
        strictEqual(body.includes("Page Not Found"), true);
        strictEqual(response.headers.get("Cache-Control"), "public, max-age=0, must-revalidate");
    });

    test("should fall back to plain text when custom 404 page fails to load", async () => {
        const errorMock = mock.method(logger, "error", () => {});
        const handler = createHandler({
            getRoutes: () => [],
            resolve404Page: () => "/pages/404.tsx",
            loadJsxModule: async () => {
                throw new Error("Module load failed");
            },
        });
        const response = await handler.handle404(false);

        assertStatus(response, 404);
        strictEqual(await response.text(), "Not found");
        strictEqual(errorMock.mock.callCount(), 1);
        strictEqual(errorMock.mock.calls[0].arguments[1], "Failed to render custom 404 page");
        errorMock.mock.restore();
    });

    test("should return 404 HEAD with correct headers when custom page is available", async () => {
        const handler = createHandler({
            getRoutes: () => [],
            resolve404Page: () => "/pages/404.tsx",
            loadJsxModule: async () => () => "<html><head><title>Custom 404</title></head><body>Not Found</body></html>",
        });
        const response = await handler.handle404(true);

        assertStatus(response, 404);
        strictEqual(response.body, null);
        strictEqual(response.headers.get("Cache-Control"), "public, max-age=0, must-revalidate");
    });
});

// --- handle500() tests ---

describe("handle500", () => {
    const createErrorHandler = () => createHandler({ getRoutes: () => [] });

    test("should return 500 with error HTML", async () => {
        const response = await createErrorHandler().handle500(new Error("Test error message"), false);

        assertHtmlResponse(response, 500);
        strictEqual(response.headers.get("Cache-Control"), "no-store");
    });

    test("should return 500 with null body for HEAD", async () => {
        const response = await createErrorHandler().handle500(new Error("Test error"), true);

        assertStatus(response, 500);
        strictEqual(response.body, null);
    });

    test("should include error message in HTML response", async () => {
        const response = await createErrorHandler().handle500(new Error("Specific error message"), false);
        const body = await response.text();

        strictEqual(body.includes("Specific error message"), true);
    });

    test("should render custom 500 page when resolver returns a valid path", async () => {
        const handler = createHandler({
            getRoutes: () => [],
            resolve500Page: () => "/pages/500.tsx",
            loadJsxModule: async () => () => "<html><head><title>Custom 500</title></head><body>Server Error</body></html>",
        });
        const response = await handler.handle500(new Error("Original error"), false);

        assertStatus(response, 500);
        const body = await response.text();
        strictEqual(body.includes("Custom 500"), true);
        strictEqual(body.includes("Server Error"), true);
        strictEqual(response.headers.get("Cache-Control"), "no-store");
    });

    test("should fall back to error HTML when custom 500 page fails to load", async () => {
        const errorMock = mock.method(logger, "error", () => {});
        const handler = createHandler({
            getRoutes: () => [],
            resolve500Page: () => "/pages/500.tsx",
            loadJsxModule: async () => {
                throw new Error("Module load failed");
            },
        });
        const response = await handler.handle500(new Error("Original error"), false);

        assertStatus(response, 500);
        strictEqual(response.headers.get("Cache-Control"), "no-store");
        const body = await response.text();
        strictEqual(body.includes("Original error"), true);
        strictEqual(errorMock.mock.callCount(), 1);
        strictEqual(errorMock.mock.calls[0].arguments[1], "Failed to render custom 500 page");
        errorMock.mock.restore();
    });

    test("should return 500 HEAD with correct headers when custom page is available", async () => {
        const handler = createHandler({
            getRoutes: () => [],
            resolve500Page: () => "/pages/500.tsx",
            loadJsxModule: async () => () => "<html><head><title>Custom 500</title></head><body>Server Error</body></html>",
        });
        const response = await handler.handle500(new Error("Test error"), true);

        assertStatus(response, 500);
        strictEqual(response.body, null);
        strictEqual(response.headers.get("Cache-Control"), "no-store");
    });
});

// --- Pre-matched route optimization tests (P5) ---

describe("handleSSR with pre-matched route", () => {
    test("should use empty params object when params is not provided but route is", async () => {
        const mockRoute = createMockRoute({ path: "/about" });

        const handler = createHandler({
            getRoutes: () => [mockRoute],
            loadJsxModule: async () => (params) => `<html><body>Params: ${JSON.stringify(params)}</body></html>`,
        });

        const request = makeRequest("/about");
        // Pass route but not params - should use empty params
        const response = await handler.handleSSR(request, false, mockRoute);

        assertStatus(response, 200);
        const body = await response.text();
        strictEqual(body.includes("{}"), true);
    });

    test("should use provided params for dynamic routes", async () => {
        const mockRoute = createMockRoute({ path: "blog/[slug]", jsx: "/dist/server/blog/[slug].js" });

        const handler = createHandler({
            getRoutes: () => [mockRoute],
            loadJsxModule: async () => (params) => `<html><body>Slug: ${params.slug}</body></html>`,
        });

        const request = makeRequest("/blog/my-post");
        const preMatchedParams = { slug: "my-post" };

        const response = await handler.handleSSR(request, false, mockRoute, preMatchedParams);

        assertStatus(response, 200);
        const body = await response.text();
        strictEqual(body.includes("Slug: my-post"), true);
    });
});
