import assert from "node:assert/strict";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { canCreateSymlinks, createSymlinkTestStructure } from "../test-utils.js";
import { validateConfig } from "./validate-config.js";

/**
 * Clean up test directory structure.
 *
 * @param {string} baseDir - Base temporary directory to clean
 */
async function cleanupTestStructure(baseDir) {
    try {
        await fsp.rm(baseDir, { recursive: true, force: true, maxRetries: 2 });
    } catch {
        // Ignore cleanup errors
    }
}

describe("config/validate-config.js", () => {
    let testBaseDir;
    /** @type {boolean} */
    let symlinksSupported;

    before(async () => {
        testBaseDir = await fsp.mkdtemp(path.join(os.tmpdir(), "test-symlink-escape-"));
        symlinksSupported = await canCreateSymlinks();
    });

    after(async () => {
        if (testBaseDir) {
            await cleanupTestStructure(testBaseDir);
        }
    });

    // Symlink escape tests: skip entire describe block if symlinks not supported
    // On Windows without elevated privileges, symlink creation fails
    const describeSymlinkSkip = symlinksSupported ? describe : describe.skip;

    describe("Validation: Allow valid directory configurations", () => {
        const symlinkTests = symlinksSupported ? it : it.skip;

        symlinkTests("should accept valid pagesDir within project", async () => {
            const structure = await createSymlinkTestStructure(testBaseDir, "pages-valid");
            const config = {
                port: 3000,
                pagesDir: "src/pages", // Normal directory within project
                outDir: path.join(structure.projectDir, "dist"),
                clientDir: "client",
                componentsDir: "src/components",
            };

            await validateConfig(config, structure.projectDir);
        });

        symlinkTests("should accept valid componentsDir within project", async () => {
            const structure = await createSymlinkTestStructure(testBaseDir, "components-valid");
            const config = {
                port: 3000,
                pagesDir: "src/pages",
                outDir: path.join(structure.projectDir, "dist"),
                clientDir: "client",
                componentsDir: "src/components", // Normal directory within project
            };

            await validateConfig(config, structure.projectDir);
        });

        symlinkTests("should accept symlinks pointing within project", async () => {
            const structure = await createSymlinkTestStructure(testBaseDir, "symlink-valid");
            const config = {
                port: 3000,
                pagesDir: structure.symlinks.pagesValid, // Symlink within project
                outDir: path.join(structure.projectDir, "dist"),
                clientDir: "client",
                componentsDir: structure.symlinks.componentsValid, // Symlink within project
            };

            await validateConfig(config, structure.projectDir);
        });

        it("should accept regular non-symlink directories", async () => {
            const projectDir = path.join(testBaseDir, "project-regular");
            await fsp.mkdir(path.join(projectDir, "src"), { recursive: true });
            await fsp.mkdir(path.join(projectDir, "src/pages"), { recursive: true });
            await fsp.mkdir(path.join(projectDir, "src/components"), { recursive: true });

            const config = {
                port: 3000,
                pagesDir: "src/pages",
                outDir: path.join(projectDir, "dist"),
                clientDir: "client",
                componentsDir: "src/components",
            };

            await validateConfig(config, projectDir);
        });
    });

    describe("Validation: securityHeaders", () => {
        const getBaseConfig = () => ({
            port: 3000,
            pagesDir: "src/pages",
            outDir: path.join(testBaseDir, "project-dist"),
            clientDir: "client",
            componentsDir: "src/components",
        });

        it("should accept undefined securityHeaders", async () => {
            const config = { ...getBaseConfig(), securityHeaders: undefined };
            await validateConfig(config, testBaseDir);
        });

        it("should accept null securityHeaders", async () => {
            const config = { ...getBaseConfig(), securityHeaders: null };
            await validateConfig(config, testBaseDir);
        });

        it("should accept valid securityHeaders object", async () => {
            const config = {
                ...getBaseConfig(),
                securityHeaders: {
                    "X-Frame-Options": "DENY",
                    "Content-Security-Policy": "default-src 'self'",
                },
            };
            await validateConfig(config, testBaseDir);
        });

        it("should reject string securityHeaders", async () => {
            const config = { ...getBaseConfig(), securityHeaders: "invalid" };
            await assert.rejects(validateConfig(config, testBaseDir), /Invalid securityHeaders: "invalid". Expected an object or null./);
        });

        it("should reject securityHeaders with non-string values", async () => {
            const config = {
                ...getBaseConfig(),
                securityHeaders: {
                    "X-Frame-Options": "DENY",
                    "X-XSS-Protection": 1,
                },
            };
            await assert.rejects(
                validateConfig(config, testBaseDir),
                /Invalid securityHeaders values: X-XSS-Protection: number. All values must be strings./,
            );
        });
    });

    describe("Validation: Basic fields", () => {
        const getBaseConfig = () => ({
            port: 3000,
            pagesDir: "src/pages",
            outDir: path.join(testBaseDir, "project-dist"),
            clientDir: "client",
            componentsDir: "src/components",
        });

        it("should reject non-integer port", async () => {
            await assert.rejects(validateConfig({ ...getBaseConfig(), port: 3000.5 }, testBaseDir), /Invalid port/);
        });

        it("should reject port < 1", async () => {
            await assert.rejects(validateConfig({ ...getBaseConfig(), port: 0 }, testBaseDir), /Invalid port/);
        });

        it("should reject port > 65535", async () => {
            await assert.rejects(validateConfig({ ...getBaseConfig(), port: 65536 }, testBaseDir), /Invalid port/);
        });

        it("should reject empty pagesDir", async () => {
            await assert.rejects(validateConfig({ ...getBaseConfig(), pagesDir: "" }, testBaseDir), /Invalid pagesDir/);
        });

        it("should reject non-string pagesDir", async () => {
            await assert.rejects(validateConfig({ ...getBaseConfig(), pagesDir: 123 }, testBaseDir), /Invalid pagesDir/);
        });

        it("should reject non-absolute outDir", async () => {
            await assert.rejects(validateConfig({ ...getBaseConfig(), outDir: "dist" }, testBaseDir), /Invalid outDir/);
        });

        it("should reject non-string outDir", async () => {
            await assert.rejects(validateConfig({ ...getBaseConfig(), outDir: 123 }, testBaseDir), /Invalid outDir/);
        });

        it("should reject empty componentsDir", async () => {
            await assert.rejects(validateConfig({ ...getBaseConfig(), componentsDir: "" }, testBaseDir), /Invalid componentsDir/);
        });

        it("should reject non-string componentsDir", async () => {
            await assert.rejects(validateConfig({ ...getBaseConfig(), componentsDir: 123 }, testBaseDir), /Invalid componentsDir/);
        });

        it("should reject non-string clientDir", async () => {
            await assert.rejects(validateConfig({ ...getBaseConfig(), clientDir: 123 }, testBaseDir), /Invalid clientDir/);
        });

        it("should reject empty clientDir", async () => {
            await assert.rejects(validateConfig({ ...getBaseConfig(), clientDir: "" }, testBaseDir), /Invalid clientDir/);
        });

        it("should reject clientDir with slashes", async () => {
            await assert.rejects(validateConfig({ ...getBaseConfig(), clientDir: "foo/bar" }, testBaseDir), /Invalid clientDir/);
            await assert.rejects(validateConfig({ ...getBaseConfig(), clientDir: "foo\\bar" }, testBaseDir), /Invalid clientDir/);
        });

        it("should reject outDir escaping project directory", async () => {
            const projectDir = path.join(testBaseDir, "project-outdir-escape");
            await fsp.mkdir(projectDir, { recursive: true });
            const config = {
                ...getBaseConfig(),
                outDir: path.join(testBaseDir, "outside"),
            };
            await assert.rejects(validateConfig(config, projectDir), /Invalid outDir.*attempts to escape project directory/);
        });

        it("should reject outDir targeting project root", async () => {
            const projectDir = path.join(testBaseDir, "project-outdir-root");
            await fsp.mkdir(projectDir, { recursive: true });
            const config = {
                ...getBaseConfig(),
                outDir: projectDir,
            };
            await assert.rejects(validateConfig(config, projectDir), /Invalid outDir.*protected directory/);
        });

        it("should reject outDir targeting src directory", async () => {
            const projectDir = path.join(testBaseDir, "project-outdir-src");
            await fsp.mkdir(path.join(projectDir, "src"), { recursive: true });
            const config = {
                ...getBaseConfig(),
                outDir: path.join(projectDir, "src"),
            };
            await assert.rejects(validateConfig(config, projectDir), /Invalid outDir.*protected directory/);
        });
    });

    describe("Security: Reject escape (no symlinks required)", () => {
        it("should reject pagesDir escaping via parent reference", async () => {
            const projectDir = path.join(testBaseDir, "project-escape-pages");
            await fsp.mkdir(projectDir, { recursive: true });
            const config = {
                port: 3000,
                pagesDir: "../outside",
                outDir: path.join(projectDir, "dist"),
                clientDir: "client",
                componentsDir: "src/components",
            };

            await assert.rejects(validateConfig(config, projectDir), /Invalid pagesDir.*attempts to escape project directory/);
        });

        it("should reject componentsDir escaping via parent reference", async () => {
            const projectDir = path.join(testBaseDir, "project-escape-components");
            await fsp.mkdir(projectDir, { recursive: true });
            const config = {
                port: 3000,
                pagesDir: "src/pages",
                outDir: path.join(projectDir, "dist"),
                clientDir: "client",
                componentsDir: "../outside",
            };

            await assert.rejects(validateConfig(config, projectDir), /Invalid componentsDir.*attempts to escape project directory/);
        });
    });

    describeSymlinkSkip("Security: Error message clarity", () => {
        it("should include escape details in pagesDir error message", async () => {
            const structure = await createSymlinkTestStructure(testBaseDir, "pages-message");
            const config = {
                port: 3000,
                pagesDir: "../escape",
                outDir: path.join(structure.projectDir, "dist"),
                clientDir: "client",
                componentsDir: "src/components",
            };

            try {
                await validateConfig(config, structure.projectDir);
                assert.fail("should have thrown an error");
            } catch (err) {
                assert.ok(err.message.includes("Invalid pagesDir"), "error message should mention pagesDir");
                assert.ok(err.message.includes("attempts to escape"), "error message should mention escape attempt");
                assert.ok(err.message.includes("within"), "error message should mention project directory constraint");
            }
        });

        it("should include escape details in componentsDir error message", async () => {
            const structure = await createSymlinkTestStructure(testBaseDir, "components-message");
            const config = {
                port: 3000,
                pagesDir: "src/pages",
                outDir: path.join(structure.projectDir, "dist"),
                clientDir: "client",
                componentsDir: "../escape",
            };

            try {
                await validateConfig(config, structure.projectDir);
                assert.fail("should have thrown an error");
            } catch (err) {
                assert.ok(err.message.includes("Invalid componentsDir"), "error message should mention componentsDir");
                assert.ok(err.message.includes("attempts to escape"), "error message should mention escape attempt");
                assert.ok(err.message.includes("within"), "error message should mention project directory constraint");
            }
        });
    });
});
