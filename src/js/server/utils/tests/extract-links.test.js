import { strict as assert } from "node:assert";
import { test } from "node:test";
import { extractLinkTag } from "../index.js";

test("extractLinkTag - basic functionality with global.css filter", () => {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <link rel="stylesheet" href="/css/global.css">
            <link rel="stylesheet" href="/css/page.css">
            <link rel="icon" href="/favicon.ico">
        </head>
        <body></body>
        </html>
    `;

    const link = extractLinkTag(html);
    assert.ok(link, "Should return first matching link");
    assert.equal(link.attributes.href, "/css/global.css");
    assert.equal(link.attributes.rel, "stylesheet");
});

test("extractLinkTag - returns all matches when returnFirst is false", () => {
    const html = `
        <head>
            <link rel="stylesheet" href="/css/global.css">
            <link rel="preload" href="/fonts/global.css.woff2" as="font">
        </head>
    `;

    const links = extractLinkTag(html, { returnFirst: false });
    assert.equal(links.length, 2, "Should return all matching links");
    assert.ok(links[0].attributes.href.includes("global.css"));
    assert.ok(links[1].attributes.href.includes("global.css"));
});

test("extractLinkTag - excludes hot-replace links by default", () => {
    const html = `
        <head>
            <link rel="stylesheet" href="/css/global.css" data-hot-replace>
            <link rel="stylesheet" href="/css/global.css">
        </head>
    `;

    const link = extractLinkTag(html);
    assert.ok(link);
    assert.equal(link.attributes["data-hot-replace"], undefined);
});

test("extractLinkTag - includes hot-replace links when configured", () => {
    const html = `
        <head>
            <link rel="stylesheet" href="/css/global.css" data-hot-replace>
            <link rel="stylesheet" href="/css/other-global.css">
        </head>
    `;

    const links = extractLinkTag(html, {
        excludeHotReplace: false,
        returnFirst: false,
    });
    assert.equal(links.length, 2);
    assert.equal(links[0].attributes["data-hot-replace"], "");
});

test("extractLinkTag - custom string filter", () => {
    const html = `
        <head>
            <link rel="stylesheet" href="/css/main.css">
            <link rel="stylesheet" href="/css/vendor.css">
            <link rel="stylesheet" href="/css/theme.css">
        </head>
    `;

    const link = extractLinkTag(html, { filter: "vendor" });
    assert.ok(link);
    assert.equal(link.attributes.href, "/css/vendor.css");
});

test("extractLinkTag - regex filter", () => {
    const html = `
        <head>
            <link rel="stylesheet" href="/css/app.css">
            <link rel="stylesheet" href="/css/vendor.min.css">
            <link rel="stylesheet" href="/css/theme.min.css">
        </head>
    `;

    const links = extractLinkTag(html, {
        filter: /\.min\.css$/,
        returnFirst: false,
    });
    assert.equal(links.length, 2);
    assert.ok(links[0].attributes.href.endsWith(".min.css"));
    assert.ok(links[1].attributes.href.endsWith(".min.css"));
});

test("extractLinkTag - function filter", () => {
    const html = `
        <head>
            <link rel="stylesheet" href="/css/main.css">
            <link rel="preload" href="/fonts/font.woff2" as="font">
            <link rel="icon" href="/favicon.ico">
        </head>
    `;

    const links = extractLinkTag(html, {
        filter: (attrs) => attrs.rel === "preload",
        returnFirst: false,
    });
    assert.equal(links.length, 1);
    assert.equal(links[0].attributes.rel, "preload");
    assert.equal(links[0].attributes.as, "font");
});

test("extractLinkTag - handles various attribute formats", () => {
    const html = `
        <head>
            <link href="/global.css" rel="stylesheet">
            <link href='/global.css' rel='stylesheet' type="text/css">
            <link href=/global.css rel=stylesheet>
        </head>
    `;

    const links = extractLinkTag(html, { returnFirst: false });
    assert.equal(links.length, 3);

    // All should have the correct href
    links.forEach((link) => {
        assert.ok(link.attributes.href.includes("global.css"));
        assert.equal(link.attributes.rel, "stylesheet");
    });
});

test("extractLinkTag - handles self-closing tags", () => {
    const html = `
        <head>
            <link href="/global.css" rel="stylesheet" />
            <link href="/global.css" rel="stylesheet">
        </head>
    `;

    const links = extractLinkTag(html, { returnFirst: false });
    assert.equal(links.length, 2);
    links.forEach((link) => {
        assert.equal(link.attributes.href, "/global.css");
    });
});

test("extractLinkTag - only searches in head section", () => {
    const html = `
        <link href="/before-global.css" rel="stylesheet">
        <html>
        <head>
            <link href="/head-global.css" rel="stylesheet">
        </head>
        <body>
            <link href="/body-global.css" rel="stylesheet">
        </body>
        </html>
    `;

    const links = extractLinkTag(html, { returnFirst: false });
    assert.equal(links.length, 1, "Should only find links in head");
    assert.equal(links[0].attributes.href, "/head-global.css");
});

test("extractLinkTag - handles empty or invalid input", () => {
    assert.equal(extractLinkTag(""), undefined);
    assert.equal(extractLinkTag(null), undefined);
    assert.equal(extractLinkTag(undefined), undefined);
    assert.equal(extractLinkTag(123), undefined);

    assert.deepEqual(extractLinkTag("", { returnFirst: false }), []);
    assert.deepEqual(extractLinkTag(null, { returnFirst: false }), []);
});

test("extractLinkTag - handles missing head section", () => {
    const html = `
        <html>
        <body>
            <link href="/global.css" rel="stylesheet">
        </body>
        </html>
    `;

    assert.equal(extractLinkTag(html), undefined);
    assert.deepEqual(extractLinkTag(html, { returnFirst: false }), []);
});

test("extractLinkTag - preserves original tag string", () => {
    const html = `
        <head>
            <link href="/global.css" rel="stylesheet" type="text/css" media="screen">
        </head>
    `;

    const link = extractLinkTag(html);
    assert.ok(link.original.includes('href="/global.css"'));
    assert.ok(link.original.includes('rel="stylesheet"'));
    assert.ok(link.original.includes('type="text/css"'));
    assert.ok(link.original.includes('media="screen"'));
});

test("extractLinkTag - handles attributes with special characters", () => {
    const html = `
        <head>
            <link href="/global.css?v=1.2.3" rel="stylesheet" data-custom="value" xml:lang="en">
        </head>
    `;

    const link = extractLinkTag(html);
    assert.equal(link.attributes.href, "/global.css?v=1.2.3");
    assert.equal(link.attributes["data-custom"], "value");
    assert.equal(link.attributes["xml:lang"], "en");
});

test("extractLinkTag - no filter returns all links with href", () => {
    const html = `
        <head>
            <link href="/css/app.css" rel="stylesheet">
            <link href="/favicon.ico" rel="icon">
            <link rel="preconnect" href="https://fonts.googleapis.com">
        </head>
    `;

    const links = extractLinkTag(html, { filter: null, returnFirst: false });
    assert.equal(links.length, 3, "Should return all links with href when no filter");
    assert.equal(links[0].attributes.href, "/css/app.css");
    assert.equal(links[1].attributes.href, "/favicon.ico");
    assert.equal(links[2].attributes.href, "https://fonts.googleapis.com");
});

test("extractLinkTag - backward compatibility alias works", () => {
    const html = `
        <head>
            <link href="/global.css" rel="stylesheet">
        </head>
    `;

    const link = extractLinkTag(html);
    assert.ok(link);
    assert.equal(link.attributes.href, "/global.css");
});

test("extractLinkTag - returns undefined when no matches and returnFirst is true", () => {
    const html = `
        <head>
            <link href="/css/app.css" rel="stylesheet">
            <link href="/css/vendor.css" rel="stylesheet">
        </head>
    `;

    const link = extractLinkTag(html, { filter: "nonexistent" });
    assert.equal(link, undefined);
});

test("extractLinkTag - returns empty array when no matches and returnFirst is false", () => {
    const html = `
        <head>
            <link href="/css/app.css" rel="stylesheet">
            <link href="/css/vendor.css" rel="stylesheet">
        </head>
    `;

    const links = extractLinkTag(html, { filter: "nonexistent", returnFirst: false });
    assert.deepEqual(links, []);
});
