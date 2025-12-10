/**
 * @fileoverview Tests for cache utilities.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CACHE_IMMUTABLE, CACHE_MUST_REVALIDATE, CACHE_NO_STORE, CACHE_SHORT, weakEtag, weakEtagFromStat } from "./cache.js";

describe("Cache control constants", () => {
    it("should have CACHE_IMMUTABLE for hashed assets", () => {
        assert.equal(CACHE_IMMUTABLE, "public, max-age=31536000, immutable");
    });

    it("should have CACHE_SHORT for non-hashed assets", () => {
        assert.equal(CACHE_SHORT, "public, max-age=300");
    });

    it("should have CACHE_NO_STORE for errors", () => {
        assert.equal(CACHE_NO_STORE, "no-store");
    });

    it("should have CACHE_MUST_REVALIDATE for 404s", () => {
        assert.equal(CACHE_MUST_REVALIDATE, "public, max-age=0, must-revalidate");
    });
});

describe("weakEtag", () => {
    it("should generate weak etag from size and mtime", () => {
        const size = 1024;
        const mtime = 1700000000000;
        const result = weakEtag(size, mtime);
        // Verify format: W/"<sizeHex>-<mtimeHex>"
        const expected = `W/"${size.toString(16)}-${Math.floor(mtime).toString(16)}"`;
        assert.equal(result, expected);
    });

    it("should handle zero values", () => {
        const result = weakEtag(0, 0);
        assert.equal(result, 'W/"0-0"');
    });

    it("should handle large file sizes", () => {
        const size = 10000000;
        const mtime = 1700000000000;
        const result = weakEtag(size, mtime);
        const expected = `W/"${size.toString(16)}-${Math.floor(mtime).toString(16)}"`;
        assert.equal(result, expected);
    });
});

describe("weakEtagFromStat", () => {
    it("should generate etag from Node.js-style stat object", () => {
        const size = 1024;
        const mtime = 1700000000000;
        const stat = { size, mtimeMs: mtime };
        const result = weakEtagFromStat(stat);
        const expected = `W/"${size.toString(16)}-${Math.floor(mtime).toString(16)}"`;
        assert.equal(result, expected);
    });

    it("should generate etag from Deno-style stat object with mtime Date", () => {
        const size = 1024;
        const mtime = 1700000000000;
        const stat = { size, mtime: new Date(mtime) };
        const result = weakEtagFromStat(stat);
        const expected = `W/"${size.toString(16)}-${Math.floor(mtime).toString(16)}"`;
        assert.equal(result, expected);
    });

    it("should handle null mtime", () => {
        const stat = { size: 1024, mtime: null };
        const result = weakEtagFromStat(stat);
        assert.equal(result, 'W/"400-0"');
    });
});
