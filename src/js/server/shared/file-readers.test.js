/**
 * @fileoverview Unified file reader tests for node:fs/promises.
 *
 * Focus: Error handling, edge cases, and text reader behavior.
 *
 * @module server/shared/file-readers.test
 */

import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, afterEach, before, describe, test } from "node:test";
import { createFileReader, createTextReader } from "./file-readers.js";

describe("file-readers - unified node:fs/promises implementation", () => {
    let testDir;

    before(async () => {
        testDir = await mkdtemp(join(tmpdir(), "sxo-test-"));
    });

    after(async () => {
        try {
            await rm(testDir, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }
    });

    afterEach(async () => {
        try {
            await rm(testDir, { recursive: true, force: true });
            await mkdir(testDir, { recursive: true });
        } catch {
            // Ignore cleanup errors
        }
    });

    test("should return true for existing files in exists()", async () => {
        const filePath = join(testDir, "existing-file.txt");
        await writeFile(filePath, "test content");

        const fileReader = createFileReader();

        const result = await fileReader.exists(filePath);

        assert.strictEqual(result, true, "Should return true for existing files");
    });

    test("should return false for non-existent files in exists()", async () => {
        const filePath = join(testDir, "nonexistent-file.txt");

        const fileReader = createFileReader();

        const result = await fileReader.exists(filePath);

        assert.strictEqual(result, false, "Should return false for non-existent files");
    });

    test("should return null for file not found in read()", async () => {
        const filePath = join(testDir, "nonexistent-file.bin");

        const fileReader = createFileReader();

        const result = await fileReader.read(filePath);

        assert.strictEqual(result, null, "Should return null for ENOENT errors");
    });

    test("should return null when stat fails for non-files", async () => {
        const dirPath = join(testDir, "directory");
        await mkdir(dirPath);

        const fileReader = createFileReader();

        const result = await fileReader.stat(dirPath);

        assert.strictEqual(result, null, "Should return null for non-files");
    });

    test("should handle empty files correctly", async () => {
        const filePath = join(testDir, "empty-file.bin");
        await writeFile(filePath, "");

        const fileReader = createFileReader();

        const result = await fileReader.read(filePath);

        assert.deepStrictEqual(result, new Uint8Array([]), "Should return empty Uint8Array for empty file");
    });

    test("should return stat data for existing files", async () => {
        const filePath = join(testDir, "file.txt");
        const content = "hello world";
        await writeFile(filePath, content);

        const fileReader = createFileReader();

        const result = await fileReader.stat(filePath);

        assert.strictEqual(result.size, content.length, "Should return correct size");
        assert.ok(result.mtime instanceof Date, "Should return a Date object for mtime");
    });

    test("should return null on stat() error for non-existent file", async () => {
        const filePath = join(testDir, "nonexistent-file.txt");

        const fileReader = createFileReader();

        const result = await fileReader.stat(filePath);

        assert.strictEqual(result, null, "Should return null for stat errors");
    });

    test("should return null on read() error for non-existent file", async () => {
        const filePath = join(testDir, "nonexistent-file.bin");

        const fileReader = createFileReader();

        const result = await fileReader.read(filePath);

        assert.strictEqual(result, null, "Should return null on read error");
    });

    test("should read file as binary correctly", async () => {
        const filePath = join(testDir, "binary-file.bin");
        const content = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
        await writeFile(filePath, Buffer.from(content));

        const fileReader = createFileReader();

        const result = await fileReader.read(filePath);

        assert.deepStrictEqual(result, content, "Should return correct binary content");
    });

    test("should read file as text correctly", async () => {
        const filePath = join(testDir, "text-file.txt");
        const content = "Hello, World!";
        await writeFile(filePath, content, "utf-8");

        const fileReader = createFileReader();

        const result = await fileReader.readText(filePath);

        assert.strictEqual(result, content, "Should return correct text content");
    });

    test("should return null on readText() error for non-existent file", async () => {
        const filePath = join(testDir, "nonexistent-file.txt");

        const fileReader = createFileReader();

        const result = await fileReader.readText(filePath);

        assert.strictEqual(result, null, "Should return null for readText errors");
    });
});

describe("createTextReader", () => {
    let testDir;

    before(async () => {
        testDir = await mkdtemp(join(tmpdir(), "sxo-test-"));
    });

    after(async () => {
        try {
            await rm(testDir, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }
    });

    test("should throw on null content", async () => {
        const mockFileReader = {
            readText: async () => null,
        };

        const textReader = createTextReader(mockFileReader);

        await assert.rejects(
            textReader("/missing/file.txt"),
            { message: "Failed to read file: /missing/file.txt" },
            "Should throw with descriptive message",
        );
    });

    test("should return content when not null", async () => {
        const mockFileReader = {
            readText: async () => "file content here",
        };

        const textReader = createTextReader(mockFileReader);

        const result = await textReader("/existing/file.txt");

        assert.strictEqual(result, "file content here", "Should return content when not null");
    });

    test("should read existing file with textReader", async () => {
        const filePath = join(testDir, "real-file.txt");
        const content = "test content";
        await writeFile(filePath, content, "utf-8");

        const fileReader = createFileReader();
        const textReader = createTextReader(fileReader);

        const result = await textReader(filePath);

        assert.strictEqual(result, content, "Should read real file correctly");
    });

    test("should throw for non-existent file with textReader", async () => {
        const filePath = join(testDir, "nonexistent-file.txt");

        const fileReader = createFileReader();
        const textReader = createTextReader(fileReader);

        await assert.rejects(
            textReader(filePath),
            { message: `Failed to read file: ${filePath}` },
            "Should throw with descriptive message for missing file",
        );
    });
});
