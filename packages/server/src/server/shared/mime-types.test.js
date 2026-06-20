/**
 * @fileoverview Tests for MIME types and constants utilities.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { COMPRESSIBLE_EXTS, getMimeType, isCompressible, MAX_PATH_LEN, MIME_TYPES } from "./mime-types.js";

describe("MIME_TYPES", () => {
    it("should have correct MIME type for .css", () => {
        assert.equal(MIME_TYPES[".css"], "text/css; charset=utf-8");
    });

    it("should have correct MIME type for .js", () => {
        assert.equal(MIME_TYPES[".js"], "application/javascript; charset=utf-8");
    });

    it("should have correct MIME type for .mjs", () => {
        assert.equal(MIME_TYPES[".mjs"], "application/javascript; charset=utf-8");
    });

    it("should have correct MIME type for .html", () => {
        assert.equal(MIME_TYPES[".html"], "text/html; charset=utf-8");
    });

    it("should have correct MIME type for .json", () => {
        assert.equal(MIME_TYPES[".json"], "application/json; charset=utf-8");
    });

    it("should have correct MIME type for .png", () => {
        assert.equal(MIME_TYPES[".png"], "image/png");
    });

    it("should have correct MIME type for .svg", () => {
        assert.equal(MIME_TYPES[".svg"], "image/svg+xml; charset=utf-8");
    });

    it("should have correct MIME type for .woff2", () => {
        assert.equal(MIME_TYPES[".woff2"], "font/woff2");
    });

    it("should have correct MIME type for .wasm", () => {
        assert.equal(MIME_TYPES[".wasm"], "application/wasm");
    });

    it("should have correct MIME type for .webmanifest", () => {
        assert.equal(MIME_TYPES[".webmanifest"], "application/manifest+json; charset=utf-8");
    });
});

describe("COMPRESSIBLE_EXTS", () => {
    it("should include .html", () => {
        assert.ok(COMPRESSIBLE_EXTS.has(".html"));
    });

    it("should include .js", () => {
        assert.ok(COMPRESSIBLE_EXTS.has(".js"));
    });

    it("should include .css", () => {
        assert.ok(COMPRESSIBLE_EXTS.has(".css"));
    });

    it("should include .svg", () => {
        assert.ok(COMPRESSIBLE_EXTS.has(".svg"));
    });

    it("should include .json", () => {
        assert.ok(COMPRESSIBLE_EXTS.has(".json"));
    });

    it("should include .map", () => {
        assert.ok(COMPRESSIBLE_EXTS.has(".map"));
    });

    it("should NOT include .png (binary)", () => {
        assert.ok(!COMPRESSIBLE_EXTS.has(".png"));
    });

    it("should NOT include .woff2 (already compressed)", () => {
        assert.ok(!COMPRESSIBLE_EXTS.has(".woff2"));
    });
});

describe("Constants", () => {
    it("should have MAX_PATH_LEN of 1024", () => {
        assert.equal(MAX_PATH_LEN, 1024);
    });
});

describe("getMimeType", () => {
    it("should return MIME type for known extension", () => {
        assert.equal(getMimeType(".css"), "text/css; charset=utf-8");
    });

    it("should return MIME type for extension with uppercase", () => {
        assert.equal(getMimeType(".CSS"), "text/css; charset=utf-8");
    });

    it("should return MIME type for extension without dot", () => {
        assert.equal(getMimeType("css"), "text/css; charset=utf-8");
    });

    it("should return undefined for unknown extension", () => {
        assert.equal(getMimeType(".xyz"), undefined);
    });

    it("should return undefined for empty string", () => {
        assert.equal(getMimeType(""), undefined);
    });
});

describe("isCompressible", () => {
    it("should return true for .html", () => {
        assert.equal(isCompressible(".html"), true);
    });

    it("should return true for .js", () => {
        assert.equal(isCompressible(".js"), true);
    });

    it("should return true for .css", () => {
        assert.equal(isCompressible(".css"), true);
    });

    it("should return false for .png", () => {
        assert.equal(isCompressible(".png"), false);
    });

    it("should return false for .woff2", () => {
        assert.equal(isCompressible(".woff2"), false);
    });

    it("should handle extension without dot", () => {
        assert.equal(isCompressible("html"), true);
    });

    it("should handle uppercase extension", () => {
        assert.equal(isCompressible(".HTML"), true);
    });
});
