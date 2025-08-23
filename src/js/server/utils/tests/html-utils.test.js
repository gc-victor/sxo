import { strict as assert } from "node:assert";
import { test } from "node:test";
import { DIV_APP_REGEX, injectPageContent, renderErrorHtml } from "../index.js";

// AIDEV-NOTE: Tests for HTML utility helpers split out from original aggregated utils test.
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
    assert.equal(html, `<div id="page"><pre style="color:red;">Error: Something went wrong</pre></div>`);
});

test("renderErrorHtml escapes embedded <script> tags to prevent injection", () => {
    const msg = 'Bad <script>alert("x")</script> here';
    const out = renderErrorHtml(msg);
    assert.ok(out.includes("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"), "Script tag must be escaped");
    assert.ok(!out.includes('<script>alert("x")</script>'), "Raw script tag must not appear");
});

test("injectPageContent replaces existing #page container content", () => {
    const template = `<html><body><div id="page">Old</div></body></html>`;
    const result = injectPageContent(template, `<p>New</p>`);
    assert.ok(result.includes(`<div id="page"><p>New</p></div>`), "Should replace previous content");
    assert.ok(!result.includes(">Old<"), "Old content should be gone");
});

test("injectPageContent leaves other parts of the document intact", () => {
    const template = `<!doctype html><html><head><title>X</title></head><body><div id="page">Y</div><footer>Z</footer></body></html>`;
    const result = injectPageContent(template, "NEW");
    assert.ok(result.startsWith("<!doctype html>"), "Doctype should remain");
    assert.ok(result.includes("<title>X</title>"), "Head/title should remain");
    assert.ok(result.includes("<footer>Z</footer>"), "Footer should remain");
});

test("injectPageContent treats non-string content by coercing to string", () => {
    const template = `<div id="page">X</div>`;
    const result = injectPageContent(template, 123);
    assert.ok(result.includes('<div id="page">123</div>'));
});

test("injectPageContent returns empty string when html is not a string", () => {
    const out = injectPageContent(null, "X");
    assert.equal(out, "", "Non-string template should yield empty string");
});

test("injectPageContent allows raw HTML (no escaping performed)", () => {
    // The function deliberately does not sanitize; SSR caller is responsible.
    const template = `<div id="page">safe</div>`;
    const raw = `<span onclick="evil()">Hi & <b>there</b></span>`;
    const result = injectPageContent(template, raw);
    assert.ok(result.includes(raw), "Raw HTML should be inserted as-is");
});

test("injectPageContent correctly replaces very large inner content", () => {
    const large = "x".repeat(10_000);
    const template = `<div id="page">short</div>`;
    const result = injectPageContent(template, large);
    assert.ok(result.includes(large));
    assert.ok(!result.includes("short"));
});

test("injectPageContent handles multiple candidate divs but only replaces the first with id=page", () => {
    const template = `<div id="page">First</div><div id="page">Second</div>`;
    const result = injectPageContent(template, "New");
    const occurrences = (result.match(/<div id="page">/g) || []).length;
    assert.equal(occurrences, 2, "Both divs still present");
    assert.ok(result.startsWith(`<div id="page">New</`), "First occurrence replaced");
});

test("renderErrorHtml handles non-string input (object)", () => {
    const out = renderErrorHtml({ foo: "bar" });
    assert.ok(out.includes("Error: [object Object]"), "Object coerced via String()");
});

test("renderErrorHtml handles undefined input", () => {
    const out = renderErrorHtml(undefined);
    assert.ok(out.includes("Error: "), "Base prefix retained");
});
