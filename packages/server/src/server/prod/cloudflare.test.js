/**
 * @fileoverview Tests for Cloudflare Workers adapter.
 *
 * Tests cover:
 * - Error handling when aliases not configured (routes, modules)
 * - Request validation (URL length, malformed URLs, invalid parameters)
 * - Integration: complete request lifecycle and HTTP methods
 * - Error handling and fallback mechanisms
 */

import { deepStrictEqual, ok, rejects, strictEqual } from "node:assert";
import { describe, test } from "node:test";
import { createHandler } from "./cloudflare.js";

/** Maximum URL length to accept (must match cloudflare.js) */
const MAX_URL_LEN = 2048;

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

describe("createHandler configuration errors", () => {
    const errorCases = [
        { name: "sxo:routes", config: {} },
        { name: "sxo:modules", config: { routes: [] } },
    ];

    for (const { name, config } of errorCases) {
        test(`throws helpful error when ${name} alias not configured`, async () => {
            await rejects(createHandler(config), (err) => {
                ok(err.message.includes(name), `Expected error about ${name}, got: ${err.message}`);
                ok(err.message.includes("wrangler.jsonc"), `Expected guidance about wrangler.jsonc, got: ${err.message}`);
                return true;
            });
        });
    }
});

describe("createHandler request validation", () => {
    const validationCases = [
        {
            name: "returns 414 for URL exceeding MAX_URL_LEN",
            url: `https://example.com/${"x".repeat(MAX_URL_LEN + 1 - 20)}`,
            expectedStatus: 414,
        },
        {
            name: "returns 400 for malformed percent-encoding",
            url: "https://example.com/path%",
            expectedStatus: 400,
        },
        {
            name: "returns 400 for invalid slug parameters",
            url: "https://example.com/post/<script>",
            expectedStatus: 400,
            routes: [
                {
                    filename: "post/[slug]/index.html",
                    jsx: "src/pages/post/[slug]/index.jsx",
                    path: "post/[slug]",
                    assets: { css: [], js: [] },
                },
            ],
        },
    ];

    for (const { name, url, expectedStatus, routes = [] } of validationCases) {
        test(name, async () => {
            const handler = await createHandler({
                routes,
                modules: {},
            });
            const env = { ASSETS: createMockAssets() };
            const ctx = createMockContext();
            const response = await handler.fetch(new Request(url), env, ctx);
            strictEqual(response.status, expectedStatus);
        });
    }
});

describe("createHandler integration & methods", () => {
    test("handles various request types and methods", async () => {
        const callOrder = [];
        const routes = [
            {
                filename: "index.html",
                jsx: "src/pages/index.jsx",
                path: "/",
                assets: { css: ["style.css"], js: ["app.js"] },
            },
            {
                filename: "about.html",
                jsx: "src/pages/about.jsx",
                path: "/about",
                generated: true,
                assets: { css: [], js: [] },
            },
        ];

        const modules = {
            "src/pages/index.jsx": {
                default: () => {
                    callOrder.push("ssr");
                    return "<html><head></head><body>SSR Content</body></html>";
                },
            },
        };

        const middleware = [
            (request) => {
                const url = new URL(request.url);
                callOrder.push("middleware");
                if (url.pathname === "/auth") return new Response("Authenticated", { status: 200 });
            },
        ];

        const handler = await createHandler({ routes, modules, middleware, publicPath: "/assets/" });
        const env = {
            ASSETS: createMockAssets({
                "/app.js": 'console.log("test");',
                "/about.html": "<!doctype html><html><body>About Page</body></html>",
            }),
        };
        const ctx = createMockContext();

        // 1. Middleware short-circuit
        const authRes = await handler.fetch(new Request("https://example.com/auth"), env, ctx);
        strictEqual(authRes.status, 200);
        strictEqual(await authRes.text(), "Authenticated");
        deepStrictEqual(callOrder, ["middleware"]);
        callOrder.length = 0;

        // 2. Static file request
        const jsRes = await handler.fetch(new Request("https://example.com/app.js"), env, ctx);
        strictEqual(jsRes.status, 200);
        strictEqual(jsRes.headers.get("Content-Type"), "application/javascript");
        callOrder.length = 0;

        // 3. SSR route with asset injection
        const indexRes = await handler.fetch(new Request("https://example.com/"), env, ctx);
        const indexBody = await indexRes.text();
        ok(
            indexBody.includes("SSR Content") &&
                indexBody.includes('href="/assets/style.css"') &&
                indexBody.includes('src="/assets/app.js"'),
        );
        deepStrictEqual(callOrder, ["middleware", "ssr"]);
        callOrder.length = 0;

        // 4. Generated route
        const aboutRes = await handler.fetch(new Request("https://example.com/about"), env, ctx);
        strictEqual(aboutRes.status, 200);
        strictEqual(aboutRes.headers.get("Cache-Control"), "public, max-age=300");
        ok((await aboutRes.text()).includes("About Page"));

        // 5. HEAD request
        const headRes = await handler.fetch(new Request("https://example.com/", { method: "HEAD" }), env, ctx);
        strictEqual(headRes.status, 200);
        strictEqual(await headRes.text(), "");

        // 6. OPTIONS preflight
        const optionsRes = await handler.fetch(new Request("https://example.com/api", { method: "OPTIONS" }), env, ctx);
        strictEqual(optionsRes.status, 204);
        strictEqual(optionsRes.body, null);
    });
});

describe("createHandler error fallbacks", () => {
    const fallbackCases = [
        {
            name: "falls back to plain text 404 when custom render404 throws",
            setup: {
                render404: () => {
                    throw new Error("404 fail");
                },
            },
            url: "https://example.com/404",
            expectedStatus: 404,
            expectedText: "Not found",
        },
        {
            name: "falls back to plain text 500 when custom render500 throws",
            setup: {
                routes: [{ filename: "err.html", jsx: "err.jsx", path: "err", assets: { css: [], js: [] } }],
                modules: {
                    "err.jsx": {
                        default: () => {
                            throw new Error("SSR fail");
                        },
                    },
                },
                render500: () => {
                    throw new Error("500 fail");
                },
            },
            url: "https://example.com/err",
            expectedStatus: 500,
            expectedText: "Internal Server Error",
        },
        {
            name: "returns 500 when middleware throws",
            setup: {
                middleware: [
                    () => {
                        throw new Error("MW fail");
                    },
                ],
            },
            url: "https://example.com/",
            expectedStatus: 500,
            expectedText: "Internal Server Error",
        },
        {
            name: "returns 500 for unexpected errors in core handler",
            setup: {
                routes: [{ filename: "index.html", jsx: "index.jsx", path: "", assets: { css: [], js: [] } }],
                modules: {
                    "index.jsx": {
                        default: () => {
                            throw new Error("Unexpected");
                        },
                    },
                },
            },
            url: "https://example.com/",
            expectedStatus: 500,
            expectedText: "Internal Server Error",
        },
        {
            name: "returns 404 for non-existent route",
            setup: { routes: [] },
            url: "https://example.com/none",
            expectedStatus: 404,
        },
    ];

    for (const { name, setup, url, expectedStatus, expectedText } of fallbackCases) {
        test(name, async () => {
            const handler = await createHandler({ routes: [], modules: {}, ...setup });
            const response = await handler.fetch(new Request(url), { ASSETS: createMockAssets() }, createMockContext());
            strictEqual(response.status, expectedStatus);
            if (expectedText) strictEqual(await response.text(), expectedText);
        });
    }
});

describe("createHandler edge cases", () => {
    test("falls through to SSR when static file fetch throws", async () => {
        const handler = await createHandler({
            routes: [{ filename: "app.js", jsx: "app.jsx", path: "app.js", assets: { css: [], js: [] } }],
            modules: { "app.jsx": { default: () => "<html><body>SSR Fallback</body></html>" } },
        });
        const env = {
            ASSETS: {
                fetch: () => {
                    throw new Error("fail");
                },
            },
        };
        const response = await handler.fetch(new Request("https://example.com/app.js"), env, createMockContext());
        strictEqual(response.status, 200);
        ok((await response.text()).includes("SSR Fallback"));
    });

    test("returns 404 when generated route asset fetch fails", async () => {
        const handler = await createHandler({
            routes: [{ filename: "gen.html", jsx: "gen.jsx", path: "/gen", generated: true, assets: { css: [], js: [] } }],
            modules: {},
        });
        const env = { ASSETS: { fetch: async () => new Response("Not Found", { status: 404 }) } };
        const response = await handler.fetch(new Request("https://example.com/gen"), env, createMockContext());
        strictEqual(response.status, 404);
    });

    test("serves generated index route for / with empty path", async () => {
        const handler = await createHandler({
            routes: [{ filename: "index.html", jsx: "index.jsx", path: "", generated: true, assets: { css: [], js: [] } }],
            modules: {},
        });
        const env = { ASSETS: createMockAssets({ "/index.html": "Generated Index" }) };
        const response = await handler.fetch(new Request("https://example.com/"), env, createMockContext());
        strictEqual(response.status, 200);
        strictEqual(await response.text(), "Generated Index");
    });

    test("getRequestUrl returns 400 for invalid URL format", async () => {
        const handler = await createHandler({ routes: [], modules: {} });
        // Passing a request-like object where URL constructor will fail
        const response = await handler.fetch({ url: "not-a-url" }, {}, {});
        strictEqual(response.status, 400);
    });

    test("fetch returns 500 for global unexpected errors (e.g. throwing property access)", async () => {
        const handler = await createHandler({ routes: [], modules: {} });
        const mockRequest = {
            get url() {
                throw new Error("Unexpected Error");
            },
        };
        // @ts-expect-error - testing invalid input
        const response = await handler.fetch(mockRequest, {}, {});
        strictEqual(response.status, 500);
        strictEqual(await response.text(), "Internal Server Error");
    });

    test("tryServeGeneratedRoute falls through to SSR when ASSETS.fetch throws", async () => {
        const handler = await createHandler({
            routes: [
                {
                    filename: "gen.html",
                    jsx: "gen.jsx",
                    path: "gen",
                    generated: true,
                    assets: { css: [], js: [] },
                },
            ],
            modules: {
                "gen.jsx": {
                    default: () => "SSR Fallback",
                },
            },
        });
        const env = {
            ASSETS: {
                fetch: () => {
                    throw new Error("ASSETS failure");
                },
            },
        };
        const response = await handler.fetch(new Request("https://example.com/gen"), env, createMockContext());
        // Fallback to SSR returns 404 because coreHandler skips generated routes
        strictEqual(response.status, 404);
    });
});
