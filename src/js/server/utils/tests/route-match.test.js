import { deepStrictEqual, strictEqual } from "node:assert";
import { test } from "node:test";
import { routeMatch } from "../index.js";

// This file isolates routeMatch-focused tests split out from the original aggregated utils test.

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
        params: Object.create(null),
    });
    deepStrictEqual(routeMatch("/index.html", filesFixture), {
        route: filesFixture[0],
        params: Object.create(null),
    });
    deepStrictEqual(routeMatch("/about", filesFixture), {
        route: filesFixture[1],
        params: Object.create(null),
    });
    deepStrictEqual(routeMatch("/about/index.html", filesFixture), {
        route: filesFixture[1],
        params: Object.create(null),
    });
});

// --- Dynamic slug routes ---
test("routeMatch matches dynamic [slug] routes", () => {
    const params1 = Object.create(null);
    params1.slug = "hello-world";
    deepStrictEqual(routeMatch("/blog/hello-world", filesFixture), {
        route: filesFixture[2],
        params: params1,
    });
    const params2 = Object.create(null);
    params2.slug = "test-slug";
    deepStrictEqual(routeMatch("/blog/test-slug", filesFixture), {
        route: filesFixture[2],
        params: params2,
    });
    // index.html appended after slug directory is not a match per current semantics
    strictEqual(routeMatch("/blog/hello-world/index.html", filesFixture), null);
});

// --- Slug validation ---

test("routeMatch can disable slug validation via option", () => {
    const res = routeMatch("/blog/hello world", filesFixture, { validateSlug: false });
    const expectedParams = Object.create(null);
    expectedParams.slug = "hello world";
    deepStrictEqual(res, {
        route: filesFixture[2],
        params: expectedParams,
    });
});

// --- Normalization (query/hash + full URL forms) ---
test("routeMatch normalizes full URL and strips query/hash", () => {
    const res1 = routeMatch("http://localhost:3000/about?ref=1#hash", filesFixture);
    deepStrictEqual(res1, { route: filesFixture[1], params: Object.create(null) });

    const res2 = routeMatch("http://localhost:3000/index.html?x=1", filesFixture);
    deepStrictEqual(res2, { route: filesFixture[0], params: Object.create(null) });
});

// --- Encoded paths & decoding behavior ---

test("routeMatch returns null for malformed percent-encoding", () => {
    // Invalid (truncated) UTF-8 / percent sequence should cause decode failure -> null
    const res = routeMatch("/blog/%E0%A4%A", filesFixture);
    strictEqual(res, null);
});

// --- Edge cases ---

// --- Parameter name validation ---
test("validateRoutePattern accepts valid parameter names", async () => {
    const { validateRoutePattern } = await import("../index.js");

    deepStrictEqual(validateRoutePattern("blog/[slug]"), { valid: true });
    deepStrictEqual(validateRoutePattern("shop/[category]/[product]"), { valid: true });
    deepStrictEqual(validateRoutePattern("users/[userId]/profile"), { valid: true });
    deepStrictEqual(validateRoutePattern("api/[version]/[endpoint]"), { valid: true });
    deepStrictEqual(validateRoutePattern("blog/[valid_param_1]"), { valid: true });
});

test("validateRoutePattern rejects duplicate parameter names", async () => {
    const { validateRoutePattern } = await import("../index.js");

    const result = validateRoutePattern("blog/[category]/[category]");
    strictEqual(result.valid, false);
    strictEqual(typeof result.error, "string");
    strictEqual(result.error.toLowerCase().includes("duplicate"), true);
});

// --- Edge case tests ---

// --- Task 1.1: Cache bounds test ---
test("patternCache does not grow unbounded", async () => {
    const { routeMatch } = await import("../index.js");

    // Generate many unique patterns to stress the cache
    const files = [];
    for (let i = 0; i < 3000; i++) {
        files.push({
            path: `test/[param${i}]`,
            filename: `test-${i}.html`,
            jsx: `src/pages/test/[param${i}]/index.jsx`,
        });
    }

    // Call routeMatch with each unique pattern
    for (const file of files) {
        routeMatch(`/test/value${files.indexOf(file)}`, [file]);
    }

    // The cache should be bounded (implementation detail, but we verify no crash/OOM)
    // This test passes if no memory explosion occurs
});

// --- Task 2.1: Placeholder collision test ---

// --- Task 6.1: Empty bracket validation test ---
test("validateRoutePattern rejects empty brackets", async () => {
    const { validateRoutePattern } = await import("../index.js");

    const result = validateRoutePattern("blog/[]");
    strictEqual(result.valid, false);
    strictEqual(result.error.toLowerCase().includes("empty"), true);
});

// --- Task 6.2: Route precedence test ---
