import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { describe, mock, test } from "node:test";
import { createCoreHandler } from "./handler.js";

const mockRoutes = [
    { path: "", filename: "index.html", jsx: "src/pages/index.jsx", assets: { css: ["index.css"], js: ["index.js"] } },
    { path: "about", filename: "about/index.html", jsx: "src/pages/about/index.jsx", assets: { css: ["about.css"], js: [] } },
    { path: "blog/[slug]", filename: "blog-slug.html", jsx: "src/pages/blog/[slug]/index.jsx", assets: { css: [], js: ["blog.js"] } },
    { path: "generated", filename: "generated/index.html", jsx: "src/pages/generated/index.jsx", generated: true, assets: {} },
];

const mockModules = {
    "src/pages/index.jsx": { default: () => "<html><head><title>Home</title></head><body>Home Page</body></html>" },
    "src/pages/about/index.jsx": { default: async () => "<html><head><title>About</title></head><body>About Page</body></html>" },
    "src/pages/blog/[slug]/index.jsx": { default: (params) => `<html><head></head><body>Blog: ${params.slug}</body></html>` },
    "src/pages/generated/index.jsx": { default: () => "<html><head></head><body>Generated</body></html>" },
};

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
        deepStrictEqual(renderFn.mock.calls[0].arguments[0], Object.assign(Object.create(null), { slug: "test-post" }));
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

    test("handler returns null for generated routes", async () => {
        const handler = createCoreHandler({
            routes: mockRoutes,
            modules: mockModules,
        });
        const request = createRequest("/generated");
        const result = await handler(request);

        strictEqual(result, null, "should return null for generated routes");
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
});

describe("createCoreHandler - asset injection and headers (consolidated)", () => {
    const assetInjectionScenarios = [
        {
            description: "with default publicPath",
            publicPath: "/",
            expectedPatterns: ['<link rel="stylesheet" href="/index.css">', '<script type="module" src="/index.js">'],
        },
        {
            description: "with custom publicPath",
            publicPath: "/assets/",
            expectedPatterns: ['href="/assets/index.css"', 'src="/assets/index.js"'],
        },
        {
            description: "with empty publicPath",
            publicPath: "",
            expectedPatterns: ['href="index.css"', 'src="index.js"'],
        },
    ];

    for (const { description, publicPath, expectedPatterns } of assetInjectionScenarios) {
        test(`injects assets and sets response headers: ${description}`, async () => {
            const handler = createCoreHandler({
                routes: mockRoutes,
                modules: mockModules,
                publicPath,
            });
            const request = createRequest("/");

            const response = await handler(request);
            const html = await response.text();

            strictEqual(response.headers.get("Content-Type"), "text/html; charset=utf-8", "should set Content-Type header");
            strictEqual(response.headers.get("Cache-Control"), "public, max-age=0, must-revalidate", "should set Cache-Control header");
            ok(html.startsWith("<!doctype html>"), "should prepend doctype for HTML responses");

            for (const pattern of expectedPatterns) {
                ok(html.includes(pattern), `should inject asset: ${pattern}`);
            }
        });
    }
});

describe("createCoreHandler - error handling (consolidated)", () => {
    const errorScenarios = [
        {
            description: "when module not found",
            configOverride: {
                routes: [{ path: "broken", filename: "broken.html", jsx: "src/pages/broken.jsx", assets: {} }],
                modules: {},
            },
            requestPath: "/broken",
        },
    ];

    for (const { description, configOverride, requestPath } of errorScenarios) {
        test(`returns 500 on errors: ${description}`, async () => {
            const handler = createCoreHandler({
                routes: mockRoutes,
                modules: mockModules,
                ...configOverride,
            });
            const request = createRequest(requestPath);

            const response = await handler(request);

            strictEqual(response.status, 500, "should return 500 status code");
        });
    }
});

describe("createCoreHandler - middleware execution (consolidated)", () => {
    const middlewareScenarios = [
        {
            description: "short-circuits when middleware returns Response",
            middleware: [() => new Response("Blocked", { status: 403 })],
            requestPath: "/",
            expectedStatus: 403,
            expectedContent: "Blocked",
        },
        {
            description: "continues when middleware returns void",
            middleware: [() => undefined],
            requestPath: "/",
            expectedStatus: 200,
        },
        {
            description: "executes middleware chain in order",
            middleware: [
                (req) => {
                    req.order = [1];
                },
                (req) => {
                    req.order.push(2);
                },
                (req) => {
                    if (req.order?.[0] === 1 && req.order?.[1] === 2) {
                        return new Response("Ordered", { status: 200 });
                    }
                },
            ],
            requestPath: "/",
            expectedStatus: 200,
            expectedContent: "Ordered",
        },
        {
            description: "supports async middleware blocking",
            middleware: [
                async (req) => {
                    await new Promise((resolve) => setTimeout(resolve, 1));
                    if (new URL(req.url).pathname === "/blocked") {
                        return new Response("Blocked", { status: 403 });
                    }
                },
            ],
            requestPath: "/blocked",
            expectedStatus: 403,
            expectedContent: "Blocked",
        },
        {
            description: "passes env parameter to middleware",
            middleware: [
                (_req, env) => {
                    strictEqual(env?.DATABASE, "mock-db", "should pass env to middleware");
                },
            ],
            requestPath: "/",
            expectedStatus: 200,
            env: { DATABASE: "mock-db" },
        },
    ];

    for (const { description, middleware, requestPath, expectedStatus, expectedContent, env } of middlewareScenarios) {
        test(`middleware behavior: ${description}`, async () => {
            const handler = createCoreHandler({
                routes: mockRoutes,
                modules: mockModules,
                middleware,
            });
            const request = createRequest(requestPath);

            const response = await handler(request, env);

            strictEqual(response.status, expectedStatus, `should return ${expectedStatus} status`);
            if (expectedContent !== undefined) {
                const text = await response.text();
                ok(text.includes(expectedContent), `should contain: ${expectedContent}`);
            }
        });
    }
});

describe("createCoreHandler - middleware render context", () => {
    test("middleware can call context.render and return HTML response", async () => {
        const handler = createCoreHandler({
            routes: mockRoutes,
            modules: mockModules,
            middleware: [
                async (_req, _env, { render }) => {
                    const html = await render("src/pages/index.jsx");
                    return new Response(html, {
                        status: 200,
                        headers: { "Content-Type": "text/html; charset=utf-8" },
                    });
                },
            ],
        });
        const request = createRequest("/about");
        const response = await handler(request);

        strictEqual(response.status, 200, "should return 200");
        const text = await response.text();
        ok(text.includes("Home Page"), "should contain rendered page content");
        ok(text.startsWith("<!doctype html>"), "should prepend doctype");
    });

    test("middleware can pass params to context.render", async () => {
        const handler = createCoreHandler({
            routes: mockRoutes,
            modules: mockModules,
            middleware: [
                async (_req, _env, { render }) => {
                    const html = await render("src/pages/blog/[slug]/index.jsx", { slug: "test" });
                    return new Response(html, {
                        status: 200,
                        headers: { "Content-Type": "text/html; charset=utf-8" },
                    });
                },
            ],
        });
        const request = createRequest("/");
        const response = await handler(request);

        const text = await response.text();
        ok(text.includes("Blog: test"), "should pass params to render function");
    });

    test("middleware render throws for missing module", async () => {
        const handler = createCoreHandler({
            routes: mockRoutes,
            modules: mockModules,
            middleware: [
                async (_req, _env, { render }) => {
                    try {
                        await render("src/pages/nonexistent.jsx");
                        return new Response("should not reach", { status: 200 });
                    } catch {
                        return new Response("Module not found", { status: 404 });
                    }
                },
            ],
        });
        const request = createRequest("/");
        const response = await handler(request);

        strictEqual(response.status, 404);
        const text = await response.text();
        ok(text.includes("Module not found"));
    });
});

describe("createCoreHandler - middleware error handling", () => {
    test("returns 500 when middleware throws synchronously", async () => {
        const handler = createCoreHandler({
            routes: mockRoutes,
            modules: mockModules,
            middleware: [
                () => {
                    throw new Error("Sync middleware error");
                },
            ],
        });
        const request = createRequest("/");

        const response = await handler(request);

        strictEqual(response.status, 500, "should return 500");
        const text = await response.text();
        ok(text.includes("Internal Server Error"));
    });

    test("returns 500 when middleware rejects asynchronously", async () => {
        const handler = createCoreHandler({
            routes: mockRoutes,
            modules: mockModules,
            middleware: [
                async () => {
                    throw new Error("Async middleware error");
                },
            ],
        });
        const request = createRequest("/");

        const response = await handler(request);

        strictEqual(response.status, 500, "should return 500");
        const text = await response.text();
        ok(text.includes("Internal Server Error"));
    });
});
