/**
 * Test suite for esbuild config utilities.
 */

import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { generateModulesFile, parseEnvJson } from "./esbuild.config.js";

describe("esbuild config helpers", () => {
    /** @type {string} */
    let tempDir;
    /** @type {string} */
    let pagesDir;

    beforeEach(async () => {
        tempDir = await mkdtemp(path.join(os.tmpdir(), "sxo-test-"));
        pagesDir = path.join(tempDir, "pages");
        await mkdir(pagesDir, { recursive: true });
    });

    afterEach(async () => {
        await rm(tempDir, { recursive: true, force: true });
    });

    describe("generateModulesFile", () => {
        it("generates a modules.js file with correct imports and mapping", async () => {
            const routes = [
                { jsx: "src/pages/index.jsx" },
                { jsx: "src/pages/about/index.jsx" },
                { jsx: "src/pages/[slug].tsx" },
                { jsx: "src/pages/post.ts" },
            ];

            const outDir = path.join(tempDir, "server");
            await mkdir(outDir, { recursive: true });

            // Set PAGES_DIR env for generateModulesFile
            const originalPagesDir = process.env.PAGES_DIR;
            process.env.PAGES_DIR = "src/pages";

            try {
                await generateModulesFile(routes, outDir);

                const modulesPath = path.join(outDir, "modules.js");
                const content = await readFile(modulesPath, "utf8");

                // Check imports
                assert.match(content, /import \* as _0 from "\.\/index\.js";/);
                assert.match(content, /import \* as _1 from "\.\/about\/index\.js";/);
                assert.match(content, /import \* as _2 from "\.\/\[slug\]\.js";/);
                assert.match(content, /import \* as _3 from "\.\/post\.js";/);

                // Check default export map
                assert.match(content, /export default \{/);
                assert.match(content, /"src\/pages\/index\.jsx": _0/);
                assert.match(content, /"src\/pages\/about\/index\.jsx": _1/);
                assert.match(content, /"src\/pages\/\[slug\]\.tsx": _2/);
                assert.match(content, /"src\/pages\/post\.ts": _3/);
            } finally {
                process.env.PAGES_DIR = originalPagesDir;
            }
        });
    });

    describe("parseEnvJson", () => {
        /** @type {string} */
        let originalEnvValue;
        /** @type {typeof console.error} */
        let originalConsoleError;
        /** @type {Array<unknown>} */
        let errorLogs;

        beforeEach(() => {
            // Store original env and console.error
            originalEnvValue = process.env.BUILD;
            originalConsoleError = console.error;
            errorLogs = [];

            // Stub console.error to capture logs
            console.error = (...args) => {
                errorLogs.push(args);
            };
        });

        afterEach(() => {
            // Restore original env and console.error
            if (originalEnvValue !== undefined) {
                process.env.BUILD = originalEnvValue;
            } else {
                delete process.env.BUILD;
            }
            console.error = originalConsoleError;
        });

        it("returns default value when BUILD contains invalid JSON", () => {
            process.env.BUILD = "{ invalid json }";

            const result = parseEnvJson("BUILD", {});

            assert.deepStrictEqual(result, {});
            assert.equal(errorLogs.length, 1);
            assert.ok(errorLogs[0][0].includes("Invalid JSON in BUILD:"));
        });
    });
});
