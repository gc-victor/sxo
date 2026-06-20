import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HTTP_HEADER_CACHE_CONTROL, HTTP_HEADER_CONTENT_TYPE, MIME_TYPE_HTML_UTF8 } from "../shared/http-constants.js";
import { executeSSR, handleSSRError } from "./ssr-executor.js";

describe("ssr-executor", () => {
    const PUBLIC_PATH = "/";

    /**
     * Helper to create a route and module map.
     * @param {string} jsx - Path to JSX file
     * @param {Function} renderFn - Render function
     * @param {object} [assets] - Optional assets
     * @param {string} [exportName='default'] - Name of the export
     */
    const createFixtures = (jsx, renderFn, assets = null, exportName = "default") => {
        const route = { jsx, assets };
        const modules = {
            [jsx]: { [exportName]: renderFn },
        };
        return { route, modules };
    };

    describe("executeSSR()", () => {
        it("renders HTML with doctype and correct headers", async () => {
            const html = "<html><body>Hello</body></html>";
            const { route, modules } = createFixtures("page.jsx", async () => html);

            const result = await executeSSR(route, {}, modules, PUBLIC_PATH, false);
            const response = result.response;
            const body = await response.text();

            assert.equal(response.status, 200);
            assert.equal(response.headers.get(HTTP_HEADER_CONTENT_TYPE), MIME_TYPE_HTML_UTF8);
            assert.equal(response.headers.get(HTTP_HEADER_CACHE_CONTROL), "public, max-age=0, must-revalidate");
            assert.equal(body, `<!doctype html>\n${html}`);
        });

        it("handles HEAD requests by returning status 200 with no body", async () => {
            const { route, modules } = createFixtures("page.jsx", async () => "<html></html>");

            const result = await executeSSR(route, {}, modules, PUBLIC_PATH, true);
            const response = result.response;
            const body = await response.text();

            assert.equal(response.status, 200);
            assert.equal(response.headers.get(HTTP_HEADER_CONTENT_TYPE), MIME_TYPE_HTML_UTF8);
            assert.equal(body, "");
        });

        it("returns non-HTML output as-is without doctype prefix", async () => {
            const json = '{"key": "value"}';
            const { route, modules } = createFixtures("api.jsx", async () => json);

            const result = await executeSSR(route, {}, modules, PUBLIC_PATH, false);
            const body = await result.response.text();

            assert.equal(body, json);
            assert.ok(!body.includes("<!doctype html>"));
        });

        it("injects CSS and JS assets into HTML output", async () => {
            const html = "<html><head></head><body></body></html>";
            const assets = { css: ["style.css"], js: ["script.js"] };
            const { route, modules } = createFixtures("page.jsx", async () => html, assets);

            const result = await executeSSR(route, {}, modules, PUBLIC_PATH, false);
            const body = await result.response.text();

            // PUBLIC_PATH is "/", so assets should be prefixed with "/"
            assert.ok(body.includes('<link rel="stylesheet" href="/style.css">'));
            assert.ok(body.includes('<script type="module" src="/script.js"></script>'));
        });

        it("applies custom security headers to the response", async () => {
            const { route, modules } = createFixtures("page.jsx", async () => "<html></html>");
            const securityHeaders = { "X-Custom": "Value" };

            const result = await executeSSR(route, {}, modules, PUBLIC_PATH, false, securityHeaders);
            const response = result.response;

            assert.equal(response.headers.get("X-Custom"), "Value");
            // Verify withSecurityHeaders was called by checking standard security header
            assert.ok(response.headers.get("X-Content-Type-Options"));
        });

        it("throws an error when the JSX module is not found", async () => {
            const route = { jsx: "missing.jsx" };
            await assert.rejects(() => executeSSR(route, {}, {}, PUBLIC_PATH, false), {
                message: /Module not found: missing.jsx/,
            });
        });

        it("throws an error when the module has no valid export", async () => {
            const route = { jsx: "page.jsx" };
            const modules = { "page.jsx": {} };
            await assert.rejects(() => executeSSR(route, {}, modules, PUBLIC_PATH, false), {
                message: /No valid export found in page.jsx/,
            });
        });

        it("supports named 'jsx' export as an alternative to 'default'", async () => {
            const html = "<html></html>";
            const { route, modules } = createFixtures("page.jsx", async () => html, null, "jsx");

            const result = await executeSSR(route, {}, modules, PUBLIC_PATH, false);
            const body = await result.response.text();

            assert.equal(body, `<!doctype html>\n${html}`);
        });

        it("passes route parameters to the render function", async () => {
            const params = { slug: "test-slug" };
            const renderFn = async (p) => `<html>${p.slug}</html>`;
            const { route, modules } = createFixtures("page.jsx", renderFn);

            const result = await executeSSR(route, params, modules, PUBLIC_PATH, false);
            const body = await result.response.text();

            assert.ok(body.includes("test-slug"));
        });

        it("verifies content-type detection across different outputs", async () => {
            const scenarios = [
                { name: "full html", content: "<html><body>test</body></html>", hasDoctype: true },
                { name: "html with attribute", content: '<html lang="en">test</html>', hasDoctype: true },
                { name: "html tag with space", content: "<html >test</html>", hasDoctype: true },
                { name: "fragment", content: "<div>test</div>", hasDoctype: false },
                { name: "plain text", content: "just text", hasDoctype: false },
            ];

            for (const { name, content, hasDoctype } of scenarios) {
                const { route, modules } = createFixtures(`${name}.jsx`, async () => content);
                const result = await executeSSR(route, {}, modules, PUBLIC_PATH, false);
                const body = await result.response.text();

                if (hasDoctype) {
                    assert.equal(body, `<!doctype html>\n${content}`, `Failed doctype check for: ${name}`);
                } else {
                    assert.equal(body, content, `Failed raw check for: ${name}`);
                }
            }
        });

        it("processes HTML Response with asset injection and doctype", async () => {
            const html = "<html><head></head><body></body></html>";
            const assets = { css: ["style.css"], js: ["script.js"] };
            const pageFn = async () =>
                new Response(html, {
                    headers: { [HTTP_HEADER_CONTENT_TYPE]: "text/html" },
                });
            const { route, modules } = createFixtures("page.jsx", pageFn, assets);

            const result = await executeSSR(route, {}, modules, PUBLIC_PATH, false);
            const body = await result.response.text();

            assert.equal(result.response.status, 200);
            assert.ok(body.startsWith("<!doctype html>"));
            assert.ok(body.includes('<link rel="stylesheet" href="/style.css">'));
            assert.ok(body.includes('<script type="module" src="/script.js"></script>'));
        });

        it("processes HTML Response without <html> root as raw body", async () => {
            const pageFn = async () =>
                new Response("<div>fragment</div>", {
                    headers: { [HTTP_HEADER_CONTENT_TYPE]: "text/html" },
                });
            const { route, modules } = createFixtures("page.jsx", pageFn);

            const result = await executeSSR(route, {}, modules, PUBLIC_PATH, false);
            const body = await result.response.text();

            assert.equal(result.response.status, 200);
            assert.equal(body, "<div>fragment</div>");
            assert.ok(!body.includes("<!doctype html>"));
        });

        it("passes non-HTML Response through unchanged", async () => {
            const pageFn = async () =>
                new Response(JSON.stringify({ ok: true }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            const { route, modules } = createFixtures("api.jsx", pageFn);

            const result = await executeSSR(route, {}, modules, PUBLIC_PATH, false);
            const body = await result.response.text();

            assert.equal(result.response.status, 200);
            assert.equal(result.response.headers.get("Content-Type"), "application/json");
            assert.equal(body, JSON.stringify({ ok: true }));
        });

        it("preserves custom status and headers on HTML Response", async () => {
            const html = "<html><body>Custom</body></html>";
            const pageFn = async () =>
                new Response(html, {
                    status: 201,
                    headers: { "Content-Type": "text/html", "X-Custom": "yes" },
                });
            const { route, modules } = createFixtures("page.jsx", pageFn);

            const result = await executeSSR(route, {}, modules, PUBLIC_PATH, false);
            const body = await result.response.text();

            assert.equal(result.response.status, 201);
            assert.equal(result.response.headers.get("X-Custom"), "yes");
            assert.ok(body.startsWith("<!doctype html>"));
        });

        it("handles HEAD request with HTML Response", async () => {
            const pageFn = async () =>
                new Response("<html></html>", {
                    headers: { "Content-Type": "text/html" },
                });
            const { route, modules } = createFixtures("page.jsx", pageFn);

            const result = await executeSSR(route, {}, modules, PUBLIC_PATH, true);
            const body = await result.response.text();

            assert.equal(result.response.status, 200);
            assert.equal(body, "");
        });

        it("coerces non-string render output to string", async () => {
            // Test null/undefined returns empty string
            const nullRoute = { jsx: "null.jsx" };
            const nullModules = { "null.jsx": { default: async () => null } };
            const nullResult = await executeSSR(nullRoute, {}, nullModules, PUBLIC_PATH, false);
            const nullBody = await nullResult.response.text();
            assert.equal(nullBody, "");

            // Test number is converted to string
            const numRoute = { jsx: "num.jsx" };
            const numModules = { "num.jsx": { default: async () => 42 } };
            const numResult = await executeSSR(numRoute, {}, numModules, PUBLIC_PATH, false);
            const numBody = await numResult.response.text();
            assert.equal(numBody, "42");

            // Test object is converted to string
            const objRoute = { jsx: "obj.jsx" };
            const objModules = { "obj.jsx": { default: async () => ({ toString: () => "<div>object</div>" }) } };
            const objResult = await executeSSR(objRoute, {}, objModules, PUBLIC_PATH, false);
            const objBody = await objResult.response.text();
            assert.ok(objBody.includes("object"));
        });
    });

    describe("handleSSRError()", () => {
        it("logs the error and returns a 500 response from send500 helper", async () => {
            const error = new Error("SSR Fail");
            const request = new Request("http://localhost/");
            const mockResponse = new Response("Error", { status: 500 });

            const options = {
                send500: async (req, opts) => {
                    assert.equal(req, request);
                    assert.equal(opts.renderCustom500, true);
                    return mockResponse;
                },
                renderCustom500: true,
            };

            const result = await handleSSRError(error, request, options);

            assert.equal(result.type, "response");
            assert.equal(result.response, mockResponse);
        });

        it("passes all configuration options to the send500 helper", async () => {
            const error = new Error("SSR Fail");
            const request = new Request("http://localhost/");
            const mockResponse = new Response("Error", { status: 500 });
            const securityHeaders = { "X-Security": "true" };
            const render500Fn = async () => "500";

            const options = {
                send500: async (req, opts) => {
                    assert.equal(req, request);
                    assert.equal(opts.renderCustom500, true);
                    assert.equal(opts.render500Fn, render500Fn);
                    assert.equal(opts.securityHeaders, securityHeaders);
                    return mockResponse;
                },
                renderCustom500: true,
                render500Fn,
                securityHeaders,
            };

            const result = await handleSSRError(error, request, options);
            assert.equal(result.response, mockResponse);
        });

        it("propagates any exceptions thrown by the send500 helper", async () => {
            const error = new Error("SSR Fail");
            const request = new Request("http://localhost/");
            const send500 = async () => {
                throw new Error("Internal failure");
            };

            await assert.rejects(() => handleSSRError(error, request, { send500 }), { message: "Internal failure" });
        });
    });
});
