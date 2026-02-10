import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { entryPointsConfig } from "./entry-points-config.js";

let fixturesRoot;

before(async () => {
    fixturesRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "sxo-epc-"));
});

after(async () => {
    if (fixturesRoot) {
        await fsp.rm(fixturesRoot, { recursive: true, force: true });
    }
});

function writeFileRecursive(filePath, content) {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content);
}

test("entry-points-config coverage gaps", async (t) => {
    await t.test("scanPagesTree catch block (readdirSync error)", () => {
        // We can't easily trigger readdirSync error on a real directory without permission tricks
        // but we can pass a file path instead of a directory path to scanPagesTree
        const filePath = path.join(fixturesRoot, "not-a-dir.txt");
        fs.writeFileSync(filePath, "hello");

        // This should trigger the catch block in scanPagesTree
        const routes = entryPointsConfig({
            pagesDir: filePath,
            pagesRelativeDir: "any",
            clientDir: "client",
            cwd: process.cwd(),
        });

        assert.equal(routes.length, 0);
    });

    await t.test("scanPagesTree skips clientDir when it is the current dir", () => {
        const pagesDir = path.join(fixturesRoot, "skip-client-dir");
        const clientDir = "client";
        const clientDirPath = path.join(pagesDir, clientDir);
        writeFileRecursive(path.join(clientDirPath, "index.tsx"), "// skip me");

        // If we somehow end up with clientDirPath in the stack, it should be skipped
        // Actually the code does: if (path.basename(dir) === clientDir) continue;
        // This happens when a directory named 'client' is reached.

        const routes = entryPointsConfig({
            pagesDir: pagesDir,
            pagesRelativeDir: "any",
            clientDir: clientDir,
            cwd: process.cwd(),
        });

        assert.equal(routes.length, 0, "Should have 0 routes because index.tsx is inside clientDir");
    });

    await t.test("scanPagesTree skips symbolic links", () => {
        const pagesDir = path.join(fixturesRoot, "skip-symlinks");
        fs.mkdirSync(pagesDir, { recursive: true });

        const targetDir = path.join(fixturesRoot, "target-dir");
        writeFileRecursive(path.join(targetDir, "index.tsx"), "// target");

        const symlinkDir = path.join(pagesDir, "symlink-dir");
        try {
            fs.symlinkSync(targetDir, symlinkDir, "dir");
        } catch (e) {
            // Symlinks might fail on Windows without admin, skip if so
            console.warn(`Skipping symlink test: ${e.message}`);
            return;
        }

        const routes = entryPointsConfig({
            pagesDir: pagesDir,
            pagesRelativeDir: "any",
            clientDir: "client",
            cwd: process.cwd(),
        });

        assert.equal(routes.length, 0, "Should skip symbolic links");
    });

    await t.test("findClientEntries catch block", () => {
        const pagesDir = path.join(fixturesRoot, "client-entries-error");
        writeFileRecursive(path.join(pagesDir, "index.tsx"), "// index");

        // Create a file where a directory is expected for clientDir
        const clientFile = path.join(pagesDir, "client");
        fs.writeFileSync(clientFile, "not a directory");

        const routes = entryPointsConfig({
            pagesDir: pagesDir,
            pagesRelativeDir: "any",
            clientDir: "client",
            cwd: process.cwd(),
        });

        assert.equal(routes.length, 1);
        assert.equal(routes[0].entryPoints.length, 0, "Should have 0 client entries due to statSync error or not being a directory");
    });

    await t.test("assembleRoutes invalid route pattern", () => {
        const pagesDir = path.join(fixturesRoot, "invalid-pattern");
        // Nested directory with invalid name (starts with number in dynamic part)
        writeFileRecursive(path.join(pagesDir, "[123]", "index.tsx"), "// invalid");

        assert.throws(() => {
            entryPointsConfig({
                pagesDir: pagesDir,
                pagesRelativeDir: "any",
                clientDir: "client",
                cwd: process.cwd(),
            });
        }, /Invalid route pattern/);
    });

    await t.test("assembleRoutes isRoot branch coverage", () => {
        const pagesDir = path.join(fixturesRoot, "root-only");
        writeFileRecursive(path.join(pagesDir, "index.tsx"), "// root");

        const routes = entryPointsConfig({
            pagesDir: pagesDir,
            pagesRelativeDir: "root-only",
            clientDir: "client",
            cwd: process.cwd(),
        });

        assert.equal(routes.length, 1);
        assert.equal(routes[0].filename, "index.html");
        assert.ok(!routes[0].path, "Root route should not have path property");
    });

    await t.test("assembleRoutes non-root branch coverage", () => {
        const pagesDir = path.join(fixturesRoot, "non-root");
        writeFileRecursive(path.join(pagesDir, "sub", "index.tsx"), "// sub");

        const routes = entryPointsConfig({
            pagesDir: pagesDir,
            pagesRelativeDir: "non-root",
            clientDir: "client",
            cwd: process.cwd(),
        });

        assert.equal(routes.length, 1);
        assert.equal(routes[0].filename, "sub/index.html");
        assert.equal(routes[0].path, "sub");
    });
});
