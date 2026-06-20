/**
 * @fileoverview Tests for bun.js module.
 *
 * Tests Bun-specific dev server adapter functionality.
 * Note: Full top-level execution tests require Bun runtime.
 * This file focuses on testable utility functions.
 *
 * @module server/dev/bun
 */

import { deepStrictEqual, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";

import { hasFileExtension } from "../shared/path.js";

describe("bun.js", () => {
    describe("hasFileExtension", () => {
        it("should return true for path with file extension", () => {
            const pathnames = ["/styles/main.css", "/scripts/app.js", "/images/logo.png", "/favicon.ico", "/data.json", "/index.html"];

            for (const pathname of pathnames) {
                strictEqual(hasFileExtension(pathname), true);
            }
        });

        it("should return false for path without file extension", () => {
            const pathnames = ["/", "/about", "/blog/post", "/users/123", "/api/endpoint"];

            for (const pathname of pathnames) {
                strictEqual(hasFileExtension(pathname), false, `${pathname} should not have file extension`);
            }
        });

        it("should handle paths with multiple dots", () => {
            const testCases = [
                { path: "/file.min.js", expected: true },
                { path: "/bundle.prod.js", expected: true },
                { path: "/app.test.js", expected: true },
                { path: "/version.2.0.js", expected: true },
            ];

            for (const { path, expected } of testCases) {
                strictEqual(hasFileExtension(path), expected);
            }
        });

        it("should return false for paths ending with slash", () => {
            const pathnames = ["/static/", "/assets/css/", "/dist/js/"];

            for (const pathname of pathnames) {
                strictEqual(hasFileExtension(pathname), false);
            }
        });

        it("should return false for empty string", () => {
            const result = hasFileExtension("");

            strictEqual(result, false);
        });

        it("should handle paths with query parameters", () => {
            const pathnames = ["/style.css?v=1", "/script.js?hash=abc123", "/image.png?width=200&height=200"];

            for (const pathname of pathnames) {
                deepStrictEqual(hasFileExtension(pathname), true);
            }
        });

        it("should handle special characters in filename", () => {
            const pathnames = ["/file-name.js", "/file_name.js", "/file.name.js", "/file(name).js", "/file[1].js"];

            for (const pathname of pathnames) {
                deepStrictEqual(hasFileExtension(pathname), true);
            }
        });

        it("should detect common web asset extensions", () => {
            const extensions = [
                ".html",
                ".htm",
                ".css",
                ".js",
                ".json",
                ".png",
                ".jpg",
                ".jpeg",
                ".gif",
                ".svg",
                ".ico",
                ".woff",
                ".woff2",
                ".ttf",
                ".eot",
                ".otf",
                ".webp",
                ".avif",
            ];

            for (const ext of extensions) {
                const pathname = `/test${ext}`;
                strictEqual(hasFileExtension(pathname), true);
            }
        });

        it("should return false for dotfiles (files starting with dot)", () => {
            strictEqual(hasFileExtension("/.gitignore"), false);
            strictEqual(hasFileExtension("/.env"), false);
            strictEqual(hasFileExtension("/.env.local"), false);
            strictEqual(hasFileExtension("/config/.htaccess"), false);
        });
    });

    describe("Regex pattern validation", () => {
        it("should match standard file extension pattern", () => {
            const pattern = /\.[^/.]+$/;

            strictEqual(pattern.test("/file.js"), true);
            strictEqual(pattern.test("/file.css"), true);
            strictEqual(pattern.test("/file.min.js"), true);
            strictEqual(pattern.test("/file"), false);
            strictEqual(pattern.test("/path/"), false);
            strictEqual(pattern.test("/path/to/file"), false);
        });
    });
});
