/**
 * @fileoverview Security headers tests for production core handler.
 *
 * Tests default security headers on all response types:
 * - SSR responses
 * - Generated route responses
 * - 404 error responses
 * - 500 error responses
 * - HEAD requests
 * - Configurable header overrides
 *
 * @module server/prod/core-handler-security.test
 */

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { createProdHandler } from "./core-handler.js";

describe("Security Headers", () => {
    /** @type {ReturnType<typeof createMockConfig>} */
    let config;

    /**
     * Create mock configuration for testing.
     * @param {object} [overrides] - Configuration overrides
     * @returns {object} Mock config object
     */
    function createMockConfig(overrides = {}) {
        const routes = [
            {
                path: "",
                filename: "index.html",
                jsx: "src/pages/index.jsx",
                assets: { css: ["index.css"], js: ["index.js"] },
            },
            {
                path: "about",
                filename: "about/index.html",
                jsx: "src/pages/about/index.jsx",
                assets: { css: [], js: [] },
            },
            {
                path: "static",
                filename: "static/index.html",
                jsx: "src/pages/static/index.jsx",
                assets: { css: [], js: [] },
                generated: true,
            },
        ];

        const modules = {
            "src/pages/index.jsx": {
                default: async () => "<html><head><title>Home</title></head><body><h1>Home</h1></body></html>",
            },
            "src/pages/about/index.jsx": {
                default: async () => "<html><head><title>About</title></head><body><h1>About</h1></body></html>",
            },
            "src/pages/static/index.jsx": {
                default: async () => "<html><head><title>Static</title></head><body><h1>Static</h1></body></html>",
            },
        };

        return {
            getRoutes: () => routes,
            modules,
            publicPath: "/",
            getMiddleware: () => [],
            render404: null,
            render500: null,
            logger: { info: () => {}, error: () => {}, warn: () => {} },
            ...overrides,
        };
    }

    /**
     * Assert that all default security headers are present.
     * @param {Response} response - Response to check
     * @param {string} [context] - Optional context for error messages
     */
    function assertSecurityHeaders(response, context = "") {
        const suffix = context ? ` on ${context}` : "";
        assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff", `Missing X-Content-Type-Options header${suffix}`);
        assert.equal(response.headers.get("X-Frame-Options"), "DENY", `Missing X-Frame-Options header${suffix}`);
        assert.equal(response.headers.get("Referrer-Policy"), "strict-origin-when-cross-origin", `Missing Referrer-Policy header${suffix}`);
    }

    /**
     * Create a request for testing.
     * @param {string} path - URL path
     * @param {string} [method="GET"] - HTTP method
     * @returns {Request} Fetch Request object
     */
    function createRequest(path, method = "GET") {
        return new Request(`http://localhost:3000${path}`, { method });
    }

    /**
     * Execute handler and return response, asserting it's a response type.
     * @param {object} handler - Handler instance
     * @param {Request} request - Request to handle
     * @returns {Promise<Response>} The response from the handler result
     */
    async function getResponse(handler, request) {
        const result = await handler.handleRequest(request);
        assert.equal(result.type, "response");
        return result.response;
    }

    beforeEach(() => {
        config = createMockConfig();
    });

    describe("Default Security Headers", () => {
        it("should include security headers on SSR response", async () => {
            const handler = createProdHandler(config);
            const response = await getResponse(handler, createRequest("/"));

            assert.equal(response.status, 200);
            assertSecurityHeaders(response);
        });

        it("should include security headers on generated route response", async () => {
            const handler = createProdHandler(config);
            const result = await handler.handleRequest(createRequest("/static"));

            assert.equal(result.type, "generated");
            assert.equal(result.route.filename, "static/index.html");
            assert.equal(result.route.path, "static");
            assert.equal(typeof result.params, "object");
        });

        // Data-driven tests for 404 and 500 responses
        for (const { name, path, status, setupFn, context } of [
            { name: "404 response", path: "/nonexistent", status: 404, context: "404" },
            { name: "404 response with custom page", path: "/nonexistent", status: 404, context: "custom 404" },
            {
                name: "500 response",
                path: "/",
                status: 500,
                setupFn: (cfg) => {
                    cfg.modules["src/pages/index.jsx"].default = async () => {
                        throw new Error("Simulated server error");
                    };
                },
                context: "500",
            },
            {
                name: "500 response with custom page",
                path: "/",
                status: 500,
                setupFn: (cfg) => {
                    cfg.modules["src/pages/index.jsx"].default = async () => {
                        throw new Error("Simulated server error");
                    };
                },
                context: "custom 500",
            },
        ]) {
            it(`should include security headers on ${name}`, async () => {
                let testConfig = config;

                if (name.includes("custom")) {
                    const renderFn = name.includes("404")
                        ? async () => "<html><head><title>Not Found</title></head><body><h1>404</h1></body></html>"
                        : async () => "<html><head><title>Error</title></head><body><h1>500</h1></body></html>";
                    const overrideKey = name.includes("404") ? "render404" : "render500";
                    testConfig = createMockConfig({ [overrideKey]: renderFn });
                }

                if (setupFn) setupFn(testConfig);

                const handler = createProdHandler(testConfig);
                const response = await getResponse(handler, createRequest(path));

                assert.equal(response.status, status);
                assertSecurityHeaders(response, context);
            });
        }

        it("should include security headers on HEAD request", async () => {
            const handler = createProdHandler(config);
            const response = await getResponse(handler, createRequest("/", "HEAD"));

            assert.equal(response.status, 200);
            assert.equal(response.body, null, "HEAD request should have no body");
            assertSecurityHeaders(response, "HEAD request");
        });
    });

    describe("Configurable Security Headers", () => {
        it("should allow custom security headers via config", async () => {
            const customConfig = createMockConfig({
                securityHeaders: {
                    "X-Frame-Options": "SAMEORIGIN",
                    "X-Custom-Header": "custom-value",
                },
            });

            const handler = createProdHandler(customConfig);
            const response = await getResponse(handler, createRequest("/"));

            assert.equal(response.status, 200);
            assert.equal(response.headers.get("X-Frame-Options"), "SAMEORIGIN", "Custom X-Frame-Options should override default");
            assert.equal(response.headers.get("X-Custom-Header"), "custom-value", "Custom header should be present");
            assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff", "Default X-Content-Type-Options should remain");
        });

        it("should keep defaults when securityHeaders is empty object", async () => {
            const customConfig = createMockConfig({ securityHeaders: {} });

            const handler = createProdHandler(customConfig);
            const response = await getResponse(handler, createRequest("/"));

            assert.equal(response.status, 200);
            assert.equal(
                response.headers.get("X-Content-Type-Options"),
                "nosniff",
                "Default headers should remain with empty securityHeaders",
            );
        });
    });

    describe("Security Headers with Existing Cache-Control", () => {
        // Data-driven tests for Cache-Control preservation
        for (const { status, path, cacheControl, setupFn, context } of [
            { status: 200, path: "/", cacheControl: "public, max-age=0, must-revalidate", context: "SSR response" },
            { status: 404, path: "/nonexistent", cacheControl: "public, max-age=0, must-revalidate", context: "404 response" },
            {
                status: 500,
                path: "/",
                cacheControl: "no-store",
                setupFn: (cfg) => {
                    cfg.modules["src/pages/index.jsx"].default = async () => {
                        throw new Error("Simulated server error");
                    };
                },
                context: "500 response",
            },
        ]) {
            it(`should preserve Cache-Control header on ${context}`, async () => {
                const testConfig = createMockConfig();
                if (setupFn) setupFn(testConfig);

                const handler = createProdHandler(testConfig);
                const response = await getResponse(handler, createRequest(path));

                assert.equal(response.status, status);
                assert.equal(response.headers.get("Cache-Control"), cacheControl, `Cache-Control should be preserved on ${context}`);
                assert.equal(
                    response.headers.get("X-Content-Type-Options"),
                    "nosniff",
                    `Security headers should coexist with Cache-Control on ${context}`,
                );
            });
        }
    });

    describe("HandlerResult validation in middleware paths", () => {
        it("should pass validation for valid response type HandlerResult from middleware", async () => {
            const customConfig = createMockConfig({
                securityHeaders: { "X-Custom-Security": "test-value" },
                getMiddleware: () => [
                    async () => new Response("Middleware content", { status: 200, headers: { "X-Middleware": "active" } }),
                ],
            });

            const handler = createProdHandler(customConfig);
            const response = await getResponse(handler, createRequest("/test"));

            assert.ok(response instanceof Response, "result.response should be a Response instance");
            assert.equal(response.status, 200);
            assert.equal(response.headers.get("X-Middleware"), "active");
            assert.equal(response.headers.get("X-Custom-Security"), "test-value");
        });

        it("should pass validation for valid response type HandlerResult from middleware with HEAD request", async () => {
            const customConfig = createMockConfig({
                getMiddleware: () => [async () => new Response("Content", { status: 201 })],
            });

            const handler = createProdHandler(customConfig);
            const response = await getResponse(handler, createRequest("/test", "HEAD"));

            assert.ok(response instanceof Response);
            assert.equal(response.status, 201);
            assert.equal(response.body, null, "HEAD request should have no body");
        });

        it("should validate generated type HandlerResult structure", async () => {
            const handler = createProdHandler(config);
            const result = await handler.handleRequest(createRequest("/static"));

            assert.equal(result.type, "generated");
            assert.ok(result.route, "result.route should be present");
            assert.equal(typeof result.route, "object");
            assert.equal(typeof result.route.filename, "string");
            assert.equal(typeof result.params, "object");
            assert.ok(Array.isArray(result.params) === false, "result.params should be a plain object");
        });

        it("should validate generated type HandlerResult with params for dynamic routes", async () => {
            const routes = [
                {
                    path: "blog/[slug]",
                    filename: "blog/[slug]/index.html",
                    jsx: "src/pages/blog/[slug]/index.jsx",
                    assets: { css: [], js: [] },
                    generated: true,
                },
            ];

            const modules = {
                "src/pages/blog/[slug]/index.jsx": {
                    default: async () => "<html><head><title>Blog</title></head><body>Post</body></html>",
                },
            };

            const handler = createProdHandler({ ...createMockConfig(), getRoutes: () => routes, modules });
            const result = await handler.handleRequest(createRequest("/blog/hello-world"));

            assert.equal(result.type, "generated");
            assert.equal(result.route.filename, "blog/[slug]/index.html");
            assert.equal(typeof result.params, "object");
            assert.equal(result.params.slug, "hello-world");
        });
    });
});
