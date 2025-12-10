/**
 * @fileoverview Tests for the platform-agnostic core handler.
 *
 * Tests cover:
 * - createCoreHandler returns a function
 * - Handler accepts Request and returns Promise<Response>
 * - Handler returns null when no route matches
 * - Handler returns 400 for invalid slug
 * - Handler calls SSR module render function
 * - Handler injects assets into HTML response
 * - Handler prepends <!doctype html> for HTML responses
 * - Handler returns null for generated routes (adapter serves pre-rendered)
 * - Handler respects middleware chain
 */

import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { describe, mock, test } from "node:test";
import { createCoreHandler } from "./handler.js";

// --- Mock Routes ---
const mockRoutes = [
    { path: "", filename: "index.html", jsx: "src/pages/index.jsx", assets: { css: ["index.css"], js: ["index.js"] } },
    { path: "about", filename: "about/index.html", jsx: "src/pages/about/index.jsx", assets: { css: ["about.css"], js: [] } },
    { path: "blog/[slug]", filename: "blog-slug.html", jsx: "src/pages/blog/[slug]/index.jsx", assets: { css: [], js: ["blog.js"] } },
    { path: "generated", filename: "generated/index.html", jsx: "src/pages/generated/index.jsx", generated: true, assets: {} },
];

// --- Mock Modules ---
const mockModules = {
    "src/pages/index.jsx": { default: () => "<html><head><title>Home</title></head><body>Home Page</body></html>" },
    "src/pages/about/index.jsx": { default: async () => "<html><head><title>About</title></head><body>About Page</body></html>" },
    "src/pages/blog/[slug]/index.jsx": { default: (params) => `<html><head></head><body>Blog: ${params.slug}</body></html>` },
    "src/pages/generated/index.jsx": { default: () => "<html><head></head><body>Generated</body></html>" },
};

// --- Helper to create Request ---
function createRequest(url, method = "GET") {
    return new Request(`http://localhost${url}`, { method });
}

describe("createCoreHandler", () => {
    test("returns a function", () => {
        const handler = createCoreHandler({
            routes: mockRoutes,
            modules: mockModules,
        });
        strictEqual(typeof handler, "function");
    });

    test("handler returns Promise<Response> for matched route", async () => {
        const handler = createCoreHandler({
            routes: mockRoutes,
            modules: mockModules,
        });
        const request = createRequest("/");
        const response = await handler(request);

        ok(response instanceof Response, "should return a Response");
        strictEqual(response.status, 200);
    });

    test("handler returns null when no route matches", async () => {
        const handler = createCoreHandler({
            routes: mockRoutes,
            modules: mockModules,
        });
        const request = createRequest("/not-found-route");
        const result = await handler(request);

        strictEqual(result, null, "should return null for unmatched route");
    });

    test("handler returns 400 for invalid slug", async () => {
        const handler = createCoreHandler({
            routes: mockRoutes,
            modules: mockModules,
        });
        // Space in slug is invalid per SLUG_REGEX
        const request = createRequest("/blog/hello world");
        const response = await handler(request);

        ok(response instanceof Response, "should return a Response");
        strictEqual(response.status, 400);
        const text = await response.text();
        ok(text.includes("Invalid"), "should contain 'Invalid' in error message");
    });

    test("handler calls SSR module render function with params", async () => {
        const renderFn = mock.fn((params) => `<html><head></head><body>Slug: ${params.slug}</body></html>`);
        const modules = {
            ...mockModules,
            "src/pages/blog/[slug]/index.jsx": { default: renderFn },
        };

        const handler = createCoreHandler({
            routes: mockRoutes,
            modules,
        });
        const request = createRequest("/blog/test-post");
        const response = await handler(request);

        strictEqual(response.status, 200);
        strictEqual(renderFn.mock.calls.length, 1, "render function should be called once");
        deepStrictEqual(renderFn.mock.calls[0].arguments[0], { slug: "test-post" });
    });

    test("handler supports async render functions", async () => {
        const handler = createCoreHandler({
            routes: mockRoutes,
            modules: mockModules,
        });
        const request = createRequest("/about");
        const response = await handler(request);

        strictEqual(response.status, 200);
        const text = await response.text();
        ok(text.includes("About Page"), "should contain rendered content");
    });

    test("handler injects assets into HTML response", async () => {
        const handler = createCoreHandler({
            routes: mockRoutes,
            modules: mockModules,
            publicPath: "/",
        });
        const request = createRequest("/");
        const response = await handler(request);
        const html = await response.text();

        ok(html.includes('<link rel="stylesheet" href="/index.css">'), "should inject CSS");
        ok(html.includes('<script type="module" src="/index.js">'), "should inject JS");
    });

    test("handler prepends <!doctype html> for HTML responses", async () => {
        const handler = createCoreHandler({
            routes: mockRoutes,
            modules: mockModules,
        });
        const request = createRequest("/");
        const response = await handler(request);
        const html = await response.text();

        ok(html.startsWith("<!doctype html>"), "should start with doctype");
    });

    test("handler returns null for generated routes", async () => {
        const handler = createCoreHandler({
            routes: mockRoutes,
            modules: mockModules,
        });
        const request = createRequest("/generated");
        const result = await handler(request);

        strictEqual(result, null, "should return null for generated routes");
    });

    test("handler sets correct Content-Type header", async () => {
        const handler = createCoreHandler({
            routes: mockRoutes,
            modules: mockModules,
        });
        const request = createRequest("/");
        const response = await handler(request);

        strictEqual(response.headers.get("Content-Type"), "text/html; charset=utf-8");
    });

    test("handler sets Cache-Control header for dynamic routes", async () => {
        const handler = createCoreHandler({
            routes: mockRoutes,
            modules: mockModules,
        });
        const request = createRequest("/");
        const response = await handler(request);

        strictEqual(response.headers.get("Cache-Control"), "public, max-age=0, must-revalidate");
    });

    test("handler passes env to middleware", async () => {
        const envReceived = [];
        const middleware = (_req, env) => {
            envReceived.push(env);
            // Continue to handler
        };

        const handler = createCoreHandler({
            routes: mockRoutes,
            modules: mockModules,
            middleware: [middleware],
        });

        const env = { DATABASE: "mock-db" };
        const request = createRequest("/");
        await handler(request, env);

        strictEqual(envReceived.length, 1);
        strictEqual(envReceived[0].DATABASE, "mock-db");
    });

    test("handler returns 500 when module not found", async () => {
        const handler = createCoreHandler({
            routes: [{ path: "broken", filename: "broken.html", jsx: "src/pages/broken.jsx", assets: {} }],
            modules: {}, // No modules
        });
        const request = createRequest("/broken");
        const response = await handler(request);

        strictEqual(response.status, 500);
    });

    test("handler uses named jsx export if no default export", async () => {
        const modules = {
            "src/pages/index.jsx": { jsx: () => "<html><head></head><body>Named Export</body></html>" },
        };
        const routes = [{ path: "", filename: "index.html", jsx: "src/pages/index.jsx", assets: {} }];

        const handler = createCoreHandler({ routes, modules });
        const request = createRequest("/");
        const response = await handler(request);

        strictEqual(response.status, 200);
        const text = await response.text();
        ok(text.includes("Named Export"));
    });

    test("handler respects custom publicPath", async () => {
        const handler = createCoreHandler({
            routes: mockRoutes,
            modules: mockModules,
            publicPath: "/assets/",
        });
        const request = createRequest("/");
        const response = await handler(request);
        const html = await response.text();

        ok(html.includes('href="/assets/index.css"'), "should use custom publicPath for CSS");
        ok(html.includes('src="/assets/index.js"'), "should use custom publicPath for JS");
    });

    test("handler handles empty publicPath", async () => {
        const handler = createCoreHandler({
            routes: mockRoutes,
            modules: mockModules,
            publicPath: "",
        });
        const request = createRequest("/");
        const response = await handler(request);
        const html = await response.text();

        ok(html.includes('href="index.css"'), "should handle empty publicPath");
    });
});

describe("createCoreHandler with middleware", () => {
    test("middleware returning Response short-circuits", async () => {
        const earlyResponse = new Response("Blocked", { status: 403 });
        const middleware = () => earlyResponse;

        const handler = createCoreHandler({
            routes: mockRoutes,
            modules: mockModules,
            middleware: [middleware],
        });

        const request = createRequest("/");
        const response = await handler(request);

        strictEqual(response.status, 403);
        const text = await response.text();
        strictEqual(text, "Blocked");
    });

    test("middleware returning void continues to handler", async () => {
        let middlewareCalled = false;
        const middleware = () => {
            middlewareCalled = true;
            // Return nothing to continue
        };

        const handler = createCoreHandler({
            routes: mockRoutes,
            modules: mockModules,
            middleware: [middleware],
        });

        const request = createRequest("/");
        const response = await handler(request);

        ok(middlewareCalled, "middleware should be called");
        strictEqual(response.status, 200);
    });

    test("middleware chain executes in order", async () => {
        const order = [];
        const mw1 = () => {
            order.push(1);
        };
        const mw2 = () => {
            order.push(2);
        };
        const mw3 = () => {
            order.push(3);
        };

        const handler = createCoreHandler({
            routes: mockRoutes,
            modules: mockModules,
            middleware: [mw1, mw2, mw3],
        });

        const request = createRequest("/");
        await handler(request);

        deepStrictEqual(order, [1, 2, 3]);
    });

    test("async middleware supported", async () => {
        const asyncMiddleware = async (req) => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            if (new URL(req.url).pathname === "/blocked") {
                return new Response("Async Blocked", { status: 403 });
            }
        };

        const handler = createCoreHandler({
            routes: mockRoutes,
            modules: mockModules,
            middleware: [asyncMiddleware],
        });

        const blockedRequest = createRequest("/blocked");
        const blockedResponse = await handler(blockedRequest);
        strictEqual(blockedResponse.status, 403);

        const normalRequest = createRequest("/");
        const normalResponse = await handler(normalRequest);
        strictEqual(normalResponse.status, 200);
    });

    test("middleware throwing returns 500", async () => {
        const throwingMiddleware = () => {
            throw new Error("Middleware error");
        };

        const handler = createCoreHandler({
            routes: mockRoutes,
            modules: mockModules,
            middleware: [throwingMiddleware],
        });

        const request = createRequest("/");
        const response = await handler(request);

        strictEqual(response.status, 500);
    });
});
