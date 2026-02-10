/**
 * @fileoverview Tests for path utilities.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getBasename, getExtension, hasFileExtension, isHashedAsset, resolveSafePath, validateAndNormalizePath } from "./path.js";

describe("hasFileExtension", () => {
    it("should return true for path with extension", () => {
        assert.equal(hasFileExtension("/styles.css"), true);
    });

    it("should return true for nested path with extension", () => {
        assert.equal(hasFileExtension("/assets/app.js"), true);
    });

    it("should return false for path without extension", () => {
        assert.equal(hasFileExtension("/about"), false);
    });

    it("should return false for root path", () => {
        assert.equal(hasFileExtension("/"), false);
    });

    it("should return false for dotfiles because dot-prefixed segments are not treated as static asset extensions", () => {
        assert.equal(hasFileExtension("/.gitignore"), false);
        assert.equal(hasFileExtension("/.env.local"), false);
    });

    it("should return true for files with multiple dots", () => {
        assert.equal(hasFileExtension("/app.bundle.js"), true);
    });

    it("should handle empty string", () => {
        assert.equal(hasFileExtension(""), false);
    });
});

describe("isHashedAsset", () => {
    it("should return true for hex hash with dot separator", () => {
        assert.equal(isHashedAsset("styles.abcdef12.css"), true);
    });

    it("should return true for hex hash with dash separator", () => {
        assert.equal(isHashedAsset("styles-abcdef12.css"), true);
    });

    it("should return true for esbuild base36 uppercase hash", () => {
        assert.equal(isHashedAsset("global.JF2RTEIZ.css"), true);
    });

    it("should return true for long hex hash", () => {
        assert.equal(isHashedAsset("bundle.abcdef1234567890.js"), true);
    });

    it("should return false for non-hashed file", () => {
        assert.equal(isHashedAsset("styles.css"), false);
    });

    it("should return false for short segment", () => {
        assert.equal(isHashedAsset("app.min.js"), false);
    });

    it("should return false for semantic version", () => {
        assert.equal(isHashedAsset("lib-1.2.3.js"), false);
    });
});

describe("getExtension", () => {
    it("should return extension for simple file", () => {
        assert.equal(getExtension("/app.js"), ".js");
    });

    it("should return extension for nested path", () => {
        assert.equal(getExtension("/assets/styles.css"), ".css");
    });

    it("should return last extension for multi-dot file", () => {
        assert.equal(getExtension("/app.bundle.min.js"), ".js");
    });

    it("should return empty for file without extension", () => {
        assert.equal(getExtension("/README"), "");
    });

    it("should return empty for dotfile", () => {
        assert.equal(getExtension("/.gitignore"), "");
    });

    it("should return extension for dotfile with extension", () => {
        assert.equal(getExtension("/.config.json"), ".json");
    });
});

describe("getBasename", () => {
    it("should return basename for simple path", () => {
        assert.equal(getBasename("/app.js"), "app.js");
    });

    it("should return basename for nested path", () => {
        assert.equal(getBasename("/assets/styles/main.css"), "main.css");
    });

    it("should return filename for no slashes", () => {
        assert.equal(getBasename("file.txt"), "file.txt");
    });

    it("should return empty for trailing slash", () => {
        assert.equal(getBasename("/dir/"), "");
    });
});

describe("validateAndNormalizePath", () => {
    it("should decode URI encoded path", () => {
        const result = validateAndNormalizePath("/hello%20world.txt");
        assert.equal(result?.normalized, "/hello world.txt");
    });

    it("should return null for path exceeding MAX_PATH_LEN", () => {
        const longPath = `/${"a".repeat(1025)}`;
        assert.equal(validateAndNormalizePath(longPath), null);
    });

    it("should return null for path with null bytes", () => {
        assert.equal(validateAndNormalizePath("/test\0path"), null);
    });

    it("should return null for path with newlines", () => {
        assert.equal(validateAndNormalizePath("/test\npath"), null);
    });

    it("should return null for path with carriage returns", () => {
        assert.equal(validateAndNormalizePath("/test\rpath"), null);
    });

    it("should return null for traversal with ..", () => {
        assert.equal(validateAndNormalizePath("/../etc/passwd"), null);
    });

    it("should return null for traversal with .", () => {
        assert.equal(validateAndNormalizePath("/./test"), null);
    });

    it("should return relative path without leading slashes", () => {
        const result = validateAndNormalizePath("/assets/styles.css");
        assert.equal(result?.rel, "assets/styles.css");
    });

    it("should return null for invalid URI encoding", () => {
        assert.equal(validateAndNormalizePath("/%zz"), null);
    });

    it("should return null for double-encoded traversal", () => {
        assert.equal(validateAndNormalizePath("/%252e%252e/etc/passwd"), null);
    });

    it("should handle encoded path segments", () => {
        assert.equal(validateAndNormalizePath("/%2e%2e/test"), null);
    });
});

describe("resolveSafePath", () => {
    it("should resolve valid paths under base directory", () => {
        assert.strictEqual(resolveSafePath("/dist/client", "assets/app.js"), "/dist/client/assets/app.js");
        assert.strictEqual(resolveSafePath("/dist/client/", "app.js"), "/dist/client/app.js");
        assert.strictEqual(resolveSafePath("/dist/client", "/app.js"), "/dist/client/app.js");
        assert.strictEqual(resolveSafePath("/base", "foo/bar"), "/base/foo/bar");
    });

    it("should handle multiple leading slashes safely", () => {
        assert.strictEqual(resolveSafePath("/base", "//etc/passwd"), "/base/etc/passwd");
        assert.strictEqual(resolveSafePath("/base", "///etc/passwd"), "/base/etc/passwd");
    });

    it("should reject path traversal attempts", () => {
        assert.strictEqual(resolveSafePath("/dist/client", "../server/secret.js"), null);
        assert.strictEqual(resolveSafePath("/base", "foo/.."), null);
        assert.strictEqual(resolveSafePath("/base", "../foo"), null);
        assert.strictEqual(resolveSafePath("/base", "foo/../bar"), null);
    });

    it("should reject current directory segments", () => {
        assert.strictEqual(resolveSafePath("/base", "foo/."), null);
        assert.strictEqual(resolveSafePath("/base", "./foo"), null);
        assert.strictEqual(resolveSafePath("/base", "foo/./bar"), null);
    });

    it("should reject encoded and double-encoded traversal", () => {
        assert.strictEqual(resolveSafePath("/base", "%2e%2e/foo"), null);
        assert.strictEqual(resolveSafePath("/base", "foo/%2e%2e"), null);
        assert.strictEqual(resolveSafePath("/base", "%252e%252e/foo"), null);
    });

    it("should reject invalid characters in relative path", () => {
        assert.strictEqual(resolveSafePath("/base", "foo\0bar"), null);
        assert.strictEqual(resolveSafePath("/base", "foo\nbar"), null);
        assert.strictEqual(resolveSafePath("/base", "foo\rbar"), null);
    });
});
