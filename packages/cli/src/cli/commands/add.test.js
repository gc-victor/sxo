import assert from "node:assert/strict";
import fsp from "node:fs/promises";
import path from "node:path";
import { after, beforeEach, describe, it, mock } from "node:test";
import { withTempProject, writeFile } from "../../test-utils.js";
import { handleAddCommand } from "./add.js";

const originalExitCode = process.exitCode;
const originalFetch = global.fetch;

/**
 * Helper to set up test environment with componentsDir and cwd change.
 * @param {string} tmp - Temp directory path
 * @param {Object} options
 * @param {boolean} [options.createBasecoat=false] - Whether to create basecoat dir
 * @returns {Promise<{componentsDir: string, originalCwd: string}>}
 */
async function setupTestEnv(tmp, { createBasecoat = false } = {}) {
    const componentsDir = path.join(tmp, "src/components");
    await fsp.mkdir(componentsDir, { recursive: true });

    if (createBasecoat) {
        const basecoatDir = path.join(tmp, "packages/components/src/components");
        await fsp.mkdir(basecoatDir, { recursive: true });
    }

    const originalCwd = process.cwd();
    process.chdir(tmp);

    return { componentsDir, originalCwd };
}

/**
 * Helper to restore cwd after test.
 * @param {string} originalCwd - Original working directory
 */
async function teardownTestEnv(originalCwd) {
    process.chdir(originalCwd);
}

/**
 * Helper to create a basecoat component file.
 * @param {string} tmp - Temp directory path
 * @param {string} name - Component name
 * @param {string} [content] - File content
 * @param {string} [ext=".jsx"] - File extension
 */
async function createBasecoatComponent(tmp, name, content, ext = ".jsx") {
    const basecoatDir = path.join(tmp, "packages/components/src/components");
    await writeFile(basecoatDir, `${name}${ext}`, content ?? `export function ${toPascalCase(name)}() {}`);
}

/**
 * Convert kebab-case to PascalCase.
 * @param {string} str
 * @returns {string}
 */
function toPascalCase(str) {
    return str.replace(/(^|-)([a-z])/g, (_, __, letter) => letter.toUpperCase());
}

/**
 * Helper to assert that a component name is rejected as invalid.
 * @param {string} componentName - The component name to test
 */
async function assertInvalidComponent(componentName) {
    await assert.rejects(() => handleAddCommand(componentName, { componentsDir: "src/components" }), /Invalid component name/);
    assert.equal(process.exitCode, 1);
}

describe("cli/commands/add", () => {
    after(() => {
        process.exitCode = originalExitCode;
        global.fetch = originalFetch;
    });

    beforeEach(() => {
        process.exitCode = 0;
        global.fetch = mock.fn(async () => ({ ok: false, status: 404 }));
    });

    it("installs component files from local basecoat to componentsDir", async () => {
        await withTempProject(async (tmp) => {
            await createBasecoatComponent(tmp, "test-component", "export function TestComponent() { return <div>Test</div>; }");
            await writeFile(path.join(tmp, "packages/components/src/components"), "test-component.client.js", 'console.log("client");');
            await writeFile(path.join(tmp, "packages/components/src/components"), "test-component.css", ".test { color: red; }");

            const { componentsDir, originalCwd } = await setupTestEnv(tmp);

            try {
                await handleAddCommand("test-component", { componentsDir: "src/components" });
                assert.equal(process.exitCode, 0);

                const installedJsx = await fsp.readFile(path.join(componentsDir, "test-component.jsx"), "utf8");
                const installedClient = await fsp.readFile(path.join(componentsDir, "test-component.client.js"), "utf8");
                const installedCss = await fsp.readFile(path.join(componentsDir, "test-component.css"), "utf8");

                assert.equal(installedJsx, "export function TestComponent() { return <div>Test</div>; }");
                assert.equal(installedClient, 'console.log("client");');
                assert.equal(installedCss, ".test { color: red; }");
            } finally {
                await teardownTestEnv(originalCwd);
            }
        });
    });

    it("returns false when component not found", async () => {
        await withTempProject(async (tmp) => {
            const { originalCwd } = await setupTestEnv(tmp);

            try {
                await handleAddCommand("nonexistent", { componentsDir: "src/components" });
                assert.equal(process.exitCode, 1);
            } finally {
                await teardownTestEnv(originalCwd);
            }
        });
    });

    it("creates componentsDir if it doesn't exist", async () => {
        await withTempProject(async (tmp) => {
            await createBasecoatComponent(tmp, "test-component");

            const componentsDir = path.join(tmp, "src/components");
            const originalCwd = process.cwd();
            process.chdir(tmp);

            try {
                await handleAddCommand("test-component", { componentsDir: "src/components" });
                assert.equal(process.exitCode, 0);

                const installedJsx = await fsp.readFile(path.join(componentsDir, "test-component.jsx"), "utf8");
                assert.equal(installedJsx, "export function TestComponent() {}");
            } finally {
                await teardownTestEnv(originalCwd);
            }
        });
    });

    it("handles error in handleAddCommand gracefully", async () => {
        await withTempProject(async (tmp) => {
            const { originalCwd } = await setupTestEnv(tmp);

            try {
                await handleAddCommand("test-component", { invalidFlag: true });
                assert.equal(process.exitCode, 1);
            } finally {
                await teardownTestEnv(originalCwd);
            }
        });
    });

    it("installs component files from GitHub", async () => {
        await withTempProject(async (tmp) => {
            const { componentsDir, originalCwd } = await setupTestEnv(tmp);

            const originalFetch = global.fetch;
            const requestedUrls = [];
            global.fetch = mock.fn(async (url) => {
                requestedUrls.push(url);
                return {
                    ok: true,
                    text: async () => "github-content",
                };
            });

            try {
                await handleAddCommand("github-component", { componentsDir: "src/components" });
                assert.equal(process.exitCode, 0);
                assert.deepEqual(requestedUrls, [
                    "https://raw.githubusercontent.com/gc-victor/sxo/main/packages/components/src/components/github-component.jsx",
                    "https://raw.githubusercontent.com/gc-victor/sxo/main/packages/components/src/components/github-component.client.js",
                    "https://raw.githubusercontent.com/gc-victor/sxo/main/packages/components/src/components/github-component.css",
                ]);

                const installedJsx = await fsp.readFile(path.join(componentsDir, "github-component.jsx"), "utf8");
                assert.equal(installedJsx, "github-content");
            } finally {
                global.fetch = originalFetch;
                await teardownTestEnv(originalCwd);
            }
        });
    });

    it("handles GitHub network error and falls back to local", async () => {
        await withTempProject(async (tmp) => {
            await createBasecoatComponent(tmp, "fallback-component", "local-content");
            const { componentsDir, originalCwd } = await setupTestEnv(tmp);

            const originalFetch = global.fetch;
            global.fetch = mock.fn(async () => {
                throw new Error("Network error");
            });

            try {
                await handleAddCommand("fallback-component", { componentsDir: "src/components" });
                assert.equal(process.exitCode, 0);

                const installedJsx = await fsp.readFile(path.join(componentsDir, "fallback-component.jsx"), "utf8");
                assert.equal(installedJsx, "local-content");
            } finally {
                global.fetch = originalFetch;
                await teardownTestEnv(originalCwd);
            }
        });
    });

    describe("Path Traversal Security (CODE_REVIEW.md Issue #2)", () => {
        describe("When component contains Linux path traversal", () => {
            it("should reject component with '../' sequence", async () => {
                await withTempProject(async (tmp) => {
                    const { originalCwd } = await setupTestEnv(tmp);
                    try {
                        await assertInvalidComponent("../../etc/passwd");
                    } finally {
                        await teardownTestEnv(originalCwd);
                    }
                });
            });

            it("should reject component with multiple '../' sequences", async () => {
                await withTempProject(async (tmp) => {
                    const { originalCwd } = await setupTestEnv(tmp);
                    try {
                        await assertInvalidComponent("../../../.ssh/authorized_keys");
                    } finally {
                        await teardownTestEnv(originalCwd);
                    }
                });
            });

            it("should reject component with nested '../' sequences", async () => {
                await withTempProject(async (tmp) => {
                    const { originalCwd } = await setupTestEnv(tmp);
                    try {
                        await assertInvalidComponent("foo/../../etc/passwd");
                    } finally {
                        await teardownTestEnv(originalCwd);
                    }
                });
            });
        });

        describe("When component contains Windows path traversal", () => {
            it("should reject component with '..\\' sequence", async () => {
                await withTempProject(async (tmp) => {
                    const { originalCwd } = await setupTestEnv(tmp);
                    try {
                        await assertInvalidComponent("..\\..\\Windows\\System32");
                    } finally {
                        await teardownTestEnv(originalCwd);
                    }
                });
            });

            it("should reject component with multiple '..\\' sequences", async () => {
                await withTempProject(async (tmp) => {
                    const { originalCwd } = await setupTestEnv(tmp);
                    try {
                        await assertInvalidComponent("..\\..\\..\\Windows\\System32\\config");
                    } finally {
                        await teardownTestEnv(originalCwd);
                    }
                });
            });
        });

        describe("When component contains absolute paths", () => {
            it("should reject component with Unix absolute path", async () => {
                await withTempProject(async (tmp) => {
                    const { originalCwd } = await setupTestEnv(tmp);
                    try {
                        await assertInvalidComponent("/etc/passwd");
                    } finally {
                        await teardownTestEnv(originalCwd);
                    }
                });
            });

            it("should reject component with Windows absolute path", async () => {
                await withTempProject(async (tmp) => {
                    const { originalCwd } = await setupTestEnv(tmp);
                    try {
                        await assertInvalidComponent("C:\\Windows\\System32\\config");
                    } finally {
                        await teardownTestEnv(originalCwd);
                    }
                });
            });
        });

        describe("When component is valid kebab-case", () => {
            it("should accept simple kebab-case component", async () => {
                await withTempProject(async (tmp) => {
                    await createBasecoatComponent(tmp, "my-component");
                    const { componentsDir, originalCwd } = await setupTestEnv(tmp, { createBasecoat: true });

                    try {
                        await handleAddCommand("my-component", { componentsDir: "src/components" });
                        assert.equal(process.exitCode, 0);

                        const installedFile = await fsp.readFile(path.join(componentsDir, "my-component.jsx"), "utf8");
                        assert.equal(installedFile, "export function MyComponent() {}");
                    } finally {
                        await teardownTestEnv(originalCwd);
                    }
                });
            });

            it("should accept kebab-case component with numbers and multiple segments", async () => {
                await withTempProject(async (tmp) => {
                    await createBasecoatComponent(tmp, "button-group-primary");
                    const { componentsDir, originalCwd } = await setupTestEnv(tmp, { createBasecoat: true });

                    try {
                        await handleAddCommand("button-group-primary", { componentsDir: "src/components" });
                        assert.equal(process.exitCode, 0);

                        const installedFile = await fsp.readFile(path.join(componentsDir, "button-group-primary.jsx"), "utf8");
                        assert.equal(installedFile, "export function ButtonGroupPrimary() {}");
                    } finally {
                        await teardownTestEnv(originalCwd);
                    }
                });
            });
        });

        describe("Path containment - write protection", () => {
            it("should prevent writing file outside componentsDir", async () => {
                await withTempProject(async (tmp) => {
                    const { originalCwd } = await setupTestEnv(tmp);

                    const sensitiveFile = path.join(tmp, ".ssh", "authorized_keys");
                    await writeFile(path.join(tmp, ".ssh"), "authorized_keys", "ssh-rsa test-key");

                    try {
                        await assert.rejects(
                            () => handleAddCommand("../.ssh/authorized_keys", { componentsDir: "src/components" }),
                            /Invalid component name|refusing to write/i,
                        );
                        assert.equal(process.exitCode, 1);

                        const originalContent = await fsp.readFile(sensitiveFile, "utf8");
                        assert.equal(originalContent, "ssh-rsa test-key");
                    } finally {
                        await teardownTestEnv(originalCwd);
                    }
                });
            });

            it("should prevent writing to parent directory of componentsDir", async () => {
                await withTempProject(async (tmp) => {
                    const { originalCwd } = await setupTestEnv(tmp);

                    const parentDir = path.join(tmp, "src", "parent-file.txt");
                    await fsp.writeFile(parentDir, "original content");

                    try {
                        await assert.rejects(
                            () => handleAddCommand("../parent-file", { componentsDir: "src/components" }),
                            /Invalid component name|refusing to write/i,
                        );
                        assert.equal(process.exitCode, 1);

                        const originalContent = await fsp.readFile(parentDir, "utf8");
                        assert.equal(originalContent, "original content");
                    } finally {
                        await teardownTestEnv(originalCwd);
                    }
                });
            });
        });

        describe("Error messages for invalid component names", () => {
            it("should provide clear error message for path traversal attempt", async () => {
                await withTempProject(async (tmp) => {
                    const { originalCwd } = await setupTestEnv(tmp);
                    try {
                        await assertInvalidComponent("../../etc/passwd");
                    } finally {
                        await teardownTestEnv(originalCwd);
                    }
                });
            });

            it("should provide clear error message for Windows path traversal", async () => {
                await withTempProject(async (tmp) => {
                    const { originalCwd } = await setupTestEnv(tmp);
                    try {
                        await assertInvalidComponent("..\\..\\Windows\\System32");
                    } finally {
                        await teardownTestEnv(originalCwd);
                    }
                });
            });

            it("should provide clear error message for absolute path", async () => {
                await withTempProject(async (tmp) => {
                    const { originalCwd } = await setupTestEnv(tmp);
                    try {
                        await assertInvalidComponent("/etc/passwd");
                    } finally {
                        await teardownTestEnv(originalCwd);
                    }
                });
            });
        });
    });
});
