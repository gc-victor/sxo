/**
 * Test suite for alias resolution from tsconfig.json, package.json, and directory structure.
 */

import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { resolveAliases } from "./aliases.js";

describe("resolveAliases", () => {
    /** @type {string} */
    let tmp;

    beforeEach(async () => {
        tmp = await mkdtemp(path.join(os.tmpdir(), "sxo-aliases-"));
    });

    afterEach(async () => {
        await rm(tmp, { recursive: true, force: true });
    });

    describe("tsconfig.json paths", () => {
        it("returns tsconfig aliases when compilerOptions.paths is present", async () => {
            const srcDir = path.join(tmp, "src");
            const pagesDir = path.join(srcDir, "pages");
            await mkdir(pagesDir, { recursive: true });

            await writeFile(
                path.join(tmp, "tsconfig.json"),
                JSON.stringify({
                    compilerOptions: {
                        baseUrl: ".",
                        paths: {
                            "@utils/*": ["./src/utils/*"],
                            "@components/*": ["./src/components/*"],
                        },
                    },
                }),
            );

            const aliases = resolveAliases(srcDir, pagesDir, tmp);
            assert.deepStrictEqual(aliases, {
                "@utils": path.join(tmp, "src", "utils"),
                "@components": path.join(tmp, "src", "components"),
                "@pages": pagesDir,
            });
        });

        it("strips comments from tsconfig.json", async () => {
            const srcDir = path.join(tmp, "src");
            const pagesDir = path.join(srcDir, "pages");
            await mkdir(pagesDir, { recursive: true });

            await writeFile(
                path.join(tmp, "tsconfig.json"),
                `{
                    // Base configuration
                    "compilerOptions": {
                        "baseUrl": ".",
                        /* Path aliases */
                        "paths": {
                            "@utils/*": ["./src/utils/*"]
                        }
                    }
                }`,
            );

            const aliases = resolveAliases(srcDir, pagesDir, tmp);
            assert.deepStrictEqual(aliases, {
                "@utils": path.join(tmp, "src", "utils"),
                "@pages": pagesDir,
            });
        });

        it("handles tsconfig with baseUrl", async () => {
            const srcDir = path.join(tmp, "src");
            const pagesDir = path.join(srcDir, "pages");
            await mkdir(pagesDir, { recursive: true });

            await writeFile(
                path.join(tmp, "tsconfig.json"),
                JSON.stringify({
                    compilerOptions: {
                        baseUrl: "src",
                        paths: {
                            "@utils/*": ["./utils/*"],
                        },
                    },
                }),
            );

            const aliases = resolveAliases(srcDir, pagesDir, tmp);
            assert.deepStrictEqual(aliases, {
                "@utils": path.join(tmp, "src", "utils"),
                "@pages": pagesDir,
            });
        });

        it("returns null-like fallback for tsconfig without paths", async () => {
            const srcDir = path.join(tmp, "src");
            const pagesDir = path.join(srcDir, "pages");
            await mkdir(pagesDir, { recursive: true });
            // Create dirs so auto-discovery works
            await mkdir(path.join(srcDir, "components"), { recursive: true });

            await writeFile(path.join(tmp, "tsconfig.json"), JSON.stringify({ compilerOptions: { strict: true } }));

            const aliases = resolveAliases(srcDir, pagesDir, tmp);
            // Falls through to auto-discovery since tsconfig has no paths
            assert.ok("@components" in aliases);
        });
    });

    describe("package.json imports", () => {
        it("returns aliases from package.json #imports when tsconfig is absent", async () => {
            const srcDir = path.join(tmp, "src");
            const pagesDir = path.join(srcDir, "pages");
            await mkdir(pagesDir, { recursive: true });

            await writeFile(
                path.join(tmp, "package.json"),
                JSON.stringify({
                    imports: {
                        "#utils": "./src/utils/index.js",
                        "#components": "./src/components",
                    },
                }),
            );

            const aliases = resolveAliases(srcDir, pagesDir, tmp);
            assert.deepStrictEqual(aliases, {
                "@utils": path.join(tmp, "src", "utils"),
                "@components": path.join(tmp, "src", "components"),
                "@pages": pagesDir,
            });
        });

        it("handles conditional exports in package.json imports", async () => {
            const srcDir = path.join(tmp, "src");
            const pagesDir = path.join(srcDir, "pages");
            await mkdir(pagesDir, { recursive: true });

            await writeFile(
                path.join(tmp, "package.json"),
                JSON.stringify({
                    imports: {
                        "#utils": {
                            default: "./src/utils/index.js",
                            node: "./src/utils/node.js",
                        },
                    },
                }),
            );

            const aliases = resolveAliases(srcDir, pagesDir, tmp);
            assert.deepStrictEqual(aliases, {
                "@utils": path.join(tmp, "src", "utils"),
                "@pages": pagesDir,
            });
        });

        it("tsconfig takes priority over package.json imports", async () => {
            const srcDir = path.join(tmp, "src");
            const pagesDir = path.join(srcDir, "pages");
            await mkdir(pagesDir, { recursive: true });

            await writeFile(
                path.join(tmp, "tsconfig.json"),
                JSON.stringify({
                    compilerOptions: {
                        paths: { "@api/*": ["./src/api/*"] },
                    },
                }),
            );
            await writeFile(
                path.join(tmp, "package.json"),
                JSON.stringify({
                    imports: { "#utils": "./src/utils" },
                }),
            );

            const aliases = resolveAliases(srcDir, pagesDir, tmp);
            // tsconfig wins — only has @api and @pages, not @utils
            assert.ok("@api" in aliases);
            assert.ok(!("@utils" in aliases));
        });
    });

    describe("auto-discovery fallback", () => {
        it("discovers aliases from source directory structure", async () => {
            const srcDir = path.join(tmp, "src");
            const pagesDir = path.join(srcDir, "pages");
            await mkdir(path.join(srcDir, "api"), { recursive: true });
            await mkdir(path.join(srcDir, "components"), { recursive: true });
            await mkdir(path.join(srcDir, "utils"), { recursive: true });
            await mkdir(path.join(srcDir, "_private"), { recursive: true });
            await mkdir(path.join(srcDir, ".hidden"), { recursive: true });
            await mkdir(pagesDir, { recursive: true });

            const aliases = resolveAliases(srcDir, pagesDir, tmp);

            assert.deepStrictEqual(aliases, {
                "@api": path.join(srcDir, "api"),
                "@components": path.join(srcDir, "components"),
                "@utils": path.join(srcDir, "utils"),
                "@pages": pagesDir,
            });
            // Directories starting with _ or . are excluded
            assert.ok(!("@_private" in aliases));
            assert.ok(!("@.hidden" in aliases));
        });

        it("includes @pages even when pages is not a direct child of srcDir", async () => {
            const srcDir = path.join(tmp, "src");
            const pagesDir = path.join(tmp, "custom-pages");
            await mkdir(pagesDir, { recursive: true });
            await mkdir(path.join(srcDir, "components"), { recursive: true });

            const aliases = resolveAliases(srcDir, pagesDir, tmp);

            assert.deepStrictEqual(aliases, {
                "@components": path.join(srcDir, "components"),
                "@pages": pagesDir,
            });
        });

        it("handles empty source directory gracefully", async () => {
            const srcDir = path.join(tmp, "src");
            const pagesDir = path.join(tmp, "src", "pages");
            await mkdir(pagesDir, { recursive: true });

            const aliases = resolveAliases(srcDir, pagesDir, tmp);

            assert.deepStrictEqual(aliases, {
                "@pages": pagesDir,
            });
        });
    });
});
