import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { entryPointsConfig } from "./entry-points-config.js";

let tempRoot;
let fixturesRoot;
let pagesDir;
let relPagesDir;
let globalCssPath;

// Utility to create a file and its parent directories
function writeFileRecursive(filePath, content) {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content);
}

before(async () => {
    // Set up a fixture file structure
    tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "sxo-epc-"));
    fixturesRoot = path.join(tempRoot, "pages");
    pagesDir = fixturesRoot;
    relPagesDir = path.relative(process.cwd(), pagesDir);
    globalCssPath = path.join(relPagesDir, "global.css").replace(/\\/g, "/");

    // Root
    writeFileRecursive(path.join(fixturesRoot, "index.tsx"), "// root tsx");
    writeFileRecursive(path.join(fixturesRoot, "client", "index.js"), "// root client js");

    // About
    writeFileRecursive(path.join(fixturesRoot, "about", "index.tsx"), "// about tsx");
    writeFileRecursive(path.join(fixturesRoot, "about", "client", "index.js"), "// about client js");

    // Blog dynamic
    writeFileRecursive(path.join(fixturesRoot, "blog", "[slug]", "index.tsx"), "// blog dynamic tsx");
    writeFileRecursive(path.join(fixturesRoot, "blog", "[slug]", "client", "index.js"), "// blog dynamic client js");

    // Multiple client entries
    writeFileRecursive(path.join(fixturesRoot, "multi-client", "index.tsx"), "// multi-client tsx");
    writeFileRecursive(path.join(fixturesRoot, "multi-client", "client", "index.js"), "// index.js");
    writeFileRecursive(path.join(fixturesRoot, "multi-client", "client", "index.ts"), "// index.ts");
    writeFileRecursive(path.join(fixturesRoot, "multi-client", "client", "form.index.tsx"), "// form.index.tsx");

    // global.css
    writeFileRecursive(path.join(fixturesRoot, "global.css"), "body{}");
});

after(async () => {
    if (tempRoot) {
        await fsp.rm(tempRoot, { recursive: true, force: true });
    }
});

test("entryPointsConfig basic routing", async (t) => {
    const files = entryPointsConfig({
        pagesDir,
        pagesRelativeDir: relPagesDir,
        clientDir: "client",
        cwd: process.cwd(),
    });

    const byFilename = (filename) => files.find((f) => f.filename === filename);

    await t.test("root index.html route", () => {
        const f = byFilename("index.html");
        assert.ok(f, "root index.html exists");
        assert.match(f.jsx, /index\.tsx$/);
        assert.ok(f.entryPoints.includes(globalCssPath));
    });

    await t.test("about/index.tsx route", () => {
        const f = byFilename("about/index.html");
        assert.ok(f, "about/index.html exists");
        assert.equal(f.path, "about");
    });

    await t.test("blog/[slug]/index.tsx dynamic route", () => {
        const f = byFilename("blog/[slug]/index.html");
        assert.ok(f, "blog/[slug]/index.html exists");
        assert.equal(f.path, "blog/[slug]");
    });

    await t.test("multi-client route collects all client entries", () => {
        const f = byFilename("multi-client/index.html");
        assert.ok(f, "multi-client/index.html exists");
        assert.ok(f.entryPoints.length >= 4);
    });
});

test("entryPointsConfig error handling and edge cases", async (t) => {
    await t.test("throws on duplicate parameter names", () => {
        const invalidDir = path.join(fixturesRoot, "invalid-dup", "[id]", "[id]");
        writeFileRecursive(path.join(invalidDir, "index.tsx"), "// invalid");

        assert.throws(() => {
            entryPointsConfig({
                pagesDir: path.join(fixturesRoot, "invalid-dup"),
                pagesRelativeDir: "any",
                clientDir: "client",
            });
        }, /duplicate/i);
    });

    await t.test("throws on invalid parameter names (starting with numbers)", () => {
        const invalidDir = path.join(fixturesRoot, "invalid-num", "[123abc]");
        writeFileRecursive(path.join(invalidDir, "index.tsx"), "// invalid");

        assert.throws(() => {
            entryPointsConfig({
                pagesDir: path.join(fixturesRoot, "invalid-num"),
                pagesRelativeDir: "any",
                clientDir: "client",
            });
        }, /must start with a letter/i);
    });

    await t.test("scanPagesTree catch block", () => {
        const filePath = path.join(fixturesRoot, "not-a-dir.txt");
        fs.writeFileSync(filePath, "hello");
        const routes = entryPointsConfig({ pagesDir: filePath });
        assert.equal(routes.length, 0);
    });

    await t.test("findClientEntries catch block", () => {
        const dir = path.join(fixturesRoot, "client-is-file");
        writeFileRecursive(path.join(dir, "index.tsx"), "// index");
        fs.writeFileSync(path.join(dir, "client"), "file instead of dir");

        const routes = entryPointsConfig({
            pagesDir: dir,
            clientDir: "client",
        });
        assert.equal(routes.length, 1);
        assert.equal(routes[0].entryPoints.length, 0);
    });

    await t.test("skips symbolic links", () => {
        const dir = path.join(fixturesRoot, "with-symlink");
        fs.mkdirSync(dir, { recursive: true });
        const target = path.join(fixturesRoot, "symlink-target");
        writeFileRecursive(path.join(target, "index.tsx"), "// target");

        try {
            fs.symlinkSync(target, path.join(dir, "link"), "dir");
        } catch {
            return; // Skip on Windows if no permission
        }

        const routes = entryPointsConfig({ pagesDir: dir });
        assert.equal(routes.length, 0);
    });
});

test("entryPointsConfig static routes outrank dynamic siblings", async () => {
    // Set up conflicting routes: /blog/new (static) vs /blog/[slug] (dynamic)
    const conflictDir = path.join(tempRoot, "route-conflict");
    writeFileRecursive(path.join(conflictDir, "blog", "[slug]", "index.tsx"), "// dynamic");
    writeFileRecursive(path.join(conflictDir, "blog", "new", "index.tsx"), "// static");

    const routes = entryPointsConfig({
        pagesDir: conflictDir,
        pagesRelativeDir: "route-conflict",
        clientDir: "client",
        cwd: process.cwd(),
    });

    // Find positions of static and dynamic routes
    const staticRouteIndex = routes.findIndex((r) => r.path === "blog/new");
    const dynamicRouteIndex = routes.findIndex((r) => r.path === "blog/[slug]");

    assert.ok(staticRouteIndex !== -1, "static route blog/new should exist");
    assert.ok(dynamicRouteIndex !== -1, "dynamic route blog/[slug] should exist");
    assert.ok(
        staticRouteIndex < dynamicRouteIndex,
        `static route (index ${staticRouteIndex}) should come before dynamic route (index ${dynamicRouteIndex})`,
    );
});

test("entryPointsConfig marks error page directories with isErrorPage flag", async () => {
    const errorPageDir = path.join(tempRoot, "error-pages");
    writeFileRecursive(path.join(errorPageDir, "404", "index.tsx"), "// 404");
    writeFileRecursive(path.join(errorPageDir, "404", "client", "index.js"), "// 404 client");
    writeFileRecursive(path.join(errorPageDir, "500", "index.jsx"), "// 500");
    writeFileRecursive(path.join(errorPageDir, "500", "client", "index.js"), "// 500 client");
    writeFileRecursive(path.join(errorPageDir, "index.tsx"), "// root");

    const routes = entryPointsConfig({
        pagesDir: errorPageDir,
        pagesRelativeDir: "error-pages",
        clientDir: "client",
        cwd: process.cwd(),
    });

    const byFilename = (filename) => routes.find((r) => r.filename === filename);

    const route404 = byFilename("404/index.html");
    assert.ok(route404, "404 route exists");
    assert.equal(route404.isErrorPage, true, "404 route has isErrorPage flag");
    assert.equal(route404.path, undefined, "404 route has no path (not routable)");
    assert.ok(
        route404.entryPoints.some((ep) => ep.includes("404/client/index.js")),
        "404 client entry included",
    );

    const route500 = byFilename("500/index.html");
    assert.ok(route500, "500 route exists");
    assert.equal(route500.isErrorPage, true, "500 route has isErrorPage flag");
    assert.equal(route500.path, undefined, "500 route has no path (not routable)");
    assert.ok(
        route500.entryPoints.some((ep) => ep.includes("500/client/index.js")),
        "500 client entry included",
    );

    const root = byFilename("index.html");
    assert.ok(root, "root route exists");
    assert.equal(root.isErrorPage, undefined, "root route does not have isErrorPage flag");
});

test("entryPointsConfig derives pagesRelativeDir from pagesDir when omitted", async (t) => {
    await t.test("derives pagesRelativeDir from overridden pagesDir", () => {
        // Create a custom pages directory under tempRoot
        const customPagesDir = path.join(tempRoot, "custom-pages");
        writeFileRecursive(path.join(customPagesDir, "index.tsx"), "// custom");
        writeFileRecursive(path.join(customPagesDir, "global.css"), "body{}");

        // Call with only pagesDir override, omitting pagesRelativeDir
        // This should derive pagesRelativeDir from path.relative(cwd, pagesDir)
        const routes = entryPointsConfig({
            pagesDir: customPagesDir,
            cwd: tempRoot,
        });

        assert.equal(routes.length, 1, "should find the route");

        // The global.css should be found under the derived relative path
        // Since we're using tempRoot as cwd and customPagesDir is under tempRoot,
        // pagesRelativeDir should be "custom-pages" and global.css should be included
        const route = routes[0];
        const hasGlobalCss = route.entryPoints.some((ep) => ep.includes("global.css"));
        assert.ok(hasGlobalCss, "global.css should be found under derived pagesRelativeDir");
    });

    await t.test("preserves explicit pagesRelativeDir when both are provided", () => {
        // Create a custom pages directory under tempRoot
        const customPagesDir = path.join(tempRoot, "another-pages");
        writeFileRecursive(path.join(customPagesDir, "index.tsx"), "// another");

        // Create a different directory structure for explicit pagesRelativeDir
        const explicitRelDir = path.join(tempRoot, "explicit-dir");
        writeFileRecursive(path.join(explicitRelDir, "global.css"), "body{}");

        // Call with both overrides - explicit pagesRelativeDir should win
        const routes = entryPointsConfig({
            pagesDir: customPagesDir,
            pagesRelativeDir: "explicit-dir",
            cwd: tempRoot,
        });

        assert.equal(routes.length, 1, "should find the route");

        // global.css should come from explicit-dir, not the derived path
        const route = routes[0];
        const hasGlobalCssFromExplicit = route.entryPoints.some((ep) => ep.startsWith("explicit-dir/global.css"));
        assert.ok(hasGlobalCssFromExplicit, "global.css should come from explicit pagesRelativeDir");
    });

    await t.test("uses default when neither is overridden", () => {
        // This test verifies default behavior still works
        // Since we can't easily mock PAGES_RELATIVE_DIR, we just verify
        // the function works with no arguments (uses defaults)
        assert.doesNotThrow(() => {
            entryPointsConfig();
        });
    });
});
