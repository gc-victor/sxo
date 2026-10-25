/**
 * @fileoverview Tests for prod core handler.
 *
 * Tests the platform-agnostic request handling logic for production servers.
 *
 * @module server/prod/core-handler.test
 */

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { createFetchHandler, createGeneratedRouteHandler, createProdHandler } from "./core-handler.js";

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
            assets: { css: ["about.css"], js: [] },
        },
        {
            path: "posts/[slug]",
            filename: "posts/[slug]/index.html",
            jsx: "src/pages/posts/[slug]/index.jsx",
            assets: { css: [], js: [] },
        },
        {
            path: "static-page",
            filename: "static-page/index.html",
            jsx: "src/pages/static-page/index.jsx",
            assets: { css: ["static.css"], js: [] },
            generated: true,
        },
    ];

    const modules = {
        "src/pages/index.jsx": {
            default: async () => "<html><head><title>Home</title></head><body><h1>Home</h1></body></html>",
        },
        "src/pages/about/index.jsx": {
            jsx: async () => "<html><head><title>About</title></head><body><h1>About</h1></body></html>",
        },
        "src/pages/posts/[slug]/index.jsx": {
            default: async (params) => `<html><head><title>${params.slug}</title></head><body><h1>Post: ${params.slug}</h1></body></html>`,
        },
        "src/pages/static-page/index.jsx": {
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
        ...overrides,
    };
}

function createMockFileReader(files) {
    return { readText: async (path) => files[path] ?? null };
}

function createMockFetchHandlers(overrides = {}) {
    return {
        handleStaticRequest: async () => null,
        handleRequest: async () => ({ type: "response", response: new Response("SSR content", { status: 200 }) }),
        serveGeneratedRoute: async () => null,
        send404: async () => new Response("Not Found", { status: 404 }),
        send500: async () => new Response("Internal Server Error", { status: 500 }),
        ...overrides,
    };
}

/**
 * Creates a handler and executes a request, returning the result.
 * @param {object} config - Handler configuration
 * @param {string} url - Request URL
 * @param {object} [options] - Request options (method, headers, etc.)
 * @returns {Promise<object>} Handler result
 */
async function executeRequest(config, url, options = {}) {
    const handler = createProdHandler(config);
    const request = new Request(url, options);
    return handler.handleRequest(request, {}, options.handlerOptions ?? {});
}

/**
 * Asserts that a handler result is a response with expected properties.
 * @param {object} result - Handler result
 * @param {number} expectedStatus - Expected status code
 * @param {object} [expectedHeaders] - Expected header values
 * @returns {Promise<Response>}
 */
async function assertResponseResult(result, expectedStatus, expectedHeaders = {}) {
    assert.equal(result.type, "response");
    const { response } = result;
    assert.equal(response.status, expectedStatus);
    for (const [key, value] of Object.entries(expectedHeaders)) {
        assert.equal(response.headers.get(key), value);
    }
    return response;
}

/**
 * Asserts that a response body contains expected content.
 * @param {Response} response
 * @param {string|string[]} expected - Expected content or array of content to check
 * @returns {Promise<string>}
 */
async function assertResponseBody(response, expected) {
    const body = await response.text();
    const expectations = Array.isArray(expected) ? expected : [expected];
    for (const exp of expectations) {
        assert.ok(body.includes(exp), `Expected body to include: ${exp}`);
    }
    return body;
}

/**
 * Creates a mock middleware that tracks calls.
 * @param {string} name - Middleware identifier
 * @param {Array} calls - Array to push call record to
 * @param {Response|void} [returnValue] - Optional response to return
 * @returns {Function}
 */
function createTrackingMiddleware(name, calls, returnValue) {
    return async () => {
        calls.push(name);
        return returnValue;
    };
}

describe("createProdHandler", () => {
    /** @type {ReturnType<typeof createMockConfig>} */
    let config;

    beforeEach(() => {
        config = createMockConfig();
    });

    describe("factory function", () => {
        it("returns handler object with expected methods", () => {
            const handler = createProdHandler(config);

            assert.equal(typeof handler, "object");
            assert.equal(typeof handler.handleRequest, "function");
            assert.equal(typeof handler.send404, "function");
            assert.equal(typeof handler.send500, "function");
        });

        it("uses default values for optional config", () => {
            const handler = createProdHandler({ getRoutes: () => [], modules: {} });

            assert.equal(typeof handler.handleRequest, "function");
        });
    });

    describe("URL validation", () => {
        const testCases = [
            {
                name: "rejects URLs longer than 2048 characters with 414",
                path: "/a".repeat(2050),
                expectedStatus: 414,
                expectedBody: "URI Too Long",
            },
            {
                name: "returns 400 for invalid URL encoding",
                path: "/%invalid",
                expectedStatus: 400,
            },
        ];

        for (const { name, path, expectedStatus, expectedBody } of testCases) {
            it(name, async () => {
                const result = await executeRequest(config, `http://localhost:3000${path}`);
                const response = await assertResponseResult(result, expectedStatus);
                if (expectedBody) {
                    const body = await response.text();
                    assert.ok(body.includes(expectedBody));
                }
            });
        }

        it("returns empty body for HEAD request on 414", async () => {
            const result = await executeRequest(config, `http://localhost:3000${"/a".repeat(2050)}`, {
                method: "HEAD",
            });
            const response = await assertResponseResult(result, 414);
            const body = await response.text();

            assert.equal(body, "");
        });
    });

    describe("OPTIONS requests", () => {
        it("returns 204 for OPTIONS requests", async () => {
            const result = await executeRequest(config, "http://localhost:3000/about", { method: "OPTIONS" });
            await assertResponseResult(result, 204);
        });
    });

    describe("middleware execution", () => {
        it("executes middleware chain in order", async () => {
            const middlewareCalled = [];
            config.getMiddleware = () => [
                createTrackingMiddleware("mw1", middlewareCalled),
                createTrackingMiddleware("mw2", middlewareCalled),
            ];

            await executeRequest(config, "http://localhost:3000/about");

            assert.deepEqual(middlewareCalled, ["mw1", "mw2"]);
        });

        it("short-circuits on middleware returning Response", async () => {
            config.getMiddleware = () => [
                async () => new Response("Intercepted", { status: 403 }),
                async () => {
                    throw new Error("Should not be called");
                },
            ];

            const result = await executeRequest(config, "http://localhost:3000/about");
            const response = await assertResponseResult(result, 403);

            assert.equal(await response.text(), "Intercepted");
        });

        it("strips body for HEAD requests with middleware Response", async () => {
            config.getMiddleware = () => [async () => new Response("Body", { status: 200 })];

            const result = await executeRequest(config, "http://localhost:3000/about", { method: "HEAD" });
            const response = await assertResponseResult(result, 200);

            assert.equal(await response.text(), "");
        });

        it("returns 500 when middleware throws", async () => {
            config.getMiddleware = () => [
                async () => {
                    throw new Error("Middleware error");
                },
            ];

            const result = await executeRequest(config, "http://localhost:3000/about");
            await assertResponseResult(result, 500);
        });

        it("skips non-function middleware entries", async () => {
            config.getMiddleware = () => [null, undefined, "not a function", async () => {}];

            const result = await executeRequest(config, "http://localhost:3000/about");
            await assertResponseResult(result, 200);
        });

        it("skips middleware when skipMiddleware option is true", async () => {
            let middlewareCalled = false;
            config.getMiddleware = () => [
                async () => {
                    middlewareCalled = true;
                },
            ];

            await executeRequest(config, "http://localhost:3000/about", {
                handlerOptions: { skipMiddleware: true },
            });

            assert.equal(middlewareCalled, false);
        });

        it("middleware can render a page module via context.render", async () => {
            config.getMiddleware = () => [
                async (_req, _env, { render }) => {
                    const html = await render("src/pages/index.jsx");
                    return new Response(html, {
                        status: 200,
                        headers: { "Content-Type": "text/html; charset=utf-8" },
                    });
                },
            ];

            const result = await executeRequest(config, "http://localhost:3000/");
            const response = await assertResponseResult(result, 200);
            const body = await response.text();
            assert.ok(body.includes("<h1>Home</h1>"), "should contain rendered page content");
            assert.ok(body.startsWith("<!doctype html>"), "should prepend doctype");
            assert.ok(body.includes('href="/index.css"'), "should find the route and inject its CSS asset");
            assert.ok(body.includes('src="/index.js"'), "should inject the route's JavaScript asset");
        });

        it("middleware context render stringifies values and maps nullish values to empty strings", async () => {
            config.modules["src/pages/value.jsx"] = { default: ({ value }) => value };
            config.getMiddleware = () => [
                async (_req, _env, { render }) =>
                    new Response(
                        `${await render("src/pages/value.jsx", { value: 42 })}|${await render("src/pages/value.jsx", { value: null })}`,
                    ),
            ];

            const result = await executeRequest(config, "http://localhost:3000/");

            await assertResponseBody(result.response, "42|");
        });

        it("middleware can pass params to context.render", async () => {
            config.getMiddleware = () => [
                async (_req, _env, { render }) => {
                    const html = await render("src/pages/posts/[slug]/index.jsx", { slug: "test-post" });
                    return new Response(html, {
                        status: 200,
                        headers: { "Content-Type": "text/html; charset=utf-8" },
                    });
                },
            ];

            const result = await executeRequest(config, "http://localhost:3000/");
            const response = await assertResponseResult(result, 200);
            const body = await response.text();
            assert.ok(body.includes("Post: test-post"), "should pass params to render function");
        });

        it("middleware render throws for missing module", async () => {
            config.getMiddleware = () => [
                async (_req, _env, { render }) => {
                    try {
                        await render("src/pages/nonexistent.jsx");
                        return new Response("should not reach", { status: 200 });
                    } catch {
                        return new Response("Module not found", { status: 404 });
                    }
                },
            ];

            const result = await executeRequest(config, "http://localhost:3000/");
            const response = await assertResponseResult(result, 404);
            const body = await response.text();
            assert.ok(body.includes("Module not found"));
        });
    });

    describe("SSR rendering", () => {
        const routeTestCases = [
            {
                name: "renders root route",
                url: "http://localhost:3000/",
                expectedContent: ["<!doctype html>", "<h1>Home</h1>"],
            },
            {
                name: "renders named route",
                url: "http://localhost:3000/about",
                expectedContent: "<h1>About</h1>",
            },
            {
                name: "renders dynamic route with slug",
                url: "http://localhost:3000/posts/hello-world",
                expectedContent: "Post: hello-world",
            },
        ];

        for (const { name, url, expectedContent } of routeTestCases) {
            it(name, async () => {
                const result = await executeRequest(config, url);
                const response = await assertResponseResult(result, 200, {
                    "Content-Type": "text/html; charset=utf-8",
                    "Cache-Control": "public, max-age=0, must-revalidate",
                });
                await assertResponseBody(response, expectedContent);
            });
        }

        it("injects CSS and JS assets into HTML", async () => {
            const result = await executeRequest(config, "http://localhost:3000/");
            await assertResponseBody(result.response, ['rel="stylesheet"', "index.css", 'type="module"', "index.js"]);
        });

        const publicPathTestCases = [
            { publicPath: "/cdn/", expected: ['href="/cdn/index.css"', 'src="/cdn/index.js"'] },
            { publicPath: "", expected: 'href="index.css"' },
        ];

        for (const { publicPath, expected } of publicPathTestCases) {
            it(`uses public path "${publicPath || "empty"}" for asset URLs`, async () => {
                const customConfig = createMockConfig({ publicPath });
                const result = await executeRequest(customConfig, "http://localhost:3000/");
                await assertResponseBody(result.response, expected);
            });
        }

        it("returns empty body for HEAD requests", async () => {
            const result = await executeRequest(config, "http://localhost:3000/", { method: "HEAD" });
            const response = await assertResponseResult(result, 200, {
                "Content-Type": "text/html; charset=utf-8",
            });
            const body = await response.text();

            assert.equal(body, "");
        });

        it("returns 400 HTML page for invalid slug", async () => {
            const result = await executeRequest(config, "http://localhost:3000/posts/<script>");
            const response = await assertResponseResult(result, 400);

            assert.ok(response.headers.get("Content-Type")?.includes("text/html"));
        });
    });

    describe("generated routes", () => {
        it("returns generated result with route info", async () => {
            const result = await executeRequest(config, "http://localhost:3000/static-page");

            assert.equal(result.type, "generated");
            assert.ok(result.route);
            assert.equal(result.route.path, "static-page");
            assert.equal(result.route.filename, "static-page/index.html");
            assert.ok(result.params);
            assert.equal(Object.keys(result.params).length, 0);
            assert.equal(result.route.generated, true);
        });
    });

    describe("404 handling", () => {
        it("returns 404 for non-existent route", async () => {
            const result = await executeRequest(config, "http://localhost:3000/nonexistent");

            await assertResponseResult(result, 404, {
                "Cache-Control": "public, max-age=0, must-revalidate",
            });
        });

        it("renders custom 404 page when available", async () => {
            const customConfig = createMockConfig({
                render404: async () => "<html><head><title>404</title></head><body><h1>Custom 404</h1></body></html>",
            });

            const result = await executeRequest(customConfig, "http://localhost:3000/nonexistent");
            const response = await assertResponseResult(result, 404);

            await assertResponseBody(response, ["Custom 404", "<!doctype html>"]);
        });

        const fallbackTestCases = [
            {
                name: "404",
                setup: () =>
                    createMockConfig({
                        render404: async () => {
                            throw new Error("Render error");
                        },
                    }),
                url: "http://localhost:3000/nonexistent",
                expectedStatus: 404,
                expectedBody:
                    '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>Not Found</title></head><body><h1>Not Found</h1><p>The requested resource was not found.</p></body></html>',
            },
            {
                name: "500",
                setup: () =>
                    createMockConfig({
                        render500: async () => {
                            throw new Error("500 render error");
                        },
                        modules: {
                            "src/pages/index.jsx": {
                                default: async () => {
                                    throw new Error("Render error");
                                },
                            },
                        },
                    }),
                url: "http://localhost:3000/",
                expectedStatus: 500,
                expectedBody:
                    '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>Internal Server Error</title></head><body><h1>Internal Server Error</h1><p>The server encountered an internal error.</p></body></html>',
            },
        ];

        for (const { name, setup, url, expectedStatus, expectedBody } of fallbackTestCases) {
            it(`falls back to HTML ${name} when custom render fails`, async () => {
                const customConfig = setup();
                const result = await executeRequest(customConfig, url);
                const response = await assertResponseResult(result, expectedStatus);
                const body = await response.text();
                assert.equal(body, expectedBody);
            });
        }
    });

    describe("500 handling", () => {
        function createErrorModule(error) {
            return {
                default: async () => {
                    throw error;
                },
            };
        }

        it("returns 500 on SSR error", async () => {
            const customConfig = createMockConfig({
                modules: {
                    "src/pages/index.jsx": createErrorModule(new Error("Render error")),
                },
            });

            const result = await executeRequest(customConfig, "http://localhost:3000/");
            await assertResponseResult(result, 500, { "Cache-Control": "no-store" });
        });

        it("renders custom 500 page when available", async () => {
            const customConfig = createMockConfig({
                render500: async () => "<html><head><title>500</title></head><body><h1>Custom 500</h1></body></html>",
                modules: {
                    "src/pages/index.jsx": createErrorModule(new Error("Render error")),
                },
            });

            const result = await executeRequest(customConfig, "http://localhost:3000/");
            const response = await assertResponseResult(result, 500);

            await assertResponseBody(response, "Custom 500");
        });

        it("returns 500 when module not found", async () => {
            const customConfig = createMockConfig({ modules: {} });

            const result = await executeRequest(customConfig, "http://localhost:3000/");
            await assertResponseResult(result, 500);
        });

        it("returns 500 when module has no valid export", async () => {
            const customConfig = createMockConfig({
                modules: {
                    "src/pages/index.jsx": { otherExport: () => {} },
                },
            });

            const result = await executeRequest(customConfig, "http://localhost:3000/");
            await assertResponseResult(result, 500);
        });
    });

    describe("non-HTML pages", () => {
        function createFragmentConfig(content) {
            return createMockConfig({
                modules: {
                    "src/pages/index.jsx": { default: async () => content },
                },
            });
        }

        it("renders non-HTML content without doctype", async () => {
            const customConfig = createFragmentConfig("<div>Not a full HTML page</div>");

            const result = await executeRequest(customConfig, "http://localhost:3000/");
            const response = await assertResponseResult(result, 200);
            const body = await response.text();

            assert.ok(!body.includes("<!doctype html>"));
            assert.ok(body.includes("<div>Not a full HTML page</div>"));
        });

        it("does not inject assets into non-HTML content", async () => {
            const customConfig = createFragmentConfig("<div>Fragment</div>");

            const result = await executeRequest(customConfig, "http://localhost:3000/");
            const body = await result.response.text();

            assert.ok(!body.includes("stylesheet"));
        });
    });

    describe("direct error method calls", () => {
        it("send404 returns 404 response", async () => {
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/any");

            const response = await handler.send404(request);

            assert.equal(response.status, 404);
        });

        it("send500 returns 500 response", async () => {
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/any");

            const response = await handler.send500(request);

            assert.equal(response.status, 500);
        });
    });

    describe("pre-decoded pathname option", () => {
        it("uses decodedPathname option when provided", async () => {
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/%2Fweird");

            const result = await handler.handleRequest(request, {}, { decodedPathname: "about" });
            const response = await assertResponseResult(result, 200);

            await assertResponseBody(response, "<h1>About</h1>");
        });
    });
});

describe("createGeneratedRouteHandler", () => {
    function createHandler(files) {
        return createGeneratedRouteHandler({
            staticDir: "/dist/client",
            fileReader: createMockFileReader(files),
        });
    }

    it("serves generated route HTML", async () => {
        const html = "<!doctype html><html><body>Generated</body></html>";
        const handler = createHandler({ "/dist/client/about/index.html": html });
        const route = { filename: "about/index.html", jsx: "src/pages/about/index.jsx" };
        const request = new Request("http://localhost:3000/about");

        const result = await handler(route, request);

        assert.notEqual(result, null);
        assert.equal(result.status, 200);
        assert.equal(result.headers.get("Content-Type"), "text/html; charset=utf-8");
        assert.equal(result.headers.get("Cache-Control"), "public, max-age=300");
        assert.equal(await result.text(), html);
    });

    it("handles HEAD requests without body", async () => {
        const handler = createHandler({ "/dist/client/index.html": "<html></html>" });
        const route = { filename: "index.html", jsx: "src/pages/index.jsx" };
        const request = new Request("http://localhost:3000/", { method: "HEAD" });

        const result = await handler(route, request);

        assert.notEqual(result, null);
        assert.equal(result.status, 200);
        assert.equal(result.body, null);
    });

    it("returns null when file not found", async () => {
        const handler = createHandler({});
        const route = { filename: "missing.html", jsx: "src/pages/missing.jsx" };
        const request = new Request("http://localhost:3000/missing");

        const result = await handler(route, request);

        assert.equal(result, null);
    });
});

describe("createFetchHandler", () => {
    /**
     * Helper to execute a fetch handler with mocked dependencies.
     * @param {string} url - Request URL
     * @param {object} [overrides] - Handler overrides
     * @returns {Promise<Response>}
     */
    async function executeFetchHandler(url, overrides = {}) {
        const handlers = createMockFetchHandlers(overrides);
        const fetchHandler = createFetchHandler(handlers);
        return fetchHandler(new Request(url));
    }

    it("returns static response when handleStaticRequest matches", async () => {
        const response = await executeFetchHandler("http://localhost:3000/style.css", {
            handleStaticRequest: async () => new Response("static file", { status: 200 }),
        });

        assert.equal(response.status, 200);
        assert.equal(await response.text(), "static file");
    });

    it("returns SSR response when no static match", async () => {
        const response = await executeFetchHandler("http://localhost:3000/about");

        assert.equal(response.status, 200);
        assert.equal(await response.text(), "SSR content");
    });

    it("returns generated route response when available", async () => {
        const response = await executeFetchHandler("http://localhost:3000/static-page", {
            handleRequest: async () => ({
                type: "generated",
                route: { filename: "static-page/index.html", jsx: "src/pages/static-page/index.jsx" },
                params: {},
            }),
            serveGeneratedRoute: async () => new Response("generated HTML", { status: 200 }),
        });

        assert.equal(response.status, 200);
        assert.equal(await response.text(), "generated HTML");
    });

    it("returns 404 when generated route file not found", async () => {
        const response = await executeFetchHandler("http://localhost:3000/missing", {
            handleRequest: async () => ({
                type: "generated",
                route: { filename: "missing.html", jsx: "src/pages/missing.jsx" },
                params: {},
            }),
            serveGeneratedRoute: async () => null,
        });

        assert.equal(response.status, 404);
    });

    it("returns 500 on handler error", async () => {
        const response = await executeFetchHandler("http://localhost:3000/", {
            handleRequest: async () => {
                throw new Error("SSR error");
            },
        });

        assert.equal(response.status, 500);
    });
});
