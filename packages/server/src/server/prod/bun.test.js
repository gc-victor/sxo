/**
 * @fileoverview Bun production server adapter regression tests.
 *
 * These tests perform static analysis on the source file to prevent
 * regressions like duplicate server startup blocks.
 *
 * @module server/prod/bun.test
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Bun production adapter", () => {
    describe("server startup", () => {
        test("when analyzing the source file, Bun.serve() should appear exactly once", () => {
            // Arrange: Read the source file as text
            const sourcePath = path.join(__dirname, "bun.js");
            const sourceContent = readFileSync(sourcePath, "utf-8");

            // Act: Count occurrences of "Bun.serve("
            const matches = sourceContent.match(/Bun\.serve\(/g);
            const occurrenceCount = matches ? matches.length : 0;

            // Assert: Should appear exactly once
            assert.strictEqual(
                occurrenceCount,
                1,
                `Expected Bun.serve() to appear exactly once, but found ${occurrenceCount} occurrences. ` +
                    `This prevents duplicate server startup in production.`,
            );
        });
    });
});
