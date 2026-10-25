import { strict as assert } from "node:assert";
import { test } from "node:test";
import { renderErrorHtml } from "../html-utils.js";

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

test("renderErrorHtml includes standard causes in order", () => {
    const root = new Error("root");
    const outer = new Error("outer", { cause: root });

    assert.ok(renderErrorHtml(outer).includes("Error: outer\n\nCaused by: Error: root"));
});

test("renderErrorHtml includes aggregate errors and their cause", () => {
    const aggregate = new AggregateError([new Error("first"), "second"], "aggregate", { cause: new Error("root") });
    const outer = new Error("outer", { cause: aggregate });

    assert.ok(
        renderErrorHtml(outer).includes(
            "Error: outer\n\nAggregateError with 2 error(s):\n  [0]: Error: first\n  [1]: second\n\nCaused by: Error: root",
        ),
    );
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
