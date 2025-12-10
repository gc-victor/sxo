/**
 * @fileoverview Tests for path utilities.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getBasename, getExtension, hasFileExtension, isHashedAsset, normalizePath, resolveSafePath } from "./path.js";

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

    it("should return false for dotfiles", () => {
        assert.equal(hasFileExtension("/.gitignore"), false);
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

describe("normalizePath", () => {
    it("should decode URI encoded path", () => {
        const result = normalizePath("/hello%20world.txt");
        assert.equal(result?.normalized, "/hello world.txt");
    });

    it("should return null for path exceeding MAX_PATH_LEN", () => {
        const longPath = `/${"a".repeat(1025)}`;
        assert.equal(normalizePath(longPath), null);
    });

    it("should return null for path with null bytes", () => {
        assert.equal(normalizePath("/test\0path"), null);
    });

    it("should return null for path with newlines", () => {
        assert.equal(normalizePath("/test\npath"), null);
    });

    it("should return null for path with carriage returns", () => {
        assert.equal(normalizePath("/test\rpath"), null);
    });

    it("should return null for traversal with ..", () => {
        assert.equal(normalizePath("/../etc/passwd"), null);
    });

    it("should return null for traversal with .", () => {
        assert.equal(normalizePath("/./test"), null);
    });

    it("should return relative path without leading slashes", () => {
        const result = normalizePath("/assets/styles.css");
        assert.equal(result?.rel, "assets/styles.css");
    });

    it("should return null for invalid URI encoding", () => {
        assert.equal(normalizePath("/%zz"), null);
    });
});

describe("resolveSafePath", () => {
    it("should resolve path under staticDir", () => {
        const result = resolveSafePath("/dist/client", "assets/app.js");
        assert.equal(result, "/dist/client/assets/app.js");
    });

    it("should handle trailing slash in base", () => {
        const result = resolveSafePath("/dist/client/", "app.js");
        assert.equal(result, "/dist/client/app.js");
    });

    it("should handle leading slash in relative", () => {
        const result = resolveSafePath("/dist/client", "/app.js");
        assert.equal(result, "/dist/client/app.js");
    });

    it("should return null for path that escapes root", () => {
        // This tests the traversal protection
        const result = resolveSafePath("/dist/client", "../server/secret.js");
        assert.equal(result, null);
    });
});
