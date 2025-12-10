/**
 * @fileoverview Tests for security headers utilities.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SECURITY_HEADERS, withSecurityHeaders } from "./security-headers.js";

describe("SECURITY_HEADERS constant", () => {
    it("should have X-Content-Type-Options: nosniff", () => {
        assert.equal(SECURITY_HEADERS["X-Content-Type-Options"], "nosniff");
    });

    it("should have X-Frame-Options: DENY", () => {
        assert.equal(SECURITY_HEADERS["X-Frame-Options"], "DENY");
    });

    it("should have Referrer-Policy: strict-origin-when-cross-origin", () => {
        assert.equal(SECURITY_HEADERS["Referrer-Policy"], "strict-origin-when-cross-origin");
    });

    it("should contain exactly 3 headers", () => {
        assert.equal(Object.keys(SECURITY_HEADERS).length, 3);
    });
});

describe("withSecurityHeaders", () => {
    it("should merge default security headers with user headers", () => {
        const userHeaders = {
            "Content-Type": "text/html",
            "Cache-Control": "no-cache",
        };

        const result = withSecurityHeaders(userHeaders);

        assert.equal(result["X-Content-Type-Options"], "nosniff");
        assert.equal(result["X-Frame-Options"], "DENY");
        assert.equal(result["Referrer-Policy"], "strict-origin-when-cross-origin");
        assert.equal(result["Content-Type"], "text/html");
        assert.equal(result["Cache-Control"], "no-cache");
    });

    it("should allow custom security headers to override defaults", () => {
        const userHeaders = {
            "Content-Type": "text/html",
        };
        const customSecurityHeaders = {
            "X-Frame-Options": "SAMEORIGIN",
            "X-Custom-Security": "custom-value",
        };

        const result = withSecurityHeaders(userHeaders, customSecurityHeaders);

        assert.equal(result["X-Content-Type-Options"], "nosniff", "Non-overridden security header should remain");
        assert.equal(result["X-Frame-Options"], "SAMEORIGIN", "Custom security header should override default");
        assert.equal(result["X-Custom-Security"], "custom-value", "Custom security header should be added");
        assert.equal(result["Referrer-Policy"], "strict-origin-when-cross-origin", "Non-overridden security header should remain");
        assert.equal(result["Content-Type"], "text/html");
    });

    it("should allow user headers to override both default and custom security headers", () => {
        const userHeaders = {
            "Content-Type": "text/html",
            "X-Frame-Options": "ALLOW-FROM https://example.com",
        };
        const customSecurityHeaders = {
            "X-Frame-Options": "SAMEORIGIN",
        };

        const result = withSecurityHeaders(userHeaders, customSecurityHeaders);

        assert.equal(result["X-Frame-Options"], "ALLOW-FROM https://example.com", "User header should override custom security header");
        assert.equal(result["Content-Type"], "text/html");
    });

    it("should handle empty user headers", () => {
        const result = withSecurityHeaders({});

        assert.equal(result["X-Content-Type-Options"], "nosniff");
        assert.equal(result["X-Frame-Options"], "DENY");
        assert.equal(result["Referrer-Policy"], "strict-origin-when-cross-origin");
        assert.equal(Object.keys(result).length, 3);
    });

    it("should handle empty custom security headers", () => {
        const userHeaders = {
            "Content-Type": "text/html",
        };

        const result = withSecurityHeaders(userHeaders, {});

        assert.equal(result["X-Content-Type-Options"], "nosniff");
        assert.equal(result["X-Frame-Options"], "DENY");
        assert.equal(result["Referrer-Policy"], "strict-origin-when-cross-origin");
        assert.equal(result["Content-Type"], "text/html");
    });

    it("should handle null/undefined custom security headers", () => {
        const userHeaders = {
            "Content-Type": "text/html",
        };

        const resultNull = withSecurityHeaders(userHeaders, null);
        const resultUndefined = withSecurityHeaders(userHeaders, undefined);

        assert.equal(resultNull["X-Content-Type-Options"], "nosniff");
        assert.equal(resultNull["X-Frame-Options"], "DENY");
        assert.equal(resultNull["Content-Type"], "text/html");

        assert.equal(resultUndefined["X-Content-Type-Options"], "nosniff");
        assert.equal(resultUndefined["X-Frame-Options"], "DENY");
        assert.equal(resultUndefined["Content-Type"], "text/html");
    });

    it("should preserve all user headers", () => {
        const userHeaders = {
            "Content-Type": "application/json",
            "Cache-Control": "max-age=3600",
            ETag: 'W/"123-abc"',
            "Content-Length": "1024",
        };

        const result = withSecurityHeaders(userHeaders);

        assert.equal(result["Content-Type"], "application/json");
        assert.equal(result["Cache-Control"], "max-age=3600");
        assert.equal(result.ETag, 'W/"123-abc"');
        assert.equal(result["Content-Length"], "1024");
        assert.equal(result["X-Content-Type-Options"], "nosniff");
        assert.equal(result["X-Frame-Options"], "DENY");
    });

    it("should not mutate input objects", () => {
        const userHeaders = { "Content-Type": "text/html" };
        const customSecurityHeaders = { "X-Frame-Options": "SAMEORIGIN" };
        const userHeadersCopy = { ...userHeaders };
        const customSecurityHeadersCopy = { ...customSecurityHeaders };

        withSecurityHeaders(userHeaders, customSecurityHeaders);

        assert.deepEqual(userHeaders, userHeadersCopy, "User headers should not be mutated");
        assert.deepEqual(customSecurityHeaders, customSecurityHeadersCopy, "Custom security headers should not be mutated");
    });
});
