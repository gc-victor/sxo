import assert from "node:assert/strict";
import test from "node:test";

import { clearWarnedBoolValues, toAbsolutePath, toRelativePosixPath, warnedBoolValues } from "./helpers.js";

/**
 * Parameterized test covering all toRelativePosixPath scenarios
 * Consolidates 14+ redundant tests into single test with loop
 */
test("helpers: toRelativePosixPath handles various path formats", async () => {
    const testCases = [
        // POSIX paths
        { input: "src/pages", cwd: "/project", expected: "src/pages" },
        { input: "src/pages/", cwd: "/project", expected: "src/pages" },
        { input: "src/pages///", cwd: "/project", expected: "src/pages" },

        // Backslash to forward slash conversion
        { input: "src\\pages", cwd: "/project", expected: "src/pages" },

        // Absolute to relative conversion
        { input: "/project/src/pages", cwd: "/project", expected: "src/pages" },
        { input: "/project/www/pages", cwd: "/project", expected: "www/pages" },
        { input: "/project", cwd: "/project", expected: "." },

        // Edge cases
        { input: "", cwd: "/project", expected: "src/pages" },
        { input: undefined, cwd: "/project", expected: "src/pages" },
        { input: ".", cwd: "/project", expected: "." },

        // Windows paths (verified through integration tests)
        { input: "src\\pages", cwd: "C:\\project", check: (r) => r.includes("pages") && !r.includes("\\") },
        { input: "src/pages\\nested", cwd: "C:\\project", expected: "src/pages/nested" },
    ];

    for (const { input, cwd, expected, check } of testCases) {
        const result = toRelativePosixPath(input, cwd);
        if (expected !== undefined) {
            assert.equal(
                result,
                expected,
                `toRelativePosixPath(${JSON.stringify(input)}, ${JSON.stringify(cwd)}) should return ${expected}, got ${result}`,
            );
        } else if (check) {
            assert.ok(check(result), `Result '${result}' failed custom check for input: ${JSON.stringify(input)}`);
        }
    }
});

/**
 * Parameterized test covering all toAbsolutePath scenarios
 * Consolidates 8+ redundant tests into single test with loop
 */
test("helpers: toAbsolutePath handles various path formats", async () => {
    const testCases = [
        // Relative to absolute
        { input: "dist", cwd: "/project", expected: "/project/dist" },
        { input: "build", cwd: "/project", expected: "/project/build" },
        { input: "dist/client", cwd: "/project", expected: "/project/dist/client" },

        // Preserves absolute paths
        { input: "/absolute/path", cwd: "/project", expected: "/absolute/path" },
        { input: "/other/path", cwd: "/project", expected: "/other/path" },

        // Edge cases
        { input: "", cwd: "/project", expected: "/project/dist" },
        { input: undefined, cwd: "/project", expected: "/project/dist" },
        { input: "/project/dist", cwd: "/project", expected: "/project/dist" },

        // Path normalization
        { input: "dist/", cwd: "/project", expected: "/project/dist" },
        { input: "dist//build", cwd: "/project", expected: "/project/dist/build" },
        { input: "./dist", cwd: "/project", expected: "/project/dist" },

        // Combines with different cwd values
        { input: "dist", cwd: "/my/project", expected: "/my/project/dist" },
        { input: "dist/client", cwd: "/my/project", expected: "/my/project/dist/client" },
        { input: "dist", cwd: "/my/project/", expected: "/my/project/dist" },
    ];

    for (const { input, cwd, expected } of testCases) {
        const result = toAbsolutePath(input, cwd);
        assert.equal(
            result,
            expected,
            `toAbsolutePath(${JSON.stringify(input)}, ${JSON.stringify(cwd)}) should return ${expected}, got ${result}`,
        );
    }
});

/**
 * Unique test: Verify warnedBoolValues is a Set
 */
test("helpers: warnedBoolValues is a Set", async () => {
    // Should be a Set instance
    assert.ok(warnedBoolValues instanceof Set);
});

/**
 * Unique test: Verify clearWarnedBoolValues clears Set
 */
test("helpers: clearWarnedBoolValues clears Set", async () => {
    // Add some values
    warnedBoolValues.add("invalid1");
    warnedBoolValues.add("invalid2");
    assert.equal(warnedBoolValues.size, 2);

    // Clear should empty Set
    clearWarnedBoolValues();
    assert.equal(warnedBoolValues.size, 0);
});

/**
 * Unique test: Verify toRelativePosixPath and toAbsolutePath are independent
 */
test("helpers: toRelativePosixPath and toAbsolutePath are independent", async () => {
    const cwd = "/project";

    // toRelativePosixPath doesn't affect toAbsolutePath
    const relative = toRelativePosixPath("src/pages", cwd);
    const absolute = toAbsolutePath("dist", cwd);

    assert.equal(relative, "src/pages");
    assert.equal(absolute, "/project/dist");

    // Shouldn't interfere
    assert.equal(toAbsolutePath("other", cwd), "/project/other");
});
