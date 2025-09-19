import { strict as assert } from "node:assert";
import test from "node:test";
// Intentionally import from the barrel; the utility should be exported from here by implementation.
import { injectAssets } from "../index.js";

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

test("inject-assets: graceful fallback when </head> or </body> is missing", () => {
    const noHead = ["<html>", "<body>", "  <div>ok</div>", "</body>", "</html>", ""].join("\n");
    const noBody = ["<html>", "<head>", "  <title>x</title>", "</head>", "</html>", ""].join("\n");

    const assets = {
        css: ["a.css"],
        js: ["b.js"],
    };

    // Without </head>, links should be prepended (implementation-defined fallback).
    const outNoHead = injectAssets(noHead, assets, "/");
    assert.match(outNoHead, /<link rel="stylesheet" href="\/a\.css">/);
    // Without </body>, scripts should be appended (implementation-defined fallback).
    const outNoBody = injectAssets(noBody, assets, "/");
    assert.match(outNoBody, /<script type="module" src="\/b\.js"><\/script>/);
});
