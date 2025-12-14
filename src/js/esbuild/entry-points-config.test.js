import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

/** fileRoutes is imported dynamically after setting PAGES_DIR in tests */

// Helpers to set up and tear down fixture directories/files
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesRoot = path.join(__dirname, "fixtures", "pages");

// Utility to create a file and its parent directories
function writeFileRecursive(filePath, content) {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content);
}

// Utility to clean up a directory recursively
function rmDirRecursive(dirPath) {
    if (fs.existsSync(dirPath)) {
        fs.readdirSync(dirPath).forEach((file) => {
            const curPath = path.join(dirPath, file);
            if (fs.lstatSync(curPath).isDirectory()) {
                rmDirRecursive(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(dirPath);
    }
}

before(() => {
    // Set up a fixture file structure
    // pages/
    //   index.html, index.tsx, js/index.js
    //   about/index.html, about/index.tsx, about/js/index.js
    //   blog/[slug]/index.html, blog/[slug]/index.tsx, blog/[slug]/js/index.js
    //   no-dynamic/no-dynamic/index.html, no-dynamic/no-dynamic/index.tsx, no-dynamic/no-dynamic/js/index.js
    //   no-dynamic/[slug]/index.html, no-dynamic/[slug]/index.tsx, no-dynamic/[slug]/js/index.js

    // Clean up before
    rmDirRecursive(path.join(__dirname, "fixtures"));

    // Root
    writeFileRecursive(path.join(fixturesRoot, "index.html"), "<html>root</html>");
    writeFileRecursive(path.join(fixturesRoot, "index.tsx"), "// root tsx");
    writeFileRecursive(path.join(fixturesRoot, "client", "index.js"), "// root client js");

    // About
    writeFileRecursive(path.join(fixturesRoot, "about", "index.html"), "<html>about</html>");
    writeFileRecursive(path.join(fixturesRoot, "about", "index.tsx"), "// about tsx");
    writeFileRecursive(path.join(fixturesRoot, "about", "client", "index.js"), "// about client js");

    // Blog dynamic
    writeFileRecursive(path.join(fixturesRoot, "blog", "[slug]", "index.html"), "<html>blog dynamic</html>");
    writeFileRecursive(path.join(fixturesRoot, "blog", "[slug]", "index.tsx"), "// blog dynamic tsx");
    writeFileRecursive(path.join(fixturesRoot, "blog", "[slug]", "client", "index.js"), "// blog dynamic client js");

    // Nested static
    writeFileRecursive(path.join(fixturesRoot, "no-dynamic", "no-dynamic", "index.html"), "<html>nested static</html>");
    writeFileRecursive(path.join(fixturesRoot, "no-dynamic", "no-dynamic", "index.tsx"), "// nested static tsx");
    writeFileRecursive(path.join(fixturesRoot, "no-dynamic", "no-dynamic", "client", "index.js"), "// nested static client js");

    // Nested dynamic
    writeFileRecursive(path.join(fixturesRoot, "no-dynamic", "[slug]", "index.html"), "<html>nested dynamic</html>");
    writeFileRecursive(path.join(fixturesRoot, "no-dynamic", "[slug]", "index.tsx"), "// nested dynamic tsx");
    writeFileRecursive(path.join(fixturesRoot, "no-dynamic", "[slug]", "client", "index.js"), "// nested dynamic client js");

    // Multiple client entries (index.* and *.index.*)
    writeFileRecursive(path.join(fixturesRoot, "multi-client", "index.tsx"), "// multi-client tsx");
    writeFileRecursive(path.join(fixturesRoot, "multi-client", "client", "index.js"), "// index.js");
    writeFileRecursive(path.join(fixturesRoot, "multi-client", "client", "index.ts"), "// index.ts");
    writeFileRecursive(path.join(fixturesRoot, "multi-client", "client", "form.index.tsx"), "// form.index.tsx");
    writeFileRecursive(path.join(fixturesRoot, "multi-client", "client", "modal.index.js"), "// modal.index.js");

    // global.css used by tests as a shared stylesheet entry
    writeFileRecursive(path.join(__dirname, "fixtures", "pages", "global.css"), "body{}");
});

after(() => {
    // Clean up fixtures after tests
    rmDirRecursive(path.join(__dirname, "fixtures"));
});

const pagesDir = path.join(__dirname, "fixtures", "pages");
const relPagesDir = path.relative(process.cwd(), pagesDir);
let files;
before(async () => {
    process.env.PAGES_DIR = pagesDir;
    const mod = await import("./entry-points-config.js");
    files = mod.entryPointsConfig();
});
const byFilename = (filename) => files.find((f) => f.filename === filename);
const globalCssPath = "src/js/esbuild/fixtures/pages/global.css";

test("root index.html route", () => {
    const f = byFilename("index.html");
    assert.ok(f, "root index.html exists");
    assert.equal(f.jsx, path.join(relPagesDir, "index.tsx"));
    assert.deepEqual(f.entryPoints, [path.join(relPagesDir, "client", "index.js"), globalCssPath]);
    assert.ok(!f.path, "root should not have path field");
});

test("global.css is included in each route's entryPoints", () => {
    const routes = files;
    // Each route should include global.css in its entryPoints
    for (const route of routes) {
        assert.ok(route.entryPoints.includes(globalCssPath), `route ${route.filename} should include global.css`);
    }
});

test("about/index.tsx route", () => {
    const f = byFilename(path.join("about", "index.html"));
    assert.ok(f, "about/index.html exists");
    assert.equal(f.jsx, path.join(relPagesDir, "about", "index.tsx"));
    assert.deepEqual(f.entryPoints, [path.join(relPagesDir, "about", "client", "index.js"), globalCssPath]);
    assert.equal(f.path, "about");
});

test("blog/[slug]/index.tsx dynamic route", () => {
    const f = byFilename(path.join("blog", "[slug]", "index.html"));
    assert.ok(f, "blog/[slug]/index.html exists");
    assert.equal(f.jsx, path.join(relPagesDir, "blog", "[slug]", "index.tsx"));
    assert.deepEqual(f.entryPoints, [path.join(relPagesDir, "blog", "[slug]", "client", "index.js"), globalCssPath]);
    assert.equal(f.path, "blog/[slug]");
});

test("no-dynamic/no-dynamic/index.tsx nested static route", () => {
    const f = byFilename(path.join("no-dynamic", "no-dynamic", "index.html"));
    assert.ok(f, "no-dynamic/no-dynamic/index.html exists");
    assert.equal(f.jsx, path.join(relPagesDir, "no-dynamic", "no-dynamic", "index.tsx"));
    assert.deepEqual(f.entryPoints, [path.join(relPagesDir, "no-dynamic", "no-dynamic", "client", "index.js"), globalCssPath]);
    assert.equal(f.path, "no-dynamic/no-dynamic");
});

test("no-dynamic/[slug]/index.tsx nested dynamic route", () => {
    const f = byFilename(path.join("no-dynamic", "[slug]", "index.html"));
    assert.ok(f, "no-dynamic/[slug]/index.html exists");
    assert.equal(f.jsx, path.join(relPagesDir, "no-dynamic", "[slug]", "index.tsx"));
    assert.deepEqual(f.entryPoints, [path.join(relPagesDir, "no-dynamic", "[slug]", "client", "index.js"), globalCssPath]);
    assert.equal(f.path, "no-dynamic/[slug]");
});

test("multi-client route collects all client/index.* and client/*.index.* entries", () => {
    const f = byFilename(path.join("multi-client", "index.html"));
    assert.ok(f, "multi-client/index.html exists");
    assert.equal(f.jsx, path.join(relPagesDir, "multi-client", "index.tsx"));

    // All client entries should be present (plus global.css)
    const expectedEntries = [
        path.join(relPagesDir, "multi-client", "client", "index.js"),
        path.join(relPagesDir, "multi-client", "client", "index.ts"),
        path.join(relPagesDir, "multi-client", "client", "form.index.tsx"),
        path.join(relPagesDir, "multi-client", "client", "modal.index.js"),
        globalCssPath,
    ];
    assert.equal(f.entryPoints.length, expectedEntries.length, "should have 5 entryPoints (4 client + global.css)");
    for (const expectedEntry of expectedEntries) {
        assert.ok(
            f.entryPoints.includes(expectedEntry),
            `entryPoints should include ${expectedEntry}, got: ${JSON.stringify(f.entryPoints)}`,
        );
    }
    assert.equal(f.path, "multi-client");
});

test("assembleRoutes throws on duplicate parameter names", async () => {
    // Create fixture with duplicate param names
    const invalidDir = path.join(fixturesRoot, "invalid-dup", "[id]", "[id]");
    writeFileRecursive(path.join(invalidDir, "index.jsx"), "export default () => '<div/>'");

    const savedPagesDir = process.env.PAGES_DIR;
    try {
        process.env.PAGES_DIR = pagesDir;

        // Force re-import to pick up new fixture
        const timestamp = Date.now();
        const mod = await import(`./entry-points-config.js?t=${timestamp}`);

        await assert.rejects(
            async () => {
                mod.entryPointsConfig();
            },
            {
                name: "Error",
                message: /Invalid route pattern.*duplicate/i,
            },
            "Should throw on duplicate parameter names",
        );
    } finally {
        process.env.PAGES_DIR = savedPagesDir;
        rmDirRecursive(path.dirname(path.dirname(invalidDir)));
    }
});

test("assembleRoutes throws on parameter names starting with numbers", async () => {
    const invalidDir = path.join(fixturesRoot, "invalid-num", "[123abc]");
    writeFileRecursive(path.join(invalidDir, "index.jsx"), "export default () => '<div/>'");

    const savedPagesDir = process.env.PAGES_DIR;
    try {
        process.env.PAGES_DIR = pagesDir;

        // Force re-import
        const timestamp = Date.now();
        const mod = await import(`./entry-points-config.js?t=${timestamp}`);

        await assert.rejects(
            async () => {
                mod.entryPointsConfig();
            },
            {
                name: "Error",
                message: /Invalid route pattern.*must start with a letter/i,
            },
            "Should throw on parameter names starting with numbers",
        );
    } finally {
        process.env.PAGES_DIR = savedPagesDir;
        rmDirRecursive(path.dirname(invalidDir));
    }
});
