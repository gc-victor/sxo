import { strict as assert } from "node:assert";
import { test } from "node:test";
import { extractScriptTags } from "../index.js";

test("extractScriptTags - basic functionality", () => {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <script src="/js/index.js"></script>
            <script src="/vendor/lib.js"></script>
        </head>
        <body>
            <script src="/app/index.js" defer></script>
            <script src="/other.js"></script>
        </body>
        </html>
    `;

    const scripts = extractScriptTags(html);
    assert.equal(scripts.length, 2, "Should extract 2 scripts with index.js in src");
    assert.equal(scripts[0].location, "head");
    assert.equal(scripts[1].location, "body");
    assert.equal(scripts[0].attributes.src, "/js/index.js");
    assert.equal(scripts[1].attributes.src, "/app/index.js");
});

test("extractScriptTags - excludes hot-replace scripts by default", () => {
    const html = `
        <head>
            <script src="/index.js"></script>
            <script src="/hot-replace.js" data-hot-replace></script>
        </head>
    `;

    const scripts = extractScriptTags(html);
    assert.equal(scripts.length, 1);
    assert.equal(scripts[0].attributes.src, "/index.js");
});

test("extractScriptTags - includes hot-replace scripts when configured", () => {
    const html = `
        <head>
            <script src="/index.js"></script>
            <script src="/hot-replace.js" data-hot-replace></script>
        </head>
    `;

    const scripts = extractScriptTags(html, { excludeHotReplace: false });
    assert.equal(scripts.length, 1, "Still only 1 because hot-replace.js doesn't match filter");
});

test("extractScriptTags - custom string filter", () => {
    const html = `
        <head>
            <script src="/app.js"></script>
            <script src="/vendor.js"></script>
            <script src="/lib.js"></script>
        </head>
    `;

    const scripts = extractScriptTags(html, { filter: "vendor" });
    assert.equal(scripts.length, 1);
    assert.equal(scripts[0].attributes.src, "/vendor.js");
});

test("extractScriptTags - regex filter", () => {
    const html = `
        <head>
            <script src="/app.js"></script>
            <script src="/vendor.min.js"></script>
            <script src="/lib.min.js"></script>
        </head>
    `;

    const scripts = extractScriptTags(html, { filter: /\.min\.js$/ });
    assert.equal(scripts.length, 2);
    assert.ok(scripts[0].attributes.src.includes(".min.js"));
    assert.ok(scripts[1].attributes.src.includes(".min.js"));
});

test("extractScriptTags - function filter", () => {
    const html = `
        <head>
            <script src="/app.js" defer></script>
            <script src="/vendor.js"></script>
            <script src="/lib.js" defer></script>
        </head>
    `;

    const scripts = extractScriptTags(html, {
        filter: (attrs) => attrs.defer !== undefined,
    });
    assert.equal(scripts.length, 2);
    assert.equal(scripts[0].attributes.defer, "");
    assert.equal(scripts[1].attributes.defer, "");
});

test("extractScriptTags - handles various attribute formats", () => {
    const html = `
        <head>
            <script src="/index.js" defer></script>
            <script src='/index.js' async type="module"></script>
            <script src=/index.js crossorigin="anonymous"></script>
        </head>
    `;

    const scripts = extractScriptTags(html);
    assert.equal(scripts.length, 3);

    // First script - boolean attribute
    assert.equal(scripts[0].attributes.src, "/index.js");
    assert.equal(scripts[0].attributes.defer, "");

    // Second script - single quotes and multiple attributes
    assert.equal(scripts[1].attributes.src, "/index.js");
    assert.equal(scripts[1].attributes.async, "");
    assert.equal(scripts[1].attributes.type, "module");

    // Third script - unquoted value
    assert.equal(scripts[2].attributes.src, "/index.js");
    assert.equal(scripts[2].attributes.crossorigin, "anonymous");
});

test("extractScriptTags - handles self-closing tags", () => {
    const html = `
        <head>
            <script src="/index.js" />
            <script src="/app/index.js"></script>
        </head>
    `;

    const scripts = extractScriptTags(html);
    assert.equal(scripts.length, 2);
    assert.equal(scripts[0].attributes.src, "/index.js");
    assert.equal(scripts[1].attributes.src, "/app/index.js");
});

test("extractScriptTags - handles scripts outside head/body", () => {
    const html = `
        <script src="/before-index.js"></script>
        <html>
        <head>
            <script src="/head-index.js"></script>
        </head>
        <body>
            <script src="/body-index.js"></script>
        </body>
        </html>
        <script src="/after-index.js"></script>
    `;

    const scripts = extractScriptTags(html);
    assert.equal(scripts.length, 4);
    assert.equal(scripts[0].location, "body", "Scripts before head default to body");
    assert.equal(scripts[1].location, "head");
    assert.equal(scripts[2].location, "body");
    assert.equal(scripts[3].location, "body", "Scripts after body default to body");
});

test("extractScriptTags - handles inline scripts (no src)", () => {
    // NOTE: This extractor intentionally excludes inline <script> tags (no src attribute).
    // This is different from extractHeadAndBodyAssetTags, which captures all script tags as raw HTML.
    const html = `
        <head>
            <script>console.log("inline");</script>
            <script src="/index.js"></script>
        </head>
    `;

    const scripts = extractScriptTags(html);
    assert.equal(scripts.length, 1, "Should only include scripts with src attribute");
    assert.equal(scripts[0].attributes.src, "/index.js");
});

test("extractScriptTags - handles malformed HTML gracefully", () => {
    const html = `
        <head
            <script src="/index.js"></script>
        </head
        <body>
            <script src="/app/index.js"
        </body>
    `;

    const scripts = extractScriptTags(html);
    assert.equal(scripts.length, 1, "Should handle malformed HTML gracefully");
    assert.equal(scripts[0].attributes.src, "/index.js");
});

test("extractScriptTags - handles empty or invalid input", () => {
    assert.deepEqual(extractScriptTags(""), []);
    assert.deepEqual(extractScriptTags(null), []);
    assert.deepEqual(extractScriptTags(undefined), []);
    assert.deepEqual(extractScriptTags(123), []);
});

test("extractScriptTags - preserves original tag string", () => {
    const html = `
        <head>
            <script src="/index.js" defer type="module"></script>
        </head>
    `;

    const scripts = extractScriptTags(html);
    assert.equal(scripts.length, 1);
    assert.ok(scripts[0].original.includes('src="/index.js"'));
    assert.ok(scripts[0].original.includes("defer"));
    assert.ok(scripts[0].original.includes('type="module"'));
});

test("extractScriptTags - handles attributes with colons and hyphens", () => {
    const html = `
        <head>
            <script src="/index.js" data-custom="value" xml:lang="en"></script>
        </head>
    `;

    const scripts = extractScriptTags(html);
    assert.equal(scripts.length, 1);
    assert.equal(scripts[0].attributes["data-custom"], "value");
    assert.equal(scripts[0].attributes["xml:lang"], "en");
});

test("extractScriptTags - no filter returns all scripts with src", () => {
    const html = `
        <head>
            <script src="/app.js"></script>
            <script src="/vendor.js"></script>
            <script>console.log("inline");</script>
        </head>
    `;

    const scripts = extractScriptTags(html, { filter: null });
    assert.equal(scripts.length, 2, "Should return all scripts with src when no filter");
    assert.equal(scripts[0].attributes.src, "/app.js");
    assert.equal(scripts[1].attributes.src, "/vendor.js");
});
