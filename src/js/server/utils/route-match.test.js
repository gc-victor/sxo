/**
 * Test suite for route matching and regex building.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildPatternRegex } from "./route-match.js";

describe("buildPatternRegex", () => {
    it("handles various route patterns", (t) => {
        const patterns = [
            {
                name: "static pattern with no parameters",
                pattern: "about",
                expectedParamNames: [],
                validMatches: ["about"],
                invalidMatches: ["about/extra"],
            },
            {
                name: "single parameter pattern",
                pattern: "blog/[slug]",
                expectedParamNames: ["slug"],
                validMatches: ["blog/hello-world", "blog/test-123"],
                invalidMatches: ["blog"],
            },
            {
                name: "multiple parameter pattern",
                pattern: "shop/[category]/[product]",
                expectedParamNames: ["category", "product"],
                validMatches: ["shop/electronics/laptop", "shop/books/guide"],
                invalidMatches: ["shop/electronics"],
            },
            {
                name: "root parameter pattern",
                pattern: "[id]",
                expectedParamNames: ["id"],
                validMatches: ["123"],
                invalidMatches: ["123/extra"],
            },
            {
                name: "mixed static and dynamic segments",
                pattern: "blog/[category]/[slug]/archive",
                expectedParamNames: ["category", "slug"],
                validMatches: ["blog/tech/javascript/archive"],
                invalidMatches: ["blog/javascript/archive"],
            },
            {
                name: "extracts parameter names in correct order",
                pattern: "[first]/[second]/[third]",
                expectedParamNames: ["first", "second", "third"],
                validMatches: ["1/2/3"],
                invalidMatches: [],
            },
            {
                name: "patterns with underscores in parameter names",
                pattern: "users/[user_id]/profile",
                expectedParamNames: ["user_id"],
                validMatches: ["users/123/profile"],
                invalidMatches: [],
            },
            {
                name: "trailing static segments",
                pattern: "blog/[slug]/comments",
                expectedParamNames: ["slug"],
                validMatches: ["blog/post/comments"],
                invalidMatches: ["blog/post"],
            },
        ];

        for (const { name, pattern, expectedParamNames, validMatches, invalidMatches } of patterns) {
            t.test(name, (_t) => {
                const result = buildPatternRegex(pattern);

                assert.ok(result.regex instanceof RegExp, "should return a RegExp");
                assert.deepStrictEqual(
                    result.paramNames,
                    expectedParamNames,
                    `parameter names should match expected: ${expectedParamNames}`,
                );

                for (const match of validMatches) {
                    assert.ok(result.regex.test(match), `should match valid path: ${match}`);
                }

                for (const noMatch of invalidMatches) {
                    assert.ok(!result.regex.test(noMatch), `should not match invalid path: ${noMatch}`);
                }
            });
        }
    });

    it("memoizes regex results", () => {
        const pattern = "test/[param]";

        // First call should compute
        const result1 = buildPatternRegex(pattern);
        // Second call should return cached result (same object reference)
        const result2 = buildPatternRegex(pattern);

        assert.strictEqual(result1, result2, "Should return memoized result");
    });
});
