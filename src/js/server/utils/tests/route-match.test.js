import { deepStrictEqual, strictEqual } from "node:assert";
import { test } from "node:test";
import { routeMatch } from "../index.js";

// AIDEV-NOTE: This file isolates routeMatch-focused tests split out from the original aggregated utils test.

// --- Fixtures ---
const filesFixture = [
    { path: "", filename: "index.html", jsx: "src/pages/index.jsx" },
    { path: "about", filename: "about.html", jsx: "src/pages/about/index.jsx" },
    { path: "blog/[slug]", filename: "blog-slug.html", jsx: "src/pages/blog/[slug]/index.jsx" },
];

// --- Basic matching (root + static) ---
test("routeMatch matches root and static routes", () => {
    deepStrictEqual(routeMatch("/", filesFixture), {
        route: filesFixture[0],
        params: {},
    });
    deepStrictEqual(routeMatch("/index.html", filesFixture), {
        route: filesFixture[0],
        params: {},
    });
    deepStrictEqual(routeMatch("/about", filesFixture), {
        route: filesFixture[1],
        params: {},
    });
    deepStrictEqual(routeMatch("/about/index.html", filesFixture), {
        route: filesFixture[1],
        params: {},
    });
});

// --- Dynamic slug routes ---
test("routeMatch matches dynamic [slug] routes", () => {
    deepStrictEqual(routeMatch("/blog/hello-world", filesFixture), {
        route: filesFixture[2],
        params: { slug: "hello-world" },
    });
    deepStrictEqual(routeMatch("/blog/test-slug", filesFixture), {
        route: filesFixture[2],
        params: { slug: "test-slug" },
    });
    // index.html appended after slug directory is not a match per current semantics
    strictEqual(routeMatch("/blog/hello-world/index.html", filesFixture), null);
});

// --- Unmatched routes ---
test("routeMatch returns null for unmatched routes", () => {
    strictEqual(routeMatch("/notfound", filesFixture), null);
    strictEqual(routeMatch("/blog", filesFixture), null);
    strictEqual(routeMatch("/blog/", filesFixture), null);
});

// --- Slug validation ---
test("routeMatch returns {invalid:true} for invalid slug characters", () => {
    // Space is not allowed by SLUG_REGEX
    const res = routeMatch("/blog/hello world", filesFixture);
    deepStrictEqual(res, { invalid: true });
});

test("routeMatch can disable slug validation via option", () => {
    const res = routeMatch("/blog/hello world", filesFixture, { validateSlug: false });
    deepStrictEqual(res, {
        route: filesFixture[2],
        params: { slug: "hello world" },
    });
});

// --- Normalization (query/hash + full URL forms) ---
test("routeMatch normalizes full URL and strips query/hash", () => {
    const res1 = routeMatch("http://localhost:3000/about?ref=1#hash", filesFixture);
    deepStrictEqual(res1, { route: filesFixture[1], params: {} });

    const res2 = routeMatch("http://localhost:3000/index.html?x=1", filesFixture);
    deepStrictEqual(res2, { route: filesFixture[0], params: {} });
});

// --- Encoded paths & decoding behavior ---
test("routeMatch rejects multi-segment after decode (encoded slash inside slug)", () => {
    // %2F decodes to '/', which causes an extra segment so it should not match the single [slug] pattern
    const res = routeMatch("/blog/hello-world%2Fextra", filesFixture);
    strictEqual(res, null);
});

test("routeMatch returns null for malformed percent-encoding", () => {
    // Invalid (truncated) UTF-8 / percent sequence should cause decode failure -> null
    const res = routeMatch("/blog/%E0%A4%A", filesFixture);
    strictEqual(res, null);
});

// --- Edge cases ---
test("routeMatch normalizes repeated leading/trailing slashes (implementation behavior)", () => {
    // Implementation collapses leading and trailing slashes but preserves internal path semantics.
    deepStrictEqual(
        routeMatch("//about//", filesFixture),
        { route: filesFixture[1], params: {} },
        "Multiple leading/trailing slashes normalize to the static 'about' route",
    );
    // Root with excessive slashes normalizes to root
    deepStrictEqual(routeMatch("///", filesFixture), {
        route: filesFixture[0],
        params: {},
    });
});
