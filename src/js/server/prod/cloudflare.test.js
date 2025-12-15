/**
 * @fileoverview Tests for the Cloudflare Workers adapter.
 *
 * Tests cover:
 * - createHandler returns an object with a fetch method
 * - fetch receives Request, env, ctx arguments
 * - Static file requests delegate to env.ASSETS.fetch()
 * - SSR routes call core handler and return Response
 * - Dynamic routes (with [slug]) pass params to SSR module
 * - Invalid slug parameters return 400
 * - Middleware can short-circuit with Response
 * - Middleware receives Web Standard Request
 * - Generated routes fetch pre-rendered HTML from ASSETS
 * - 404 for non-existent routes
 * - HEAD requests return headers without body
 * - Error handling when aliases not configured
 */

import { deepStrictEqual, ok, rejects, strictEqual } from "node:assert";
import { describe, test } from "node:test";
import { createHandler } from "./cloudflare.js";

// --- Test Fixtures ---

/**
 * Create a mock Cloudflare ASSETS binding.
 * @param {Record<string, string>} files - Map of paths to content
 * @returns {{ fetch: (request: Request) => Promise<Response> }}
 */
function createMockAssets(files = {}) {
    return {
        async fetch(request) {
            const url = new URL(request.url);
            const pathname = url.pathname;
            const content = files[pathname];

            if (content !== undefined) {
                return new Response(content, {
                    status: 200,
                    headers: {
                        "Content-Type": pathname.endsWith(".js")
                            ? "application/javascript"
                            : pathname.endsWith(".css")
                              ? "text/css"
                              : pathname.endsWith(".html")
                                ? "text/html"
                                : "application/octet-stream",
                    },
                });
            }

            return new Response("Not Found", { status: 404 });
        },
    };
}

/**
 * Create a mock ExecutionContext.
 * @returns {ExecutionContext}
 */
function createMockContext() {
    return {
        waitUntil: () => {},
        passThroughOnException: () => {},
    };
}

// --- Tests ---

describe("createHandler", () => {
    test("returns an object with a fetch method", async () => {
        const handler = await createHandler({
            routes: [],
            modules: {},
        });

        ok(handler !== null && typeof handler === "object", "Should return an object");
        strictEqual(typeof handler.fetch, "function", "Should have a fetch method");
    });

    test("fetch receives Request, env, ctx arguments", async () => {
        let receivedArgs = null;

        const handler = await createHandler({
            routes: [],
            modules: {},
        });

        // Wrap to capture args
        const originalFetch = handler.fetch;
        handler.fetch = async (request, env, ctx) => {
            receivedArgs = { request, env, ctx };
            return originalFetch(request, env, ctx);
        };

        const request = new Request("https://example.com/");
        const env = { ASSETS: createMockAssets() };
        const ctx = createMockContext();

        await handler.fetch(request, env, ctx);

        ok(receivedArgs !== null, "Arguments should be captured");
        ok(receivedArgs.request instanceof Request, "First arg should be Request");
        strictEqual(receivedArgs.env, env, "Second arg should be env");
        strictEqual(receivedArgs.ctx, ctx, "Third arg should be ctx");
    });

    test("throws helpful error when sxo:routes alias not configured", async () => {
        // When no routes or modules provided, it tries dynamic import
        // which fails since sxo:routes doesn't exist
        await rejects(createHandler({}), (err) => {
            ok(err.message.includes("sxo:routes"), `Expected error about sxo:routes, got: ${err.message}`);
            ok(err.message.includes("wrangler.jsonc"), `Expected guidance about wrangler.jsonc, got: ${err.message}`);
            return true;
        });
    });

    test("throws helpful error when sxo:modules alias not configured", async () => {
        // Provide routes but not modules - should fail on modules import
        await rejects(createHandler({ routes: [] }), (err) => {
            ok(err.message.includes("sxo:modules"), `Expected error about sxo:modules, got: ${err.message}`);
            ok(err.message.includes("wrangler.jsonc"), `Expected guidance about wrangler.jsonc, got: ${err.message}`);
            return true;
        });
    });
});

describe("Cloudflare adapter static file serving", () => {
    test("static file requests delegate to env.ASSETS.fetch()", async () => {
        let assetsFetchCalled = false;

        const handler = await createHandler({
            routes: [],
            modules: {},
        });

        const request = new Request("https://example.com/app.js");
        const env = {
            ASSETS: {
                async fetch(_req) {
                    assetsFetchCalled = true;
                    return new Response('console.log("test");', {
                        headers: { "Content-Type": "application/javascript" },
                    });
                },
            },
        };
        const ctx = createMockContext();

        const response = await handler.fetch(request, env, ctx);

        ok(assetsFetchCalled, "ASSETS.fetch should be called for static files");
        strictEqual(response.status, 200);
        const body = await response.text();
        ok(body.includes('console.log("test")'), "Should return asset content");
    });

    test("static file requests for CSS delegate to env.ASSETS.fetch()", async () => {
        const handler = await createHandler({
            routes: [],
            modules: {},
        });

        const request = new Request("https://example.com/style.css");
        const env = {
            ASSETS: createMockAssets({
                "/style.css": "body { color: red; }",
            }),
        };
        const ctx = createMockContext();

        const response = await handler.fetch(request, env, ctx);

        strictEqual(response.status, 200);
        strictEqual(response.headers.get("Content-Type"), "text/css");
    });

    test("falls through to SSR if asset not found", async () => {
        const routes = [
            {
                filename: "index.html",
                jsx: "src/pages/index.jsx",
                path: "/",
                assets: { css: [], js: [] },
            },
        ];

        const modules = {
            "src/pages/index.jsx": {
                default: () => "<html><head></head><body>SSR Fallback</body></html>",
            },
        };

        const handler = await createHandler({
            routes,
            modules,
        });

        const request = new Request("https://example.com/");
        const env = {
            ASSETS: createMockAssets({}),
        };
        const ctx = createMockContext();

        const response = await handler.fetch(request, env, ctx);

        strictEqual(response.status, 200);
        const body = await response.text();
        ok(body.includes("SSR Fallback"), "Should fall through to SSR");
    });
});

describe("Cloudflare adapter SSR handling", () => {
    test("SSR routes call core handler and return Response", async () => {
        const routes = [
            {
                filename: "index.html",
                jsx: "src/pages/index.jsx",
                path: "/",
                assets: { css: [], js: [] },
            },
        ];

        const modules = {
            "src/pages/index.jsx": {
                default: () => "<html><head></head><body>SSR Content</body></html>",
            },
        };

        const handler = await createHandler({
            routes,
            modules,
        });

        const request = new Request("https://example.com/");
        const env = { ASSETS: createMockAssets() };
        const ctx = createMockContext();

        const response = await handler.fetch(request, env, ctx);

        ok(response instanceof Response, "Should return a Response");
        strictEqual(response.status, 200);
        const body = await response.text();
        ok(body.includes("SSR Content"), "Body should contain SSR content");
        ok(body.includes("<!doctype html>"), "Body should include doctype");
    });

    test("dynamic routes pass params to SSR module", async () => {
        let receivedParams = null;

        const routes = [
            {
                filename: "post/[slug]/index.html",
                jsx: "src/pages/post/[slug]/index.jsx",
                path: "post/[slug]",
                assets: { css: [], js: [] },
            },
        ];

        const modules = {
            "src/pages/post/[slug]/index.jsx": {
                default: (params) => {
                    receivedParams = params;
                    return `<html><head></head><body>Post: ${params.slug}</body></html>`;
                },
            },
        };

        const handler = await createHandler({
            routes,
            modules,
        });

        const request = new Request("https://example.com/post/hello-world");
        const env = { ASSETS: createMockAssets() };
        const ctx = createMockContext();

        const response = await handler.fetch(request, env, ctx);

        strictEqual(response.status, 200);
        const expectedParams = Object.create(null);
        expectedParams.slug = "hello-world";
        deepStrictEqual(receivedParams, expectedParams);
    });

    test("returns 400 for invalid slug parameters", async () => {
        const routes = [
            {
                filename: "post/[slug]/index.html",
                jsx: "src/pages/post/[slug]/index.jsx",
                path: "post/[slug]",
                assets: { css: [], js: [] },
            },
        ];

        const handler = await createHandler({
            routes,
            modules: {},
        });

        const request = new Request("https://example.com/post/<script>");
        const env = { ASSETS: createMockAssets() };
        const ctx = createMockContext();

        const response = await handler.fetch(request, env, ctx);

        strictEqual(response.status, 400);
    });

    test("returns 404 for non-existent routes", async () => {
        const handler = await createHandler({
            routes: [],
            modules: {},
        });

        const request = new Request("https://example.com/nonexistent");
        const env = { ASSETS: createMockAssets() };
        const ctx = createMockContext();

        const response = await handler.fetch(request, env, ctx);

        strictEqual(response.status, 404);
    });
});

describe("Cloudflare adapter middleware integration", () => {
    test("middleware can short-circuit with Response", async () => {
        const middleware = [
            (request) => {
                if (new URL(request.url).pathname === "/blocked") {
                    return new Response("Blocked", { status: 403 });
                }
            },
        ];

        const handler = await createHandler({
            routes: [],
            modules: {},
            middleware,
        });

        const request = new Request("https://example.com/blocked");
        const env = { ASSETS: createMockAssets() };
        const ctx = createMockContext();

        const response = await handler.fetch(request, env, ctx);

        strictEqual(response.status, 403);
        const body = await response.text();
        strictEqual(body, "Blocked");
    });

    test("middleware receives Web Standard Request", async () => {
        let receivedRequest = null;

        const middleware = [
            (request) => {
                receivedRequest = request;
            },
        ];

        const handler = await createHandler({
            routes: [],
            modules: {},
            middleware,
        });

        const request = new Request("https://example.com/test");
        const env = { ASSETS: createMockAssets() };
        const ctx = createMockContext();

        await handler.fetch(request, env, ctx);

        ok(receivedRequest instanceof Request, "Middleware should receive Web Standard Request");
        strictEqual(new URL(receivedRequest.url).pathname, "/test");
    });

    test("middleware runs before static file check", async () => {
        const callOrder = [];

        const middleware = [
            () => {
                callOrder.push("middleware");
            },
        ];

        const handler = await createHandler({
            routes: [],
            modules: {},
            middleware,
        });

        const request = new Request("https://example.com/app.js");
        const env = {
            ASSETS: {
                async fetch() {
                    callOrder.push("assets");
                    return new Response("js content");
                },
            },
        };
        const ctx = createMockContext();

        await handler.fetch(request, env, ctx);

        deepStrictEqual(callOrder, ["middleware", "assets"], "Middleware should run before ASSETS.fetch");
    });
});

describe("Cloudflare adapter generated routes", () => {
    test("generated routes fetch pre-rendered HTML from ASSETS", async () => {
        const routes = [
            {
                filename: "about.html",
                jsx: "src/pages/about/index.jsx",
                path: "/about",
                generated: true,
                assets: { css: [], js: [] },
            },
        ];

        const handler = await createHandler({
            routes,
            modules: {},
        });

        const request = new Request("https://example.com/about");
        const env = {
            ASSETS: createMockAssets({
                "/about.html": "<!doctype html><html><body>About Page</body></html>",
            }),
        };
        const ctx = createMockContext();

        const response = await handler.fetch(request, env, ctx);

        strictEqual(response.status, 200);
        const body = await response.text();
        ok(body.includes("About Page"), "Should serve pre-rendered content");
    });

    test("generated routes set appropriate cache headers", async () => {
        const routes = [
            {
                filename: "about.html",
                jsx: "src/pages/about/index.jsx",
                path: "/about",
                generated: true,
                assets: { css: [], js: [] },
            },
        ];

        const handler = await createHandler({
            routes,
            modules: {},
        });

        const request = new Request("https://example.com/about");
        const env = {
            ASSETS: createMockAssets({
                "/about.html": "<!doctype html><html><body>About Page</body></html>",
            }),
        };
        const ctx = createMockContext();

        const response = await handler.fetch(request, env, ctx);

        strictEqual(response.headers.get("Cache-Control"), "public, max-age=300");
    });
});

describe("Cloudflare adapter HEAD requests", () => {
    test("HEAD request for static file returns headers without body", async () => {
        const handler = await createHandler({
            routes: [],
            modules: {},
        });

        const request = new Request("https://example.com/app.js", { method: "HEAD" });
        const env = {
            ASSETS: createMockAssets({
                "/app.js": 'console.log("test");',
            }),
        };
        const ctx = createMockContext();

        const response = await handler.fetch(request, env, ctx);

        strictEqual(response.status, 200);
        const body = await response.text();
        strictEqual(body, "", "HEAD response should have no body");
    });

    test("HEAD request for SSR route returns headers without body", async () => {
        const routes = [
            {
                filename: "index.html",
                jsx: "src/pages/index.jsx",
                path: "/",
                assets: { css: [], js: [] },
            },
        ];

        const modules = {
            "src/pages/index.jsx": {
                default: () => "<html><head></head><body>Content</body></html>",
            },
        };

        const handler = await createHandler({
            routes,
            modules,
        });

        const request = new Request("https://example.com/", { method: "HEAD" });
        const env = { ASSETS: createMockAssets() };
        const ctx = createMockContext();

        const response = await handler.fetch(request, env, ctx);

        strictEqual(response.status, 200);
        const body = await response.text();
        strictEqual(body, "", "HEAD response should have no body");
    });

    test("HEAD request for 404 returns headers without body", async () => {
        const handler = await createHandler({
            routes: [],
            modules: {},
        });

        const request = new Request("https://example.com/nonexistent", { method: "HEAD" });
        const env = { ASSETS: createMockAssets() };
        const ctx = createMockContext();

        const response = await handler.fetch(request, env, ctx);

        strictEqual(response.status, 404);
        const body = await response.text();
        strictEqual(body, "", "HEAD 404 response should have no body");
    });
});

describe("Cloudflare adapter publicPath configuration", () => {
    test("uses default publicPath of /", async () => {
        const routes = [
            {
                filename: "index.html",
                jsx: "src/pages/index.jsx",
                path: "/",
                assets: { css: ["style.css"], js: ["app.js"] },
            },
        ];

        const modules = {
            "src/pages/index.jsx": {
                default: () => "<html><head></head><body>Content</body></html>",
            },
        };

        const handler = await createHandler({
            routes,
            modules,
        });

        const request = new Request("https://example.com/");
        const env = { ASSETS: createMockAssets() };
        const ctx = createMockContext();

        const response = await handler.fetch(request, env, ctx);
        const body = await response.text();

        ok(body.includes('href="/style.css"'), "Should use default / publicPath for CSS");
        ok(body.includes('src="/app.js"'), "Should use default / publicPath for JS");
    });

    test("uses custom publicPath when provided", async () => {
        const routes = [
            {
                filename: "index.html",
                jsx: "src/pages/index.jsx",
                path: "/",
                assets: { css: ["style.css"], js: ["app.js"] },
            },
        ];

        const modules = {
            "src/pages/index.jsx": {
                default: () => "<html><head></head><body>Content</body></html>",
            },
        };

        const handler = await createHandler({
            routes,
            modules,
            publicPath: "/assets/",
        });

        const request = new Request("https://example.com/");
        const env = { ASSETS: createMockAssets() };
        const ctx = createMockContext();

        const response = await handler.fetch(request, env, ctx);
        const body = await response.text();

        ok(body.includes('href="/assets/style.css"'), "Should use custom publicPath for CSS");
        ok(body.includes('src="/assets/app.js"'), "Should use custom publicPath for JS");
    });
});

describe("Cloudflare adapter security headers", () => {
    test("SSR responses include default security headers", async () => {
        const routes = [
            {
                filename: "index.html",
                jsx: "src/pages/index.jsx",
                path: "/",
                assets: { css: [], js: [] },
            },
        ];

        const modules = {
            "src/pages/index.jsx": {
                default: () => "<html><head></head><body>Content</body></html>",
            },
        };

        const handler = await createHandler({
            routes,
            modules,
        });

        const request = new Request("https://example.com/");
        const env = { ASSETS: createMockAssets() };
        const ctx = createMockContext();

        const response = await handler.fetch(request, env, ctx);

        strictEqual(response.headers.get("X-Content-Type-Options"), "nosniff");
        strictEqual(response.headers.get("X-Frame-Options"), "DENY");
        strictEqual(response.headers.get("Referrer-Policy"), "strict-origin-when-cross-origin");
    });

    test("custom security headers override defaults", async () => {
        const routes = [
            {
                filename: "index.html",
                jsx: "src/pages/index.jsx",
                path: "/",
                assets: { css: [], js: [] },
            },
        ];

        const modules = {
            "src/pages/index.jsx": {
                default: () => "<html><head></head><body>Content</body></html>",
            },
        };

        const handler = await createHandler({
            routes,
            modules,
            securityHeaders: {
                "X-Frame-Options": "SAMEORIGIN",
                "Strict-Transport-Security": "max-age=31536000",
            },
        });

        const request = new Request("https://example.com/");
        const env = { ASSETS: createMockAssets() };
        const ctx = createMockContext();

        const response = await handler.fetch(request, env, ctx);

        // Custom header overrides default
        strictEqual(response.headers.get("X-Frame-Options"), "SAMEORIGIN");
        // New custom header added
        strictEqual(response.headers.get("Strict-Transport-Security"), "max-age=31536000");
        // Default headers still present
        strictEqual(response.headers.get("X-Content-Type-Options"), "nosniff");
        strictEqual(response.headers.get("Referrer-Policy"), "strict-origin-when-cross-origin");
    });

    test("404 responses include security headers", async () => {
        const handler = await createHandler({
            routes: [],
            modules: {},
            securityHeaders: {
                "X-Frame-Options": "SAMEORIGIN",
            },
        });

        const request = new Request("https://example.com/nonexistent");
        const env = { ASSETS: createMockAssets() };
        const ctx = createMockContext();

        const response = await handler.fetch(request, env, ctx);

        strictEqual(response.status, 404);
        strictEqual(response.headers.get("X-Frame-Options"), "SAMEORIGIN");
        strictEqual(response.headers.get("X-Content-Type-Options"), "nosniff");
    });
});
