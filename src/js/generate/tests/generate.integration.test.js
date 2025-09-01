import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

async function makeTempDir(prefix = "sxo-generate-it-") {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
    return dir;
}

async function writeFile(filePath, content) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, "utf8");
}

async function readFile(filePath) {
    return await fs.readFile(filePath, "utf8");
}

async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

function makeHtmlShell({ title = "Old Title", body = "" } = {}) {
    return [
        "<!doctype html>",
        "<html>",
        "<head>",
        `  <meta charset=\"utf-8\" />`,
        `  <title>${title}</title>`,
        "</head>",
        "<body>",
        `  <div id=\"page\">${body}</div>`,
        "</body>",
        "</html>",
        "",
    ].join("\n");
}

test("generate integration: build outputs simulated -> generate writes content and updates manifest flags", async () => {
    // Arrange temp project
    const tmpRoot = await makeTempDir();
    const outDir = path.join(tmpRoot, "dist");
    const outClient = path.join(outDir, "client");
    const outServer = path.join(outDir, "server");
    const pagesDirRel = "src/pages";
    const pagesDirAbs = path.join(tmpRoot, pagesDirRel);

    // Prepare fake "post-build" filesystem:
    // - pages source root (only for path mapping; generate() uses dist/*)
    // - dist/client HTML shells
    // - dist/server SSR modules
    // - dist/server/routes.json manifest

    // pages dir (not strictly read, but required for path mapping validation)
    await writeFile(path.join(pagesDirAbs, "index.jsx"), "// source placeholder");
    await writeFile(path.join(pagesDirAbs, "about", "index.jsx"), "// source placeholder");
    await writeFile(path.join(pagesDirAbs, "blog", "[slug]", "index.jsx"), "// source placeholder");

    // client HTML shells
    await writeFile(path.join(outClient, "index.html"), makeHtmlShell({ title: "Old Home", body: "" }));
    await writeFile(path.join(outClient, "about", "index.html"), makeHtmlShell({ title: "Old About", body: "" }));
    await writeFile(path.join(outClient, "blog", "[slug]", "index.html"), makeHtmlShell({ title: "Old Blog Dynamic", body: "" }));

    // server SSR bundles (ESM)
    const indexJs = [`export const head = { title: "Home" };`, `export default () => "<div>Welcome Home</div>";`, ""].join("\n");
    await writeFile(path.join(outServer, "index.js"), indexJs);

    const aboutJs = [`export function jsx() { return "<div>About Page</div>"; }`, `export const head = { title: "About Title" };`, ""].join(
        "\n",
    );
    await writeFile(path.join(outServer, "about", "index.js"), aboutJs);

    // No server bundle for dynamic route (it should be skipped by generate)
    // Manifest (minimal fields required by generate)
    const routes = [
        { filename: "index.html", jsx: "src/pages/index.jsx" },
        { path: "about", filename: "about/index.html", jsx: "src/pages/about/index.jsx" },
        { path: "blog/[slug]", filename: "blog/[slug]/index.html", jsx: "src/pages/blog/[slug]/index.jsx" },
    ];
    const routesFile = path.join(outServer, "routes.json");
    await writeFile(routesFile, JSON.stringify(routes, null, 2));

    // Set resolved config and cwd before importing generate()
    const prevCwd = process.cwd();
    const prevResolved = process.env.SXO_RESOLVED_CONFIG;
    try {
        process.chdir(tmpRoot);
        process.env.SXO_RESOLVED_CONFIG = JSON.stringify({
            command: "build",
            port: 0,
            pagesDir: pagesDirRel,
            outDir: outDir,
            minify: true,
            sourcemap: false,
        });

        // Act: run generate once
        const mod = await import("../generate.js");
        const res1 = await mod.generate();

        // Assert: first run generated 2 (index and about), skipped 0
        assert.equal(res1.ok, true);
        assert.equal(res1.generated, 2, "should generate 2 static routes");
        assert.equal(res1.skipped, 0, "should not skip on first run");

        // Verify client HTMLs updated with SSR content and titles
        const homeHtml = await readFile(path.join(outClient, "index.html"));
        assert.match(homeHtml, /Welcome Home/);
        assert.match(homeHtml, /<title>Home<\/title>/);

        const aboutHtml = await readFile(path.join(outClient, "about", "index.html"));
        assert.match(aboutHtml, /About Page/);
        assert.match(aboutHtml, /<title>About Title<\/title>/);

        // Dynamic route untouched
        const dynHtml = await readFile(path.join(outClient, "blog", "[slug]", "index.html"));
        assert.doesNotMatch(dynHtml, /About Page|Welcome Home/);

        // Manifest updated: generated true for static routes; dynamic remains unset/falsey
        const updatedRoutes = JSON.parse(await readFile(routesFile));
        const byFile = (f) => updatedRoutes.find((r) => r.filename === f);
        assert.equal(byFile("index.html").generated, true);
        assert.equal(byFile("about/index.html").generated, true);
        assert.ok(!byFile("blog/[slug]/index.html").generated, "dynamic route should not be marked generated");

        // Act: run generate again (idempotent by manifest flags)
        const res2 = await mod.generate();
        assert.equal(res2.ok, true);
        assert.equal(res2.generated, 0, "second run should not generate again");
        assert.equal(res2.skipped >= 2, true, "second run should report skipped for already-generated routes");

        // Ensure files still exist
        assert.equal(await fileExists(path.join(outClient, "index.html")), true);
        assert.equal(await fileExists(path.join(outClient, "about", "index.html")), true);
    } finally {
        // Cleanup and restore env
        process.chdir(prevCwd);
        if (prevResolved === undefined) delete process.env.SXO_RESOLVED_CONFIG;
        else process.env.SXO_RESOLVED_CONFIG = prevResolved;
        try {
            await fs.rm(tmpRoot, { recursive: true, force: true });
        } catch {
            // ignore
        }
    }
});
