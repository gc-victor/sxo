import { ok, strictEqual } from "node:assert";
import { test } from "node:test";
import { applyHead } from "../index.js";

// AIDEV-NOTE: Tests for applyHead split out from original aggregated utils test and expanded.

/**
 * Helper: base HTML template used across tests.
 */
const BASE_HTML = `<!doctype html><html><head><meta charset="utf-8"></head><body><div id="page"></div></body></html>`;

test("applyHead injects title, meta, link, script, style", () => {
    const head = {
        title: "Hello",
        meta: { name: "description", content: "Site Desc" },
        link: [{ rel: "canonical", href: "https://example.com/" }],
        script: [{ content: "console.log('x')" }],
        style: [{ content: "body{color:#000;}" }],
    };
    const out = applyHead(BASE_HTML, head);
    strictEqual(out.includes("<!-- sxo-head-start -->"), true);
    strictEqual(out.includes("<title>Hello</title>"), true);
    strictEqual(out.includes('<meta name="description" content="Site Desc">'), true);
    strictEqual(out.includes('<link rel="canonical" href="https://example.com/">'), true);
    strictEqual(out.includes("<script>console.log(&#39;x&#39;)</script>"), true);
    strictEqual(out.includes("<style>body{color:#000;}</style>"), true);
});

test("applyHead supports dynamic head function with params (title function inside head object)", () => {
    const html = `<!doctype html><html><head></head><body><div id="page"></div></body></html>`;
    const headFn = () => ({ title: (p) => `Post ${p.slug}` });
    const out = applyHead(html, headFn, { slug: "abc" });
    strictEqual(out.includes("<title>Post abc</title>"), true);
});

test("applyHead escapes dangerous characters in title", () => {
    const html = `<!doctype html><html><head></head><body><div id="page"></div></body></html>`;
    const head = { title: 'Attack <script>alert("x")</script>' };
    const out = applyHead(html, head);
    strictEqual(out.includes("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"), true);
    strictEqual(out.includes('<script>alert("x")</script>'), false, "Raw script tag must not appear");
});

test("applyHead is idempotent and replaces previous block", () => {
    const first = applyHead(BASE_HTML, { title: "One" });
    const second = applyHead(first, { title: "Two" });
    strictEqual(second.includes("<title>Two</title>"), true);
    strictEqual(second.includes("<title>One</title>"), false);
    const count = (second.match(/sxo-head-start/g) || []).length;
    strictEqual(count, 1);
});

test("applyHead with empty object removes prior block and injects nothing new", () => {
    const withHead = applyHead(BASE_HTML, { title: "Keep" });
    const cleaned = applyHead(withHead, {}); // empty object => no managed lines
    strictEqual(cleaned.includes("<!-- sxo-head-start -->"), false);
    strictEqual(cleaned.includes("<title>Keep</title>"), false);
});

test("applyHead returns original (minus old block) if head export throws", () => {
    const throwing = () => {
        throw new Error("boom");
    };
    const withHead = applyHead(BASE_HTML, { title: "First" });
    const again = applyHead(withHead, throwing);
    // Old block removed
    strictEqual(again.includes("<title>First</title>"), false);
    // No new block inserted
    strictEqual(again.includes("sxo-head-start"), false);
});

test("applyHead ignores non-object head export return value", () => {
    const badFn = () => 123;
    const out = applyHead(BASE_HTML, badFn);
    strictEqual(out.includes("sxo-head-start"), false);
});

test("applyHead handles boolean attributes and excludes falsey", () => {
    const head = {
        script: [{ src: "/app.js", defer: true, async: false }, { content: "console.log('inline')" }],
    };
    const out = applyHead(BASE_HTML, head);
    const scriptTag = out.split("\n").find((l) => /<script src="\/app.js"/.test(l));
    ok(scriptTag, "Script with src should be rendered");
    ok(/ defer\b/.test(scriptTag), "Boolean true attribute should appear without value");
    strictEqual(/ async\b/.test(scriptTag), false, "Boolean false attribute should not appear");
    ok(out.includes("<script>console.log(&#39;inline&#39;)</script>"), "Inline script content escaped");
});

test("applyHead meta tag retains content attribute (void tag semantics)", () => {
    const head = {
        meta: [
            { name: "description", content: "Desc" },
            { httpEquiv: "content-security-policy", content: "default-src 'self'" },
        ],
    };
    const out = applyHead(BASE_HTML, head);
    ok(out.includes('<meta name="description" content="Desc">'), "Meta description rendered with content attribute");
    ok(
        out.includes('<meta http-equiv="content-security-policy" content="default-src &#39;self&#39;">'),
        "httpEquiv converted and value escaped",
    );
});

test("applyHead forces closing tags for script/style even if empty", () => {
    const head = {
        script: [{}],
        style: [{}],
    };
    const out = applyHead(BASE_HTML, head);
    ok(out.includes("<script></script>"), "Empty script gets explicit closing tag");
    ok(out.includes("<style></style>"), "Empty style gets explicit closing tag");
});

test("applyHead supports multiple entries and preserves order", () => {
    const head = {
        link: [
            { rel: "preconnect", href: "https://one.example" },
            { rel: "preconnect", href: "https://two.example" },
        ],
    };
    const out = applyHead(BASE_HTML, head);
    const sequence = out.match(/<link[^>]+preconnect[^>]+>/g) || [];
    strictEqual(sequence.length, 2);
    ok(sequence[0].includes("one.example"));
    ok(sequence[1].includes("two.example"));
});

test("applyHead allows title function directly (convenience) not wrapped in head function", () => {
    // Provided head object with title function
    const head = {
        title: (p) => `Hello ${p.name}`,
    };
    const out = applyHead(BASE_HTML, head, { name: "World" });
    ok(out.includes("<title>Hello World</title>"));
});

test("applyHead skips non-array/object primitive properties other than title", () => {
    const head = {
        title: "Good",
        foo: "bar", // should be ignored
    };
    const out = applyHead(BASE_HTML, head);
    ok(out.includes("<title>Good</title>"));
    strictEqual(/foo/.test(out), false);
});

test("applyHead handles numeric title values", () => {
    const head = {
        title: 123,
    };
    const out = applyHead(BASE_HTML, head);
    ok(out.includes("<title>123</title>"));
});

test("applyHead escapes single quotes in inline script/style content", () => {
    const head = {
        script: [{ content: "console.log('a<b>');" }],
        style: [{ content: "body:after{content:'\"<x\"'}" }],
    };
    const out = applyHead(BASE_HTML, head);
    ok(out.includes("console.log(&#39;a&lt;b&gt;&#39;);"), "Script content escaped");
    ok(out.includes("body:after{content:&#39;&quot;&lt;x&quot;&#39;}"), "Style content escaped");
});

test("applyHead falls back to appending block if no </head> present", () => {
    const html = '<html><body><div id="page"></div></body></html>';
    const out = applyHead(html, { title: "X" });
    ok(out.endsWith("<!-- sxo-head-end -->\n"), "Managed block appended at end");
    ok(out.includes("<title>X</title>"));
});
