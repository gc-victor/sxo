/**
 * @fileoverview Tests for URL validator exception-based error handling.
 *
 * @module shared/url-validator.exception.test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decodeURIComponentSafe } from "./url-validator.js";

describe("decodeURIComponentSafe (exception-based)", () => {
    it("returns decoded pathname for valid UTF-8 URLs", () => {
        const pathname = "/hello%20world";
        const result = decodeURIComponentSafe(pathname);
        assert.strictEqual(result, "/hello world");
    });

    it("throws Error for invalid UTF-8 sequences", () => {
        const pathname = "/malformed%zz%encoding";
        assert.throws(
            () => decodeURIComponentSafe(pathname),
            (err) => {
                return err instanceof Error && err.message.includes("Failed to parse URL");
            },
            "Expected error with 'Failed to parse URL' message",
        );
    });

    it("handles empty strings", () => {
        const pathname = "";
        const result = decodeURIComponentSafe(pathname);
        assert.strictEqual(result, "");
    });

    it("handles double-encoded URLs", () => {
        const pathname = "/double%2520encoded";
        const result = decodeURIComponentSafe(pathname);
        assert.strictEqual(result, "/double%20encoded");
    });

    it("throws Error for mixed valid/invalid characters (malformed UTF-8)", () => {
        const pathname = "/valid%20chars/%F0%9F";
        assert.throws(
            () => decodeURIComponentSafe(pathname),
            (err) => {
                return err instanceof Error && err.message.includes("Failed to parse URL");
            },
            "Expected error with 'Failed to parse URL' message",
        );
    });
});
