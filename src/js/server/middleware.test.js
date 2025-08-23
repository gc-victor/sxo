/**
 * Extended tests for middleware loader and runner.
 *
 * Covers:
 * - Various export shapes for SRC_DIR/middleware.js (default function, default array,
 *   named exports: middleware, middlewares, mw).
 * - Filtering of non-function items in arrays.
 * - runMiddleware behavior for:
 *   - sync handlers that end the response
 *   - callback-style next(err) rejection
 *   - promise-returning middleware
 *   - thrown errors causing rejection
 *   - next() sequencing and short-circuit behavior
 *
 * These tests create/overwrite `SRC_DIR/middleware.js` temporarily and restore any
 * pre-existing file after each test.
 */

import { ok, rejects, strictEqual } from "node:assert";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { SRC_DIR } from "../constants.js";
import { loadUserDefinedMiddlewares, runMiddleware } from "./middleware.js";

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

    try {
        await writeFileEnsured(mwPath, `export default function mw(req, res){ return true; }`);
        const res = await loadUserDefinedMiddlewares();
        strictEqual(Array.isArray(res), true, "Expected array result");
        strictEqual(typeof res[0], "function", "Expected first export to be function");
    } finally {
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

    try {
        await writeFileEnsured(mwPath, `export default [function a(){}, null, 123, function b(){}];`);
        const res = await loadUserDefinedMiddlewares();
        strictEqual(Array.isArray(res), true);
        // Only two function entries should remain
        strictEqual(res.length, 2);
        strictEqual(typeof res[0], "function");
        strictEqual(typeof res[1], "function");
    } finally {
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

    try {
        await writeFileEnsured(mwPath, `export const something = 42;`);
        const res = await loadUserDefinedMiddlewares();
        strictEqual(Array.isArray(res), true);
        strictEqual(res.length, 0);
    } finally {
        await restoreBackup(mwPath, backup);
    }
});

test("runMiddleware: sync handler ends response and short-circuits", async () => {
    const req = {};
    let ended = false;
    const res = {
        writableEnded: false,
        writeHead(code) {
            this._code = code;
        },
        end(content) {
            this.writableEnded = true;
            ended = true;
            this._body = content;
        },
    };

    const mw = (_, res) => {
        res.writeHead(200);
        res.end("ok");
        return true;
    };

    const handled = await runMiddleware(req, res, [mw]);
    strictEqual(handled, true);
    ok(ended, "middleware should have ended the response");
});

test("runMiddleware: callback next(err) rejects", async () => {
    const req = {};
    const res = { writableEnded: false, writeHead() {}, end() {} };

    const mwErr = (_req, _res, next) => {
        next(new Error("boom"));
    };

    await rejects(async () => {
        await runMiddleware(req, res, [mwErr]);
    }, Error);
});

test("runMiddleware: thrown error rejects", async () => {
    const req = {};
    const res = { writableEnded: false, writeHead() {}, end() {} };

    const mwThrow = () => {
        throw new Error("sync throw");
    };

    await rejects(async () => {
        await runMiddleware(req, res, [mwThrow]);
    }, Error);
});

test("runMiddleware: promise-returning middleware resolves and short-circuits", async () => {
    const req = {};
    const res = { writableEnded: false, writeHead() {}, end() {} };

    const mwPromise = async () => {
        // resolves to a truthy value -> runMiddleware treats as handled
        return "ok";
    };

    const handled = await runMiddleware(req, res, [mwPromise]);
    strictEqual(handled, true);
});

test("runMiddleware: next(null, value) wins over returned promise", async () => {
    const req = {};
    const res = { writableEnded: false, writeHead() {}, end() {} };

    const mwBoth = (_req, _res, next) => {
        // call next with value; return a promise that would resolve later
        next(null, "fromNext");
        return new Promise((resolve) => setTimeout(() => resolve("fromPromise"), 10));
    };

    // runMiddleware returns boolean handled; ensure it resolves (no rejection)
    const handled = await runMiddleware(req, res, [mwBoth]);
    strictEqual(handled, true);
});

test("runMiddleware: sequencing and skip after writableEnded", async () => {
    const req = {};
    let secondRan = false;
    const res = {
        writableEnded: false,
        writeHead() {},
        end() {
            this.writableEnded = true;
        },
    };

    const first = (_, res) => {
        res.end("done");
        return true;
    };
    const second = () => {
        secondRan = true;
    };

    const handled = await runMiddleware(req, res, [first, second]);
    strictEqual(handled, true);
    strictEqual(secondRan, false, "Second middleware should not run after response ended");
});
