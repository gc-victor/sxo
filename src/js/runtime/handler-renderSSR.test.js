import { ok, rejects, strictEqual } from "node:assert";
import { describe, test } from "node:test";
import { renderSSR } from "./handler.js";

describe("renderSSR helper function", () => {
    describe("Scenario 1: Normal Rendering", () => {
        test("When calling renderSSR with valid inputs, then returns rendered HTML string", async () => {
            const route = {
                path: "",
                filename: "index.html",
                jsx: "src/pages/index.jsx",
                assets: { css: ["index.css"], js: ["index.js"] },
            };
            const modules = {
                "src/pages/index.jsx": {
                    default: () => "<html><head><title>Home</title></head><body>Home Page</body></html>",
                },
            };
            const request = new Request("http://localhost/");

            const result = await renderSSR(route, request, modules);

            strictEqual(typeof result, "string", "should return HTML string");
            ok(result.includes("<html"), "should contain HTML opening tag");
            ok(result.includes("Home Page"), "should contain rendered content");
        });

        test("When calling renderSSR with dynamic route params, then passes params to render function", async () => {
            const route = {
                path: "blog/[slug]",
                filename: "blog-slug.html",
                jsx: "src/pages/blog/[slug]/index.jsx",
                assets: { css: [], js: ["blog.js"] },
            };
            const modules = {
                "src/pages/blog/[slug]/index.jsx": {
                    default: (params) => `<html><head><title>Blog</title></head><body>Blog: ${params.slug}</body></html>`,
                },
            };
            const request = new Request("http://localhost/blog/test-post");

            const result = await renderSSR(route, request, modules);

            ok(result.includes("Blog: test-post"), "should include slug parameter in rendered output");
        });

        test("When calling renderSSR with async render function, then handles async rendering correctly", async () => {
            const route = {
                path: "about",
                filename: "about/index.html",
                jsx: "src/pages/about/index.jsx",
                assets: {},
            };
            const modules = {
                "src/pages/about/index.jsx": {
                    default: async () => `<html><head><title>About</title></head><body>About Page</body></html>`,
                },
            };
            const request = new Request("http://localhost/about");

            const result = await renderSSR(route, request, modules);

            ok(result.includes("About Page"), "should handle async render functions");
        });

        test("When render function returns non-string value, then converts to string", async () => {
            const route = {
                path: "test",
                filename: "test.html",
                jsx: "src/pages/test.jsx",
                assets: {},
            };
            const modules = {
                "src/pages/test.jsx": { default: () => 12345 },
            };
            const request = new Request("http://localhost/test");

            const result = await renderSSR(route, request, modules);

            strictEqual(result, "12345", "should convert non-string to string");
        });

        test("When render function uses named jsx export, then uses jsx export", async () => {
            const route = {
                path: "named-export",
                filename: "named.html",
                jsx: "src/pages/named.jsx",
                assets: {},
            };
            const modules = {
                "src/pages/named.jsx": {
                    jsx: () => "<html><head></head><body>Named Export</body></html>",
                },
            };
            const request = new Request("http://localhost/named-export");

            const result = await renderSSR(route, request, modules);

            ok(result.includes("Named Export"), "should use named jsx export");
        });
    });

    describe("Scenario 2: Module Loading Error", () => {
        test("When calling renderSSR with missing module, then throws error with module path", async () => {
            const route = {
                path: "missing",
                filename: "missing.html",
                jsx: "src/pages/missing.jsx",
                assets: {},
            };
            const modules = {};
            const request = new Request("http://localhost/missing");

            await rejects(
                () => renderSSR(route, request, modules),
                { message: /Module not found.*src\/pages\/missing\.jsx/ },
                "should throw error for missing module",
            );
        });

        test("When calling renderSSR with module missing valid export, then throws error", async () => {
            const route = {
                path: "invalid-export",
                filename: "invalid-export.html",
                jsx: "src/pages/invalid-export.jsx",
                assets: {},
            };
            const modules = {
                "src/pages/invalid-export.jsx": { invalidExport: () => "<html></html>" },
            };
            const request = new Request("http://localhost/invalid-export");

            await rejects(
                () => renderSSR(route, request, modules),
                { message: /No valid export found.*src\/pages\/invalid-export\.jsx/ },
                "should throw error for missing valid export",
            );
        });
    });

    describe("Scenario 3: Rendering Error", () => {
        test("When render function throws error, then propagates error", async () => {
            const route = {
                path: "error-route",
                filename: "error.html",
                jsx: "src/pages/error.jsx",
                assets: {},
            };
            const modules = {
                "src/pages/error.jsx": {
                    default: () => {
                        throw new Error("Render function failed");
                    },
                },
            };
            const request = new Request("http://localhost/error-route");

            await rejects(
                () => renderSSR(route, request, modules),
                { message: "Render function failed" },
                "should propagate render function errors",
            );
        });

        test("When async render function rejects, then propagates rejection error", async () => {
            const route = {
                path: "async-error",
                filename: "async-error.html",
                jsx: "src/pages/async-error.jsx",
                assets: {},
            };
            const modules = {
                "src/pages/async-error.jsx": {
                    default: async () => {
                        await new Promise((resolve) => setTimeout(resolve, 10));
                        throw new Error("Async render failed");
                    },
                },
            };
            const request = new Request("http://localhost/async-error");

            await rejects(
                () => renderSSR(route, request, modules),
                { message: "Async render failed" },
                "should propagate async render errors",
            );
        });

        test("When render function returns undefined, then converts to empty string", async () => {
            const route = {
                path: "undefined-return",
                filename: "undefined.html",
                jsx: "src/pages/undefined.jsx",
                assets: {},
            };
            const modules = {
                "src/pages/undefined.jsx": { default: () => undefined },
            };
            const request = new Request("http://localhost/undefined-return");

            const result = await renderSSR(route, request, modules);

            strictEqual(result, "", "should convert undefined to empty string");
        });

        test("When render function returns null, then converts to empty string (not literal 'null')", async () => {
            const route = {
                path: "null-return",
                filename: "null.html",
                jsx: "src/pages/null.jsx",
                assets: {},
            };
            const modules = {
                "src/pages/null.jsx": { default: () => null },
            };
            const request = new Request("http://localhost/null-return");

            const result = await renderSSR(route, request, modules);

            strictEqual(result, "", "should convert null to empty string, not literal 'null'");
            strictEqual(result !== "null", true, "should NOT be the string 'null'");
        });
    });

    describe("Scenario 4: HTML Response Processing", () => {
        test("When render returns HTML document, then prepends doctype", async () => {
            const route = {
                path: "",
                filename: "index.html",
                jsx: "src/pages/index.jsx",
                assets: { css: ["index.css"], js: ["index.js"] },
            };
            const modules = {
                "src/pages/index.jsx": {
                    default: () => "<html><head><title>Home</title></head><body>Home Page</body></html>",
                },
            };
            const request = new Request("http://localhost/");

            const result = await renderSSR(route, request, modules);

            ok(result.startsWith("<!doctype html>") || result.startsWith("<!DOCTYPE html>"), "should prepend doctype declaration");
            ok(result.includes("<html"), "should contain HTML tag");
        });

        test("When render returns non-HTML response, then does not prepend doctype", async () => {
            const route = {
                path: "plain-text",
                filename: "plain.html",
                jsx: "src/pages/plain.jsx",
                assets: {},
            };
            const modules = {
                "src/pages/plain.jsx": { default: () => "Plain text response without HTML tags" },
            };
            const request = new Request("http://localhost/plain-text");

            const result = await renderSSR(route, request, modules);

            ok(!result.startsWith("<!doctype html>") && !result.startsWith("<!DOCTYPE html>"), "should not prepend doctype for non-HTML");
            ok(result.startsWith("Plain text response"), "should return plain text as-is");
        });
    });

    describe("Scenario 5: Pre-matched params optimization", () => {
        test("When calling renderSSR with pre-matched params, then uses them instead of the URL", async () => {
            const route = {
                path: "blog/[slug]/[id]",
                filename: "blog-slug-id.html",
                jsx: "src/pages/blog/[slug]/[id]/index.jsx",
                assets: {},
            };
            const modules = {
                "src/pages/blog/[slug]/[id]/index.jsx": {
                    default: (params) => `<html><body>Slug: ${params.slug}, ID: ${params.id}</body></html>`,
                },
            };
            const request = new Request("http://localhost/blog/different-slug/999");
            const preMatchedParams = { slug: "my-post", id: "123" };

            const result = await renderSSR(route, request, modules, preMatchedParams);

            ok(result.includes("Slug: my-post"), "should use pre-matched slug param");
            ok(result.includes("ID: 123"), "should use pre-matched id param");
        });

        test("When calling renderSSR without params, then extracts from URL via routeMatch", async () => {
            const route = {
                path: "blog/[slug]",
                filename: "blog-slug.html",
                jsx: "src/pages/blog/[slug]/index.jsx",
                assets: {},
            };
            const modules = {
                "src/pages/blog/[slug]/index.jsx": {
                    default: (params) => `<html><body>Slug: ${params.slug}</body></html>`,
                },
            };
            const request = new Request("http://localhost/blog/extracted-slug");

            const result = await renderSSR(route, request, modules);

            ok(result.includes("Slug: extracted-slug"), "should extract params from URL when not provided");
        });

        test("When calling renderSSR with empty params object, then uses empty params", async () => {
            const route = {
                path: "",
                filename: "index.html",
                jsx: "src/pages/index.jsx",
                assets: {},
            };
            const modules = {
                "src/pages/index.jsx": {
                    default: (params) => `<html><body>Params: ${JSON.stringify(params)}</body></html>`,
                },
            };
            const request = new Request("http://localhost/");

            const result = await renderSSR(route, request, modules, {});

            ok(result.includes("Params: {}"), "should use empty params when provided");
        });
    });
});
