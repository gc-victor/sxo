import assert from "node:assert/strict";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { after, before, beforeEach, describe, it, mock } from "node:test";

import { checkDirectoryExists, handleCreateCommand, selectRuntime } from "./create.js";
import { log } from "./ui.js";

// Store originals
const originalFetch = global.fetch;
const originalIsTTY = process.stdout.isTTY;

// Helper to manage temp directories
async function withTempDir(fn) {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "sxo-create-test-"));
    try {
        return await fn(dir);
    } finally {
        await fsp.rm(dir, { recursive: true, force: true }).catch(() => {});
    }
}

describe("cli/create", () => {
    let logMocks;

    before(() => {
        // Silence logs
        logMocks = {
            info: mock.method(log, "info", () => {}),
            success: mock.method(log, "success", () => {}),
            warn: mock.method(log, "warn", () => {}),
            error: mock.method(log, "error", () => {}),
        };
    });

    after(() => {
        mock.restoreAll();
        if (originalFetch) global.fetch = originalFetch;
        logMocks = null;
    });

    beforeEach(() => {
        logMocks.info.mock.resetCalls();
        logMocks.success.mock.resetCalls();
        logMocks.warn.mock.resetCalls();
        logMocks.error.mock.resetCalls();
        global.fetch = mock.fn(); // Reset fetch mock
    });

    describe("checkDirectoryExists", () => {
        it("returns {exists:false, shouldProceed:true} if dir missing", async () => {
            await withTempDir(async (cwd) => {
                const target = path.join(cwd, "missing");
                const res = await checkDirectoryExists(target, "missing");
                assert.deepEqual(res, { exists: false, shouldProceed: true });
            });
        });

        it("returns {exists:true, shouldProceed:false} if dir exists and user says no (default non-TTY)", async () => {
            await withTempDir(async (cwd) => {
                const target = path.join(cwd, "exists");
                await fsp.mkdir(target);

                // In non-TTY (test) environment, askYesNo returns false
                const res = await checkDirectoryExists(target, "exists");
                assert.deepEqual(res, { exists: true, shouldProceed: false });
            });
        });
    });

    describe("selectRuntime", () => {
        it('returns "node" in non-TTY environment (default)', async () => {
            // Force non-TTY
            Object.defineProperty(process.stdout, "isTTY", { value: false, configurable: true });

            try {
                // Import the function (will fail initially since it doesn't exist)
                const { selectRuntime } = await import("./create.js");
                const result = await selectRuntime();
                assert.equal(result, "node");
            } finally {
                // Restore TTY
                Object.defineProperty(process.stdout, "isTTY", { value: originalIsTTY, configurable: true });
            }
        });

        it('returns "node" when user presses Enter (default selection)', async () => {
            // Temporarily set NODE_ENV to undefined to test interactive behavior
            const originalNodeEnv = process.env.NODE_ENV;
            delete process.env.NODE_ENV;

            // Mock readline to simulate Enter (empty input)
            const questionMock = mock.fn((_q, cb) => cb(""));
            const closeMock = mock.fn();

            mock.method(readline, "createInterface", () => ({
                question: questionMock,
                close: closeMock,
            }));

            // Force TTY to true after mocks
            const originalIsTTY = process.stdout.isTTY;
            Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true });

            try {
                const { selectRuntime } = await import("./create.js");
                const result = await selectRuntime();
                assert.equal(result, "node");
                assert.equal(questionMock.mock.callCount(), 1);
                assert.equal(closeMock.mock.callCount(), 1);
            } finally {
                // Restore
                Object.defineProperty(process.stdout, "isTTY", { value: originalIsTTY, configurable: true });
                process.env.NODE_ENV = originalNodeEnv;
            }
        });

        it('returns "bun" when user inputs 2', async () => {
            const originalNodeEnv = process.env.NODE_ENV;
            delete process.env.NODE_ENV;

            Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true });

            const questionMock = mock.fn((_q, cb) => cb("2"));
            const closeMock = mock.fn();

            mock.method(readline, "createInterface", () => ({
                question: questionMock,
                close: closeMock,
            }));

            try {
                const { selectRuntime } = await import("./create.js");
                const result = await selectRuntime();
                assert.equal(result, "bun");
                assert.equal(questionMock.mock.callCount(), 1);
                assert.equal(closeMock.mock.callCount(), 1);
            } finally {
                Object.defineProperty(process.stdout, "isTTY", { value: originalIsTTY, configurable: true });
                process.env.NODE_ENV = originalNodeEnv;
            }
        });

        it('returns "deno" when user inputs 3', async () => {
            const originalNodeEnv = process.env.NODE_ENV;
            delete process.env.NODE_ENV;

            Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true });

            const questionMock = mock.fn((_q, cb) => cb("3"));
            const closeMock = mock.fn();

            mock.method(readline, "createInterface", () => ({
                question: questionMock,
                close: closeMock,
            }));

            try {
                const { selectRuntime } = await import("./create.js");
                const result = await selectRuntime();
                assert.equal(result, "deno");
                assert.equal(questionMock.mock.callCount(), 1);
                assert.equal(closeMock.mock.callCount(), 1);
            } finally {
                Object.defineProperty(process.stdout, "isTTY", { value: originalIsTTY, configurable: true });
                process.env.NODE_ENV = originalNodeEnv;
            }
        });

        it('returns "workers" when user inputs 4', async () => {
            const originalNodeEnv = process.env.NODE_ENV;
            delete process.env.NODE_ENV;

            Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true });

            const questionMock = mock.fn((_q, cb) => cb("4"));
            const closeMock = mock.fn();

            mock.method(readline, "createInterface", () => ({
                question: questionMock,
                close: closeMock,
            }));

            try {
                const { selectRuntime } = await import("./create.js");
                const result = await selectRuntime();
                assert.equal(result, "workers");
                assert.equal(questionMock.mock.callCount(), 1);
                assert.equal(closeMock.mock.callCount(), 1);
            } finally {
                Object.defineProperty(process.stdout, "isTTY", { value: originalIsTTY, configurable: true });
                process.env.NODE_ENV = originalNodeEnv;
            }
        });

        it("re-prompts on invalid input (e.g., 5, abc)", async () => {
            const originalNodeEnv = process.env.NODE_ENV;
            delete process.env.NODE_ENV;

            Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true });

            let callCount = 0;
            const questionMock = mock.fn((_q, cb) => {
                callCount++;
                if (callCount === 1) {
                    cb("5"); // Invalid input first
                } else {
                    cb("1"); // Valid input second
                }
            });
            const closeMock = mock.fn();

            mock.method(readline, "createInterface", () => ({
                question: questionMock,
                close: closeMock,
            }));

            try {
                const { selectRuntime } = await import("./create.js");
                const result = await selectRuntime();
                assert.equal(result, "node");
                assert.equal(questionMock.mock.callCount(), 2); // Called twice: invalid then valid
                assert.equal(closeMock.mock.callCount(), 1);
            } finally {
                Object.defineProperty(process.stdout, "isTTY", { value: originalIsTTY, configurable: true });
                process.env.NODE_ENV = originalNodeEnv;
            }
        });

        it("fetchTemplateFileList constructs path for node runtime", async () => {
            const { fetchTemplateFileList } = await import("./create.js");

            global.fetch = mock.fn(async (url) => {
                if (url === "https://api.github.com/repos/gc-victor/sxo/git/trees/main:templates/node?recursive=1") {
                    return {
                        ok: true,
                        json: async () => ({ tree: [] }),
                    };
                }
                return { ok: false };
            });

            try {
                await fetchTemplateFileList("node");
                assert.equal(global.fetch.mock.callCount(), 1);
                const calledUrl = global.fetch.mock.calls[0].arguments[0];
                assert.equal(calledUrl, "https://api.github.com/repos/gc-victor/sxo/git/trees/main:templates/node?recursive=1");
            } finally {
                global.fetch = mock.fn();
            }
        });

        it("fetchTemplateFileList constructs path for bun runtime", async () => {
            const { fetchTemplateFileList } = await import("./create.js");

            global.fetch = mock.fn(async (url) => {
                if (url === "https://api.github.com/repos/gc-victor/sxo/git/trees/main:templates/bun?recursive=1") {
                    return {
                        ok: true,
                        json: async () => ({ tree: [] }),
                    };
                }
                return { ok: false };
            });

            try {
                await fetchTemplateFileList("bun");
                assert.equal(global.fetch.mock.callCount(), 1);
                const calledUrl = global.fetch.mock.calls[0].arguments[0];
                assert.equal(calledUrl, "https://api.github.com/repos/gc-victor/sxo/git/trees/main:templates/bun?recursive=1");
            } finally {
                global.fetch = mock.fn();
            }
        });

        it("fetchTemplateFile constructs correct raw URL", async () => {
            const { fetchTemplateFile } = await import("./create.js");

            global.fetch = mock.fn(async (url) => {
                if (url === "https://raw.githubusercontent.com/gc-victor/sxo/main/templates/node/package.json") {
                    return {
                        ok: true,
                        arrayBuffer: async () => Buffer.from('{"name": "test"}'),
                    };
                }
                return { ok: false, status: 404, statusText: "Not Found" };
            });

            try {
                // The implementation expects the full repo path
                await fetchTemplateFile("templates/node/package.json", "test", "node");
                assert.equal(global.fetch.mock.callCount(), 1);
                const calledUrl = global.fetch.mock.calls[0].arguments[0];
                assert.equal(calledUrl, "https://raw.githubusercontent.com/gc-victor/sxo/main/templates/node/package.json");
            } finally {
                global.fetch = mock.fn();
            }
        });
    });

    describe("handleCreateCommand", () => {
        const GITHUB_API_TREE = "https://api.github.com/repos/gc-victor/sxo/git/trees/main:templates/node?recursive=1";
        const RAW_BASE = "https://raw.githubusercontent.com/gc-victor/sxo/main/templates/node/";

        function mockFetchForSuccess(runtime = "node") {
            const apiTree = `https://api.github.com/repos/gc-victor/sxo/git/trees/main:templates/${runtime}?recursive=1`;
            const rawBase = `https://raw.githubusercontent.com/gc-victor/sxo/main/templates/${runtime}/`;

            global.fetch = mock.fn(async (url) => {
                if (url === apiTree) {
                    return {
                        ok: true,
                        json: async () => ({
                            tree: [
                                { path: "package.json", type: "blob" },
                                { path: "assets/logo.png", type: "blob" },
                                { path: "ignore-me", type: "tree" }, // Should be ignored
                            ],
                        }),
                    };
                }
                if (url.startsWith(rawBase)) {
                    const rel = url.replace(rawBase, "");
                    if (rel === "package.json") {
                        // Text file with interpolation placeholder
                        return {
                            ok: true,
                            arrayBuffer: async () => Buffer.from('{ "name": "project_name" }'),
                        };
                    }
                    if (rel === "assets/logo.png") {
                        // Binary file (simulated with null byte)
                        return {
                            ok: true,
                            arrayBuffer: async () => Buffer.from([0x89, 0x50, 0x00, 0x47]), // Has null byte
                        };
                    }
                }
                return { ok: false, status: 404, statusText: "Not Found" };
            });
        }

        it("creates a new project successfully", async () => {
            await withTempDir(async (cwd) => {
                mockFetchForSuccess();

                const result = await handleCreateCommand("my-app", { cwd });

                assert.equal(result, true);

                // Verify files
                const pkgPath = path.join(cwd, "my-app", "package.json");
                const logoPath = path.join(cwd, "my-app", "assets", "logo.png");

                assert.equal(await fsp.readFile(pkgPath, "utf8"), '{ "name": "my-app" }', "Should interpolate project_name");

                const logoBuf = await fsp.readFile(logoPath);
                assert.equal(Buffer.compare(logoBuf, Buffer.from([0x89, 0x50, 0x00, 0x47])), 0, "Should write binary correctly");

                assert.equal(logMocks.success.mock.callCount(), 1);
            });
        });

        it("handles '.' as project name (current directory)", async () => {
            Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true });

            // Mock readline to simulate "yes" answer
            const questionMock = mock.fn((_q, cb) => cb("yes"));
            const closeMock = mock.fn();

            mock.method(readline, "createInterface", () => ({
                question: questionMock,
                close: closeMock,
            }));

            // Mock selectRuntime to avoid readline conflicts
            selectRuntime.mock = mock.fn(() => Promise.resolve("node"));

            try {
                await withTempDir(async (cwd) => {
                    mockFetchForSuccess();

                    // We use cwd directly. Ensure it's empty-ish (mkdtemp is empty)
                    const result = await handleCreateCommand(".", { cwd });

                    assert.equal(result, true);
                    const pkgPath = path.join(cwd, "package.json");
                    const content = await fsp.readFile(pkgPath, "utf8");
                    const dirName = path.basename(cwd);
                    assert.equal(content, `{ "name": "${dirName}" }`);
                });
            } finally {
                // Restore TTY
                Object.defineProperty(process.stdout, "isTTY", { value: originalIsTTY, configurable: true });
            }
        });

        it("cancels if directory exists and user declines", async () => {
            await withTempDir(async (cwd) => {
                const projectDir = path.join(cwd, "exists");
                await fsp.mkdir(projectDir);

                const result = await handleCreateCommand("exists", { cwd });
                assert.equal(result, false);
                assert.equal(logMocks.info.mock.calls[0].arguments[0], "Project creation cancelled");
            });
        });

        it("handles empty template list from GitHub", async () => {
            await withTempDir(async (cwd) => {
                global.fetch = mock.fn(async (url) => {
                    if (url === GITHUB_API_TREE) {
                        return {
                            ok: true,
                            json: async () => ({ tree: [] }),
                        };
                    }
                    return { ok: false };
                });

                const result = await handleCreateCommand("empty-repo", { cwd });
                assert.equal(result, false);

                const errorMsg = logMocks.error.mock.calls[0].arguments[0];
                assert.match(errorMsg, /No template files found/);
            });
        });

        it("handles GitHub API 404 for templates directory", async () => {
            await withTempDir(async (cwd) => {
                global.fetch = mock.fn(async (url) => {
                    if (url === GITHUB_API_TREE) {
                        return {
                            ok: false,
                            status: 404,
                            statusText: "Not Found",
                        };
                    }
                    return { ok: false };
                });

                const result = await handleCreateCommand("missing-templates", { cwd });
                assert.equal(result, false);
                assert.match(logMocks.error.mock.calls[0].arguments[0], /Templates directory not found/);
            });
        });

        it("warns if GitHub tree is truncated", async () => {
            await withTempDir(async (cwd) => {
                global.fetch = mock.fn(async (url) => {
                    if (url === GITHUB_API_TREE) {
                        return {
                            ok: true,
                            json: async () => ({
                                truncated: true,
                                tree: [{ path: "package.json", type: "blob" }],
                            }),
                        };
                    }
                    if (url.startsWith(RAW_BASE)) {
                        return {
                            ok: true,
                            arrayBuffer: async () => Buffer.from("{}"),
                        };
                    }
                    return { ok: false };
                });

                const result = await handleCreateCommand("truncated", { cwd });
                assert.equal(result, true);
                assert.equal(logMocks.warn.mock.callCount(), 1);
                assert.match(logMocks.warn.mock.calls[0].arguments[0], /GitHub repository tree is too large/);
            });
        });

        it("handles GitHub API error (List)", async () => {
            await withTempDir(async (cwd) => {
                global.fetch = mock.fn(async () => ({
                    ok: false,
                    status: 500,
                    statusText: "Server Error",
                }));

                const result = await handleCreateCommand("api-error", { cwd });
                assert.equal(result, false);
                assert.match(logMocks.error.mock.calls[0].arguments[0], /GitHub API responded with 500/);
            });
        });

        it("handles GitHub API error (File Download)", async () => {
            await withTempDir(async (cwd) => {
                global.fetch = mock.fn(async (url) => {
                    if (url === GITHUB_API_TREE) {
                        return {
                            ok: true,
                            json: async () => ({ tree: [{ path: "bad.file", type: "blob" }] }),
                        };
                    }
                    return { ok: false, status: 404, statusText: "Not Found" };
                });

                const result = await handleCreateCommand("file-error", { cwd });
                assert.equal(result, false);
                assert.match(logMocks.error.mock.calls[0].arguments[0], /GitHub responded with 404/);
            });
        });

        it("overwrites existing directory if user approves", async () => {
            // Force TTY to true so askYesNo enters interactive mode
            Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true });

            // Mock readline to simulate "yes" answer
            const questionMock = mock.fn((_q, cb) => cb("yes"));
            const closeMock = mock.fn();

            mock.method(readline, "createInterface", () => ({
                question: questionMock,
                close: closeMock,
            }));

            try {
                await withTempDir(async (cwd) => {
                    const projectDir = path.join(cwd, "overwrite-me");
                    await fsp.mkdir(projectDir);

                    mockFetchForSuccess();

                    const result = await handleCreateCommand("overwrite-me", { cwd });

                    assert.equal(result, true);
                    assert.equal(questionMock.mock.callCount(), 1);

                    // Should have downloaded files
                    assert.equal(await fsp.readFile(path.join(projectDir, "package.json"), "utf8"), '{ "name": "overwrite-me" }');
                });
            } finally {
                // Restore TTY
                Object.defineProperty(process.stdout, "isTTY", { value: originalIsTTY, configurable: true });
            }
        });

        it("handles multiple project_name occurrences in text files (interpolation)", async () => {
            await withTempDir(async (cwd) => {
                global.fetch = mock.fn(async (url) => {
                    if (url === GITHUB_API_TREE) {
                        return {
                            ok: true,
                            json: async () => ({
                                tree: [{ path: "README.md", type: "blob" }],
                            }),
                        };
                    }
                    if (url.startsWith(RAW_BASE)) {
                        return {
                            ok: true,
                            // File with multiple occurrences and edge cases
                            arrayBuffer: async () =>
                                Buffer.from("# project_name\n\nWelcome to project_name. This is project_name documentation."),
                        };
                    }
                    return { ok: false };
                });

                const result = await handleCreateCommand("my-project", { cwd });
                assert.equal(result, true);

                const content = await fsp.readFile(path.join(cwd, "my-project", "README.md"), "utf8");
                // All occurrences should be replaced
                assert.equal(content, "# my-project\n\nWelcome to my-project. This is my-project documentation.");
                // Ensure no stray "project_name" remains
                assert.equal(content.includes("project_name"), false);
            });
        });

        it("handles text files with no project_name placeholder", async () => {
            await withTempDir(async (cwd) => {
                global.fetch = mock.fn(async (url) => {
                    if (url === GITHUB_API_TREE) {
                        return {
                            ok: true,
                            json: async () => ({
                                tree: [{ path: "LICENSE", type: "blob" }],
                            }),
                        };
                    }
                    if (url.startsWith(RAW_BASE)) {
                        return {
                            ok: true,
                            arrayBuffer: async () => Buffer.from("MIT License - no substitution needed"),
                        };
                    }
                    return { ok: false };
                });

                const result = await handleCreateCommand("any-app", { cwd });
                assert.equal(result, true);

                const content = await fsp.readFile(path.join(cwd, "any-app", "LICENSE"), "utf8");
                assert.equal(content, "MIT License - no substitution needed");
            });
        });

        it("detects binary files with null bytes and writes them as-is (no interpolation)", async () => {
            await withTempDir(async (cwd) => {
                global.fetch = mock.fn(async (url) => {
                    if (url === GITHUB_API_TREE) {
                        return {
                            ok: true,
                            json: async () => ({
                                tree: [{ path: "icon.bin", type: "blob" }],
                            }),
                        };
                    }
                    if (url.startsWith(RAW_BASE)) {
                        // Binary data: has null byte to be detected
                        const buf = Buffer.alloc(10);
                        buf[0] = 0x89; // PNG signature
                        buf[1] = 0x50;
                        buf[2] = 0x4e;
                        buf[3] = 0x47;
                        buf[4] = 0x00; // null byte to trigger binary detection
                        buf[5] = 0x0d;
                        return {
                            ok: true,
                            arrayBuffer: async () => buf,
                        };
                    }
                    return { ok: false };
                });

                const result = await handleCreateCommand("binary-app", { cwd });
                assert.equal(result, true);

                const written = await fsp.readFile(path.join(cwd, "binary-app", "icon.bin"));
                // Should have null byte (binary detection worked, no interpolation)
                assert.ok(written.includes(0), "Buffer should contain null byte at position 4");
                // First 4 bytes should match PNG signature
                assert.equal(written[0], 0x89);
                assert.equal(written[1], 0x50);
            });
        });

        it("batches downloads with concurrency limit (5 files per batch)", async () => {
            await withTempDir(async (cwd) => {
                const fileCount = 12; // More than one batch (5 files)
                const fetchCallOrder = [];

                global.fetch = mock.fn(async (url) => {
                    if (url === GITHUB_API_TREE) {
                        const tree = [];
                        for (let i = 0; i < fileCount; i++) {
                            tree.push({ path: `file${i}.txt`, type: "blob" });
                        }
                        return {
                            ok: true,
                            json: async () => ({ tree }),
                        };
                    }
                    if (url.startsWith(RAW_BASE)) {
                        const match = url.match(/file(\d+)\.txt$/);
                        if (match) {
                            fetchCallOrder.push(Number(match[1]));
                            return {
                                ok: true,
                                arrayBuffer: async () => Buffer.from("{}"),
                            };
                        }
                    }
                    return { ok: false };
                });

                const result = await handleCreateCommand("batch-app", { cwd });
                assert.equal(result, true);

                // Verify all 12 files were fetched
                assert.equal(fetchCallOrder.length, fileCount);

                // Verify files exist
                for (let i = 0; i < fileCount; i++) {
                    const filePath = path.join(cwd, "batch-app", `file${i}.txt`);
                    assert.equal(await fsp.readFile(filePath, "utf8"), "{}");
                }
            });
        });

        it("writes progress dots to stdout for each downloaded file", async () => {
            await withTempDir(async (cwd) => {
                const stdoutWrites = [];
                const originalWrite = process.stdout.write;

                // Replace write directly without mocking (to avoid serialization issues)
                process.stdout.write = (chunk) => {
                    stdoutWrites.push(chunk);
                    return true;
                };

                try {
                    global.fetch = mock.fn(async (url) => {
                        if (url === GITHUB_API_TREE) {
                            return {
                                ok: true,
                                json: async () => ({
                                    tree: [
                                        { path: "file1.txt", type: "blob" },
                                        { path: "file2.txt", type: "blob" },
                                        { path: "file3.txt", type: "blob" },
                                    ],
                                }),
                            };
                        }
                        if (url.startsWith(RAW_BASE)) {
                            return {
                                ok: true,
                                arrayBuffer: async () => Buffer.from("test"),
                            };
                        }
                        return { ok: false };
                    });

                    const result = await handleCreateCommand("progress-app", { cwd });
                    assert.equal(result, true);

                    // Should have at least 3 dots for 3 files, and a newline at the end
                    const dots = stdoutWrites.filter((w) => w === ".").length;
                    const newlines = stdoutWrites.filter((w) => w === "\n").length;
                    assert.equal(dots, 3, "Should write one dot per file");
                    assert.ok(newlines >= 1, "Should write at least one newline");
                } finally {
                    // Restore original write
                    process.stdout.write = originalWrite;
                }
            });
        });

        it("handles fetch timeout (AbortController signal)", async () => {
            await withTempDir(async (cwd) => {
                // Track abort signal calls
                const abortedSignals = [];

                global.fetch = mock.fn(async (url, options) => {
                    if (url === GITHUB_API_TREE) {
                        return {
                            ok: true,
                            json: async () => ({
                                tree: [{ path: "slow.txt", type: "blob" }],
                            }),
                        };
                    }
                    if (url.startsWith(RAW_BASE)) {
                        // Simulate timeout by aborting the signal
                        if (options?.signal) {
                            abortedSignals.push(options.signal.aborted);
                            // Throw an AbortError to simulate timeout
                            const err = new Error("The operation was aborted");
                            err.name = "AbortError";
                            throw err;
                        }
                        return { ok: false };
                    }
                    return { ok: false };
                });

                const result = await handleCreateCommand("timeout-app", { cwd });
                assert.equal(result, false);
                assert.match(logMocks.error.mock.calls[0].arguments[0], /Failed to fetch/);
            });
        });

        it("handles special characters in project names (interpolation is exact string match)", async () => {
            await withTempDir(async (cwd) => {
                global.fetch = mock.fn(async (url) => {
                    if (url === GITHUB_API_TREE) {
                        return {
                            ok: true,
                            json: async () => ({
                                tree: [{ path: "config.json", type: "blob" }],
                            }),
                        };
                    }
                    if (url.startsWith(RAW_BASE)) {
                        return {
                            ok: true,
                            arrayBuffer: async () => Buffer.from('{"project_name": "value", "name": "project_name"}'),
                        };
                    }
                    return { ok: false };
                });

                const specialName = "my-app_v2.0";
                const result = await handleCreateCommand(specialName, { cwd });
                assert.equal(result, true);

                const content = await fsp.readFile(path.join(cwd, specialName, "config.json"), "utf8");
                // All occurrences of the string "project_name" should be replaced (including object keys)
                const parsed = JSON.parse(content);
                // The key "project_name" is replaced with the special name
                assert.equal(parsed[specialName], "value");
                // The value "project_name" is replaced with the special name
                assert.equal(parsed.name, specialName);
            });
        });

        it("handles GitHub API server error during list (5xx response)", async () => {
            await withTempDir(async (cwd) => {
                global.fetch = mock.fn(async (url) => {
                    if (url === GITHUB_API_TREE) {
                        return {
                            ok: false,
                            status: 503,
                            statusText: "Service Unavailable",
                        };
                    }
                    return { ok: false };
                });

                const result = await handleCreateCommand("server-error-app", { cwd });
                assert.equal(result, false);
                assert.match(logMocks.error.mock.calls[0].arguments[0], /GitHub API responded with 503/);
            });
        });

        it("creates nested directory structure for files in subdirectories", async () => {
            await withTempDir(async (cwd) => {
                global.fetch = mock.fn(async (url) => {
                    if (url === GITHUB_API_TREE) {
                        return {
                            ok: true,
                            json: async () => ({
                                tree: [
                                    { path: "src/index.js", type: "blob" },
                                    { path: "public/assets/style.css", type: "blob" },
                                    { path: "config.json", type: "blob" },
                                ],
                            }),
                        };
                    }
                    if (url.startsWith(RAW_BASE)) {
                        return {
                            ok: true,
                            arrayBuffer: async () => Buffer.from("{}"),
                        };
                    }
                    return { ok: false };
                });

                const result = await handleCreateCommand("nested-app", { cwd });
                assert.equal(result, true);

                // Verify nested structure
                const srcFile = path.join(cwd, "nested-app", "src", "index.js");
                const styleFile = path.join(cwd, "nested-app", "public", "assets", "style.css");
                const configFile = path.join(cwd, "nested-app", "config.json");

                assert.ok(await fsp.readFile(srcFile, "utf8"));
                assert.ok(await fsp.readFile(styleFile, "utf8"));
                assert.ok(await fsp.readFile(configFile, "utf8"));
            });
        });

        it("logs next steps with relative path when creating in non-current directory", async () => {
            await withTempDir(async (cwd) => {
                mockFetchForSuccess();

                const result = await handleCreateCommand("new-app", { cwd });
                assert.equal(result, true);

                // Should have logged "cd new-app" as a next step (not shown for ".")
                const infoCalls = logMocks.info.mock.calls.map((c) => c.arguments[0]).filter((msg) => msg?.includes("cd "));
                assert.equal(infoCalls.length > 0, true);
                assert.equal(
                    infoCalls.some((msg) => msg.includes("cd new-app")),
                    true,
                );
            });
        });

        it("omits cd step when creating in current directory (.)", async () => {
            Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true });

            const questionMock = mock.fn((_q, cb) => cb("yes"));
            const closeMock = mock.fn();

            mock.method(readline, "createInterface", () => ({
                question: questionMock,
                close: closeMock,
            }));

            try {
                await withTempDir(async (cwd) => {
                    mockFetchForSuccess();

                    const result = await handleCreateCommand(".", { cwd });
                    assert.equal(result, true);

                    // Should NOT have logged "cd ." or similar
                    const infoCalls = logMocks.info.mock.calls.map((c) => c.arguments[0]).filter((msg) => msg?.includes("cd"));
                    // Should not include a cd command for "."
                    assert.equal(
                        infoCalls.some((msg) => msg.includes('cd "."')),
                        false,
                    );
                    assert.equal(
                        infoCalls.some((msg) => msg.match(/^ {2}cd /)),
                        false,
                    );
                });
            } finally {
                Object.defineProperty(process.stdout, "isTTY", { value: originalIsTTY, configurable: true });
            }
        });
    });
});
