/**
 * @fileoverview Tests for server/utils/error-pages.js module.
 *
 * @module server/utils/error-pages.test
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { PAGES_DIR } from "../../constants.js";
import { resolve404Page, resolve500Page, resolveErrorPage } from "./error-pages.js";

describe("server/utils/error-pages.js", () => {
    it("should resolve 404 page when it exists as .tsx", (t) => {
        const accessMock = t.mock.method(fs, "accessSync", (p) => {
            if (p === path.join(PAGES_DIR, "404.tsx")) return;
            throw new Error("ENOENT");
        });

        try {
            const result = resolve404Page();
            assert.strictEqual(result, path.join(PAGES_DIR, "404.tsx"));
        } finally {
            accessMock.mock.restore();
        }
    });

    it("should fallback to .jsx for 404 page if .tsx is missing", (t) => {
        const accessMock = t.mock.method(fs, "accessSync", (p) => {
            if (p === path.join(PAGES_DIR, "404.jsx")) return;
            throw new Error("ENOENT");
        });

        try {
            const result = resolve404Page();
            assert.strictEqual(result, path.join(PAGES_DIR, "404.jsx"));
        } finally {
            accessMock.mock.restore();
        }
    });

    it("should return null if 404 page does not exist", (t) => {
        const accessMock = t.mock.method(fs, "accessSync", () => {
            throw new Error("ENOENT");
        });

        try {
            const result = resolve404Page();
            assert.strictEqual(result, null);
        } finally {
            accessMock.mock.restore();
        }
    });

    it("should resolve 500 page when it exists as .tsx", (t) => {
        const accessMock = t.mock.method(fs, "accessSync", (p) => {
            if (p === path.join(PAGES_DIR, "500.tsx")) return;
            throw new Error("ENOENT");
        });

        try {
            const result = resolve500Page();
            assert.strictEqual(result, path.join(PAGES_DIR, "500.tsx"));
        } finally {
            accessMock.mock.restore();
        }
    });

    it("should fallback to .jsx for 500 page if .tsx is missing", (t) => {
        const accessMock = t.mock.method(fs, "accessSync", (p) => {
            if (p === path.join(PAGES_DIR, "500.jsx")) return;
            throw new Error("ENOENT");
        });

        try {
            const result = resolve500Page();
            assert.strictEqual(result, path.join(PAGES_DIR, "500.jsx"));
        } finally {
            accessMock.mock.restore();
        }
    });

    it("should resolve 404 page from folder index.tsx", (t) => {
        const accessMock = t.mock.method(fs, "accessSync", (p) => {
            if (p === path.join(PAGES_DIR, "404/index.tsx")) return;
            throw new Error("ENOENT");
        });

        try {
            const result = resolve404Page();
            assert.strictEqual(result, path.join(PAGES_DIR, "404/index.tsx"));
        } finally {
            accessMock.mock.restore();
        }
    });

    it("should fallback to folder index.jsx for 404 page", (t) => {
        const accessMock = t.mock.method(fs, "accessSync", (p) => {
            if (p === path.join(PAGES_DIR, "404/index.jsx")) return;
            throw new Error("ENOENT");
        });

        try {
            const result = resolve404Page();
            assert.strictEqual(result, path.join(PAGES_DIR, "404/index.jsx"));
        } finally {
            accessMock.mock.restore();
        }
    });

    it("should prefer flat .tsx over folder index.tsx", (t) => {
        const accessMock = t.mock.method(fs, "accessSync", (p) => {
            // Flat file exists, return it before checking folder
            if (p === path.join(PAGES_DIR, "404.tsx")) return;
            throw new Error("ENOENT");
        });

        try {
            const result = resolve404Page();
            assert.strictEqual(result, path.join(PAGES_DIR, "404.tsx"));
        } finally {
            accessMock.mock.restore();
        }
    });

    it("should prefer flat .jsx over folder index.tsx", (t) => {
        const accessMock = t.mock.method(fs, "accessSync", (p) => {
            // Only flat jsx exists, not tsx
            if (p === path.join(PAGES_DIR, "404.jsx")) return;
            throw new Error("ENOENT");
        });

        try {
            const result = resolve404Page();
            assert.strictEqual(result, path.join(PAGES_DIR, "404.jsx"));
        } finally {
            accessMock.mock.restore();
        }
    });

    it("should resolve 500 page from folder index.tsx", (t) => {
        const accessMock = t.mock.method(fs, "accessSync", (p) => {
            if (p === path.join(PAGES_DIR, "500/index.tsx")) return;
            throw new Error("ENOENT");
        });

        try {
            const result = resolve500Page();
            assert.strictEqual(result, path.join(PAGES_DIR, "500/index.tsx"));
        } finally {
            accessMock.mock.restore();
        }
    });

    it("should throw error for unsupported page name", () => {
        assert.throws(() => resolveErrorPage("403"), /Unsupported special page "403"/);
    });
});
