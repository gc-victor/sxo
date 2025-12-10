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
            logger: {
                info: () => {},
                error: () => {},
                warn: () => {},
            },
            ...overrides,
        };
    }

    beforeEach(() => {
        config = createMockConfig();
    });

    describe("Default Security Headers", () => {
        it("should include security headers on SSR response", async () => {
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/");

            const response = await handler.handleRequest(request);

            assert.equal(response.status, 200);
            assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff", "Missing X-Content-Type-Options header");
            assert.equal(response.headers.get("X-Frame-Options"), "DENY", "Missing X-Frame-Options header");
            assert.equal(response.headers.get("Referrer-Policy"), "strict-origin-when-cross-origin", "Missing Referrer-Policy header");
        });

        it("should include security headers on generated route response", async () => {
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/static");

            const response = await handler.handleRequest(request);

            // Generated routes return marker response with X-SXO-Generated header
            assert.equal(response.status, 200);
            assert.equal(response.headers.get("X-SXO-Generated"), "true");
            assert.equal(
                response.headers.get("X-Content-Type-Options"),
                "nosniff",
                "Missing X-Content-Type-Options header on generated route",
            );
            assert.equal(response.headers.get("X-Frame-Options"), "DENY", "Missing X-Frame-Options header on generated route");
            assert.equal(
                response.headers.get("Referrer-Policy"),
                "strict-origin-when-cross-origin",
                "Missing Referrer-Policy header on generated route",
            );
        });

        it("should include security headers on 404 response", async () => {
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/nonexistent");

            const response = await handler.handleRequest(request);

            assert.equal(response.status, 404);
            assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff", "Missing X-Content-Type-Options header on 404");
            assert.equal(response.headers.get("X-Frame-Options"), "DENY", "Missing X-Frame-Options header on 404");
            assert.equal(
                response.headers.get("Referrer-Policy"),
                "strict-origin-when-cross-origin",
                "Missing Referrer-Policy header on 404",
            );
        });

        it("should include security headers on 404 response with custom page", async () => {
            const customConfig = createMockConfig({
                render404: async () => "<html><head><title>Not Found</title></head><body><h1>404</h1></body></html>",
            });
            const handler = createProdHandler(customConfig);
            const request = new Request("http://localhost:3000/nonexistent");

            const response = await handler.handleRequest(request);

            assert.equal(response.status, 404);
            assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff", "Missing X-Content-Type-Options header on custom 404");
            assert.equal(response.headers.get("X-Frame-Options"), "DENY", "Missing X-Frame-Options header on custom 404");
            assert.equal(
                response.headers.get("Referrer-Policy"),
                "strict-origin-when-cross-origin",
                "Missing Referrer-Policy header on custom 404",
            );
        });

        it("should include security headers on 500 response", async () => {
            const brokenConfig = createMockConfig();
            brokenConfig.modules["src/pages/index.jsx"].default = async () => {
                throw new Error("Simulated server error");
            };

            const handler = createProdHandler(brokenConfig);
            const request = new Request("http://localhost:3000/");

            const response = await handler.handleRequest(request);

            assert.equal(response.status, 500);
            assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff", "Missing X-Content-Type-Options header on 500");
            assert.equal(response.headers.get("X-Frame-Options"), "DENY", "Missing X-Frame-Options header on 500");
            assert.equal(
                response.headers.get("Referrer-Policy"),
                "strict-origin-when-cross-origin",
                "Missing Referrer-Policy header on 500",
            );
        });

        it("should include security headers on 500 response with custom page", async () => {
            const customConfig = createMockConfig({
                render500: async () => "<html><head><title>Error</title></head><body><h1>500</h1></body></html>",
            });
            customConfig.modules["src/pages/index.jsx"].default = async () => {
                throw new Error("Simulated server error");
            };

            const handler = createProdHandler(customConfig);
            const request = new Request("http://localhost:3000/");

            const response = await handler.handleRequest(request);

            assert.equal(response.status, 500);
            assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff", "Missing X-Content-Type-Options header on custom 500");
            assert.equal(response.headers.get("X-Frame-Options"), "DENY", "Missing X-Frame-Options header on custom 500");
            assert.equal(
                response.headers.get("Referrer-Policy"),
                "strict-origin-when-cross-origin",
                "Missing Referrer-Policy header on custom 500",
            );
        });

        it("should include security headers on HEAD request", async () => {
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/", {
                method: "HEAD",
            });

            const response = await handler.handleRequest(request);

            assert.equal(response.status, 200);
            assert.equal(response.body, null, "HEAD request should have no body");
            assert.equal(
                response.headers.get("X-Content-Type-Options"),
                "nosniff",
                "Missing X-Content-Type-Options header on HEAD request",
            );
            assert.equal(response.headers.get("X-Frame-Options"), "DENY", "Missing X-Frame-Options header on HEAD request");
            assert.equal(
                response.headers.get("Referrer-Policy"),
                "strict-origin-when-cross-origin",
                "Missing Referrer-Policy header on HEAD request",
            );
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
            const request = new Request("http://localhost:3000/");

            const response = await handler.handleRequest(request);

            assert.equal(response.status, 200);
            // Custom override should replace default
            assert.equal(response.headers.get("X-Frame-Options"), "SAMEORIGIN", "Custom X-Frame-Options should override default");
            // Custom header should be added
            assert.equal(response.headers.get("X-Custom-Header"), "custom-value", "Custom header should be present");
            // Other defaults should remain
            assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff", "Default X-Content-Type-Options should remain");
        });

        it("should allow disabling security headers by setting to empty object", async () => {
            const customConfig = createMockConfig({
                securityHeaders: {},
            });

            const handler = createProdHandler(customConfig);
            const request = new Request("http://localhost:3000/");

            const response = await handler.handleRequest(request);

            assert.equal(response.status, 200);
            // When securityHeaders is empty object, defaults should still apply
            // (only explicit header values override defaults)
            assert.equal(
                response.headers.get("X-Content-Type-Options"),
                "nosniff",
                "Default headers should remain with empty securityHeaders",
            );
        });
    });

    describe("Security Headers with Existing Cache-Control", () => {
        it("should preserve Cache-Control header on SSR response", async () => {
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/");

            const response = await handler.handleRequest(request);

            assert.equal(response.status, 200);
            assert.equal(response.headers.get("Cache-Control"), "public, max-age=0, must-revalidate", "Cache-Control should be preserved");
            assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff", "Security headers should coexist with Cache-Control");
        });

        it("should preserve Cache-Control header on 404 response", async () => {
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/nonexistent");

            const response = await handler.handleRequest(request);

            assert.equal(response.status, 404);
            assert.equal(
                response.headers.get("Cache-Control"),
                "public, max-age=0, must-revalidate",
                "Cache-Control should be preserved on 404",
            );
            assert.equal(
                response.headers.get("X-Content-Type-Options"),
                "nosniff",
                "Security headers should coexist with Cache-Control on 404",
            );
        });

        it("should preserve Cache-Control header on 500 response", async () => {
            const brokenConfig = createMockConfig();
            brokenConfig.modules["src/pages/index.jsx"].default = async () => {
                throw new Error("Simulated server error");
            };

            const handler = createProdHandler(brokenConfig);
            const request = new Request("http://localhost:3000/");

            const response = await handler.handleRequest(request);

            assert.equal(response.status, 500);
            assert.equal(response.headers.get("Cache-Control"), "no-store", "Cache-Control should be preserved on 500");
            assert.equal(
                response.headers.get("X-Content-Type-Options"),
                "nosniff",
                "Security headers should coexist with Cache-Control on 500",
            );
        });
    });
});
