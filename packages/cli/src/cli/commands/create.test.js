import assert from "node:assert/strict";
import fsp from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { after, before, beforeEach, describe, it, mock } from "node:test";
import { withTempProject } from "../../test-utils.js";
import { log } from "../ui.js";
import { fetchTemplateFile, fetchTemplateFileList } from "../utils/template-downloader.js";
import { checkDirectoryExists, handleCreateCommand } from "./create.js";

// Store originals
const originalFetch = global.fetch;
const originalIsTTY = process.stdout.isTTY;

/**
 * Helper to run test with TTY and NODE_ENV restoration
 * @param {Function} testFn - Async test function to run
 * @param {object} [options] - Options
 * @param {boolean} [options.tty=true] - Whether to enable TTY
 * @param {string} [options.input] - Readline input to simulate
 */
async function withInteractiveEnv(testFn, options = {}) {
    const { tty = true, input } = options;
    const originalNodeEnv = process.env.NODE_ENV;
    delete process.env.NODE_ENV;

    Object.defineProperty(process.stdout, "isTTY", { value: tty, configurable: true });

    const mocks = [];
    if (input !== undefined) {
        const questionMock = mock.fn((_q, cb) => cb(input));
        const closeMock = mock.fn();
        mock.method(readline, "createInterface", () => ({
            question: questionMock,
            close: closeMock,
        }));
        mocks.push(questionMock, closeMock);
    }

    try {
        await testFn(...mocks);
    } finally {
        Object.defineProperty(process.stdout, "isTTY", { value: originalIsTTY, configurable: true });
        process.env.NODE_ENV = originalNodeEnv;
    }
}

/**
 * Helper to run test with directory change and restoration
 * @param {string} cwd - Directory to change to
 * @param {Function} testFn - Async test function to run
 */
async function withDirectoryChange(cwd, testFn) {
    const originalCwd = process.cwd();
    process.chdir(cwd);
    try {
        await testFn();
    } finally {
        process.chdir(originalCwd);
    }
}

describe("cli/create", () => {
    let logMocks;

    before(() => {
        logMocks = {
            info: mock.method(log, "info", () => {}),
            success: mock.method(log, "success", () => {}),
            warn: mock.method(log, "warn", () => {}),
            error: mock.method(log, "error", () => {}),
            text: mock.method(log, "text", () => {}),
        };
    });

    after(() => {
        mock.restoreAll();
        if (originalFetch) global.fetch = originalFetch;
        logMocks = null;
    });

    beforeEach(() => {
        for (const m of Object.values(logMocks)) m.mock.resetCalls();
        global.fetch = mock.fn();
        process.exitCode = 0;
    });

    describe("checkDirectoryExists", () => {
        it("returns {exists:false, shouldProceed:true} if dir missing", async () => {
            await withTempProject(async (cwd) => {
                await withDirectoryChange(cwd, async () => {
                    const target = path.join(cwd, "missing");
                    const res = await checkDirectoryExists(target);
                    assert.deepEqual(res, { exists: false, shouldProceed: true });
                });
            });
        });

        it("returns {exists:true, shouldProceed:false} if dir exists and user says no (default non-TTY)", async () => {
            await withTempProject(async (cwd) => {
                await withDirectoryChange(cwd, async () => {
                    const target = path.join(cwd, "exists");
                    await fsp.mkdir(target);
                    const res = await checkDirectoryExists(target);
                    assert.deepEqual(res, { exists: true, shouldProceed: false });
                });
            });
        });
    });

    describe("selectRuntime", () => {
        it('returns "node" in non-TTY environment (default)', async () => {
            Object.defineProperty(process.stdout, "isTTY", { value: false, configurable: true });
            try {
                const { selectRuntime } = await import("./create.js");
                const result = await selectRuntime();
                assert.equal(result, "node");
            } finally {
                Object.defineProperty(process.stdout, "isTTY", { value: originalIsTTY, configurable: true });
            }
        });

        it('returns "node" when user presses Enter (default selection)', async () => {
            await withInteractiveEnv(
                async (questionMock, closeMock) => {
                    const { selectRuntime } = await import("./create.js");
                    const result = await selectRuntime();
                    assert.equal(result, "node");
                    assert.equal(questionMock.mock.callCount(), 1);
                    assert.equal(closeMock.mock.callCount(), 1);
                },
                { input: "" },
            );
        });

        // Parameterized test for runtime selection by input
        const runtimeTestCases = [
            { input: "1", expected: "node" },
            { input: "2", expected: "bun" },
            { input: "3", expected: "deno" },
            { input: "4", expected: "workers" },
        ];

        for (const { input, expected } of runtimeTestCases) {
            it(`returns "${expected}" when user inputs ${input}`, async () => {
                await withInteractiveEnv(
                    async (questionMock, closeMock) => {
                        const { selectRuntime } = await import("./create.js");
                        const result = await selectRuntime();
                        assert.equal(result, expected);
                        assert.equal(questionMock.mock.callCount(), 1);
                        assert.equal(closeMock.mock.callCount(), 1);
                    },
                    { input },
                );
            });
        }

        it("re-prompts on invalid input (e.g., 5, abc)", async () => {
            await withInteractiveEnv(
                async (questionMock, closeMock) => {
                    let callCount = 0;
                    questionMock.mock.mockImplementation((_q, cb) => {
                        callCount++;
                        cb(callCount === 1 ? "5" : "1");
                    });

                    const { selectRuntime } = await import("./create.js");
                    const result = await selectRuntime();
                    assert.equal(result, "node");
                    assert.equal(questionMock.mock.callCount(), 2);
                    assert.equal(closeMock.mock.callCount(), 1);
                },
                { input: "1" },
            );
        });

        // Parameterized test for fetchTemplateFileList URL construction
        for (const runtime of ["node", "bun"]) {
            it(`fetchTemplateFileList constructs path for ${runtime} runtime`, async () => {
                const expectedUrl = `https://api.github.com/repos/gc-victor/sxo/git/trees/main:templates/${runtime}?recursive=1`;
                global.fetch = mock.fn(async (url) =>
                    url === expectedUrl ? { ok: true, json: async () => ({ tree: [] }) } : { ok: false },
                );

                await fetchTemplateFileList(runtime);
                assert.equal(global.fetch.mock.callCount(), 1);
                assert.equal(global.fetch.mock.calls[0].arguments[0], expectedUrl);
            });
        }

        it("fetchTemplateFile constructs correct raw URL", async () => {
            const expectedUrl = "https://raw.githubusercontent.com/gc-victor/sxo/main/templates/node/package.json";
            global.fetch = mock.fn(async (url) =>
                url === expectedUrl
                    ? { ok: true, arrayBuffer: async () => Buffer.from('{"name": "test"}') }
                    : { ok: false, status: 404, statusText: "Not Found" },
            );

            await fetchTemplateFile("templates/node/package.json", "test");
            assert.equal(global.fetch.mock.callCount(), 1);
            assert.equal(global.fetch.mock.calls[0].arguments[0], expectedUrl);
        });
    });

    describe("handleCreateCommand", () => {
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
                                { path: "ignore-me", type: "tree" },
                            ],
                        }),
                    };
                }
                if (url.startsWith(rawBase)) {
                    const rel = url.replace(rawBase, "");
                    if (rel === "package.json") {
                        return { ok: true, arrayBuffer: async () => Buffer.from('{ "name": "project_name" }') };
                    }
                    if (rel === "assets/logo.png") {
                        return { ok: true, arrayBuffer: async () => Buffer.from([0x89, 0x50, 0x00, 0x47]) };
                    }
                }
                return { ok: false, status: 404, statusText: "Not Found" };
            });
        }

        it("cancels if directory exists and user declines", async () => {
            await withTempProject(async (cwd) => {
                await withDirectoryChange(cwd, async () => {
                    const projectDir = path.join(cwd, "exists");
                    await fsp.mkdir(projectDir);
                    await handleCreateCommand("exists");
                    assert.equal(process.exitCode, 1);
                    assert.equal(logMocks.info.mock.calls[0].arguments[0], "Project creation cancelled");
                });
            });
        });

        it("outer catch block covers error logging", async () => {
            const resolveMock = mock.method(path, "resolve", () => {
                throw new Error("Forced outer error");
            });
            try {
                await handleCreateCommand("any");
                assert.equal(process.exitCode, 1);
                assert.ok(logMocks.error.mock.calls.some((c) => c.arguments[0].includes("create failed: Forced outer error")));
            } finally {
                resolveMock.mock.restore();
            }
        });

        it("logs bun-specific next steps when runtime is bun", async () => {
            await withInteractiveEnv(
                async () => {
                    await withTempProject(async (cwd) => {
                        await withDirectoryChange(cwd, async () => {
                            mockFetchForSuccess("bun");
                            await handleCreateCommand("bun-app");

                            const textCalls = logMocks.text.mock.calls.map((c) => c.arguments[0]);
                            assert.ok(textCalls.some((msg) => msg.includes("bun install")));
                            assert.ok(textCalls.some((msg) => msg.includes("bun run dev")));
                        });
                    });
                },
                { input: "2" },
            );
        });

        it("logs pnpm next steps when runtime is node (default)", async () => {
            await withInteractiveEnv(
                async () => {
                    await withTempProject(async (cwd) => {
                        await withDirectoryChange(cwd, async () => {
                            mockFetchForSuccess("node");
                            await handleCreateCommand("node-app");

                            const textCalls = logMocks.text.mock.calls.map((c) => c.arguments[0]);
                            assert.ok(textCalls.some((msg) => msg.includes("pnpm install")));
                            assert.ok(textCalls.some((msg) => msg.includes("pnpm run dev")));
                        });
                    });
                },
                { input: "" },
            );
        });

        it("uses current directory name when no project name provided", async () => {
            await withInteractiveEnv(
                async () => {
                    await withTempProject(async (cwd) => {
                        await withDirectoryChange(cwd, async () => {
                            mockFetchForSuccess("node");
                            // Call without any argument - should use basename(cwd) as project name
                            // and create a subdirectory with that name
                            await handleCreateCommand();

                            // Verify success was logged
                            assert.ok(logMocks.success.mock.calls.some((c) => c.arguments[0].includes("Project created")));

                            // Verify next steps include "cd" since we created a subdirectory
                            const textCalls = logMocks.text.mock.calls.map((c) => c.arguments[0]);
                            assert.ok(textCalls.some((msg) => msg.includes("pnpm install")));
                            assert.ok(textCalls.some((msg) => msg.includes("pnpm run dev")));
                            // Should have a "cd" step since we created in a subdirectory
                            assert.ok(textCalls.some((msg) => msg.startsWith("  - cd ")));
                        });
                    });
                },
                { input: "" },
            );
        });
    });
});
