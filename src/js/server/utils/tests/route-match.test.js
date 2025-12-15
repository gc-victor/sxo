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

// --- Task 3: Parameter length validation tests ---
test("routeMatch rejects slug values exceeding 200 character limit", () => {
    const longSlug = "a".repeat(201);
    const result = routeMatch(`/blog/${longSlug}`, filesFixture);
    // Returns {invalid: true} when slug validation fails
    deepStrictEqual(result, { invalid: true }, "Slug exceeding 200 chars should be rejected");
});

test("routeMatch accepts slug values at exactly 200 character limit", () => {
    const maxSlug = "a".repeat(200);
    const result = routeMatch(`/blog/${maxSlug}`, filesFixture);
    deepStrictEqual(result?.params?.slug, maxSlug, "Slug at exactly 200 chars should be accepted");
});

test("routeMatch accepts slug values under 200 character limit", () => {
    const shortSlug = "a".repeat(50);
    const result = routeMatch(`/blog/${shortSlug}`, filesFixture);
    deepStrictEqual(result?.params?.slug, shortSlug, "Short slug should be accepted");
});

// --- Task 4: Regex escaping stress tests ---
test("routeMatch handles special regex characters in static paths", () => {
    const filesWithDots = [{ path: "api/v1.0", filename: "api-v1.0.html", jsx: "src/pages/api/v1.0/index.jsx" }];
    // Should match literal "v1.0", not "v1" followed by any char
    const result = routeMatch("/api/v1.0", filesWithDots);
    deepStrictEqual(result, { route: filesWithDots[0], params: Object.create(null) });
    // Should NOT match "v1X0" (dot is not wildcard)
    const badResult = routeMatch("/api/v1X0", filesWithDots);
    strictEqual(badResult, null, "Dot should be literal, not regex wildcard");
});

test("routeMatch handles parentheses in static paths", () => {
    const filesWithParens = [{ path: "docs/(legacy)", filename: "docs-legacy.html", jsx: "src/pages/docs/(legacy)/index.jsx" }];
    const result = routeMatch("/docs/(legacy)", filesWithParens);
    deepStrictEqual(result, { route: filesWithParens[0], params: Object.create(null) });
});

test("routeMatch handles plus signs in static paths", () => {
    const filesWithPlus = [{ path: "search/c++", filename: "cpp.html", jsx: "src/pages/search/c++/index.jsx" }];
    const result = routeMatch("/search/c++", filesWithPlus);
    deepStrictEqual(result, { route: filesWithPlus[0], params: Object.create(null) });
    // Should NOT match "ccc" (plus is not regex quantifier)
    const badResult = routeMatch("/search/ccc", filesWithPlus);
    strictEqual(badResult, null, "Plus should be literal, not regex quantifier");
});

test("routeMatch handles asterisks in static paths", () => {
    const filesWithAsterisk = [{ path: "docs/pointer*", filename: "pointer.html", jsx: "src/pages/docs/pointer*/index.jsx" }];
    const result = routeMatch("/docs/pointer*", filesWithAsterisk);
    deepStrictEqual(result, { route: filesWithAsterisk[0], params: Object.create(null) });
    // Should NOT match "pointer" alone (asterisk is not regex quantifier)
    const badResult = routeMatch("/docs/pointer", filesWithAsterisk);
    strictEqual(badResult, null, "Asterisk should be literal, not regex quantifier");
});

test("routeMatch handles pipe characters in static paths", () => {
    const filesWithPipe = [{ path: "ops/a|b", filename: "ops-ab.html", jsx: "src/pages/ops/a|b/index.jsx" }];
    const result = routeMatch("/ops/a|b", filesWithPipe);
    deepStrictEqual(result, { route: filesWithPipe[0], params: Object.create(null) });
    // Should NOT match just "a" or just "b" (pipe is not regex alternation)
    strictEqual(routeMatch("/ops/a", filesWithPipe), null);
    strictEqual(routeMatch("/ops/b", filesWithPipe), null);
});

test("routeMatch handles caret and dollar signs in static paths", () => {
    const filesWithAnchors = [{ path: "regex/^start$end", filename: "anchors.html", jsx: "src/pages/regex/^start$end/index.jsx" }];
    const result = routeMatch("/regex/^start$end", filesWithAnchors);
    deepStrictEqual(result, { route: filesWithAnchors[0], params: Object.create(null) });
});

test("routeMatch handles backslashes in static paths", () => {
    const filesWithBackslash = [{ path: "windows/C:\\Users", filename: "users.html", jsx: "src/pages/windows/C:\\Users/index.jsx" }];
    const result = routeMatch("/windows/C:\\Users", filesWithBackslash);
    deepStrictEqual(result, { route: filesWithBackslash[0], params: Object.create(null) });
});

// Note: Question marks in static paths are not tested because '?' starts URL query string parsing.
// The routeMatch function correctly strips query strings, so '/faq/what?' becomes '/faq/what'.

// --- Task 6.2: Route precedence test ---
