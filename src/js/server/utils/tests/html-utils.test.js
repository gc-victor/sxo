import { strict as assert } from "node:assert";
import { test } from "node:test";
import { DIV_APP_REGEX, renderErrorHtml } from "../index.js";

// Tests for HTML utility helpers split out from original aggregated utils test.
// Focus: DIV_APP_REGEX, renderErrorHtml, injectPageContent (and new alias injectPageContent)

test('DIV_APP_REGEX matches <div id="page"> with simple content', () => {
    const html = `<html><body><div id="page">Hello</div></body></html>`;
    const match = html.match(DIV_APP_REGEX);
    assert.ok(match, "Expected a match for #page container");
    assert.equal(match[0], `<div id="page">Hello</div>`);
});

test("DIV_APP_REGEX matches with additional attributes and multiline content (single quotes)", () => {
    const html = `<div id='page' class="main">\n  World\n</div>`;
    const match = html.match(DIV_APP_REGEX);
    assert.ok(match, "Expected a match for multiline #page container");
    assert.ok(match[0].includes("World"), "Multiline content should be captured");
    assert.ok(/class="main"/.test(match[0]), "Attributes should be retained");
});

test("DIV_APP_REGEX does not over-match nested following divs", () => {
    const html = `<div id="page"><p>Inner</p></div><div id="other">X</div>`;
    const match = html.match(DIV_APP_REGEX);
    assert.ok(match);
    assert.equal(match[0], `<div id="page"><p>Inner</p></div>`, "Match should stop at the first closing div for #page container");
});

test("renderErrorHtml returns styled error HTML with escaping", () => {
    const msg = "Something went wrong";
    const html = renderErrorHtml(msg);
    assert.equal(html, `<body><div id="page"><pre style="padding:32px;color:red;">✘ [ERROR]: Something went wrong</pre></div>`);
});

test("renderErrorHtml escapes embedded <script> tags to prevent injection", () => {
    const msg = 'Bad <script>alert("x")</script> here';
    const out = renderErrorHtml(msg);
    assert.ok(out.includes("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"), "Script tag must be escaped");
    assert.ok(!out.includes('<script>alert("x")</script>'), "Raw script tag must not appear");
});

test("renderErrorHtml handles non-string input (object)", () => {
    const out = renderErrorHtml({ foo: "bar" });
    assert.ok(out.includes("✘ [ERROR]: [object Object]"), "Object coerced via String()");
});

test("renderErrorHtml handles undefined input", () => {
    const out = renderErrorHtml(undefined);
    assert.ok(out.includes("✘ [ERROR]: "), "Base prefix retained");
});

// XSS Prevention Tests (Parent Task 3: Security Review)

test("renderErrorHtml escapes HTML event handlers to prevent XSS", () => {
    const msg = '<img src=x onerror="alert(1)">';
    const out = renderErrorHtml(msg);
    assert.ok(out.includes("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"), "Event handlers must be escaped");
    assert.ok(!out.includes('onerror="alert'), "Raw event handler must not appear");
});

test("renderErrorHtml escapes javascript: protocol URLs", () => {
    const msg = '<a href="javascript:alert(1)">Click</a>';
    const out = renderErrorHtml(msg);
    assert.ok(out.includes("&lt;a href=&quot;javascript:alert(1)&quot;&gt;"), "JavaScript URL must be escaped");
    assert.ok(!out.includes('href="javascript:'), "Raw javascript: protocol must not appear");
});

test("renderErrorHtml escapes data: protocol with base64 script", () => {
    const msg = '<iframe src="data:text/html,<script>alert(1)</script>"></iframe>';
    const out = renderErrorHtml(msg);
    assert.ok(out.includes("&lt;iframe"), "iframe tag must be escaped");
    assert.ok(out.includes("&lt;script&gt;"), "Embedded script in data URL must be escaped");
    assert.ok(!out.includes("<iframe"), "Raw iframe tag must not appear");
});

test("renderErrorHtml escapes all five critical HTML characters", () => {
    const msg = `& < > " '`;
    const out = renderErrorHtml(msg);
    assert.ok(out.includes("&amp;"), "Ampersand must be escaped");
    assert.ok(out.includes("&lt;"), "Less-than must be escaped");
    assert.ok(out.includes("&gt;"), "Greater-than must be escaped");
    assert.ok(out.includes("&quot;"), "Double quote must be escaped");
    assert.ok(out.includes("&#39;"), "Single quote must be escaped");
});

test("renderErrorHtml escapes style tags with CSS injection", () => {
    const msg = '<style>body{background:url("javascript:alert(1)")}</style>';
    const out = renderErrorHtml(msg);
    assert.ok(out.includes("&lt;style&gt;"), "Style tag must be escaped");
    assert.ok(!out.includes("<style>"), "Raw style tag must not appear");
});

test("renderErrorHtml escapes SVG with embedded script", () => {
    const msg = "<svg><script>alert(1)</script></svg>";
    const out = renderErrorHtml(msg);
    assert.ok(out.includes("&lt;svg&gt;"), "SVG tag must be escaped");
    assert.ok(out.includes("&lt;script&gt;"), "Embedded script must be escaped");
    assert.ok(!out.includes("<svg>"), "Raw SVG tag must not appear");
});

test("renderErrorHtml handles null input safely", () => {
    const out = renderErrorHtml(null);
    assert.ok(out.includes("✘ [ERROR]: "), "Null should render empty string after prefix");
    assert.equal(out, `<body><div id="page"><pre style="padding:32px;color:red;">✘ [ERROR]: </pre></div>`);
});
