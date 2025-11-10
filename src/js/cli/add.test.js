import assert from "node:assert/strict";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { handleAddCommand } from "./add.js";

// Utility: run a function within an isolated temporary directory
async function withTempProject(fn) {
    const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), "sxo-add-test-"));
    try {
        return await fn(tmp);
    } finally {
        // Cleanup temp directory
        try {
            await fsp.rm(tmp, { recursive: true, force: true, maxRetries: 2 });
        } catch {
            // ignore
        }
    }
}

// Utility: write text file, ensuring directories exist
async function writeFile(dir, rel, content) {
    const abs = path.join(dir, rel);
    await fsp.mkdir(path.dirname(abs), { recursive: true });
    await fsp.writeFile(abs, content, "utf8");
    return abs;
}

test("add: installs component files from local basecoat to componentsDir", async () => {
    await withTempProject(async (tmp) => {
        // Create mock basecoat structure
        const basecoatDir = path.join(tmp, "components/src/components");
        await writeFile(basecoatDir, "test-component.jsx", "export function TestComponent() { return <div>Test</div>; }");
        await writeFile(basecoatDir, "test-component.client.js", 'console.log("client");');
        await writeFile(basecoatDir, "test-component.css", ".test { color: red; }");

        // Create componentsDir
        const componentsDir = path.join(tmp, "src/components");
        await fsp.mkdir(componentsDir, { recursive: true });

        // Change to tmp directory for the test
        const originalCwd = process.cwd();
        process.chdir(tmp);

        try {
            const success = await handleAddCommand("test-component", { cwd: tmp, componentsDir: "src/components" });
            assert.equal(success, true);

            // Check files were installed
            const installedJsx = await fsp.readFile(path.join(componentsDir, "test-component.jsx"), "utf8");
            const installedClient = await fsp.readFile(path.join(componentsDir, "test-component.client.js"), "utf8");
            const installedCss = await fsp.readFile(path.join(componentsDir, "test-component.css"), "utf8");

            assert.equal(installedJsx, "export function TestComponent() { return <div>Test</div>; }");
            assert.equal(installedClient, 'console.log("client");');
            assert.equal(installedCss, ".test { color: red; }");
        } finally {
            process.chdir(originalCwd);
        }
    });
});

test("add: returns false when component not found", async () => {
    await withTempProject(async (tmp) => {
        // Create componentsDir but no basecoat
        const componentsDir = path.join(tmp, "src/components");
        await fsp.mkdir(componentsDir, { recursive: true });

        // Change to tmp directory for the test
        const originalCwd = process.cwd();
        process.chdir(tmp);

        try {
            const success = await handleAddCommand("nonexistent", { cwd: tmp, componentsDir: "src/components" });
            assert.equal(success, false);
        } finally {
            process.chdir(originalCwd);
        }
    });
});

test("add: creates componentsDir if it doesn't exist", async () => {
    await withTempProject(async (tmp) => {
        // Create mock basecoat
        const basecoatDir = path.join(tmp, "components/src/components");
        await writeFile(basecoatDir, "test-component.jsx", "export function TestComponent() {}");

        // componentsDir doesn't exist yet
        const componentsDir = path.join(tmp, "src/components");

        // Change to tmp directory for the test
        const originalCwd = process.cwd();
        process.chdir(tmp);

        try {
            const success = await handleAddCommand("test-component", { cwd: tmp, componentsDir: "src/components" });
            assert.equal(success, true);

            // Check componentsDir was created and file installed
            const installedJsx = await fsp.readFile(path.join(componentsDir, "test-component.jsx"), "utf8");
            assert.equal(installedJsx, "export function TestComponent() {}");
        } finally {
            process.chdir(originalCwd);
        }
    });
});
