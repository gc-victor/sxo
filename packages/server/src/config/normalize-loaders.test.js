import assert from "node:assert/strict";
import test from "node:test";

import { mergeLoadersMaps, normalizeLoaderKey, normalizeLoaders, parseLoadersString } from "./normalize-loaders.js";

/**
 * Parameterized test: normalizeLoaders handles various input formats
 * Consolidates 4 redundant tests into single test with loop
 */
test("normalize-loaders: handles various input formats", async () => {
    const inputFormats = [
        {
            format: "object map",
            input: { svg: "file", ".ts": "tsx" },
            expected: { ".svg": "file", ".ts": "tsx" },
        },
        {
            format: "array",
            input: [".svg=file", "ts=tsx"],
            expected: { ".svg": "file", ".ts": "tsx" },
        },
        {
            format: "JSON string",
            input: '{"svg":"file","ts":"tsx"}',
            expected: { ".svg": "file", ".ts": "tsx" },
        },
        {
            format: "key=value string",
            input: ".svg=file,ts=tsx",
            expected: { ".svg": "file", ".ts": "tsx" },
        },
    ];

    for (const { format, input, expected } of inputFormats) {
        const result = normalizeLoaders(input);
        assert.deepEqual(result, expected, `Failed for ${format} input`);
    }
});

/**
 * Parameterized test: normalizeLoaders handles mixed dot notation
 * Consolidates 3 redundant tests into single test with loop
 */
test("normalize-loaders: converts object and JSON values to strings", () => {
    assert.deepEqual(normalizeLoaders({ svg: 42 }), { ".svg": "42" });
    assert.deepEqual(normalizeLoaders('{"svg":42}'), { ".svg": "42" });
});

test("normalize-loaders: handles mixed dot notation", async () => {
    const dotNotationCases = [
        {
            description: "adds dot to keys without dot",
            input: { svg: "file", txt: "text", md: "markdown" },
            expected: { ".svg": "file", ".txt": "text", ".md": "markdown" },
        },
        {
            description: "preserves existing leading dot",
            input: { ".svg": "file", ".ts": "tsx", ".md": "markdown" },
            expected: { ".svg": "file", ".ts": "tsx", ".md": "markdown" },
        },
        {
            description: "handles mixed dot notation in object",
            input: { svg: "file", ".ts": "tsx", md: "markdown" },
            expected: { ".svg": "file", ".ts": "tsx", ".md": "markdown" },
        },
        {
            description: "handles mixed dot notation in array",
            input: ["svg=file", ".ts=tsx", "md=markdown"],
            expected: { ".svg": "file", ".ts": "tsx", ".md": "markdown" },
        },
        {
            description: "handles array items with dot notation",
            input: ["svg=file", ".ts=tsx"],
            expected: { ".svg": "file", ".ts": "tsx" },
        },
        {
            description: "JSON string handles mixed dot notation",
            input: '{"svg":"file",".ts":"tsx","md":"markdown"}',
            expected: { ".svg": "file", ".ts": "tsx", ".md": "markdown" },
        },
    ];

    for (const { description, input, expected } of dotNotationCases) {
        const result = normalizeLoaders(input);
        assert.deepEqual(result, expected, `Failed: ${description}`);
    }
});

/**
 * Unique test: normalizeLoaders sorts keys alphabetically
 */
test("normalize-loaders: sorts keys alphabetically", async () => {
    const result = normalizeLoaders({ c: "css", a: "js", b: "html" });

    const keys = Object.keys(result);
    assert.deepEqual(keys, [".a", ".b", ".c"]);
});

/**
 * Unique test: normalizeLoaders returns undefined for empty input
 */
test("normalize-loaders: returns undefined for empty input", async () => {
    assert.equal(normalizeLoaders({}), undefined);
    assert.equal(normalizeLoaders([]), undefined);
    assert.equal(normalizeLoaders(""), undefined);
});

/**
 * Unique test: normalizeLoaderKey adds dot prefix when missing
 */
test("normalizeLoaderKey: adds dot prefix when missing", async () => {
    assert.equal(normalizeLoaderKey("svg"), ".svg");
    assert.equal(normalizeLoaderKey("ts"), ".ts");
    assert.equal(normalizeLoaderKey("css"), ".css");
});

/**
 * Unique test: normalizeLoaderKey preserves existing dot prefix
 */
test("normalizeLoaderKey: preserves existing dot prefix", async () => {
    assert.equal(normalizeLoaderKey(".svg"), ".svg");
    assert.equal(normalizeLoaderKey(".ts"), ".ts");
});

/**
 * Unique test: normalizeLoaderKey trims whitespace
 */
test("normalizeLoaderKey: trims whitespace", async () => {
    assert.equal(normalizeLoaderKey("  svg  "), ".svg");
    assert.equal(normalizeLoaderKey("  .ts"), ".ts");
});

/**
 * Unique test: parseLoadersString handles single key=value pair
 */
test("parseLoadersString: handles single key=value pair", async () => {
    const result = parseLoadersString("svg=file");
    assert.deepEqual(result, { ".svg": "file" });
});

/**
 * Unique test: parseLoadersString handles multiple comma-separated pairs
 */
test("parseLoadersString: handles multiple comma-separated pairs", async () => {
    const result = parseLoadersString("svg=file,ts=tsx");
    assert.deepEqual(result, { ".svg": "file", ".ts": "tsx" });
});

/**
 * Unique test: parseLoadersString ignores malformed pairs
 */
test("parseLoadersString: ignores malformed pairs", async () => {
    const result = parseLoadersString("svg=file,noequal,ts=tsx");
    assert.deepEqual(result, { ".svg": "file", ".ts": "tsx" });
});

/**
 * Unique test: parseLoadersString returns empty object for empty string
 */
test("parseLoadersString: returns empty object for empty string", async () => {
    assert.deepEqual(parseLoadersString(""), {});
});

/**
 * Unique test: mergeLoadersMaps merges multiple maps
 */
test("mergeLoadersMaps: merges multiple maps", async () => {
    const map1 = { ".svg": "file" };
    const map2 = { ".ts": "tsx" };
    const result = mergeLoadersMaps(map1, map2);
    assert.deepEqual(result, { ".svg": "file", ".ts": "tsx" });
});

/**
 * Unique test: mergeLoadersMaps later maps override earlier ones
 */
test("mergeLoadersMaps: later maps override earlier ones", async () => {
    const map1 = { ".svg": "file" };
    const map2 = { ".svg": "dataurl" };
    const result = mergeLoadersMaps(map1, map2);
    assert.equal(result[".svg"], "dataurl");
});

/**
 * Unique test: mergeLoadersMaps handles null/undefined maps
 */
test("mergeLoadersMaps: handles null/undefined maps", async () => {
    const map1 = { ".svg": "file" };
    const result = mergeLoadersMaps(map1, null, undefined, { ".ts": "tsx" });
    assert.deepEqual(result, { ".svg": "file", ".ts": "tsx" });
});

/**
 * Unique test: mergeLoadersMaps returns empty object for no maps
 */
test("mergeLoadersMaps: returns empty object for no maps", async () => {
    assert.deepEqual(mergeLoadersMaps(), {});
});

/**
 * Unique test: normalizeLoaders handles null and undefined
 */
test("normalize-loaders: handles null and undefined", async () => {
    assert.equal(normalizeLoaders(null), undefined);
    assert.equal(normalizeLoaders(undefined), undefined);
});

/**
 * Unique test: normalizeLoaders handles whitespace-only string
 */
test("normalize-loaders: handles whitespace-only string", async () => {
    assert.equal(normalizeLoaders("   "), undefined);
});

/**
 * Unique test: normalizeLoaders later array items override earlier ones
 */
test("normalize-loaders: later array items override earlier ones", async () => {
    const result = normalizeLoaders(["svg=file", "svg=dataurl"]);
    assert.equal(result[".svg"], "dataurl");
});

/**
 * Unique test: normalizeLoaders JSON string sorts keys alphabetically
 */
test("normalize-loaders: JSON string sorts keys alphabetically", async () => {
    const result = normalizeLoaders('{"z":"file","a":"tsx","m":"ts"}');
    const keys = Object.keys(result);
    assert.deepEqual(keys, [".a", ".m", ".z"]);
});

/**
 * Unique test: normalizeLoaders key=value string sorts keys alphabetically
 */
test("normalize-loaders: key=value string sorts keys alphabetically", async () => {
    const result = normalizeLoaders("z=file,a=tsx,m=ts");
    const keys = Object.keys(result);
    assert.deepEqual(keys, [".a", ".m", ".z"]);
});

/**
 * Unique test: normalizeLoaders returns undefined for invalid types
 */
test("normalize-loaders: returns undefined for invalid types", async () => {
    assert.equal(normalizeLoaders(123), undefined);
    assert.equal(normalizeLoaders(true), undefined);
    assert.equal(normalizeLoaders(false), undefined);
    assert.equal(normalizeLoaders(Symbol("test")), undefined);
});
