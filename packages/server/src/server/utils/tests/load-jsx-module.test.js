import { strict as assert } from "node:assert";
import fsp from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { withEnvCapture, withTempProject } from "../../../test-utils.js";
import { loadJsxModule } from "../../shared/module-loader.js";

/* helpers */

function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* tests */

test("loadJsxModule: loads default export function", async () => {
    await withTempProject(async (tmpDir) => {
        const serverDir = path.join(tmpDir, "server");
        await fsp.mkdir(serverDir, { recursive: true });
        const pagesDir = path.join(tmpDir, "pages");
        await fsp.mkdir(pagesDir, { recursive: true });

        await withEnvCapture(async () => {
            process.env.OUTPUT_DIR_SERVER = serverDir;
            process.env.PAGES_DIR = pagesDir;

            const rel = "load-jsx-module/default/index.js";
            const modPath = path.join(serverDir, rel);
            await fsp.mkdir(path.dirname(modPath), { recursive: true });
            await fsp.writeFile(
                modPath,
                `
                export default function () {
                    return "<html><head><title>t</title></head><body>default-ok</body></html>";
                }
            `,
                "utf8",
            );

            const pagesRel = path.relative(process.cwd(), pagesDir);
            const srcPath = `${pagesRel}/load-jsx-module/default/index.jsx`;
            const cache = new Map();

            const fn = await loadJsxModule(srcPath, { cache });
            assert.equal(typeof fn, "function", "Should return a function");

            const html = await fn({});
            assert.match(html, /default-ok/, "Rendered output should come from default export");
        });
    });
});

test("loadJsxModule: falls back to named export 'jsx' when default missing", async () => {
    await withTempProject(async (tmpDir) => {
        const serverDir = path.join(tmpDir, "server");
        await fsp.mkdir(serverDir, { recursive: true });
        const pagesDir = path.join(tmpDir, "pages");
        await fsp.mkdir(pagesDir, { recursive: true });

        await withEnvCapture(async () => {
            process.env.OUTPUT_DIR_SERVER = serverDir;
            process.env.PAGES_DIR = pagesDir;

            const rel = "load-jsx-module/named/index.js";
            const modPath = path.join(serverDir, rel);
            await fsp.mkdir(path.dirname(modPath), { recursive: true });
            await fsp.writeFile(
                modPath,
                `
                export function jsx() {
                    return "<html><head><title>t</title></head><body>named-ok</body></html>";
                }
            `,
                "utf8",
            );

            const pagesRel = path.relative(process.cwd(), pagesDir);
            const srcPath = `${pagesRel}/load-jsx-module/named/index.jsx`;
            const cache = new Map();

            const fn = await loadJsxModule(srcPath, { cache });
            assert.equal(typeof fn, "function");

            const html = await fn({});
            assert.match(html, /named-ok/, "Rendered output should come from named 'jsx' export");
        });
    });
});

test("loadJsxModule: throws when no valid export is present (returnErrorStub=false)", async () => {
    await withTempProject(async (tmpDir) => {
        const serverDir = path.join(tmpDir, "server");
        await fsp.mkdir(serverDir, { recursive: true });
        const pagesDir = path.join(tmpDir, "pages");
        await fsp.mkdir(pagesDir, { recursive: true });

        await withEnvCapture(async () => {
            process.env.OUTPUT_DIR_SERVER = serverDir;
            process.env.PAGES_DIR = pagesDir;

            const rel = "load-jsx-module/invalid/index.js";
            const modPath = path.join(serverDir, rel);
            await fsp.mkdir(path.dirname(modPath), { recursive: true });
            await fsp.writeFile(
                modPath,
                `
                export const nope = 1;
            `,
                "utf8",
            );

            const pagesRel = path.relative(process.cwd(), pagesDir);
            const srcPath = `${pagesRel}/load-jsx-module/invalid/index.jsx`;
            const cache = new Map();

            let threw = false;
            try {
                await loadJsxModule(srcPath, { cache });
            } catch (e) {
                threw = true;
                assert.match(String(e?.message ?? e), /No valid export found/, "Error should mention missing valid export");
            }
            assert.equal(threw, true, "Expected loadJsxModule to throw for invalid module");
        });
    });
});

test("loadJsxModule: returns error stub when no valid export and returnErrorStub=true", async () => {
    await withTempProject(async (tmpDir) => {
        const serverDir = path.join(tmpDir, "server");
        await fsp.mkdir(serverDir, { recursive: true });
        const pagesDir = path.join(tmpDir, "pages");
        await fsp.mkdir(pagesDir, { recursive: true });

        await withEnvCapture(async () => {
            process.env.OUTPUT_DIR_SERVER = serverDir;
            process.env.PAGES_DIR = pagesDir;

            const rel = "load-jsx-module/error-stub/index.js";
            const modPath = path.join(serverDir, rel);
            await fsp.mkdir(path.dirname(modPath), { recursive: true });
            await fsp.writeFile(
                modPath,
                `
                // no valid exports on purpose
                export const foo = 42;
            `,
                "utf8",
            );

            const pagesRel = path.relative(process.cwd(), pagesDir);
            const srcPath = `${pagesRel}/load-jsx-module/error-stub/index.jsx`;
            const cache = new Map();

            const fn = await loadJsxModule(srcPath, { returnErrorStub: true, cache, isDev: true });
            assert.equal(typeof fn, "function", "Should return a stub function instead of throwing");

            const html = await fn({});
            assert.match(html, /<pre/i, "Stub should render a <pre> block");
            assert.match(html, /Error loading/i, "Stub should mention error loading");
            assert.match(html, new RegExp(escapeRegExp(srcPath)), "Stub should include the requested source path");
        });
    });
});

test("loadJsxModule: caches results and respects bustCache to force re-import", async () => {
    await withTempProject(async (tmpDir) => {
        const serverDir = path.join(tmpDir, "server");
        await fsp.mkdir(serverDir, { recursive: true });
        const pagesDir = path.join(tmpDir, "pages");
        await fsp.mkdir(pagesDir, { recursive: true });

        await withEnvCapture(async () => {
            process.env.OUTPUT_DIR_SERVER = serverDir;
            process.env.PAGES_DIR = pagesDir;

            const rel = "load-jsx-module/cache-bust/index.js";
            const mkModule = (value) => `
                export default function () {
                    return "<html><head></head><body>${value}</body></html>";
                }
            `;

            // initial module
            const modPath = path.join(serverDir, rel);
            await fsp.mkdir(path.dirname(modPath), { recursive: true });
            await fsp.writeFile(modPath, mkModule("v1"), "utf8");

            const pagesRel = path.relative(process.cwd(), pagesDir);
            const srcPath = `${pagesRel}/load-jsx-module/cache-bust/index.jsx`;
            const cache = new Map();

            // first load -> v1
            let fn = await loadJsxModule(srcPath, { cache });
            let html = await fn({});
            assert.match(html, /v1/, "Initial render should be v1");

            // overwrite built module with v2
            await fsp.writeFile(modPath, mkModule("v2"), "utf8");

            // load without bustCache should return cached fn (v1)
            fn = await loadJsxModule(srcPath, { cache });
            html = await fn({});
            assert.match(html, /v1/, "Without bustCache, should use cached function (v1)");

            // load with bustCache should re-import and return v2
            fn = await loadJsxModule(srcPath, { cache, bustCache: true });
            html = await fn({});
            assert.match(html, /v2/, "With bustCache, should pick up new module (v2)");
        });
    });
});
