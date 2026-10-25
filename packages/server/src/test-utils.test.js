/**
 * @fileoverview Tests for shared test utilities.
 *
 * Tests the correctness of reusable test helper functions:
 * - withTempProject: directory creation and cleanup
 * - writeFile: path resolution and content writing
 * - withEnvCapture: environment isolation and restoration
 * - mockConsoleWarn: warning capture and restoration
 */

import assert from "node:assert/strict";
import fsp from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { createSymlinkTestStructure, mockConsoleError, mockConsoleWarn, withEnvCapture, withTempProject, writeFile } from "./test-utils.js";

test("test-utils: createSymlinkTestStructure marks privilege-code errors for platform skips", async (t) => {
    const symlinkError = Object.assign(new Error("Operation denied"), { code: "EPERM" });

    await withTempProject(async (baseDir) => {
        t.mock.method(fsp, "symlink", async () => {
            throw symlinkError;
        });

        await assert.rejects(createSymlinkTestStructure(baseDir, "privilege-code"), (error) => {
            assert.equal(error.message, "Symlink test skipped - requires elevated privileges on Windows");
            assert.equal(error.skipPlatform, "windows");
            assert.equal(error.symlinkTest, true);
            return true;
        });
    });
});

test("test-utils: createSymlinkTestStructure marks Windows privilege messages for platform skips", async (t) => {
    const symlinkError = new Error("The required privilege is not held");

    await withTempProject(async (baseDir) => {
        t.mock.method(fsp, "symlink", async () => {
            throw symlinkError;
        });

        await assert.rejects(createSymlinkTestStructure(baseDir, "privilege-message"), (error) => {
            assert.equal(error.message, "Symlink test skipped - requires elevated privileges on Windows");
            assert.equal(error.skipPlatform, "windows");
            assert.equal(error.symlinkTest, true);
            return true;
        });
    });
});

test("test-utils: createSymlinkTestStructure rethrows unrelated symlink errors", async (t) => {
    const symlinkError = Object.assign(new Error("Permission denied"), { code: "EIO" });

    await withTempProject(async (baseDir) => {
        t.mock.method(fsp, "symlink", async () => {
            throw symlinkError;
        });

        await assert.rejects(createSymlinkTestStructure(baseDir, "unrelated-error"), (error) => {
            assert.strictEqual(error, symlinkError);
            return true;
        });
    });
});

test("test-utils: createSymlinkTestStructure rethrows non-error symlink rejections", async (t) => {
    for (const [testName, rejection] of [
        ["null", null],
        ["string", "not an error object"],
    ]) {
        await t.test(testName, async (subtest) => {
            await withTempProject(async (baseDir) => {
                subtest.mock.method(fsp, "symlink", async () => {
                    throw rejection;
                });

                await assert.rejects(createSymlinkTestStructure(baseDir, testName), (error) => {
                    assert.strictEqual(error, rejection);
                    return true;
                });
            });
        });
    }
});

test("test-utils: withTempProject creates and cleans up directory", async () => {
    const createdDirs = [];
    const tempPaths = [];

    // Verify directory creation
    await withTempProject(async (dir) => {
        tempPaths.push(dir);
        createdDirs.push(dir);

        // Verify directory exists
        const stat = await fsp.stat(dir);
        assert.equal(stat.isDirectory(), true);

        // Verify dir is in system temp directory
        assert.ok(path.dirname(dir).startsWith(path.join(process.env.TMPDIR || process.env.TEMP || "/tmp")));
    });

    // Verify directory was cleaned up
    for (const dir of tempPaths) {
        try {
            await fsp.stat(dir);
            assert.fail(`Temp directory ${dir} should have been cleaned up`);
        } catch (err) {
            assert.equal(err.code, "ENOENT", "Directory should not exist after cleanup");
        }
    }
});

test("test-utils: withTempProject handles exceptions and still cleans up", async () => {
    let capturedDir;
    try {
        const tempDir = await withTempProject(async (dir) => {
            capturedDir = dir;
            // Write a file to verify it's deleted later
            await writeFile(dir, "test.txt", "content");

            // Throw an error to test cleanup in error case
            throw new Error("Test error");
        });

        // tempDir should still be the directory path even though function threw
        assert.ok(tempDir);
        assert.equal(tempDir, capturedDir);

        // Even though function threw, directory should be cleaned up
        try {
            await fsp.stat(tempDir);
            assert.fail("Temp directory should have been cleaned up after exception");
        } catch (err) {
            assert.equal(err.code, "ENOENT");
        }
    } catch (err) {
        assert.equal(err.message, "Test error");
    }
});

test("test-utils: writeFile creates directories and writes content", async () => {
    await withTempProject(async (dir) => {
        // Test single-level directory
        const filePath1 = await writeFile(dir, "test.txt", "Hello, World!");
        assert.equal(path.basename(filePath1), "test.txt");
        assert.equal(await fsp.readFile(filePath1, "utf8"), "Hello, World!");

        // Test nested directories
        const filePath2 = await writeFile(dir, "deep/nested/path.txt", "Nested content");
        assert.ok(filePath2.includes("deep/nested/path.txt"));
        assert.equal(await fsp.readFile(filePath2, "utf8"), "Nested content");

        // Verify file was actually written
        const stat1 = await fsp.stat(filePath1);
        const stat2 = await fsp.stat(filePath2);
        assert.equal(stat1.isFile(), true);
        assert.equal(stat2.isFile(), true);
    });
});

test("test-utils: writeFile overwrites existing files", async () => {
    await withTempProject(async (dir) => {
        const filePath = await writeFile(dir, "test.txt", "Original content");
        assert.equal(await fsp.readFile(filePath, "utf8"), "Original content");

        // Overwrite
        await writeFile(dir, "test.txt", "Updated content");
        assert.equal(await fsp.readFile(filePath, "utf8"), "Updated content");
    });
});

test("test-utils: withEnvCapture isolates and restores environment", async () => {
    // Set initial values
    process.env.PORT = "3000";
    process.env.PAGES_DIR = "src/pages";
    process.env.OPEN = "true";
    const originalPort = process.env.PORT;

    await withEnvCapture(async () => {
        // Modify environment inside capture
        process.env.PORT = "4100";
        process.env.PAGES_DIR = "www/pages";
        process.env.OPEN = "false";
        process.env.OUTPUT_DIR = "build"; // New key

        // Verify modifications are visible inside
        assert.equal(process.env.PORT, "4100");
        assert.equal(process.env.PAGES_DIR, "www/pages");
        assert.equal(process.env.OPEN, "false");
        assert.equal(process.env.OUTPUT_DIR, "build");
    });

    // Verify original environment restored
    assert.equal(process.env.PORT, originalPort);
    assert.equal(process.env.PAGES_DIR, "src/pages");
    assert.equal(process.env.OPEN, "true");
    assert.equal(process.env.OUTPUT_DIR, undefined); // New key deleted
});

test("test-utils: withEnvCapture handles exceptions and still restores", async () => {
    process.env.PORT = "3000";
    process.env.PAGES_DIR = "src/pages";

    try {
        await withEnvCapture(async () => {
            process.env.PORT = "4100";
            process.env.PAGES_DIR = "www/pages";
            throw new Error("Test error");
        });
        assert.fail("Should have thrown an error");
    } catch (err) {
        assert.equal(err.message, "Test error");
    }

    // Verify environment restored even after exception
    assert.equal(process.env.PORT, "3000");
    assert.equal(process.env.PAGES_DIR, "src/pages");
});

test("test-utils: mockConsoleWarn captures warnings", async (t) => {
    const mock = mockConsoleWarn(t);

    console.warn("Warning 1");
    console.warn("Warning 2");
    console.warn("Warning 3");

    const warnings = mock.getWarnings();
    assert.equal(warnings.length, 3);
    assert.equal(warnings[0], "Warning 1");
    assert.equal(warnings[1], "Warning 2");
    assert.equal(warnings[2], "Warning 3");
});

test("test-utils: mockConsoleWarn handles multiple arguments", async (t) => {
    const mock = mockConsoleWarn(t);

    console.warn("Error:", "something went wrong", "code:", 500);

    const warnings = mock.getWarnings();
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0], "Error: something went wrong code: 500");
});

test("test-utils: mockConsoleWarn isolates multiple mocks", async (t) => {
    const mock1 = mockConsoleWarn(t);
    console.warn("Mock 1 warning");

    assert.equal(mock1.getWarnings().length, 1);

    const mock2 = mockConsoleWarn(t);
    console.warn("Mock 2 warning");

    assert.equal(mock2.getWarnings().length, 1);
});

test("test-utils: mockConsoleWarn automatic cleanup", async (t) => {
    const originalWarn = console.warn;
    await t.test("mocked scope", (childT) => {
        mockConsoleWarn(childT);
        console.warn("captured");
    });
    assert.strictEqual(console.warn, originalWarn, "console.warn should be restored after subtest finishes");
});

test("test-utils: mockConsoleError captures errors", async (t) => {
    const mock = mockConsoleError(t);

    console.error("Error 1");
    console.error("Error 2");

    const errors = mock.getErrors();
    assert.equal(errors.length, 2);
    assert.equal(errors[0], "Error 1");
    assert.equal(errors[1], "Error 2");
});

test("test-utils: mockConsoleError handles multiple arguments", async (t) => {
    const mock = mockConsoleError(t);

    console.error("Error:", "something went wrong", "code:", 500);

    const errors = mock.getErrors();
    assert.equal(errors.length, 1);
    assert.equal(errors[0], "Error: something went wrong code: 500");
});

test("test-utils: mockConsoleError isolates multiple mocks", async (t) => {
    const mock1 = mockConsoleError(t);
    console.error("Mock 1 error");

    assert.equal(mock1.getErrors().length, 1);

    const mock2 = mockConsoleError(t);
    console.error("Mock 2 error");

    assert.equal(mock2.getErrors().length, 1);
});

test("test-utils: mockConsoleError automatic cleanup", async (t) => {
    const originalError = console.error;
    await t.test("mocked scope", (childT) => {
        mockConsoleError(childT);
        console.error("captured");
    });
    assert.strictEqual(console.error, originalError, "console.error should be restored after subtest finishes");
});
