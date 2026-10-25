import assert from "node:assert/strict";
import { test } from "node:test";
import middleware from "./middleware.js";

function createRequest(pathname) {
    return new Request(`http://localhost${pathname}`);
}

test("redirects the root route to installation", async () => {
    const response = await middleware(createRequest("/"), {}, {});

    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), "/installation");
});

test("passes through unrelated paths without rendering", async () => {
    let renderCalls = 0;
    const context = { render: () => (renderCalls += 1) };

    assert.equal(await middleware(createRequest("/components/button"), {}, context), undefined);
    assert.equal(await middleware(createRequest("/index.md"), {}, context), undefined);
    assert.equal(renderCalls, 0);
});

test("renders markdown from article content and maps the route to its JSX page", async () => {
    let renderedPath;
    const context = {
        render: async (path) => {
            renderedPath = path;
            return "<html><body><header>Site header</header><article><h1>Button</h1><p>Text <strong>formatting</strong>.</p></article></body></html>";
        },
    };

    const response = await middleware(createRequest("/components/button.md"), {}, context);
    const markdown = await response.text();

    assert.equal(renderedPath, "src/pages/components/button/index.jsx");
    assert.equal(response.headers.get("content-type"), "text/markdown; charset=utf-8");
    assert.match(markdown, /# Button/);
    assert.match(markdown, /Text \*\*formatting\*\*\./);
    assert.doesNotMatch(markdown, /Site header/);
});

test("passes through render errors and non-page render results", async () => {
    const throwingContext = {
        render: async () => {
            throw new Error("missing page");
        },
    };
    const stubContext = { render: async () => "Error loading page" };
    const nonHtmlContext = { render: async () => "not a document" };

    assert.equal(await middleware(createRequest("/missing.md"), {}, throwingContext), undefined);
    assert.equal(await middleware(createRequest("/missing.md"), {}, stubContext), undefined);
    assert.equal(await middleware(createRequest("/missing.md"), {}, nonHtmlContext), undefined);
});
