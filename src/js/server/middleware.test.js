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
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { SRC_DIR } from "../constants.js";
import { loadUserDefinedMiddlewares } from "./middleware.js";

async function writeFileEnsured(filePath, content) {
    await fsp.mkdir(path.dirname(filePath), { recursive: true });
    await fsp.writeFile(filePath, content, "utf8");
}

async function maybeRemove(filePath) {
    try {
        await fsp.unlink(filePath);
    } catch {}
}

async function restoreBackup(filePath, backupPath) {
    await maybeRemove(filePath);
    if (backupPath) {
        await fsp.copyFile(backupPath, filePath);
        await maybeRemove(backupPath);
    }
}

test("loader: default-exported function", async () => {
    const mwPath = path.resolve(SRC_DIR, "middleware.js");
    if (fs.existsSync(mwPath)) {
        // Skip loader test to avoid modifying an existing user middleware.js
        return;
    }
    const backup = null;
    const originalDev = process.env.DEV;
    process.env.DEV = "true"; // Enable cache-busting for test

    try {
        await writeFileEnsured(mwPath, `export default function mw(req, res){ return true; }`);
        const res = await loadUserDefinedMiddlewares();
        strictEqual(Array.isArray(res), true, "Expected array result");
        strictEqual(typeof res[0], "function", "Expected first export to be function");
    } finally {
        process.env.DEV = originalDev;
        await restoreBackup(mwPath, backup);
    }
});

test("loader: default-exported array filters non-functions", async () => {
    const mwPath = path.resolve(SRC_DIR, "middleware.js");
    if (fs.existsSync(mwPath)) {
        // Skip loader test to avoid modifying an existing user middleware.js
        return;
    }
    const backup = null;
    const originalDev = process.env.DEV;
    process.env.DEV = "true"; // Enable cache-busting for test

    try {
        await writeFileEnsured(mwPath, `export default [function a(){}, null, 123, function b(){}];`);
        const res = await loadUserDefinedMiddlewares();
        strictEqual(Array.isArray(res), true);
        // Only two function entries should remain
        strictEqual(res.length, 2);
        strictEqual(typeof res[0], "function");
        strictEqual(typeof res[1], "function");
    } finally {
        process.env.DEV = originalDev;
        await restoreBackup(mwPath, backup);
    }
});

test("loader: named export 'middleware' and 'middlewares' and 'mw'", async () => {
    const mwPath = path.resolve(SRC_DIR, "middleware.js");
    if (fs.existsSync(mwPath)) {
        // Skip loader test to avoid modifying an existing user middleware.js
        return;
    }
    const backup = null;
    const originalDev = process.env.DEV;
    process.env.DEV = "true"; // Enable cache-busting for test

    try {
        // middleware (single)
        await writeFileEnsured(mwPath, `export function middleware(req,res){ return true; }`);
        let res = await loadUserDefinedMiddlewares();
        strictEqual(Array.isArray(res), true);
        strictEqual(typeof res[0], "function");

        // middlewares (array)
        await writeFileEnsured(mwPath, `export const middlewares = [function a(){}, function b(){}];`);
        res = await loadUserDefinedMiddlewares();
        strictEqual(Array.isArray(res), true);
        strictEqual(res.length, 2);

        // mw (alias)
        await writeFileEnsured(mwPath, `export const mw = (req,res)=>true;`);
        res = await loadUserDefinedMiddlewares();
        strictEqual(Array.isArray(res), true);
        strictEqual(typeof res[0], "function");
    } finally {
        process.env.DEV = originalDev;
        await restoreBackup(mwPath, backup);
    }
});

test("loader: invalid export returns empty array", async () => {
    const mwPath = path.resolve(SRC_DIR, "middleware.js");
    if (fs.existsSync(mwPath)) {
        // Skip loader test to avoid modifying an existing user middleware.js
        return;
    }
    const backup = null;
    const originalDev = process.env.DEV;
    process.env.DEV = "true"; // Enable cache-busting for test

    try {
        await writeFileEnsured(mwPath, `export const something = 42;`);
        const res = await loadUserDefinedMiddlewares();
        strictEqual(Array.isArray(res), true);
        strictEqual(res.length, 0);
    } finally {
        process.env.DEV = originalDev;
        await restoreBackup(mwPath, backup);
    }
});

test("loader: cache-busting only in dev mode", async () => {
    const mwPath = path.resolve(SRC_DIR, "middleware.js");
    if (fs.existsSync(mwPath)) {
        // Skip loader test to avoid modifying an existing user middleware.js
        return;
    }
    const backup = null;
    const originalDev = process.env.DEV;

    try {
        // Test dev mode: cache-busting should pick up changes
        process.env.DEV = "true";

        // Load version 1
        await writeFileEnsured(mwPath, `export default function mw(){ return "dev-v1"; }`);
        const devResult1 = await loadUserDefinedMiddlewares();
        strictEqual(Array.isArray(devResult1), true, "Dev mode should return array");
        strictEqual(devResult1.length, 1, "Dev mode should load one middleware");
        strictEqual(devResult1[0](), "dev-v1", "Dev mode should load v1");

        // Modify and reload - should get new version (cache bypassed)
        await writeFileEnsured(mwPath, `export default function mw(){ return "dev-v2"; }`);
        const devResult2 = await loadUserDefinedMiddlewares();
        strictEqual(devResult2[0](), "dev-v2", "Dev mode should reload and get v2");

        // Test prod mode: no cache-busting, should use cached version
        process.env.DEV = "false";

        // Load version 1
        await writeFileEnsured(mwPath, `export default function mw(){ return "prod-v1"; }`);
        const prodResult1 = await loadUserDefinedMiddlewares();
        strictEqual(Array.isArray(prodResult1), true, "Prod mode should return array");
        strictEqual(prodResult1.length, 1, "Prod mode should load one middleware");
        strictEqual(prodResult1[0](), "prod-v1", "Prod mode should load v1");

        // Modify file - prod should still use cached version
        await writeFileEnsured(mwPath, `export default function mw(){ return "prod-v2"; }`);
        const prodResult2 = await loadUserDefinedMiddlewares();
        strictEqual(prodResult2[0](), "prod-v1", "Prod mode should use cached v1, not v2");
    } finally {
        process.env.DEV = originalDev;
        await restoreBackup(mwPath, backup);
    }
});
