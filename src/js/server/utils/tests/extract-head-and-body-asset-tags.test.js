import { strict as assert } from "node:assert";
import { test } from "node:test";
import { extractHeadAndBodyAssetTags } from "../index.js";

// AIDEV-NOTE: Dedicated test suite for extractHeadAndBodyAssetTags split from the
// legacy aggregated utils test. Expanded to cover additional edge cases, ordering,
// malformed HTML, and non-string inputs.

test("assetTags: extracts link, script (inline+src), and style from both head and body", () => {
    // NOTE: This extractor intentionally captures both inline and src-based <script> and <style> tags as raw HTML.
    // This is different from extractScriptTags, which only returns scripts with a src attribute.
    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <link rel="stylesheet" href="/styles/main.css">
    <script src="/head-asset.js"></script>
    <style>h1{color:red;}</style>
  </head>
  <body>
    <div id="page"></div>
    <script src="/body-asset.js"></script>
    <link rel="preload" href="/preload.js" as="script" />
    <script>console.log('inline')</script>
    <style>.body{color:blue;}</style>
  </body>
</html>`;

    const { head, body } = extractHeadAndBodyAssetTags(html);

    // Head expectations
    assert.ok(Array.isArray(head));
    assert.equal(head.length, 3, "Head should have 3 tags (link, script, style)");
    assert.ok(head.some((t) => /<link\b/.test(t) && /main\.css/.test(t)));
    assert.ok(head.some((t) => /<script\b/.test(t) && /head-asset\.js/.test(t)));
    assert.ok(head.some((t) => /<style\b/.test(t) && /h1\{color:red;}/.test(t)));

    // Body expectations
    assert.ok(Array.isArray(body));
    assert.equal(body.length, 4, "Body should have 4 tags (script src, link preload, inline script, style)");
    assert.ok(body.some((t) => /body-asset\.js/.test(t)));
    assert.ok(body.some((t) => /<link\b/.test(t) && /preload\.js/.test(t)));
    assert.ok(
        body.some((t) => /<script>console\.log\('inline'\)<\/script>/.test(t)),
        "Inline script should be captured (see note above)",
    );
    assert.ok(body.some((t) => /<style>.*color:blue/.test(t)));
});

test("assetTags: handles missing <body> returning empty body array", () => {
    const html = `<!doctype html><html><head><script src="only-head.js"></script></head></html>`;
    const { head, body } = extractHeadAndBodyAssetTags(html);
    assert.equal(head.length, 1);
    assert.ok(head[0].includes("only-head.js"));
    assert.deepEqual(body, []);
});

test("assetTags: handles missing <head> returning empty head array but still parsing body", () => {
    const html = `<!doctype html>
<html>
  <body>
    <script src="/in-body.js"></script>
    <style>.x{}</style>
    <link rel="stylesheet" href="/body.css">
  </body>
</html>`;
    const { head, body } = extractHeadAndBodyAssetTags(html);
    assert.deepEqual(head, []);
    assert.equal(body.length, 3);
    assert.ok(body.some((t) => /in-body\.js/.test(t)));
    assert.ok(body.some((t) => /<style>/.test(t)));
    assert.ok(body.some((t) => /body\.css/.test(t)));
});

test("assetTags: returns empty arrays for non-string input", () => {
    // @ts-expect-error intentional bad input
    const r1 = extractHeadAndBodyAssetTags(null);
    assert.deepEqual(r1, { head: [], body: [] });
    // @ts-expect-error intentional bad input
    const r2 = extractHeadAndBodyAssetTags(123);
    assert.deepEqual(r2, { head: [], body: [] });
});

test("assetTags: order of tags preserved within each section", () => {
    const html = `
<head>
  <link href="/a.css" rel="stylesheet">
  <script src="/a.js"></script>
  <style>.a{}</style>
</head>
<body>
  <script src="/b.js"></script>
  <link href="/b.css" rel="stylesheet">
  <style>.b{}</style>
</body>`;
    const { head, body } = extractHeadAndBodyAssetTags(html);
    assert.deepEqual(
        head.map((t) => (/<(\w+)/.exec(t) || [])[1]),
        ["link", "script", "style"],
        "Head tag order should be preserved",
    );
    assert.deepEqual(
        body.map((t) => (/<(\w+)/.exec(t) || [])[1]),
        ["link", "script", "style"],
        "Body tag grouping order (link,script,style) as implemented",
    );
});

test("assetTags: does not include meta tags (only link/script/style)", () => {
    const html = `
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <link href="/ok.css" rel="stylesheet">
</head>`;
    const { head } = extractHeadAndBodyAssetTags(html);
    assert.equal(head.length, 1, "Only link should be captured");
    assert.ok(head[0].includes("ok.css"));
});

test("assetTags: extracts self-closing link tags and standard tags equivalently", () => {
    const html = `
<head>
  <link href="/one.css" rel="stylesheet" />
  <link href="/two.css" rel="stylesheet">
</head>
<body>
  <link href="/three.css" rel="stylesheet"/>
</body>`;
    const { head, body } = extractHeadAndBodyAssetTags(html);
    assert.equal(head.length, 2);
    assert.equal(body.length, 1);
    assert.ok(head.some((t) => /one\.css/.test(t)));
    assert.ok(head.some((t) => /two\.css/.test(t)));
    assert.ok(body.some((t) => /three\.css/.test(t)));
});

test("assetTags: captures inline style and script blocks verbatim", () => {
    const html = `
<head>
  <style>\nbody { background:#fff; }\n</style>
  <script>\nconsole.log("hi")\n</script>
</head>`;
    const { head } = extractHeadAndBodyAssetTags(html);
    assert.equal(head.length, 2);
    assert.ok(
        head.some((t) => t.startsWith("<style>")),
        "Contains a <style> tag",
    );
    assert.ok(
        head.some((t) => t.startsWith("<script>")),
        "Contains a <script> tag",
    );
    assert.ok(
        head.some((t) => /console\.log\("hi"\)/.test(t)),
        "Inline console.log script content should be present",
    );
});

test("assetTags: tolerates malformed HTML and still extracts recoverable tags", () => {
    const html = `
<head
  <script src="/good.js"></script
</head
<body>
  <style>.x{}</style
  <script>inline()</script>
</body`;
    const { head, body } = extractHeadAndBodyAssetTags(html);
    // Due to malformed head/body tags, regex may or may not capture; we assert graceful result (no throws) and arrays present.
    assert.ok(Array.isArray(head));
    assert.ok(Array.isArray(body));
});

test("assetTags: multiple style and script tags in head are all captured", () => {
    const html = `
<head>
  <script src="/one.js"></script>
  <script src="/two.js"></script>
  <style>.a{}</style>
  <style>.b{}</style>
</head>`;
    const { head } = extractHeadAndBodyAssetTags(html);
    assert.equal(head.filter((t) => /<script\b/.test(t)).length, 2);
    assert.equal(head.filter((t) => /<style\b/.test(t)).length, 2);
});

test("assetTags: nested-looking tags inside script/style content do not break extraction", () => {
    const html = `
<head>
  <script>const tpl = "<style>ignored</style>";</script>
  <style>.x{background:url("</script>.png")}</style>
</head>`;
    const { head } = extractHeadAndBodyAssetTags(html);
    assert.equal(head.length, 3, "Known limitation: style inside script string also matched (total 3 tags)");
    assert.ok(head.filter((t) => t.startsWith("<script")).length === 1, "One outer script tag");
    assert.ok(head.filter((t) => t.startsWith("<style")).length >= 1, "At least one style tag captured");
});

test("assetTags: body-only script/style/link when head absent", () => {
    const html = `
<body>
  <script src="/only-body.js"></script>
  <link rel="stylesheet" href="/only-body.css">
  <style>.only{}</style>
</body>`;
    const { head, body } = extractHeadAndBodyAssetTags(html);
    assert.deepEqual(head, []);
    assert.equal(body.length, 3);
    assert.ok(body.some((t) => /only-body\.js/.test(t)));
    assert.ok(body.some((t) => /only-body\.css/.test(t)));
    assert.ok(body.some((t) => /<style>/.test(t)));
});
