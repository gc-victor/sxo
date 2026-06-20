import assert from "node:assert/strict";
import fsp from "node:fs/promises";
import path from "node:path";
import { after, before, beforeEach, describe, it, mock } from "node:test";
import { withTempProject } from "../../test-utils.js";
import { log } from "../ui.js";
import { downloadTemplates, fetchTemplateFile, fetchTemplateFileList } from "./template-downloader.js";

const originalFetch = global.fetch;
const GITHUB_API_BASE = "https://api.github.com/repos/gc-victor/sxo";
const RAW_BASE = "https://raw.githubusercontent.com/gc-victor/sxo/main/";

// Mock helpers
function mockFetch(response) {
    global.fetch = mock.fn(async () => response);
}

function mockFetchError(error) {
    global.fetch = mock.fn(async () => {
        throw error;
    });
}

function createAbortError() {
    const err = new Error("The operation was aborted");
    err.name = "AbortError";
    return err;
}

function mockFetchForSuccess(runtime = "node", tree = null) {
    const apiTree = `${GITHUB_API_BASE}/git/trees/main:templates/${runtime}?recursive=1`;
    const rawBase = `${RAW_BASE}templates/${runtime}/`;

    global.fetch = mock.fn(async (url) => {
        if (url === apiTree) {
            return {
                ok: true,
                json: async () => ({
                    tree: tree || [
                        { path: "package.json", type: "blob" },
                        { path: "src/index.js", type: "blob" },
                    ],
                }),
            };
        }
        if (url.startsWith(rawBase)) {
            return {
                ok: true,
                arrayBuffer: async () => Buffer.from('{"name": "project_name"}'),
            };
        }
        return { ok: false };
    });
}

describe("cli/utils/template-downloader", () => {
    let logMocks;

    before(() => {
        logMocks = Object.fromEntries(["info", "success", "warn", "error", "text"].map((key) => [key, mock.method(log, key, () => {})]));
    });

    after(() => {
        mock.restoreAll();
        global.fetch = originalFetch;
    });

    beforeEach(() => {
        for (const m of Object.values(logMocks)) {
            m.mock.resetCalls();
        }
        global.fetch = mock.fn();
    });

    describe("fetchTemplateFileList", () => {
        it("fetches template list for node runtime", async () => {
            mockFetch({
                ok: true,
                json: async () => ({
                    tree: [
                        { path: "package.json", type: "blob" },
                        { path: "src/index.js", type: "blob" },
                        { path: "assets/", type: "tree" },
                    ],
                    truncated: false,
                }),
            });

            const files = await fetchTemplateFileList("node");
            assert.deepEqual(files, ["package.json", "src/index.js"]);
        });

        it("filters out non-blob nodes from tree", async () => {
            mockFetch({
                ok: true,
                json: async () => ({
                    tree: [
                        { path: "file.txt", type: "blob" },
                        { path: "dir/", type: "tree" },
                        { path: "file2.txt", type: "blob" },
                    ],
                    truncated: false,
                }),
            });

            const files = await fetchTemplateFileList("node");
            assert.deepEqual(files, ["file.txt", "file2.txt"]);
        });

        it("throws 404 error when templates directory not found", async () => {
            mockFetch({ ok: false, status: 404, statusText: "Not Found" });
            await assert.rejects(() => fetchTemplateFileList("node"), /Templates directory not found/);
        });

        it("throws error for other HTTP errors", async () => {
            mockFetch({ ok: false, status: 500, statusText: "Error" });
            await assert.rejects(() => fetchTemplateFileList("node"), /GitHub API responded with 500/);
        });

        it("throws network errors appropriately", async () => {
            mockFetchError(new Error("Network connection failed"));
            await assert.rejects(
                () => fetchTemplateFileList("node"),
                /Failed to fetch template list from GitHub: Network connection failed/,
            );
        });

        it("handles non-Error objects in catch block", async () => {
            mockFetchError("string error");
            await assert.rejects(() => fetchTemplateFileList("node"), /Failed to fetch template list from GitHub: string error/);
        });

        it("warns when tree is truncated", async () => {
            mockFetch({
                ok: true,
                json: async () => ({
                    tree: [{ path: "file.txt", type: "blob" }],
                    truncated: true,
                }),
            });

            await fetchTemplateFileList("node");
            assert.equal(logMocks.warn.mock.callCount(), 1);
            assert.match(logMocks.warn.mock.calls[0].arguments[0], /GitHub repository tree is too large/);
        });

        it("handles abort errors", async () => {
            mockFetchError(createAbortError());
            await assert.rejects(() => fetchTemplateFileList("node"), /Failed to fetch template list from GitHub.*operation was aborted/);
        });

        it("respects AbortController signal", async () => {
            let signalReceived = false;
            global.fetch = mock.fn(async (_url, options) => {
                if (options?.signal) {
                    signalReceived = true;
                    assert.ok(options.signal instanceof AbortSignal);
                }
                return {
                    ok: true,
                    json: async () => ({ tree: [{ path: "file.txt", type: "blob" }], truncated: false }),
                };
            });

            await fetchTemplateFileList("node");
            assert.ok(signalReceived);
        });
    });

    describe("fetchTemplateFile", () => {
        it("interpolates project_name placeholder", async () => {
            mockFetch({ ok: true, arrayBuffer: async () => Buffer.from('{"name": "project_name"}') });
            const result = await fetchTemplateFile("templates/node/file.txt", "my-app");
            assert.equal(result, '{"name": "my-app"}');
        });

        it("replaces all occurrences of project_name", async () => {
            mockFetch({ ok: true, arrayBuffer: async () => Buffer.from("project_name, project_name") });
            const result = await fetchTemplateFile("templates/node/file.txt", "app");
            assert.equal(result, "app, app");
        });

        it("detects binary files by null byte", async () => {
            const binaryBuffer = Buffer.from([0x89, 0x50, 0x00, 0x47]);
            mockFetch({ ok: true, arrayBuffer: async () => binaryBuffer });
            const result = await fetchTemplateFile("templates/node/file.png", "test");
            assert.ok(Buffer.isBuffer(result));
            assert.equal(Buffer.compare(result, binaryBuffer), 0);
        });

        it("handles text files without placeholder", async () => {
            mockFetch({ ok: true, arrayBuffer: async () => Buffer.from("plain text") });
            const result = await fetchTemplateFile("templates/node/file.txt", "app");
            assert.equal(result, "plain text");
        });

        it("handles fetch errors for missing files", async () => {
            mockFetch({ ok: false, status: 404, statusText: "Not Found" });
            await assert.rejects(() => fetchTemplateFile("templates/node/file.txt", "app"), /Failed to fetch/);
        });

        it("handles fetch timeout", async () => {
            global.fetch = mock.fn(async (_url, options) => {
                if (options?.signal) throw createAbortError();
                return { ok: false };
            });
            await assert.rejects(() => fetchTemplateFile("templates/node/file.txt", "app"), /Failed to fetch/);
        });

        it("handles non-Error objects in catch block", async () => {
            mockFetchError("timeout string");
            await assert.rejects(
                () => fetchTemplateFile("templates/node/file.txt", "app"),
                /Failed to fetch templates\/node\/file.txt: timeout string/,
            );
        });

        it("constructs correct raw GitHub URL", async () => {
            mockFetch({ ok: true, arrayBuffer: async () => Buffer.from("test") });
            await fetchTemplateFile("templates/bun/package.json", "test");
            assert.equal(global.fetch.mock.calls[0].arguments[0], `${RAW_BASE}templates/bun/package.json`);
        });
    });

    describe("downloadTemplates", () => {
        const runtimes = ["node", "bun", "deno", "workers"];

        for (const runtime of runtimes) {
            it(`downloads templates for ${runtime}`, async () => {
                await withTempProject(async (cwd) => {
                    const projectPath = path.join(cwd, `${runtime}-app`);
                    await fsp.mkdir(projectPath);
                    mockFetchForSuccess(runtime);

                    await downloadTemplates(runtime, `${runtime}-app`, projectPath);

                    const pkgContent = await fsp.readFile(path.join(projectPath, "package.json"), "utf8");
                    assert.equal(pkgContent, `{"name": "${runtime}-app"}`);
                });
            });
        }

        it("handles special characters in project name", async () => {
            await withTempProject(async (cwd) => {
                const projectPath = path.join(cwd, "my-app_v2.0");
                await fsp.mkdir(projectPath);
                mockFetchForSuccess("node");

                await downloadTemplates("node", "my-app_v2.0", projectPath);

                const pkgContent = await fsp.readFile(path.join(projectPath, "package.json"), "utf8");
                assert.equal(pkgContent, '{"name": "my-app_v2.0"}');
            });
        });

        it("creates nested directory structure", async () => {
            await withTempProject(async (cwd) => {
                const projectPath = path.join(cwd, "nested");
                await fsp.mkdir(projectPath);
                mockFetchForSuccess("node", [
                    { path: "deep/nested/file.txt", type: "blob" },
                    { path: "root.txt", type: "blob" },
                ]);

                await downloadTemplates("node", "app", projectPath);

                assert.equal(await fsp.readFile(path.join(projectPath, "deep/nested/file.txt"), "utf8"), '{"name": "app"}');
                assert.equal(await fsp.readFile(path.join(projectPath, "root.txt"), "utf8"), '{"name": "app"}');
            });
        });

        it("batches downloads with concurrency limit of 5", async () => {
            await withTempProject(async (cwd) => {
                const projectPath = path.join(cwd, "batch");
                await fsp.mkdir(projectPath);
                const fileCount = 12;
                const tree = Array.from({ length: fileCount }, (_, i) => ({ path: `file${i}.txt`, type: "blob" }));
                mockFetchForSuccess("node", tree);

                await downloadTemplates("node", "app", projectPath);
                assert.equal(global.fetch.mock.callCount(), fileCount + 1);
            });
        });

        it("throws when template list is empty", async () => {
            await withTempProject(async (cwd) => {
                const projectPath = path.join(cwd, "empty");
                await fsp.mkdir(projectPath);
                mockFetchForSuccess("node", []);
                await assert.rejects(() => downloadTemplates("node", "app", projectPath), /No template files found/);
            });
        });

        it("throws when individual file fetch fails", async () => {
            await withTempProject(async (cwd) => {
                const projectPath = path.join(cwd, "error");
                await fsp.mkdir(projectPath);
                global.fetch = mock.fn(async (url) => {
                    if (url.includes("trees")) return { ok: true, json: async () => ({ tree: [{ path: "bad.txt", type: "blob" }] }) };
                    return { ok: false, status: 404, statusText: "Not Found" };
                });
                await assert.rejects(() => downloadTemplates("node", "app", projectPath), /GitHub responded with 404/);
            });
        });

        it("logs progress dots", async () => {
            await withTempProject(async (cwd) => {
                const projectPath = path.join(cwd, "progress");
                await fsp.mkdir(projectPath);
                const stdoutWrites = [];
                const originalWrite = process.stdout.write.bind(process.stdout);
                process.stdout.write = (chunk) => {
                    stdoutWrites.push(chunk);
                    return originalWrite(chunk);
                };

                try {
                    mockFetchForSuccess("node", [
                        { path: "f1.txt", type: "blob" },
                        { path: "f2.txt", type: "blob" },
                    ]);
                    await downloadTemplates("node", "app", projectPath);
                    assert.equal(stdoutWrites.filter((w) => w === ".").length, 2);
                } finally {
                    process.stdout.write = originalWrite;
                }
            });
        });

        it("handles binary files correctly in batch downloads", async () => {
            await withTempProject(async (cwd) => {
                const projectPath = path.join(cwd, "binary");
                await fsp.mkdir(projectPath);
                const binaryBuffer = Buffer.from([0x89, 0x50, 0x00, 0x47]);

                global.fetch = mock.fn(async (url) => {
                    if (url.includes("trees")) {
                        return {
                            ok: true,
                            json: async () => ({
                                tree: [
                                    { path: "logo.png", type: "blob" },
                                    { path: "README.md", type: "blob" },
                                ],
                            }),
                        };
                    }
                    if (url.includes("logo.png")) return { ok: true, arrayBuffer: async () => binaryBuffer };
                    return { ok: true, arrayBuffer: async () => Buffer.from("# project_name") };
                });

                await downloadTemplates("node", "app", projectPath);
                assert.equal(Buffer.compare(await fsp.readFile(path.join(projectPath, "logo.png")), binaryBuffer), 0);
                assert.equal(await fsp.readFile(path.join(projectPath, "README.md"), "utf8"), "# app");
            });
        });
    });
});
