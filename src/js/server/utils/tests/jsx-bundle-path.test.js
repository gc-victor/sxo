import { strict as assert } from "node:assert";
import path from "node:path";
import { test } from "node:test";
import { OUTPUT_DIR_SERVER, PAGES_DIR, PAGES_RELATIVE_DIR } from "../../../constants.js";
import { jsxBundlePath } from "../index.js";

// AIDEV-NOTE: Tests for jsxBundlePath split out from original aggregated utils test (original-utils.test.js)

/**
 * Helper to build expected path under OUTPUT_DIR_SERVER from a relative
 * pages subpath (already with .js extension).
 * @param {string} relSubPath - e.g. "about/index.js"
 */
function expected(relSubPath) {
    return path.resolve(OUTPUT_DIR_SERVER, relSubPath.replace(/\\/g, "/"));
}

test("jsxBundlePath maps relative JSX page path to dist/server .js bundle path", () => {
    const input = `${PAGES_RELATIVE_DIR}/about/index.jsx`; // typically "src/pages/about/index.jsx"
    const out = jsxBundlePath(input);
    assert.equal(out, expected("about/index.js"));
});

test("jsxBundlePath maps relative TSX page path to dist/server .js bundle path", () => {
    const input = `${PAGES_RELATIVE_DIR}/blog/index.tsx`;
    const out = jsxBundlePath(input);
    assert.equal(out, expected("blog/index.js"));
});

test("jsxBundlePath leaves non-jsx/tsx extension unchanged (no replacement)", () => {
    const input = `${PAGES_RELATIVE_DIR}/data/schema.json`;
    const out = jsxBundlePath(input);
    assert.equal(out, expected("data/schema.json"));
});

test("jsxBundlePath accepts absolute path inside PAGES_DIR", () => {
    const abs = path.resolve(PAGES_DIR, "about/index.jsx");
    const out = jsxBundlePath(abs);
    assert.equal(out, expected("about/index.js"));
});

test("jsxBundlePath throws if path does not start with pagesDir (relative outside)", () => {
    assert.throws(() => jsxBundlePath("otherdir/about/index.jsx"), /JSX path must start with/);
});

test("jsxBundlePath throws if path does not start with pagesDir (absolute outside)", () => {
    const absOutside = path.resolve("otherdir/about/index.jsx");
    assert.throws(() => jsxBundlePath(absOutside), /JSX path must start with/);
});

test("jsxBundlePath throws for non-string argument", () => {
    // @ts-expect-error intentional bad input
    assert.throws(() => jsxBundlePath(123), /must be a string/);
});

test("jsxBundlePath prevents path escape via '..' segments", () => {
    // Attempt to escape by resolving to a parent; passes prefix guard but fails OUTPUT_DIR_SERVER containment
    const tricky = `${PAGES_RELATIVE_DIR}/../outside/index.jsx`;
    assert.throws(() => jsxBundlePath(tricky), /escapes OUTPUT_DIR_SERVER/, "Parent traversal rejected by OUTPUT_DIR_SERVER escape guard");
});

test("jsxBundlePath returns OUTPUT_DIR_SERVER root if given pages root itself (edge case)", () => {
    // Not typical usage, but ensure it does not throw.
    const out = jsxBundlePath(PAGES_RELATIVE_DIR);
    assert.equal(out, path.resolve(OUTPUT_DIR_SERVER), "Pages root maps to server output root");
});

test("jsxBundlePath honors PAGES_DIR env for relative and absolute inputs", () => {
    const previous = process.env.PAGES_DIR;
    try {
        process.env.PAGES_DIR = "custom/pages-env";

        const relInput = "custom/pages-env/site/home/index.tsx";
        const absInput = path.resolve(process.cwd(), "custom/pages-env/blog/post/index.jsx");

        const outRel = jsxBundlePath(relInput);
        const outAbs = jsxBundlePath(absInput);

        assert.equal(outRel, expected("site/home/index.js"));
        assert.equal(outAbs, expected("blog/post/index.js"));
    } finally {
        if (previous === undefined) {
            delete process.env.PAGES_DIR;
        } else {
            process.env.PAGES_DIR = previous;
        }
    }
});

test("jsxBundlePath with PAGES_DIR env validates prefix and root mapping", () => {
    const previous = process.env.PAGES_DIR;
    try {
        process.env.PAGES_DIR = "alt/pages";

        assert.throws(() => jsxBundlePath("not-pages/thing.jsx"), /JSX path must start with/);

        const out = jsxBundlePath("alt/pages");
        assert.equal(out, path.resolve(OUTPUT_DIR_SERVER), "Env pages root maps to server output root");
    } finally {
        if (previous === undefined) {
            delete process.env.PAGES_DIR;
        } else {
            process.env.PAGES_DIR = previous;
        }
    }
});
