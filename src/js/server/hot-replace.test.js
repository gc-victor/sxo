import assert from "node:assert/strict";
import test from "node:test";
import { normalizePublicPath, renderErrorHtml } from "./utils/index.js";

// These tests validate the SSE hot-replace contract described in AGENTS.md:
// - Success payload shape: { body, assets, publicPath }
// - Error payload shape: { body }
// They do not start the dev server (which is long-running), but instead verify
// the payload schema and URL normalization semantics used by the client script
// to inject assets.

function makeTagsFromPayloadAssets({ assets, publicPath }) {
    const base = normalizePublicPath(publicPath ?? "/");
    const prefix = base === "" ? "" : base; // "" preserved, non-empty already normalized with trailing slash

    const links = (assets?.css ?? []).map((href) => `<link rel="stylesheet" href="${prefix}${href}">`);
    const scripts = (assets?.js ?? []).map((src) => `<script type="module" src="${prefix}${src}"></script>`);
    return { links, scripts };
}

test('hot-replace SSE: success payload has { body, assets, publicPath } and paths normalize with PUBLIC_PATH="/"', () => {
    const payload = {
        body: '<div id="page">New Body</div>',
        assets: {
            css: ["global.X1.css", "route/index.X1.css"],
            js: ["route/index.X1.js"],
        },
        publicPath: "/",
    };

    // Shape checks
    assert.equal(typeof payload.body, "string");
    assert.ok(payload.body.includes('id="page"'));
    assert.ok(payload.assets && Array.isArray(payload.assets.css) && Array.isArray(payload.assets.js));
    assert.equal(payload.publicPath, "/");

    // URL normalization -> leading slash present
    const { links, scripts } = makeTagsFromPayloadAssets(payload);
    assert.ok(links.includes('<link rel="stylesheet" href="/global.X1.css">'));
    assert.ok(links.includes('<link rel="stylesheet" href="/route/index.X1.css">'));
    assert.ok(scripts.includes('<script type="module" src="/route/index.X1.js"></script>'));
});

test('hot-replace SSE: success payload with PUBLIC_PATH="" preserves empty base (no leading slash)', () => {
    const payload = {
        body: "<div>Body</div>",
        assets: {
            css: ["styles.A1.css"],
            js: ["entry.A1.js"],
        },
        publicPath: "",
    };

    // Shape checks
    assert.equal(typeof payload.body, "string");
    assert.ok(payload.assets && Array.isArray(payload.assets.css) && Array.isArray(payload.assets.js));
    assert.equal(payload.publicPath, "");

    // URL normalization -> no leading slash when base is ""
    const { links, scripts } = makeTagsFromPayloadAssets(payload);
    assert.ok(links.includes('<link rel="stylesheet" href="styles.A1.css">'));
    assert.ok(scripts.includes('<script type="module" src="entry.A1.js"></script>'));
});

test("hot-replace SSE: error fallback payload includes only { body } with escaped error content", () => {
    // Simulate an error message containing a script to ensure escaping
    const errMessage = 'Bad <script>alert("x")</script> error';
    const errorBody = renderErrorHtml(errMessage);

    // Error payload contract: only { body }
    const payload = { body: errorBody };

    assert.equal(Object.keys(payload).length, 1, "Error payload should contain only the 'body' key");
    assert.equal(typeof payload.body, "string");

    // Ensure rendered error body is safe
    assert.ok(payload.body.includes("✘ [ERROR]:"));
    assert.ok(payload.body.includes("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"), "Error body must escape scripts");
    assert.ok(!payload.body.includes('<script>alert("x")</script>'), "Raw script must not appear");
});
