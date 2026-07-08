/**
 * @fileoverview Tests for core-handler.js module.
 *
 * Tests request handler orchestration, hot-reload, middleware,
 * and error handling for platform-agnostic dev server.
 *
 * @module server/dev/core-handler
 */

import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { afterEach, before, beforeEach, describe, it } from "node:test";
import { createDevHandler } from "./core-handler.js";

describe("core-handler.js", () => {
    let mockGetRoutes;
    let mockLoadJsxModule;
    let mockGetEsbuildError;
    let mockReadFile = async () => "mock file content";
    let mockGetMiddleware = () => [];
    let handler;

    const defaultConfig = () => ({
        getRoutes: mockGetRoutes,
        loadJsxModule: mockLoadJsxModule,
        publicPath: "/",
        getEsbuildError: mockGetEsbuildError,
        hotReplaceClientPath: "/path/to/hot-replace.js",
        readFile: mockReadFile,
        getMiddleware: mockGetMiddleware,
        resolve404Page: null,
        resolve500Page: null,
    });

    const makeRequest = (path, method = "GET") => new Request(`http://localhost:3000${path}`, { method });

    const setupHandler = (overrides = {}) => {
        handler = createDevHandler({ ...defaultConfig(), ...overrides });
    };

    before(() => {
        mockGetRoutes = () => [
            { path: "/", jsx: "/path/to/index.jsx", assets: { css: [], js: [] } },
            { path: "/about", jsx: "/path/to/about.jsx", assets: { css: [], js: [] } },
        ];

        mockLoadJsxModule = async () => async () => "<html><body>Test content</body></html>";

        mockGetEsbuildError = () => "";
    });

    describe("createDevHandler", () => {
        describe("When config is valid", () => {
            it("should create handler without throwing", () => {
                deepStrictEqual(typeof createDevHandler(defaultConfig()), "function");
            });

            it("should use default middleware getter when not provided", () => {
                const { getMiddleware: _getMiddleware, ...configWithoutMiddleware } = defaultConfig();
                deepStrictEqual(typeof createDevHandler(configWithoutMiddleware), "function");
            });
        });

        describe("When config is invalid", () => {
            it("should throw error when getRoutes is missing", () => {
                const { getRoutes: _getRoutes, ...config } = defaultConfig();
                try {
                    createDevHandler(config);
                    throw new Error("Should have thrown");
                } catch (err) {
                    deepStrictEqual(err.message, "getRoutes function is required");
                }
            });

            it("should throw error when loadJsxModule is missing", () => {
                const { loadJsxModule: _loadJsxModule, ...config } = defaultConfig();
                try {
                    createDevHandler(config);
                    throw new Error("Should have thrown");
                } catch (err) {
                    deepStrictEqual(err.message, "loadJsxModule function is required");
                }
            });
        });
    });

    describe("Request handling", () => {
        beforeEach(() => setupHandler());
        afterEach(() => {
            mockReadFile = async () => "mock file content";
        });

        describe("When requesting hot-replace.js", () => {
            it("should return 200 with JavaScript content", async () => {
                const mockJsContent = "console.log('hot replace');";
                mockReadFile = async () => mockJsContent;
                setupHandler();

                const response = await handler(makeRequest("/hot-replace.js"));

                deepStrictEqual(response.status, 200);
                deepStrictEqual(response.headers.get("content-type"), "application/javascript; charset=utf-8");
                deepStrictEqual(await response.text(), mockJsContent);
            });

            it("should return 404 when file not found", async () => {
                mockReadFile = async () => {
                    throw new Error("File not found");
                };
                setupHandler({ hotReplaceClientPath: "/nonexistent.js" });

                const response = await handler(makeRequest("/hot-replace.js"));

                deepStrictEqual(response.status, 404);
                deepStrictEqual(response.headers.get("content-type"), "text/plain");
                deepStrictEqual(await response.text(), "Not found");
            });
        });

        describe("When requesting SSE endpoint", () => {
            it("should return 400 when href parameter is missing", async () => {
                const response = await handler(makeRequest("/hot-replace"));

                deepStrictEqual(response.status, 400);
                deepStrictEqual(response.headers.get("content-type"), "text/plain");
                deepStrictEqual(await response.text(), "Missing href parameter");
            });

            it("should handle SSE connection when href is provided", async () => {
                const response = await handler(makeRequest("/hot-replace?href=/"));

                deepStrictEqual(response.status, 200);
                deepStrictEqual(response.headers.get("content-type"), "text/event-stream");
            });
        });

        describe("When making OPTIONS request", () => {
            it("should return CORS-friendly response", async () => {
                const response = await handler(makeRequest("/", "OPTIONS"));
                deepStrictEqual(response.status, 204);
            });
        });

        describe("When route is not found", () => {
            it("should return 404 for unknown path", async () => {
                mockGetRoutes = () => [{ path: "/", jsx: "/path/to/index.jsx" }];
                setupHandler();

                const response = await handler(makeRequest("/unknown"));
                deepStrictEqual(response.status, 404);
            });
        });

        describe("When route has invalid parameters", () => {
            it("should handle invalid slug gracefully", async () => {
                mockGetRoutes = () => [{ path: "/blog/[slug]", jsx: "/path/to/blog.jsx" }];
                setupHandler();

                const response = await handler(makeRequest("/blog/invalid/slug"));
                deepStrictEqual([200, 400, 404].includes(response.status), true);
            });
        });

        describe("When middleware returns response", () => {
            it("should short-circuit and return middleware response", async () => {
                const middlewareResponse = new Response("Middleware handled", { status: 403 });
                mockGetMiddleware = () => [async () => middlewareResponse];
                setupHandler();

                const response = await handler(makeRequest("/protected"));
                deepStrictEqual(response, middlewareResponse);
            });
        });

        describe("When middleware uses render context", () => {
            it("should render a page module via context.render", async () => {
                mockGetMiddleware = () => [
                    async (_req, _env, { render }) => {
                        const html = await render("src/pages/custom.jsx", { title: "Custom" });
                        return new Response(html, {
                            status: 200,
                            headers: { "Content-Type": "text/html; charset=utf-8" },
                        });
                    },
                ];
                setupHandler({
                    loadJsxModule: async (jsxPath) => {
                        strictEqual(jsxPath, "src/pages/custom.jsx");
                        return async () => `<html><body>Rendered: custom</body></html>`;
                    },
                });

                const response = await handler(makeRequest("/"));
                deepStrictEqual(response.status, 200);
                const body = await response.text();
                ok(body.includes("Rendered: custom"), "should contain rendered content");
                ok(body.startsWith("<!doctype html>"), "should prepend doctype");
            });

            it("should pass params to context.render", async () => {
                mockGetMiddleware = () => [
                    async (_req, _env, { render }) => {
                        const html = await render("src/pages/post.jsx", { slug: "hello" });
                        return new Response(html, {
                            status: 200,
                            headers: { "Content-Type": "text/html; charset=utf-8" },
                        });
                    },
                ];
                setupHandler({
                    loadJsxModule: async (_jsxPath) => async (params) => `<html><body>Slug: ${params.slug}</body></html>`,
                });

                const response = await handler(makeRequest("/"));
                const body = await response.text();
                ok(body.includes("Slug: hello"), "should pass params");
            });
        });

        describe("When middleware throws error", () => {
            it("should return 500 on middleware error", async () => {
                const failingMiddleware = [
                    () => {
                        throw new Error("Sync middleware error");
                    },
                    async () => {
                        throw new Error("Async middleware error");
                    },
                ];

                for (const middleware of failingMiddleware) {
                    mockGetRoutes = () => [
                        { path: "/", jsx: "/path/to/index.jsx", assets: { css: [], js: [] } },
                        { path: "/about", jsx: "/path/to/about.jsx", assets: { css: [], js: [] } },
                    ];
                    mockGetMiddleware = () => [middleware];
                    setupHandler();

                    const response = await handler(makeRequest("/"));
                    deepStrictEqual(response.status, 500);
                    const body = await response.text();
                    deepStrictEqual(body.includes("[ERROR]"), true);
                }
            });
        });

        describe("When HEAD request is made", () => {
            it("should handle HEAD for static-like paths", async () => {
                const response = await handler(makeRequest("/hot-replace.js", "HEAD"));
                deepStrictEqual(response.status, 200);
            });

            it("should handle HEAD for middleware response", async () => {
                mockGetMiddleware = () => [async () => new Response("OK", { status: 200 })];
                setupHandler();

                const response = await handler(makeRequest("/", "HEAD"));
                deepStrictEqual(response.status, 200);
            });
        });

        describe("getClientCount", () => {
            beforeEach(() => setupHandler());

            it("should return 0 when no clients connected", () => {
                strictEqual(handler.getClientCount(), 0);
            });
        });

        describe("broadcastReload", () => {
            beforeEach(() => setupHandler());

            it("should call reloadFiles function when provided", async () => {
                let reloadCalled = false;
                await handler.broadcastReload(() => {
                    reloadCalled = true;
                });
                deepStrictEqual(reloadCalled, true);
            });

            it("should handle broadcast without reload function", async () => {
                await handler.broadcastReload();
            });
        });
    });
});
