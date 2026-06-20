import assert from "node:assert/strict";
import { test } from "node:test";
import { convertToPosixSlashes } from "./path-utils.js";

test("Windows path conversion - backslashes to forward slashes", () => {
    assert.strictEqual(convertToPosixSlashes("C:\\Users\\test"), "C:/Users/test");
    assert.strictEqual(convertToPosixSlashes("C:\\Users\\test\\file.txt"), "C:/Users/test/file.txt");
    assert.strictEqual(convertToPosixSlashes("C:\\Users\\test"), "C:/Users/test");
});

test("POSIX path passthrough - no change needed", () => {
    assert.strictEqual(convertToPosixSlashes("/home/user"), "/home/user");
    assert.strictEqual(convertToPosixSlashes("./relative/path"), "./relative/path");
    assert.strictEqual(convertToPosixSlashes("/absolute/path/to/file.js"), "/absolute/path/to/file.js");
});

test("Mixed paths - combination of separators", () => {
    assert.strictEqual(convertToPosixSlashes("C:\\Users\\test/file.txt"), "C:/Users/test/file.txt");
    assert.strictEqual(convertToPosixSlashes("path\\with/mixed/separators"), "path/with/mixed/separators");
    assert.strictEqual(convertToPosixSlashes("a\\b\\c\\d\\e\\f"), "a/b/c/d/e/f");
});

test("Edge cases - empty string and single separator", () => {
    assert.strictEqual(convertToPosixSlashes(""), "");
    assert.strictEqual(convertToPosixSlashes("\\"), "/");
    assert.strictEqual(convertToPosixSlashes("/"), "/");
    assert.strictEqual(convertToPosixSlashes("a"), "a");
});

test("Very long paths - no performance issues", () => {
    const longPath = "a\\b\\c\\d\\e\\f\\g\\h\\i\\j\\k\\l\\m\\n\\o\\p\\q\\r\\s\\t\\u\\v\\w\\x\\y\\z";
    const expected = "a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t/u/v/w/x/y/z";
    assert.strictEqual(convertToPosixSlashes(longPath), expected);
});

test("Type coercion - non-string inputs converted to string", () => {
    assert.strictEqual(convertToPosixSlashes(null), "null");
    assert.strictEqual(convertToPosixSlashes(undefined), "undefined");
    assert.strictEqual(convertToPosixSlashes(123), "123");
    assert.strictEqual(convertToPosixSlashes(true), "true");
    assert.strictEqual(convertToPosixSlashes(0), "0");
});

test("Special characters - preserve characters unchanged", () => {
    assert.strictEqual(convertToPosixSlashes("C:\\Users\\test user\\file.txt"), "C:/Users/test user/file.txt");
    assert.strictEqual(convertToPosixSlashes("path\\with\\spaces and\\dashes.js"), "path/with/spaces and/dashes.js");
    assert.strictEqual(convertToPosixSlashes("path\\with-dashes_underscores.js"), "path/with-dashes_underscores.js");
});
