import { strict as assert } from "node:assert";
import test from "node:test";
import { injectAssets } from "../inject-assets.js";

// Helper to build a basic HTML document
function htmlDoc({ head = '<meta charset="utf-8">', body = "<div>content</div>" } = {}) {
    return ["<!doctype html>", "<html>", "<head>", `  ${head}`, "</head>", "<body>", `  ${body}`, "</body>", "</html>", ""].join("\n");
}

test("inject-assets: injects CSS <link> before </head> and JS <script type=\"module\"> before </body> with PUBLIC_PATH='/'", () => {
    const base = htmlDoc({ head: '<meta name="viewport" content="width=device-width, initial-scale=1">' });

    const assets = {
        css: ["global.A1.css", "route/index.B2.css"],
        js: ["route/index.B2.js"],
    };

    // In runtime, PUBLIC_PATH="/" should prefix with a leading slash and ensure single trailing slash semantics.
    const output = injectAssets(base, assets, "/");

    // CSS links inserted before </head>
    assert.match(output, /<link rel="stylesheet" href="\/global\.A1\.css">/);
    assert.match(output, /<link rel="stylesheet" href="\/route\/index\.B2\.css">/);

    // JS script inserted before </body>
    assert.match(output, /<script type="module" src="\/route\/index\.B2\.js"><\/script>/);

    // Ensure order: both CSS before </head>, script before </body>
    const idxHeadClose = output.indexOf("</head>");
    const idxCss1 = output.indexOf('<link rel="stylesheet" href="/global.A1.css">');
    const idxCss2 = output.indexOf('<link rel="stylesheet" href="/route/index.B2.css">');
    const idxScript = output.indexOf('<script type="module" src="/route/index.B2.js"></script>');
    const idxBodyClose = output.lastIndexOf("</body>");

    assert.ok(idxCss1 > -1 && idxCss1 < idxHeadClose, "global css should be before </head>");
    assert.ok(idxCss2 > -1 && idxCss2 < idxHeadClose, "route css should be before </head>");
    assert.ok(idxScript > -1 && idxScript < idxBodyClose, "route script should be before </body>");
});

test("inject-assets: preserves empty PUBLIC_PATH '' (no leading slash)", () => {
    const base = htmlDoc();

    const assets = {
        css: ["styles.X1.css"],
        js: ["entry.X1.js"],
    };

    const output = injectAssets(base, assets, "");

    // No leading slash when PUBLIC_PATH is empty string
    assert.match(output, /<link rel="stylesheet" href="styles\.X1\.css">/);
    assert.match(output, /<script type="module" src="entry\.X1\.js"><\/script>/);
});

test("inject-assets: escapes special characters in CSS href to prevent XSS", () => {
    const base = htmlDoc();

    // Test characters that need escaping in attribute contexts
    const assets = {
        css: ['style".css', "style<.css", "style>.css", "style&.css"],
        js: [],
    };

    const output = injectAssets(base, assets, "/");

    // Verify that special characters are properly escaped (note the leading "/" from PUBLIC_PATH)
    assert.match(output, /href="\/style&quot;\.css"/); // " should be escaped to &quot;
    assert.match(output, /href="\/style&lt;\.css"/); // < should be escaped to &lt;
    assert.match(output, /href="\/style&gt;\.css"/); // > should be escaped to &gt;
    assert.match(output, /href="\/style&amp;\.css"/); // & should be escaped to &amp;
});

test("inject-assets: escapes special characters in JS src to prevent XSS", () => {
    const base = htmlDoc();

    // Test characters that need escaping in attribute contexts
    const assets = {
        css: [],
        js: ['script".js', "script<.js", "script>.js", "script&.js"],
    };

    const output = injectAssets(base, assets, "/");

    // Verify that special characters are properly escaped (note the leading "/" from PUBLIC_PATH)
    assert.match(output, /src="\/script&quot;\.js"/); // " should be escaped to &quot;
    assert.match(output, /src="\/script&lt;\.js"/); // < should be escaped to &lt;
    assert.match(output, /src="\/script&gt;\.js"/); // > should be escaped to &gt;
    assert.match(output, /src="\/script&amp;\.js"/); // & should be escaped to &amp;
});

test("inject-assets: prevents XSS injection through malicious asset paths", () => {
    const base = htmlDoc();

    // Test malicious-looking asset paths that could lead to XSS if not escaped
    const maliciousCss = ['foo" onload="alert(1)', "bar<script>alert(2)</script>"];
    const maliciousJs = ['test" onerror="alert(3)', "data:<svg onload=alert(4)>"];

    const assets = {
        css: maliciousCss,
        js: maliciousJs,
    };

    const output = injectAssets(base, assets, "/");

    // The dangerous attributes should NOT appear as actual HTML attributes (unescaped)
    // We check that onload= is not followed by an unescaped quote (indicating a real attribute)
    assert.ok(!output.match(/onload="([^"]|&quot;)*"/), "Should not have unescaped onload attribute");
    assert.ok(!output.match(/onerror="([^"]|&quot;)*"/), "Should not have unescaped onerror attribute");
    assert.ok(!output.match(/<script[^>]*>alert\(/), "Should not have unescaped script tags");

    // Verify the quotes are properly escaped so the attribute values remain intact
    assert.match(output, /href="\/foo&quot; onload=&quot;alert\(1\)"/); // Malicious path should be escaped
    assert.match(output, /src="\/test&quot; onerror=&quot;alert\(3\)"/); // Malicious path should be escaped
});

test("inject-assets: escapes quotes in asset paths with empty PUBLIC_PATH", () => {
    const base = htmlDoc();

    const assets = {
        css: ['test".css'],
        js: ['demo".js'],
    };

    const output = injectAssets(base, assets, "");

    // Even with empty PUBLIC_PATH, quotes should be escaped
    assert.match(output, /href="test&quot;\.css"/);
    assert.match(output, /src="demo&quot;\.js"/);
});

test("inject-assets: escapes malicious publicPath containing ><script>alert(1)</script>", () => {
    const base = htmlDoc();

    const assets = {
        css: ["style.css"],
        js: ["script.js"],
    };

    // Malicious publicPath attempting to inject script tags
    const maliciousPublicPath = '"><script>alert(1)</script>';
    const output = injectAssets(base, assets, maliciousPublicPath);

    // The malicious sequence should be escaped, preventing script execution
    // Note: publicPath is normalized to include a trailing slash
    assert.match(output, /href="&quot;&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt;style\.css"/);
    assert.match(output, /src="&quot;&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt;script\.js"/);

    // Verify that actual <script> tags are NOT injected (only escaped text)
    assert.ok(!output.match(/<script>alert\(1\)<\/script>/), "Should not have unescaped script tag from malicious publicPath");
});

test("inject-assets: escapes malicious filenames containing ><script>alert(1)</script>", () => {
    const base = htmlDoc();

    // Malicious filenames attempting to inject script tags
    const assets = {
        css: ['"><script>alert(1)</script>.css'],
        js: ['"><script>alert(2)</script>.js'],
    };

    const output = injectAssets(base, assets, "/");

    // The malicious sequence in filenames should be escaped
    assert.match(output, /href="\/&quot;&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt;\.css"/);
    assert.match(output, /src="\/&quot;&gt;&lt;script&gt;alert\(2\)&lt;\/script&gt;\.js"/);

    // Verify that actual <script> tags are NOT injected (only escaped text)
    assert.ok(!output.match(/<script>alert\(1\)<\/script>/), "Should not have unescaped script tag from malicious CSS filename");
    assert.ok(!output.match(/<script>alert\(2\)<\/script>/), "Should not have unescaped script tag from malicious JS filename");
});

test("inject-assets: escapes quotes and angle brackets as &quot;, &lt;, &gt; in href/src values", () => {
    const base = htmlDoc();

    const assets = {
        css: ['test".css', "test<.css", "test>.css", "test&.css"],
        js: ['demo".js', "demo<.js", "demo>.js", "demo&.js"],
    };

    const output = injectAssets(base, assets, "/");

    // Verify exact escape sequences for quotes and angle brackets in href attributes
    assert.match(output, /href="\/test&quot;\.css"/, 'CSS href should escape " to &quot;');
    assert.match(output, /href="\/test&lt;\.css"/, "CSS href should escape < to &lt;");
    assert.match(output, /href="\/test&gt;\.css"/, "CSS href should escape > to &gt;");
    assert.match(output, /href="\/test&amp;\.css"/, "CSS href should escape & to &amp;");

    // Verify exact escape sequences for quotes and angle brackets in src attributes
    assert.match(output, /src="\/demo&quot;\.js"/, 'JS src should escape " to &quot;');
    assert.match(output, /src="\/demo&lt;\.js"/, "JS src should escape < to &lt;");
    assert.match(output, /src="\/demo&gt;\.js"/, "JS src should escape > to &gt;");
    assert.match(output, /src="\/demo&amp;\.js"/, "JS src should escape & to &amp;");
});

test("inject-assets: HTML with no </head> tag - prepends CSS and still injects JS before </body>", () => {
    // Malformed HTML: missing closing head tag
    const malformedHtml = [
        "<!doctype html>",
        "<html>",
        "<head>",
        '<meta charset="utf-8">',
        "<body>",
        "  <div>content</div>",
        "</body>",
        "</html>",
    ].join("\n");

    const assets = {
        css: ["global.A1.css"],
        js: ["route/index.B2.js"],
    };

    const output = injectAssets(malformedHtml, assets, "/");

    // CSS should be prepended to document (fallback behavior when no </head> found)
    // The implementation uses `${cssTags.join("\n")}\n${html}` which prepends CSS with leading spaces
    assert.match(output, /<link rel="stylesheet" href="\/global\.A1\.css">/, "CSS should be present when no </head> tag");
    const idxDoctype = output.indexOf("<!doctype");
    const idxCss = output.indexOf('<link rel="stylesheet" href="/global.A1.css">');
    assert.ok(idxCss > -1 && idxCss < idxDoctype, "CSS should be prepended before <!doctype>");

    // JS should still be injected before </body> since </body> exists
    assert.match(output, /<script type="module" src="\/route\/index\.B2\.js"><\/script>/);
    const idxBodyClose = output.lastIndexOf("</body>");
    const idxScript = output.indexOf('<script type="module" src="/route/index.B2.js"></script>');
    assert.ok(idxScript > -1 && idxScript < idxBodyClose, "JS should be before </body>");
});

test("inject-assets: HTML with no </body> tag - injects CSS before </head> and appends JS", () => {
    // Malformed HTML: missing closing body tag
    const malformedHtml = [
        "<!doctype html>",
        "<html>",
        "<head>",
        '<meta charset="utf-8">',
        "</head>",
        "<body>",
        "  <div>content</div>",
        "</html>",
    ].join("\n");

    const assets = {
        css: ["global.A1.css"],
        js: ["route/index.B2.js"],
    };

    const output = injectAssets(malformedHtml, assets, "/");

    // CSS should be injected before </head>
    assert.match(output, /<link rel="stylesheet" href="\/global\.A1\.css">/);
    const idxHeadClose = output.indexOf("</head>");
    const idxCss = output.indexOf('<link rel="stylesheet" href="/global.A1.css">');
    assert.ok(idxCss > -1 && idxCss < idxHeadClose, "CSS should be before </head>");

    // JS should be appended to document (fallback behavior when no </body> found)
    assert.match(output, /<script type="module" src="\/route\/index\.B2\.js"><\/script>/);
    const idxHtmlClose = output.lastIndexOf("</html>");
    const idxScript = output.indexOf('<script type="module" src="/route/index.B2.js"></script>');
    assert.ok(idxScript > -1 && idxScript > idxHtmlClose, "JS should be appended after </html>");
});

test("inject-assets: HTML with multiple </head> tags - injects before first occurrence", () => {
    // Malformed HTML: multiple closing head tags
    const malformedHtml = [
        "<!doctype html>",
        "<html>",
        "<head>",
        '<meta charset="utf-8">',
        "</head>",
        "<head>",
        "  <!-- duplicate head -->",
        "</head>",
        "<body>",
        "  <div>content</div>",
        "</body>",
        "</html>",
    ].join("\n");

    const assets = {
        css: ["global.A1.css", "styles.B2.css"],
        js: ["route/index.C3.js"],
    };

    const output = injectAssets(malformedHtml, assets, "/");

    // CSS should be injected before the first </head> occurrence
    const idxFirstHeadClose = output.indexOf("</head>");
    const idxCss1 = output.indexOf('<link rel="stylesheet" href="/global.A1.css">');
    const idxCss2 = output.indexOf('<link rel="stylesheet" href="/styles.B2.css">');

    assert.ok(idxCss1 > -1 && idxCss1 < idxFirstHeadClose, "First CSS should be before first </head>");
    assert.ok(idxCss2 > -1 && idxCss2 < idxFirstHeadClose, "Second CSS should be before first </head>");
    assert.ok(idxCss1 < idxCss2, "CSS tags should maintain order");

    // Verify only the first </head> was replaced
    const lines = output.split("\n");
    const headCloseCount = lines.filter((line) => line.trim() === "</head>").length;
    assert.equal(headCloseCount, 2, "Should still have 2 </head> tags in output");
});

test("inject-assets: HTML with both </head> and </body> missing - prepends CSS and appends JS", () => {
    // Severely malformed HTML: missing both closing tags
    const malformedHtml = [
        "<!doctype html>",
        "<html>",
        "<head>",
        '<meta charset="utf-8">',
        "<body>",
        "  <div>content</div>",
        "</html>",
    ].join("\n");

    const assets = {
        css: ["global.A1.css"],
        js: ["route/index.B2.js"],
    };

    const output = injectAssets(malformedHtml, assets, "/");

    // CSS should be prepended
    const idxDoctype = output.indexOf("<!doctype");
    const idxCss = output.indexOf('<link rel="stylesheet" href="/global.A1.css">');
    assert.ok(idxCss > -1 && idxCss < idxDoctype, "CSS should be prepended before <!doctype>");

    // JS should be appended
    assert.match(output, /<script type="module" src="\/route\/index\.B2\.js"><\/script>/);
    const idxHtmlClose = output.lastIndexOf("</html>");
    const idxScript = output.indexOf('<script type="module" src="/route/index.B2.js"></script>');
    assert.ok(idxScript > -1 && idxScript > idxHtmlClose, "JS should be appended after </html>");
});
