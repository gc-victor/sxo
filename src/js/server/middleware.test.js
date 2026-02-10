/**
 * Tests for middleware loader.
 *
 * Covers:
 * - Various export shapes for SRC_DIR/middleware.js (default function, default array,
 *   named exports: middleware, middlewares, mw).
 * - Filtering of non-function items in arrays.
 * - Cache-busting behavior in dev vs. prod mode.
 *
 * These tests create/overwrite `SRC_DIR/middleware.js` temporarily and restore any
 * pre-existing file after each test.
 */

import { strictEqual } from "node:assert";
import { test } from "node:test";
import { withTempProject, writeFile } from "../test-utils.js";
import { loadUserDefinedMiddlewares } from "./middleware.js";

async function withDevEnv(testFn) {
    const originalDev = process.env.DEV;
    process.env.DEV = "true";
    try {
        return await testFn();
    } finally {
        process.env.DEV = originalDev;
    }
}

function assertMiddlewareArray(result, expectedLength, message) {
    strictEqual(Array.isArray(result), true, message ?? "Expected array result");
    if (expectedLength !== undefined) {
        strictEqual(result.length, expectedLength, message ?? `Expected ${expectedLength} middleware(s)`);
    }
}

function assertFunction(item, message) {
    strictEqual(typeof item, "function", message ?? "Expected function");
}

test("loader: default-exported function", async () => {
    await withTempProject(async (tmpDir) => {
        await withDevEnv(async () => {
            await writeFile(tmpDir, "middleware.js", `export default function mw(req, res){ return true; }`);
            const res = await loadUserDefinedMiddlewares({ srcDir: tmpDir });
            assertMiddlewareArray(res, 1);
            assertFunction(res[0]);
        });
    });
});

test("loader: default-exported array filters non-functions", async () => {
    await withTempProject(async (tmpDir) => {
        await withDevEnv(async () => {
            await writeFile(tmpDir, "middleware.js", `export default [function a(){}, null, 123, function b(){}];`);
            const res = await loadUserDefinedMiddlewares({ srcDir: tmpDir });
            assertMiddlewareArray(res, 2);
            assertFunction(res[0]);
            assertFunction(res[1]);
        });
    });
});

test("loader: named export 'middleware' and 'middlewares' and 'mw'", async () => {
    await withTempProject(async (tmpDir) => {
        await withDevEnv(async () => {
            // middleware (single)
            await writeFile(tmpDir, "middleware.js", `export function middleware(req,res){ return true; }`);
            let res = await loadUserDefinedMiddlewares({ srcDir: tmpDir });
            assertMiddlewareArray(res, 1);
            assertFunction(res[0]);

            // middlewares (array)
            await writeFile(tmpDir, "middleware.js", `export const middlewares = [function a(){}, function b(){}];`);
            res = await loadUserDefinedMiddlewares({ srcDir: tmpDir });
            assertMiddlewareArray(res, 2);

            // mw (alias)
            await writeFile(tmpDir, "middleware.js", `export const mw = (req,res)=>true;`);
            res = await loadUserDefinedMiddlewares({ srcDir: tmpDir });
            assertMiddlewareArray(res, 1);
            assertFunction(res[0]);
        });
    });
});

test("loader: invalid export returns empty array", async () => {
    await withTempProject(async (tmpDir) => {
        await withDevEnv(async () => {
            await writeFile(tmpDir, "middleware.js", `export const something = 42;`);
            const res = await loadUserDefinedMiddlewares({ srcDir: tmpDir });
            assertMiddlewareArray(res, 0);
        });
    });
});

test("loader: cache-busting only in dev mode", async () => {
    await withTempProject(async (tmpDir) => {
        // Test dev mode: cache-busting should pick up changes
        process.env.DEV = "true";

        // Load version 1
        await writeFile(tmpDir, "middleware.js", `export default function mw(){ return "dev-v1"; }`);
        const devResult1 = await loadUserDefinedMiddlewares({ srcDir: tmpDir });
        assertMiddlewareArray(devResult1, 1);
        strictEqual(devResult1[0](), "dev-v1", "Dev mode should load v1");

        // Modify and reload - should get new version (cache bypassed)
        await writeFile(tmpDir, "middleware.js", `export default function mw(){ return "dev-v2"; }`);
        const devResult2 = await loadUserDefinedMiddlewares({ srcDir: tmpDir });
        strictEqual(devResult2[0](), "dev-v2", "Dev mode should reload and get v2");

        // Test prod mode: no cache-busting, should use cached version
        process.env.DEV = "false";

        // Load version 1
        await writeFile(tmpDir, "middleware.js", `export default function mw(){ return "prod-v1"; }`);
        const prodResult1 = await loadUserDefinedMiddlewares({ srcDir: tmpDir });
        assertMiddlewareArray(prodResult1, 1);
        strictEqual(prodResult1[0](), "prod-v1", "Prod mode should load v1");

        // Modify file - prod should still use cached version
        await writeFile(tmpDir, "middleware.js", `export default function mw(){ return "prod-v2"; }`);
        const prodResult2 = await loadUserDefinedMiddlewares({ srcDir: tmpDir });
        strictEqual(prodResult2[0](), "prod-v1", "Prod mode should use cached v1, not v2");

        // Restore DEV env
        process.env.DEV = "true";
    });
});

test("loader: extension priority uses first match", async () => {
    await withTempProject(async (tmpDir) => {
        await withDevEnv(async () => {
            // Create .mjs (third priority), .ts (second priority), .js (first priority)
            // Should pick .js and ignore others
            await writeFile(tmpDir, "middleware.mjs", `export default function mw(){ return "mjs"; }`);
            await writeFile(tmpDir, "middleware.ts", `export default function mw(){ return "ts"; }`);
            await writeFile(tmpDir, "middleware.js", `export default function mw(){ return "js"; }`);

            const result = await loadUserDefinedMiddlewares({ srcDir: tmpDir });
            assertMiddlewareArray(result, 1);
            strictEqual(result[0](), "js", "Should prioritize .js over .ts and .mjs");
        });
    });
});

test("loader: returns empty array when no middleware file exists", async () => {
    await withTempProject(async (tmpDir) => {
        await withDevEnv(async () => {
            // No middleware files created in tmpDir
            const result = await loadUserDefinedMiddlewares({ srcDir: tmpDir });
            assertMiddlewareArray(result, 0);
        });
    });
});

test("loader: handles import errors gracefully", async () => {
    await withTempProject(async (tmpDir) => {
        await withDevEnv(async () => {
            // Create a file with syntax error
            await writeFile(tmpDir, "middleware.js", `export default function mw(){{{`);

            const result = await loadUserDefinedMiddlewares({ srcDir: tmpDir });
            assertMiddlewareArray(result, 0);
        });
    });
});

test("loader: array export filters only functions", async () => {
    await withTempProject(async (tmpDir) => {
        await withDevEnv(async () => {
            await writeFile(
                tmpDir,
                "middleware.js",
                `export default [function a(){}, {not: "function"}, 42, null, "string", function b(){}]`,
            );

            const result = await loadUserDefinedMiddlewares({ srcDir: tmpDir });
            assertMiddlewareArray(result, 2);
            assertFunction(result[0]);
            assertFunction(result[1]);
        });
    });
});

test("loader: empty array export returns empty array", async () => {
    await withTempProject(async (tmpDir) => {
        await withDevEnv(async () => {
            await writeFile(tmpDir, "middleware.js", `export default []`);

            const result = await loadUserDefinedMiddlewares({ srcDir: tmpDir });
            assertMiddlewareArray(result, 0);
        });
    });
});

test("loader: non-array non-function export returns empty array", async () => {
    await withTempProject(async (tmpDir) => {
        await withDevEnv(async () => {
            await writeFile(tmpDir, "middleware.js", `export default 42`);

            const result = await loadUserDefinedMiddlewares({ srcDir: tmpDir });
            assertMiddlewareArray(result, 0);
        });
    });
});

test("loader: silently handles import errors when logger is null", async () => {
    await withTempProject(async (tmpDir) => {
        await withDevEnv(async () => {
            await writeFile(tmpDir, "middleware.js", `export default function mw(){{{`);

            const result = await loadUserDefinedMiddlewares({ srcDir: tmpDir, logger: null });
            assertMiddlewareArray(result, 0);
        });
    });
});

test("loader: returns empty array when srcDir is nullish", async () => {
    const result = await loadUserDefinedMiddlewares({ srcDir: null });
    assertMiddlewareArray(result, 0);
});

test("loader: prod mode via options (no cache-bust)", async () => {
    await withTempProject(async (tmpDir) => {
        await writeFile(tmpDir, "middleware.js", `export default function mw(){ return "prod-opt"; }`);
        const result = await loadUserDefinedMiddlewares({ srcDir: tmpDir, isDev: false });
        strictEqual(result[0](), "prod-opt");
    });
});
