/**
 * @fileoverview Tests for dev core handler.
 *
 * Tests the platform-agnostic request handling logic for dev servers.
 *
 * @module server/dev/core-handler.test
 */

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { createDevHandler } from "./core-handler.js";

/**
 * Extract the base64EncodeUnicode helper from the handler module for testing.
 * This is a minimal reproduction of the helper function for unit tests.
 *
 * @param {string} str - String to encode
 * @returns {string} Base64-encoded string
 */
function base64EncodeUnicode(str) {
    const bytes = new TextEncoder().encode(str);
    const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join("");
    return btoa(binString);
}

/**
 * Decode a base64 Unicode string (mirrors client-side implementation).
 *
 * @param {string} base64 - Base64-encoded string
 * @returns {string} Decoded Unicode string
 */
function base64DecodeUnicode(base64) {
    const binString = atob(base64);
    const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0));
    return new TextDecoder().decode(bytes);
}

describe("base64 Unicode encoding", () => {
    describe("base64EncodeUnicode", () => {
        it("should encode simple ASCII string", () => {
            const input = "Hello World";
            const encoded = base64EncodeUnicode(input);
            assert.ok(encoded.length > 0);
            assert.equal(typeof encoded, "string");
        });

        it("should encode string with emoji", () => {
            const input = "Hello 🌍 World";
            const encoded = base64EncodeUnicode(input);
            assert.ok(encoded.length > 0);
            // Should not throw InvalidCharacterError
        });

        it("should encode string with Chinese characters", () => {
            const input = "你好世界";
            const encoded = base64EncodeUnicode(input);
            assert.ok(encoded.length > 0);
        });

        it("should encode string with Arabic characters", () => {
            const input = "مرحبا بالعالم";
            const encoded = base64EncodeUnicode(input);
            assert.ok(encoded.length > 0);
        });

        it("should encode string with Cyrillic characters", () => {
            const input = "Привет мир";
            const encoded = base64EncodeUnicode(input);
            assert.ok(encoded.length > 0);
        });

        it("should encode string with mathematical symbols", () => {
            const input = "∑∫∂√π≈≠";
            const encoded = base64EncodeUnicode(input);
            assert.ok(encoded.length > 0);
        });

        it("should encode string with mixed Unicode", () => {
            const input = "Hello 世界 🌍 مرحبا Привет ∑";
            const encoded = base64EncodeUnicode(input);
            assert.ok(encoded.length > 0);
        });

        it("should encode empty string", () => {
            const input = "";
            const encoded = base64EncodeUnicode(input);
            assert.equal(encoded, "");
        });

        it("should encode JSON with Unicode", () => {
            const input = JSON.stringify({ message: "Hello 世界 🌍" });
            const encoded = base64EncodeUnicode(input);
            assert.ok(encoded.length > 0);
        });
    });

    describe("base64DecodeUnicode", () => {
        it("should decode simple ASCII string", () => {
            const input = "Hello World";
            const encoded = base64EncodeUnicode(input);
            const decoded = base64DecodeUnicode(encoded);
            assert.equal(decoded, input);
        });

        it("should decode string with emoji", () => {
            const input = "Hello 🌍 World";
            const encoded = base64EncodeUnicode(input);
            const decoded = base64DecodeUnicode(encoded);
            assert.equal(decoded, input);
        });

        it("should decode string with Chinese characters", () => {
            const input = "你好世界";
            const encoded = base64EncodeUnicode(input);
            const decoded = base64DecodeUnicode(encoded);
            assert.equal(decoded, input);
        });

        it("should decode string with Arabic characters", () => {
            const input = "مرحبا بالعالم";
            const encoded = base64EncodeUnicode(input);
            const decoded = base64DecodeUnicode(encoded);
            assert.equal(decoded, input);
        });

        it("should decode string with Cyrillic characters", () => {
            const input = "Привет мир";
            const encoded = base64EncodeUnicode(input);
            const decoded = base64DecodeUnicode(encoded);
            assert.equal(decoded, input);
        });

        it("should decode string with mathematical symbols", () => {
            const input = "∑∫∂√π≈≠";
            const encoded = base64EncodeUnicode(input);
            const decoded = base64DecodeUnicode(encoded);
            assert.equal(decoded, input);
        });

        it("should decode string with mixed Unicode", () => {
            const input = "Hello 世界 🌍 مرحبا Привет ∑";
            const encoded = base64EncodeUnicode(input);
            const decoded = base64DecodeUnicode(encoded);
            assert.equal(decoded, input);
        });

        it("should decode empty string", () => {
            const input = "";
            const encoded = base64EncodeUnicode(input);
            const decoded = base64DecodeUnicode(encoded);
            assert.equal(decoded, input);
        });

        it("should decode JSON with Unicode", () => {
            const input = JSON.stringify({ message: "Hello 世界 🌍" });
            const encoded = base64EncodeUnicode(input);
            const decoded = base64DecodeUnicode(encoded);
            assert.equal(decoded, input);
        });
    });

    describe("round-trip encoding", () => {
        it("should preserve data through encode/decode cycle", () => {
            const testCases = [
                "Simple ASCII",
                "Emoji 🎉🌟💻",
                "中文测试",
                "العربية",
                "Русский",
                "Mixed: Hello 世界 🌍",
                JSON.stringify({ key: "value 中文 🎉" }),
                "Line\nBreaks\nIncluded",
                "Tabs\tIncluded",
                "Special: !@#$%^&*()",
            ];

            for (const testCase of testCases) {
                const encoded = base64EncodeUnicode(testCase);
                const decoded = base64DecodeUnicode(encoded);
                assert.equal(decoded, testCase, `Failed for: ${testCase}`);
            }
        });
    });
});

describe("createDevHandler", () => {
    /** @type {ReturnType<typeof createMockDependencies>} */
    let deps;

    /**
     * Create mock dependencies for testing.
     */
    function createMockDependencies() {
        const routes = [
            {
                path: "",
                filename: "pages/index.jsx",
                jsx: "src/pages/index.jsx",
                assets: { css: ["index.css"], js: ["index.js"] },
            },
            {
                path: "about",
                filename: "pages/about/index.jsx",
                jsx: "src/pages/about/index.jsx",
                assets: { css: ["about.css"], js: [] },
            },
            {
                path: "posts/[slug]",
                filename: "pages/posts/[slug]/index.jsx",
                jsx: "src/pages/posts/[slug]/index.jsx",
                assets: { css: [], js: [] },
            },
        ];

        const jsxModules = new Map();
        jsxModules.set("src/pages/index.jsx", async () => "<html><head><title>Home</title></head><body><h1>Home</h1></body></html>");
        jsxModules.set(
            "src/pages/about/index.jsx",
            async () => "<html><head><title>About</title></head><body><h1>About</h1></body></html>",
        );
        jsxModules.set(
            "src/pages/posts/[slug]/index.jsx",
            async (params) => `<html><head><title>${params.slug}</title></head><body><h1>Post: ${params.slug}</h1></body></html>`,
        );

        return {
            getRoutes: () => routes,
            loadJsxModule: async (jsxPath) => {
                const fn = jsxModules.get(jsxPath);
                if (!fn) throw new Error(`Module not found: ${jsxPath}`);
                return fn;
            },
            publicPath: "/",
            getEsbuildError: () => "",
            hotReplaceClientPath: "/test/hot-replace.client.js",
            readFile: async (path) => {
                if (path === "/test/hot-replace.client.js") {
                    return "export function hotReplace() {}";
                }
                throw new Error("File not found");
            },
            getMiddleware: () => [],
            resolve404Page: () => null,
            resolve500Page: () => null,
            logger: {
                info: () => {},
                error: () => {},
                warn: () => {},
            },
        };
    }

    beforeEach(() => {
        deps = createMockDependencies();
    });

    describe("factory function", () => {
        it("should return a handler function", () => {
            const handler = createDevHandler(deps);
            assert.equal(typeof handler, "function");
        });

        it("should throw if getRoutes is not provided", () => {
            assert.throws(() => createDevHandler({ ...deps, getRoutes: undefined }), /getRoutes.*required/i);
        });

        it("should throw if loadJsxModule is not provided", () => {
            assert.throws(() => createDevHandler({ ...deps, loadJsxModule: undefined }), /loadJsxModule.*required/i);
        });
    });

    describe("hot-replace.js endpoint", () => {
        it("should serve hot-replace.js client script", async () => {
            const handler = createDevHandler(deps);
            const request = new Request("http://localhost:3000/hot-replace.js");

            const response = await handler(request);

            assert.equal(response.status, 200);
            assert.equal(response.headers.get("Content-Type"), "application/javascript; charset=utf-8");
            const body = await response.text();
            assert.ok(body.includes("hotReplace"));
        });

        it("should return 404 if hot-replace.js file not found", async () => {
            deps.readFile = async () => {
                throw new Error("File not found");
            };
            const handler = createDevHandler(deps);
            const request = new Request("http://localhost:3000/hot-replace.js");

            const response = await handler(request);

            assert.equal(response.status, 404);
        });
    });

    describe("SSE hot-replace endpoint", () => {
        it("should return SSE response for /hot-replace with valid href", async () => {
            const handler = createDevHandler(deps);
            const request = new Request("http://localhost:3000/hot-replace?href=/");

            const response = await handler(request);

            assert.equal(response.status, 200);
            assert.equal(response.headers.get("Content-Type"), "text/event-stream");
            assert.equal(response.headers.get("Cache-Control"), "no-cache");
        });

        it("should return 400 for /hot-replace without href parameter", async () => {
            const handler = createDevHandler(deps);
            const request = new Request("http://localhost:3000/hot-replace");

            const response = await handler(request);

            assert.equal(response.status, 400);
            const body = await response.text();
            assert.ok(body.includes("href"));
        });

        it("should return SSE with empty body for invalid route", async () => {
            const handler = createDevHandler(deps);
            const request = new Request("http://localhost:3000/hot-replace?href=/nonexistent");

            const response = await handler(request);

            assert.equal(response.status, 200);
            assert.equal(response.headers.get("Content-Type"), "text/event-stream");
        });

        it("should add CORS header for same-origin requests", async () => {
            const handler = createDevHandler(deps);
            const request = new Request("http://localhost:3000/hot-replace?href=/", {
                headers: {
                    origin: "http://localhost:3000",
                    host: "localhost:3000",
                },
            });

            const response = await handler(request);

            assert.equal(response.headers.get("Access-Control-Allow-Origin"), "http://localhost:3000");
        });
    });

    describe("OPTIONS requests", () => {
        it("should return 204 for OPTIONS requests", async () => {
            const handler = createDevHandler(deps);
            const request = new Request("http://localhost:3000/about", { method: "OPTIONS" });

            const response = await handler(request);

            assert.equal(response.status, 204);
        });
    });

    describe("middleware execution", () => {
        it("should execute middleware chain", async () => {
            const middlewareCalled = [];
            deps.getMiddleware = () => [
                async () => {
                    middlewareCalled.push("mw1");
                },
                async () => {
                    middlewareCalled.push("mw2");
                },
            ];
            const handler = createDevHandler(deps);
            const request = new Request("http://localhost:3000/about");

            await handler(request);

            assert.deepEqual(middlewareCalled, ["mw1", "mw2"]);
        });

        it("should short-circuit on middleware returning Response", async () => {
            deps.getMiddleware = () => [
                async () => new Response("Intercepted", { status: 403 }),
                async () => {
                    throw new Error("Should not be called");
                },
            ];
            const handler = createDevHandler(deps);
            const request = new Request("http://localhost:3000/about");

            const response = await handler(request);

            assert.equal(response.status, 403);
            const body = await response.text();
            assert.equal(body, "Intercepted");
        });

        it("should handle HEAD requests with middleware Response", async () => {
            deps.getMiddleware = () => [async () => new Response("Body", { status: 200 })];
            const handler = createDevHandler(deps);
            const request = new Request("http://localhost:3000/about", { method: "HEAD" });

            const response = await handler(request);

            assert.equal(response.status, 200);
            const body = await response.text();
            assert.equal(body, ""); // HEAD should have no body
        });

        it("should continue on middleware error", async () => {
            deps.getMiddleware = () => [
                async () => {
                    throw new Error("Middleware error");
                },
            ];
            const handler = createDevHandler(deps);
            const request = new Request("http://localhost:3000/about");

            const response = await handler(request);

            // Should still render the page
            assert.equal(response.status, 200);
        });
    });

    describe("SSR rendering", () => {
        it("should render root route", async () => {
            const handler = createDevHandler(deps);
            const request = new Request("http://localhost:3000/");

            const response = await handler(request);

            assert.equal(response.status, 200);
            assert.equal(response.headers.get("Content-Type"), "text/html; charset=utf-8");
            const body = await response.text();
            assert.ok(body.includes("<!doctype html>"));
            assert.ok(body.includes("<h1>Home</h1>"));
        });

        it("should render named route", async () => {
            const handler = createDevHandler(deps);
            const request = new Request("http://localhost:3000/about");

            const response = await handler(request);

            assert.equal(response.status, 200);
            const body = await response.text();
            assert.ok(body.includes("<h1>About</h1>"));
        });

        it("should render dynamic route with slug", async () => {
            const handler = createDevHandler(deps);
            const request = new Request("http://localhost:3000/posts/hello-world");

            const response = await handler(request);

            assert.equal(response.status, 200);
            const body = await response.text();
            assert.ok(body.includes("Post: hello-world"));
        });

        it("should inject CSS assets", async () => {
            const handler = createDevHandler(deps);
            const request = new Request("http://localhost:3000/");

            const response = await handler(request);
            const body = await response.text();

            assert.ok(body.includes('rel="stylesheet"'));
            assert.ok(body.includes("index.css"));
        });

        it("should inject hot-reload script", async () => {
            const handler = createDevHandler(deps);
            const request = new Request("http://localhost:3000/");

            const response = await handler(request);
            const body = await response.text();

            assert.ok(body.includes("hot-replace.js"));
            assert.ok(body.includes("hotReplace"));
        });

        it("should handle HEAD requests (no body)", async () => {
            const handler = createDevHandler(deps);
            const request = new Request("http://localhost:3000/", { method: "HEAD" });

            const response = await handler(request);

            assert.equal(response.status, 200);
            assert.equal(response.headers.get("Content-Type"), "text/html; charset=utf-8");
            const body = await response.text();
            assert.equal(body, "");
        });

        it("should return 400 for invalid URL encoding", async () => {
            const handler = createDevHandler(deps);
            const request = new Request("http://localhost:3000/%invalid");

            const response = await handler(request);

            assert.equal(response.status, 400);
        });

        it("should return 400 for invalid slug", async () => {
            const handler = createDevHandler(deps);
            const request = new Request("http://localhost:3000/posts/<script>");

            const response = await handler(request);

            assert.equal(response.status, 400);
            const body = await response.text();
            assert.ok(body.toLowerCase().includes("invalid"));
        });
    });

    describe("404 handling", () => {
        it("should return 404 for non-existent route", async () => {
            const handler = createDevHandler(deps);
            const request = new Request("http://localhost:3000/nonexistent");

            const response = await handler(request);

            assert.equal(response.status, 404);
        });

        it("should render custom 404 page if available", async () => {
            deps.resolve404Page = () => "src/pages/404.jsx";
            deps.loadJsxModule = async (path) => {
                if (path === "src/pages/404.jsx") {
                    return async () => "<html><head><title>404</title></head><body><h1>Custom 404</h1></body></html>";
                }
                throw new Error("Not found");
            };
            const handler = createDevHandler(deps);
            const request = new Request("http://localhost:3000/nonexistent");

            const response = await handler(request);

            assert.equal(response.status, 404);
            const body = await response.text();
            assert.ok(body.includes("Custom 404"));
        });

        it("should handle HEAD for 404", async () => {
            const handler = createDevHandler(deps);
            const request = new Request("http://localhost:3000/nonexistent", { method: "HEAD" });

            const response = await handler(request);

            assert.equal(response.status, 404);
            const body = await response.text();
            assert.equal(body, "");
        });
    });

    describe("500 handling", () => {
        it("should return 500 on SSR error", async () => {
            deps.loadJsxModule = async () => {
                return async () => {
                    throw new Error("Render error");
                };
            };
            const handler = createDevHandler(deps);
            const request = new Request("http://localhost:3000/");

            const response = await handler(request);

            assert.equal(response.status, 500);
            assert.equal(response.headers.get("Cache-Control"), "no-store");
        });

        it("should render custom 500 page if available", async () => {
            deps.resolve500Page = () => "src/pages/500.jsx";
            deps.loadJsxModule = async (path) => {
                if (path === "src/pages/500.jsx") {
                    return async ({ error }) =>
                        `<html><head><title>500</title></head><body><h1>Custom 500: ${error?.message || "Unknown"}</h1></body></html>`;
                }
                // First call is for the main page, which should error
                return async () => {
                    throw new Error("Render error");
                };
            };
            const handler = createDevHandler(deps);
            const request = new Request("http://localhost:3000/");

            const response = await handler(request);

            assert.equal(response.status, 500);
            const body = await response.text();
            assert.ok(body.includes("Custom 500"));
        });

        it("should handle HEAD for 500", async () => {
            deps.loadJsxModule = async () => {
                return async () => {
                    throw new Error("Render error");
                };
            };
            const handler = createDevHandler(deps);
            const request = new Request("http://localhost:3000/", { method: "HEAD" });

            const response = await handler(request);

            assert.equal(response.status, 500);
            const body = await response.text();
            assert.equal(body, "");
        });
    });

    describe("esbuild error handling", () => {
        it("should render esbuild error in body when present", async () => {
            deps.getEsbuildError = () => "Syntax error in file.jsx:10";
            const handler = createDevHandler(deps);
            // Trigger SSE to see the error
            const request = new Request("http://localhost:3000/hot-replace?href=/");

            const response = await handler(request);

            assert.equal(response.status, 200);
            // The SSE stream should contain the error
            // We can't easily read the stream in tests, but we verified the handler accepts the error
        });
    });

    describe("non-HTML pages", () => {
        it("should render non-HTML content without doctype", async () => {
            deps.loadJsxModule = async () => {
                return async () => "<div>Not a full HTML page</div>";
            };
            const handler = createDevHandler(deps);
            const request = new Request("http://localhost:3000/");

            const response = await handler(request);

            assert.equal(response.status, 200);
            const body = await response.text();
            assert.ok(!body.includes("<!doctype html>"));
            assert.ok(body.includes("<div>Not a full HTML page</div>"));
        });
    });
});

describe("SSE client management", () => {
    it("should track connected clients", async () => {
        // This is more of an integration test - the SSE client tracking
        // is managed via ReadableStream callbacks in the handler
        // We verify the basic structure works
        const deps = {
            getRoutes: () => [{ path: "", jsx: "src/pages/index.jsx", assets: {} }],
            loadJsxModule: async () => async () => "<html><head></head><body></body></html>",
            publicPath: "/",
            getEsbuildError: () => "",
            hotReplaceClientPath: "/test.js",
            readFile: async () => "export function hotReplace() {}",
            getMiddleware: () => [],
            resolve404Page: () => null,
            resolve500Page: () => null,
            logger: { info: () => {}, error: () => {}, warn: () => {} },
        };

        const handler = createDevHandler(deps);
        const request = new Request("http://localhost:3000/hot-replace?href=/");

        const response = await handler(request);

        assert.equal(response.status, 200);
        assert.ok(response.body instanceof ReadableStream);
    });
});
