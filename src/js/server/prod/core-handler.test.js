/**
 * @fileoverview Tests for prod core handler.
 *
 * Tests the platform-agnostic request handling logic for production servers.
 *
 * @module server/prod/core-handler.test
 */

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { validateRoutes } from "../shared/routes-loader.js";
import { createFetchHandler, createGeneratedRouteHandler, createProdHandler, getGeneratedRouteInfo } from "./core-handler.js";

describe("createProdHandler", () => {
    /** @type {ReturnType<typeof createMockConfig>} */
    let config;

    /**
     * Create mock configuration for testing.
     */
    function createMockConfig() {
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
                default: async (params) =>
                    `<html><head><title>${params.slug}</title></head><body><h1>Post: ${params.slug}</h1></body></html>`,
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
            logger: {
                info: () => {},
                error: () => {},
                warn: () => {},
            },
        };
    }

    beforeEach(() => {
        config = createMockConfig();
    });

    describe("factory function", () => {
        it("should return handler object with expected methods", () => {
            const handler = createProdHandler(config);
            assert.equal(typeof handler, "object");
            assert.equal(typeof handler.handleRequest, "function");
            assert.equal(typeof handler.send404, "function");
            assert.equal(typeof handler.send500, "function");
        });

        it("should use default values for optional config", () => {
            const handler = createProdHandler({
                getRoutes: () => [],
                modules: {},
            });
            assert.equal(typeof handler.handleRequest, "function");
        });
    });

    describe("URL validation", () => {
        it("should reject URLs longer than 2048 characters", async () => {
            const handler = createProdHandler(config);
            const longPath = "/a".repeat(2050);
            const request = new Request(`http://localhost:3000${longPath}`);

            const response = await handler.handleRequest(request);

            assert.equal(response.status, 414);
            const body = await response.text();
            assert.ok(body.includes("URI Too Long"));
        });

        it("should handle HEAD request for 414 error", async () => {
            const handler = createProdHandler(config);
            const longPath = "/a".repeat(2050);
            const request = new Request(`http://localhost:3000${longPath}`, { method: "HEAD" });

            const response = await handler.handleRequest(request);

            assert.equal(response.status, 414);
            const body = await response.text();
            assert.equal(body, "");
        });

        it("should return 400 for invalid URL encoding", async () => {
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/%invalid");

            const response = await handler.handleRequest(request);

            assert.equal(response.status, 400);
        });
    });

    describe("OPTIONS requests", () => {
        it("should return 204 for OPTIONS requests", async () => {
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/about", { method: "OPTIONS" });

            const response = await handler.handleRequest(request);

            assert.equal(response.status, 204);
        });
    });

    describe("middleware execution", () => {
        it("should execute middleware chain", async () => {
            const middlewareCalled = [];
            config.getMiddleware = () => [
                async () => {
                    middlewareCalled.push("mw1");
                },
                async () => {
                    middlewareCalled.push("mw2");
                },
            ];
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/about");

            await handler.handleRequest(request);

            assert.deepEqual(middlewareCalled, ["mw1", "mw2"]);
        });

        it("should short-circuit on middleware returning Response", async () => {
            config.getMiddleware = () => [
                async () => new Response("Intercepted", { status: 403 }),
                async () => {
                    throw new Error("Should not be called");
                },
            ];
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/about");

            const response = await handler.handleRequest(request);

            assert.equal(response.status, 403);
            const body = await response.text();
            assert.equal(body, "Intercepted");
        });

        it("should handle HEAD requests with middleware Response", async () => {
            config.getMiddleware = () => [async () => new Response("Body", { status: 200 })];
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/about", { method: "HEAD" });

            const response = await handler.handleRequest(request);

            assert.equal(response.status, 200);
            const body = await response.text();
            assert.equal(body, ""); // HEAD should have no body
        });

        it("should continue on middleware error", async () => {
            config.getMiddleware = () => [
                async () => {
                    throw new Error("Middleware error");
                },
            ];
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/about");

            const response = await handler.handleRequest(request);

            // Should still render the page
            assert.equal(response.status, 200);
        });

        it("should skip non-function middleware entries", async () => {
            config.getMiddleware = () => [null, undefined, "not a function", async () => {}];
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/about");

            const response = await handler.handleRequest(request);

            assert.equal(response.status, 200);
        });

        it("should skip middleware when skipMiddleware option is true", async () => {
            let middlewareCalled = false;
            config.getMiddleware = () => [
                async () => {
                    middlewareCalled = true;
                },
            ];
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/about");

            await handler.handleRequest(request, {}, { skipMiddleware: true });

            assert.equal(middlewareCalled, false);
        });
    });

    describe("SSR rendering", () => {
        it("should render root route", async () => {
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/");

            const response = await handler.handleRequest(request);

            assert.equal(response.status, 200);
            assert.equal(response.headers.get("Content-Type"), "text/html; charset=utf-8");
            assert.equal(response.headers.get("Cache-Control"), "public, max-age=0, must-revalidate");
            const body = await response.text();
            assert.ok(body.includes("<!doctype html>"));
            assert.ok(body.includes("<h1>Home</h1>"));
        });

        it("should render named route", async () => {
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/about");

            const response = await handler.handleRequest(request);

            assert.equal(response.status, 200);
            const body = await response.text();
            assert.ok(body.includes("<h1>About</h1>"));
        });

        it("should render route with named jsx export", async () => {
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/about");

            const response = await handler.handleRequest(request);

            assert.equal(response.status, 200);
            const body = await response.text();
            assert.ok(body.includes("<h1>About</h1>"));
        });

        it("should render dynamic route with slug", async () => {
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/posts/hello-world");

            const response = await handler.handleRequest(request);

            assert.equal(response.status, 200);
            const body = await response.text();
            assert.ok(body.includes("Post: hello-world"));
        });

        it("should inject CSS assets", async () => {
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/");

            const response = await handler.handleRequest(request);
            const body = await response.text();

            assert.ok(body.includes('rel="stylesheet"'));
            assert.ok(body.includes("index.css"));
        });

        it("should inject JS assets", async () => {
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/");

            const response = await handler.handleRequest(request);
            const body = await response.text();

            assert.ok(body.includes('type="module"'));
            assert.ok(body.includes("index.js"));
        });

        it("should use public path for asset URLs", async () => {
            config.publicPath = "/cdn/";
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/");

            const response = await handler.handleRequest(request);
            const body = await response.text();

            assert.ok(body.includes('href="/cdn/index.css"'));
            assert.ok(body.includes('src="/cdn/index.js"'));
        });

        it("should handle empty public path", async () => {
            config.publicPath = "";
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/");

            const response = await handler.handleRequest(request);
            const body = await response.text();

            assert.ok(body.includes('href="index.css"'));
        });

        it("should handle HEAD requests (no body)", async () => {
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/", { method: "HEAD" });

            const response = await handler.handleRequest(request);

            assert.equal(response.status, 200);
            assert.equal(response.headers.get("Content-Type"), "text/html; charset=utf-8");
            const body = await response.text();
            assert.equal(body, "");
        });

        it("should return 400 for invalid slug", async () => {
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/posts/<script>");

            const response = await handler.handleRequest(request);

            assert.equal(response.status, 400);
            const body = await response.text();
            assert.ok(body.toLowerCase().includes("invalid"));
        });
    });

    describe("generated routes", () => {
        it("should return marker response for generated routes", async () => {
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/static-page");

            const response = await handler.handleRequest(request);

            assert.equal(response.status, 200);
            assert.equal(response.headers.get("X-SXO-Generated"), "true");
            assert.equal(response.headers.get("X-SXO-Filename"), "static-page/index.html");
            assert.equal(response.headers.get("Cache-Control"), "public, max-age=300");
        });

        it("should attach route info to generated response", async () => {
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/static-page");

            const response = await handler.handleRequest(request);
            const info = getGeneratedRouteInfo(response);

            assert.ok(info);
            assert.equal(info.route.path, "static-page");
            assert.equal(info.route.generated, true);
        });
    });

    describe("404 handling", () => {
        it("should return 404 for non-existent route", async () => {
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/nonexistent");

            const response = await handler.handleRequest(request);

            assert.equal(response.status, 404);
            assert.equal(response.headers.get("Cache-Control"), "public, max-age=0, must-revalidate");
        });

        it("should render custom 404 page if available", async () => {
            config.render404 = async () => "<html><head><title>404</title></head><body><h1>Custom 404</h1></body></html>";
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/nonexistent");

            const response = await handler.handleRequest(request);

            assert.equal(response.status, 404);
            const body = await response.text();
            assert.ok(body.includes("Custom 404"));
            assert.ok(body.includes("<!doctype html>"));
        });

        it("should fallback to plain 404 if custom render fails", async () => {
            config.render404 = async () => {
                throw new Error("Render error");
            };
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/nonexistent");

            const response = await handler.handleRequest(request);

            assert.equal(response.status, 404);
            const body = await response.text();
            assert.equal(body, "Not found");
        });

        it("should handle HEAD for 404", async () => {
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/nonexistent", { method: "HEAD" });

            const response = await handler.handleRequest(request);

            assert.equal(response.status, 404);
            const body = await response.text();
            assert.equal(body, "");
        });

        it("should handle HEAD for custom 404", async () => {
            config.render404 = async () => "<html><head><title>404</title></head><body><h1>Custom 404</h1></body></html>";
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/nonexistent", { method: "HEAD" });

            const response = await handler.handleRequest(request);

            assert.equal(response.status, 404);
            const body = await response.text();
            assert.equal(body, "");
        });
    });

    describe("500 handling", () => {
        it("should return 500 on SSR error", async () => {
            config.modules["src/pages/index.jsx"] = {
                default: async () => {
                    throw new Error("Render error");
                },
            };
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/");

            const response = await handler.handleRequest(request);

            assert.equal(response.status, 500);
            assert.equal(response.headers.get("Cache-Control"), "no-store");
        });

        it("should render custom 500 page if available", async () => {
            config.render500 = async () => "<html><head><title>500</title></head><body><h1>Custom 500</h1></body></html>";
            config.modules["src/pages/index.jsx"] = {
                default: async () => {
                    throw new Error("Render error");
                },
            };
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/");

            const response = await handler.handleRequest(request);

            assert.equal(response.status, 500);
            const body = await response.text();
            assert.ok(body.includes("Custom 500"));
        });

        it("should fallback to plain 500 if custom render fails", async () => {
            config.render500 = async () => {
                throw new Error("500 render error");
            };
            config.modules["src/pages/index.jsx"] = {
                default: async () => {
                    throw new Error("Render error");
                },
            };
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/");

            const response = await handler.handleRequest(request);

            assert.equal(response.status, 500);
            const body = await response.text();
            assert.equal(body, "Internal Server Error");
        });

        it("should handle HEAD for 500", async () => {
            config.modules["src/pages/index.jsx"] = {
                default: async () => {
                    throw new Error("Render error");
                },
            };
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/", { method: "HEAD" });

            const response = await handler.handleRequest(request);

            assert.equal(response.status, 500);
            const body = await response.text();
            assert.equal(body, "");
        });

        it("should return 500 when module not found", async () => {
            config.modules = {}; // Empty modules
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/");

            const response = await handler.handleRequest(request);

            assert.equal(response.status, 500);
        });

        it("should return 500 when module has no valid export", async () => {
            config.modules["src/pages/index.jsx"] = {
                // No default or jsx export
                otherExport: () => {},
            };
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/");

            const response = await handler.handleRequest(request);

            assert.equal(response.status, 500);
        });
    });

    describe("non-HTML pages", () => {
        it("should render non-HTML content without doctype", async () => {
            config.modules["src/pages/index.jsx"] = {
                default: async () => "<div>Not a full HTML page</div>",
            };
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/");

            const response = await handler.handleRequest(request);

            assert.equal(response.status, 200);
            const body = await response.text();
            assert.ok(!body.includes("<!doctype html>"));
            assert.ok(body.includes("<div>Not a full HTML page</div>"));
        });

        it("should not inject assets into non-HTML content", async () => {
            config.modules["src/pages/index.jsx"] = {
                default: async () => "<div>Fragment</div>",
            };
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/");

            const response = await handler.handleRequest(request);
            const body = await response.text();

            // Assets should not be injected
            assert.ok(!body.includes("stylesheet"));
        });
    });

    describe("send404 direct call", () => {
        it("should return 404 response", async () => {
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/any");

            const response = await handler.send404(request);

            assert.equal(response.status, 404);
        });
    });

    describe("send500 direct call", () => {
        it("should return 500 response", async () => {
            const handler = createProdHandler(config);
            const request = new Request("http://localhost:3000/any");

            const response = await handler.send500(request);

            assert.equal(response.status, 500);
        });
    });

    describe("pre-decoded pathname option", () => {
        it("should use decodedPathname option if provided", async () => {
            const handler = createProdHandler(config);
            // Even with encoded URL, providing decoded pathname should work
            const request = new Request("http://localhost:3000/%2Fweird");

            const response = await handler.handleRequest(request, {}, { decodedPathname: "about" });

            assert.equal(response.status, 200);
            const body = await response.text();
            assert.ok(body.includes("<h1>About</h1>"));
        });
    });
});

describe("getGeneratedRouteInfo", () => {
    it("should return null for regular Response", () => {
        const response = new Response("test");
        const info = getGeneratedRouteInfo(response);
        assert.equal(info, null);
    });

    it("should return attached route info", () => {
        const response = new Response(null);
        response._sxoGenerated = { route: { path: "test" }, params: {} };
        const info = getGeneratedRouteInfo(response);
        assert.deepEqual(info, { route: { path: "test" }, params: {} });
    });
});

describe("validateRoutes", () => {
    it("should accept valid routes array", () => {
        const routes = [
            { filename: "index.html", jsx: "src/pages/index.jsx" },
            { filename: "about/index.html", jsx: "src/pages/about/index.jsx", path: "about" },
        ];

        const result = validateRoutes(routes);

        assert.deepEqual(result, routes);
    });

    it("should throw if data is not an array", () => {
        assert.throws(() => validateRoutes({}), /not an array/);
        assert.throws(() => validateRoutes("string"), /not an array/);
        assert.throws(() => validateRoutes(null), /not an array/);
    });

    it("should throw for invalid route entry", () => {
        assert.throws(() => validateRoutes([null]), /Invalid route entry/);
        assert.throws(() => validateRoutes(["string"]), /Invalid route entry/);
    });

    it("should throw for missing filename", () => {
        assert.throws(() => validateRoutes([{ jsx: "src/pages/index.jsx" }]), /missing filename or jsx/);
    });

    it("should throw for missing jsx", () => {
        assert.throws(() => validateRoutes([{ filename: "index.html" }]), /missing filename or jsx/);
    });

    it("should throw for non-string path", () => {
        assert.throws(() => validateRoutes([{ filename: "index.html", jsx: "src/index.jsx", path: 123 }]), /path must be string/);
    });

    it("should allow missing path (optional)", () => {
        const routes = [{ filename: "index.html", jsx: "src/pages/index.jsx" }];
        const result = validateRoutes(routes);
        assert.deepEqual(result, routes);
    });

    it("should use custom source name in error messages", () => {
        assert.throws(() => validateRoutes({}, "custom.json"), /custom\.json/);
    });
});

describe("createGeneratedRouteHandler", () => {
    /**
     * Create a mock file reader for testing.
     * @param {Record<string, string>} files - Map of paths to content
     */
    function createMockFileReader(files) {
        return {
            readText: async (path) => files[path] ?? null,
        };
    }

    /**
     * Simple path join for testing.
     * @param {string} base
     * @param {string} relative
     */
    function joinPath(base, relative) {
        return `${base}/${relative}`;
    }

    it("should return null for non-generated response", async () => {
        const handler = createGeneratedRouteHandler({
            staticDir: "/dist/client",
            fileReader: createMockFileReader({}),
            joinPath,
        });

        const response = new Response("regular response");
        const request = new Request("http://localhost:3000/");

        const result = await handler(response, request);

        assert.equal(result, null);
    });

    it("should serve generated route HTML", async () => {
        const html = "<!doctype html><html><body>Generated</body></html>";
        const handler = createGeneratedRouteHandler({
            staticDir: "/dist/client",
            fileReader: createMockFileReader({
                "/dist/client/about/index.html": html,
            }),
            joinPath,
        });

        // Create a generated route marker response
        const response = new Response(null);
        response._sxoGenerated = {
            route: { filename: "about/index.html", jsx: "src/pages/about/index.jsx" },
            params: {},
        };
        const request = new Request("http://localhost:3000/about");

        const result = await handler(response, request);

        assert.notEqual(result, null);
        assert.equal(result.status, 200);
        assert.equal(result.headers.get("Content-Type"), "text/html; charset=utf-8");
        assert.equal(result.headers.get("Cache-Control"), "public, max-age=300");

        const body = await result.text();
        assert.equal(body, html);
    });

    it("should handle HEAD requests without body", async () => {
        const handler = createGeneratedRouteHandler({
            staticDir: "/dist/client",
            fileReader: createMockFileReader({
                "/dist/client/index.html": "<html></html>",
            }),
            joinPath,
        });

        const response = new Response(null);
        response._sxoGenerated = {
            route: { filename: "index.html", jsx: "src/pages/index.jsx" },
            params: {},
        };
        const request = new Request("http://localhost:3000/", { method: "HEAD" });

        const result = await handler(response, request);

        assert.notEqual(result, null);
        assert.equal(result.status, 200);
        assert.equal(result.body, null);
    });

    it("should return null when file not found", async () => {
        const handler = createGeneratedRouteHandler({
            staticDir: "/dist/client",
            fileReader: createMockFileReader({}), // No files
            joinPath,
        });

        const response = new Response(null);
        response._sxoGenerated = {
            route: { filename: "missing.html", jsx: "src/pages/missing.jsx" },
            params: {},
        };
        const request = new Request("http://localhost:3000/missing");

        const result = await handler(response, request);

        assert.equal(result, null);
    });
});

describe("createFetchHandler", () => {
    /**
     * Create mock handlers for testing.
     */
    function createMockHandlers() {
        return {
            handleStaticRequest: async () => null,
            handleRequest: async () => new Response("SSR content", { status: 200 }),
            serveGeneratedRoute: async () => null,
            send500: async () => new Response("Internal Server Error", { status: 500 }),
            logger: {
                info: () => {},
                error: () => {},
                warn: () => {},
            },
        };
    }

    it("should return static response when handleStaticRequest matches", async () => {
        const handlers = createMockHandlers();
        handlers.handleStaticRequest = async () => new Response("static file", { status: 200 });

        const fetchHandler = createFetchHandler(handlers);
        const request = new Request("http://localhost:3000/style.css");

        const response = await fetchHandler(request);

        assert.equal(response.status, 200);
        const body = await response.text();
        assert.equal(body, "static file");
    });

    it("should return SSR response when no static match", async () => {
        const handlers = createMockHandlers();

        const fetchHandler = createFetchHandler(handlers);
        const request = new Request("http://localhost:3000/about");

        const response = await fetchHandler(request);

        assert.equal(response.status, 200);
        const body = await response.text();
        assert.equal(body, "SSR content");
    });

    it("should return generated route response when available", async () => {
        const handlers = createMockHandlers();
        handlers.serveGeneratedRoute = async () => new Response("generated HTML", { status: 200 });

        const fetchHandler = createFetchHandler(handlers);
        const request = new Request("http://localhost:3000/static-page");

        const response = await fetchHandler(request);

        assert.equal(response.status, 200);
        const body = await response.text();
        assert.equal(body, "generated HTML");
    });

    it("should return 500 when generated route file not found", async () => {
        const handlers = createMockHandlers();
        // Return null from serveGeneratedRoute but handleRequest returns generated marker
        handlers.handleRequest = async () => {
            const response = new Response(null, {
                headers: { "X-SXO-Generated": "true", "X-SXO-Filename": "missing.html" },
            });
            return response;
        };
        handlers.serveGeneratedRoute = async () => null;

        const fetchHandler = createFetchHandler(handlers);
        const request = new Request("http://localhost:3000/missing");

        const response = await fetchHandler(request);

        assert.equal(response.status, 500);
    });

    it("should return 500 on handler error", async () => {
        const handlers = createMockHandlers();
        handlers.handleRequest = async () => {
            throw new Error("SSR error");
        };

        const fetchHandler = createFetchHandler(handlers);
        const request = new Request("http://localhost:3000/");

        const response = await fetchHandler(request);

        assert.equal(response.status, 500);
    });

    it("should log error when generated route file not found", async () => {
        let loggedError = null;
        const handlers = createMockHandlers();
        handlers.handleRequest = async () => {
            const response = new Response(null, {
                headers: { "X-SXO-Generated": "true", "X-SXO-Filename": "missing.html" },
            });
            return response;
        };
        handlers.serveGeneratedRoute = async () => null;
        handlers.logger = {
            error: (obj) => {
                loggedError = obj;
                return true; // Return truthy to prevent fallback call
            },
        };

        const fetchHandler = createFetchHandler(handlers);
        const request = new Request("http://localhost:3000/missing");

        await fetchHandler(request);

        assert.ok(loggedError);
        assert.equal(loggedError.route, "missing.html");
    });

    it("should log error on handler exception", async () => {
        let loggedError = null;
        const handlers = createMockHandlers();
        handlers.handleRequest = async () => {
            throw new Error("SSR error");
        };
        handlers.logger = {
            error: (obj) => {
                loggedError = obj;
                return true; // Return truthy to prevent fallback call
            },
        };

        const fetchHandler = createFetchHandler(handlers);
        const request = new Request("http://localhost:3000/");

        await fetchHandler(request);

        assert.ok(loggedError);
        assert.ok(loggedError.err instanceof Error);
    });

    it("should use default console logger if not provided", async () => {
        const handlers = createMockHandlers();
        delete handlers.logger;

        const fetchHandler = createFetchHandler(handlers);
        const request = new Request("http://localhost:3000/about");

        const response = await fetchHandler(request);

        assert.equal(response.status, 200);
    });
});
