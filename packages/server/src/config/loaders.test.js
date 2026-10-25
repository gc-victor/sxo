import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { describe, it } from "node:test";
import { withTempProject, writeFile } from "../test-utils.js";
import { loadConfigFile } from "./loaders.js";

describe("loadConfigFile", () => {
    /**
     * Parameterized test: Load config files from different formats
     * Consolidates 3 redundant tests into single test with loop
     */
    it("should load config files in various formats", async () => {
        const configFormats = [
            {
                filename: "sxo.config.mjs",
                content: "export default { port: 3000, pages: 'src/pages' };",
                expected: { port: 3000, pages: "src/pages" },
            },
            {
                filename: "sxo.config.js",
                content: "export default { port: 3001, pages: 'src/pages' };",
                expected: { port: 3001, pages: "src/pages" },
            },
            {
                filename: "sxo.config.json",
                content: JSON.stringify({ port: 3002, pages: "src/pages" }),
                expected: { port: 3002, pages: "src/pages" },
            },
        ];

        for (const { filename, content, expected } of configFormats) {
            await withTempProject(async (dir) => {
                await writeFile(dir, filename, content);

                const config = await loadConfigFile(dir);

                assert.deepEqual(config, expected, `Failed for ${filename}`);
            });
        }
    });

    /**
     * Unique test: File loading precedence
     */
    it("should respect loading order: .mjs > .js > .cjs > .json", async () => {
        await withTempProject(async (dir) => {
            await writeFile(dir, "sxo.config.mjs", "export default { source: 'mjs' };");
            await writeFile(dir, "sxo.config.js", "export default { source: 'js' };");
            await writeFile(dir, "sxo.config.cjs", "module.exports = { source: 'cjs' };");
            await writeFile(dir, "sxo.config.json", JSON.stringify({ source: "json" }));

            assert.equal((await loadConfigFile(dir)).source, "mjs");
            await rm(`${dir}/sxo.config.mjs`);
            assert.equal((await loadConfigFile(dir)).source, "js");
            await rm(`${dir}/sxo.config.js`);
            assert.equal((await loadConfigFile(dir)).source, "cjs");
            await rm(`${dir}/sxo.config.cjs`);
            assert.equal((await loadConfigFile(dir)).source, "json");
        });
    });

    /**
     * Unique test: No config file found
     */
    it("should return undefined when no config file found", async () => {
        await withTempProject(async (dir) => {
            const config = await loadConfigFile(dir);

            assert.equal(config, undefined);
        });
    });

    /**
     * Parameterized test: Error handling for invalid config files
     * Consolidates 2 redundant error tests into single test with loop
     */
    it("should handle error conditions for invalid config files", async () => {
        const errorScenarios = [
            {
                filename: "sxo.config.json",
                content: "{ invalid json }",
                expectedError: "Failed to parse config file",
            },
            {
                filename: "sxo.config.js",
                content: "this is not valid javascript",
                expectedError: "Failed to parse config file",
            },
        ];

        for (const { filename, content, expectedError } of errorScenarios) {
            await withTempProject(async (dir) => {
                await writeFile(dir, filename, content);

                await assert.rejects(
                    async () => {
                        await loadConfigFile(dir);
                    },
                    (error) => {
                        assert.ok(
                            error.message.includes(expectedError),
                            `Error message should include "${expectedError}" for ${filename}: ${error.message}`,
                        );
                        return true;
                    },
                );
            });
        }
    });

    /**
     * Test: Load .cjs config file successfully
     */
    it("should load .cjs config file successfully", async () => {
        await withTempProject(async (dir) => {
            await writeFile(dir, "sxo.config.cjs", "module.exports = { port: 3003, pages: 'src/pages' };");

            const config = await loadConfigFile(dir);

            assert.deepEqual(config, { port: 3003, pages: "src/pages" });
        });
    });

    /**
     * Test: Handle .cjs config with exports.default
     */
    it("should handle .cjs config with exports.default", async () => {
        await withTempProject(async (dir) => {
            await writeFile(dir, "sxo.config.cjs", "exports.default = { port: 3004, pages: 'src/other' };");

            const config = await loadConfigFile(dir);

            assert.deepEqual(config, { port: 3004, pages: "src/other" });
        });
    });

    /**
     * Test: Parse .cjs config and return default export
     */
    it("should parse .cjs config and return default export", async () => {
        await withTempProject(async (dir) => {
            await writeFile(dir, "sxo.config.cjs", "module.exports = { default: { port: 3005, pages: 'src/views' } };");

            const config = await loadConfigFile(dir);

            assert.deepEqual(config, { port: 3005, pages: "src/views" });
        });
    });

    /**
     * Unique test: Empty .mjs config
     */
    it("should load empty .mjs config", async () => {
        await withTempProject(async (dir) => {
            await writeFile(dir, "sxo.config.mjs", "export default {};");

            const config = await loadConfigFile(dir);

            assert.deepEqual(config, {});
        });
    });

    /**
     * Unique test: Complex JSON config structure
     */
    it("should load .json config with complex structure", async () => {
        await withTempProject(async (dir) => {
            const complexConfig = {
                port: 3000,
                pages: "src/pages",
                outputDir: "dist",
                loaders: { ".svg": "file", ".ts": "tsx" },
                build: { minify: true, sourcemap: true },
            };
            await writeFile(dir, "sxo.config.json", JSON.stringify(complexConfig));

            const config = await loadConfigFile(dir);

            assert.deepEqual(config, complexConfig);
        });
    });
});
