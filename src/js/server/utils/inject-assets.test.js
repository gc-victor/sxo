import assert from "node:assert/strict";
import { test } from "node:test";
import { injectCss, injectJs } from "./inject-assets.js";

const htmlWithHead = `<!DOCTYPE html>
<html>
<head>
  <title>Test</title>
</head>
<body>
  <div>Content</div>
</body>
</html>`;

const htmlWithBody = `<!DOCTYPE html>
<html>
<head>
  <title>Test</title>
</head>
<body>
  <div>Content</div>
</body>
</html>`;

const htmlNoHead = `<div>Content</div>`;
const htmlNoBody = `<div>Content</div>`;

test("injectTags - empty asset array (no injection)", () => {
    const result = injectCss(htmlWithHead, [], "/");
    assert.strictEqual(result, htmlWithHead, "Should return unchanged HTML");
});

test("injectTags - deduplication (Set behavior)", () => {
    const css = ["style.css", "style.css", "other.css", "style.css"];
    const result = injectCss(htmlWithHead, css, "/");
    const styleCount = (result.match(/<link rel="stylesheet"/g) || []).length;
    assert.strictEqual(styleCount, 2, "Should inject each unique asset once only");
});

test("injectTags - asset validation (skips invalid strings)", () => {
    const css = ["", null, undefined, "valid.css", "another-valid.css"];
    const result = injectCss(htmlWithHead, /** @type {string[]} */ (css), "/");
    const styleCount = (result.match(/<link rel="stylesheet"/g) || []).length;
    assert.strictEqual(styleCount, 2, "Should skip invalid assets (empty, null, undefined), inject only valid ones");
});

test("injectTags - marker injection (head vs body)", () => {
    const htmlResult = injectCss(htmlWithHead, ["style.css"], "/");
    assert.ok(htmlResult.includes("</head>"), "Should preserve </head> tag");
    assert.ok(htmlResult.includes('<link rel="stylesheet" href="/style.css">'), "Should inject CSS before </head>");

    const bodyResult = injectJs(htmlWithBody, ["script.js"], "/");
    assert.ok(bodyResult.includes("</body>"), "Should preserve </body> tag");
    assert.ok(bodyResult.includes('<script type="module" src="/script.js"></script>'), "Should inject JS before </body>");
});

test("injectTags - public path normalization", () => {
    const resultEmpty = injectCss(htmlWithHead, ["style.css"], "");
    assert.ok(resultEmpty.includes('<link rel="stylesheet" href="style.css">'), "Should handle empty publicPath");

    const resultSlash = injectCss(htmlWithHead, ["style.css"], "/");
    assert.ok(resultSlash.includes('<link rel="stylesheet" href="/style.css">'), "Should include leading slash");

    const resultCustom = injectCss(htmlWithHead, ["style.css"], "/app/");
    assert.ok(resultCustom.includes('<link rel="stylesheet" href="/app/style.css">'), "Should include custom prefix");
});

test("injectTags - fallback behavior (no marker in HTML)", () => {
    // CSS: prepend to document when no </head> found
    const cssResult = injectCss(htmlNoHead, ["style.css"], "/");
    assert.ok(cssResult.includes('<link rel="stylesheet" href="/style.css">'), "Should inject CSS tags");
    assert.ok(cssResult.indexOf("<link") < cssResult.indexOf("<div>"), "Should prepend CSS tags before original content");

    // JS: append to document when no </body> found
    const jsResult = injectJs(htmlNoBody, ["script.js"], "/");
    assert.ok(jsResult.includes('<script type="module" src="/script.js"></script>'), "Should inject JS tags");
    assert.ok(jsResult.indexOf("<script") > jsResult.indexOf("<div>"), "Should append JS tags after original content");
});

test("injectTags - multiple assets maintain order", () => {
    const css = ["first.css", "second.css", "third.css"];
    const result = injectCss(htmlWithHead, css, "/");
    const firstIndex = result.indexOf('href="/first.css"');
    const secondIndex = result.indexOf('href="/second.css"');
    const thirdIndex = result.indexOf('href="/third.css"');
    assert.ok(firstIndex < secondIndex, "Should maintain first asset order");
    assert.ok(secondIndex < thirdIndex, "Should maintain second asset order");
});

test("injectTags - HTML escaping", () => {
    const css = ["style&test.css", 'script"with"quotes.js'];
    const resultCss = injectCss(htmlWithHead, css, "/");
    // Should escape HTML special characters in href attributes
    assert.ok(resultCss.includes('href="/style&amp;test.css"'), "Should escape & in CSS paths");
    assert.ok(resultCss.includes('href="/script&quot;with&quot;quotes.js"'), "Should escape quotes in JS paths");
});

test("injectJs - injects before </body> tag", () => {
    const result = injectJs(htmlWithBody, ["app.js", "utils.js"], "/");
    assert.ok(result.includes('<script type="module" src="/app.js"></script>'), "Should inject app.js");
    assert.ok(result.includes('<script type="module" src="/utils.js"></script>'), "Should inject utils.js");
    assert.ok(result.includes("</body>"), "Should preserve </body> tag");
    const scriptsBeforeBody = result.indexOf("</body>");
    const lastScript = result.lastIndexOf("<script");
    assert.ok(lastScript < scriptsBeforeBody, "Should inject all scripts before </body>");
});

test("injectCss - injects before </head> tag", () => {
    const result = injectCss(htmlWithHead, ["global.css", "theme.css"], "/");
    assert.ok(result.includes('<link rel="stylesheet" href="/global.css">'), "Should inject global.css");
    assert.ok(result.includes('<link rel="stylesheet" href="/theme.css">'), "Should inject theme.css");
    assert.ok(result.includes("</head>"), "Should preserve </head> tag");
    const linksBeforeHead = result.indexOf("</head>");
    const lastLink = result.lastIndexOf("<link");
    assert.ok(lastLink < linksBeforeHead, "Should inject all links before </head>");
});
