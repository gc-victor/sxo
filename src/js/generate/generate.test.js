import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

async function makeTempDir(prefix = "sxo-generate-cli-") {
    return await fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function writeFileEnsured(filePath, content) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, "utf8");
}

async function readFile(filePath) {
    return await fs.readFile(filePath, "utf8");
}

function scriptPath() {
    return fileURLToPath(new URL("./generate.js", import.meta.url));
}

function runGenerate({ cwd, outDir, pagesDirRel = "src/pages", extraEnv = {} }) {
    return new Promise((resolve) => {
        const env = {
            ...process.env,
            SXO_RESOLVED_CONFIG: JSON.stringify({
                command: "build",
                port: 0,
                pagesDir: pagesDirRel,
                outDir,
                minify: true,
                sourcemap: false,
            }),
            ...extraEnv,
        };

        const child = spawn(process.execPath, [scriptPath()], { cwd, env });
        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (d) => {
            stdout += d.toString();
        });
        child.stderr.on("data", (d) => {
            stderr += d.toString();
        });
        child.on("close", (code) => resolve({ code, stdout, stderr }));
    });
}

function ssrHtml({ title = "Title", body = "<div>Body</div>" } = {}) {
    return ["<html>", "<head>", `  <title>${title}</title>`, "</head>", "<body>", `  ${body}`, "</body>", "</html>", ""].join("\n");
}

test("generate (CLI): missing manifest -> exits non-zero with helpful message", async () => {
    const tmpRoot = await makeTempDir();
    const outDir = path.join(tmpRoot, "dist");

    const { code, stdout, stderr } = await runGenerate({
        cwd: tmpRoot,
        outDir,
    });

    const out = stdout + stderr;
    assert.notEqual(code, 0, "should exit with non-zero code");
    assert.match(out, /Missing or invalid manifest/i);
});

test("generate (CLI): bad manifest (not an array) -> exits non-zero", async () => {
    const tmpRoot = await makeTempDir();
    const outDir = path.join(tmpRoot, "dist");
    const routesFile = path.join(outDir, "server", "routes.json");

    await writeFileEnsured(routesFile, JSON.stringify({ not: "array" }));

    const { code, stdout, stderr } = await runGenerate({
        cwd: tmpRoot,
        outDir,
    });

    const out = stdout + stderr;
    assert.notEqual(code, 0);
    assert.match(out, /routes manifest is not an array/i);
});

test("generate (CLI): empty routes array -> ok exit 0, logs none to generate", async () => {
    const tmpRoot = await makeTempDir();
    const outDir = path.join(tmpRoot, "dist");
    const routesFile = path.join(outDir, "server", "routes.json");

    await writeFileEnsured(routesFile, JSON.stringify([]));

    const { code, stdout, stderr } = await runGenerate({
        cwd: tmpRoot,
        outDir,
    });

    const out = stdout + stderr;
    assert.equal(code, 0);
    assert.match(out, /No routes found in manifest/i);
});

test("generate (CLI): all routes dynamic -> ok exit 0, no generation performed", async () => {
    const tmpRoot = await makeTempDir();
    const outDir = path.join(tmpRoot, "dist");
    const routesFile = path.join(outDir, "server", "routes.json");

    const routes = [
        { path: "blog/[slug]", filename: "blog/[slug]/index.html", jsx: "src/pages/blog/[slug]/index.jsx" },
        { filename: "user/[id]/index.html", jsx: "src/pages/user/[id]/index.jsx" },
    ];
    await writeFileEnsured(routesFile, JSON.stringify(routes, null, 2));

    const { code, stdout, stderr } = await runGenerate({
        cwd: tmpRoot,
        outDir,
    });

    const out = stdout + stderr;
    assert.equal(code, 0);
    assert.match(out, /No static routes to generate/i);
});

test("generate (CLI): invalid SSR export (no default/jsx function) -> exits non-zero and reports error", async () => {
    const tmpRoot = await makeTempDir();
    const outDir = path.join(tmpRoot, "dist");
    const outServer = path.join(outDir, "server");
    const pagesDir = path.join(tmpRoot, "src", "pages");
    const routesFile = path.join(outServer, "routes.json");

    // Provide page source (not strictly required but mirrors real structure)
    await writeFileEnsured(path.join(pagesDir, "index.jsx"), "// placeholder");
    // SSR bundle missing valid export
    await writeFileEnsured(path.join(outServer, "index.js"), "export const nope = 123;");

    const routes = [{ filename: "index.html", jsx: "src/pages/index.jsx" }];
    await writeFileEnsured(routesFile, JSON.stringify(routes, null, 2));

    const { code, stdout, stderr } = await runGenerate({
        cwd: tmpRoot,
        outDir,
    });

    const out = stdout + stderr;
    assert.notEqual(code, 0);
    assert.match(out, /No valid export found/i);
});

test("generate (CLI): SSR returns non-HTML -> exits non-zero and reports error", async () => {
    const tmpRoot = await makeTempDir();
    const outDir = path.join(tmpRoot, "dist");
    const outServer = path.join(outDir, "server");
    const pagesDir = path.join(tmpRoot, "src", "pages");
    const routesFile = path.join(outServer, "routes.json");

    await writeFileEnsured(path.join(pagesDir, "index.jsx"), "// placeholder");
    await writeFileEnsured(path.join(outServer, "index.js"), `export default () => "plain text";`);

    const routes = [{ filename: "index.html", jsx: "src/pages/index.jsx" }];
    await writeFileEnsured(routesFile, JSON.stringify(routes, null, 2));

    const { code, stdout, stderr } = await runGenerate({
        cwd: tmpRoot,
        outDir,
    });

    const out = stdout + stderr;
    assert.notEqual(code, 0);
    assert.match(out, /must return an <html> tag/i);
});

test("generate (CLI): successful generation writes doctype, HTML, and sets generated flag", async () => {
    const tmpRoot = await makeTempDir();
    const outDir = path.join(tmpRoot, "dist");
    const outServer = path.join(outDir, "server");
    const outClient = path.join(outDir, "client");
    const pagesDir = path.join(tmpRoot, "src", "pages");
    const routesFile = path.join(outServer, "routes.json");

    await writeFileEnsured(path.join(pagesDir, "index.jsx"), "// placeholder");
    await writeFileEnsured(
        path.join(outServer, "index.js"),
        `export default () => ${JSON.stringify(ssrHtml({ title: "OK", body: "<div>Done</div>" }))};`,
    );

    const routes = [{ filename: "index.html", jsx: "src/pages/index.jsx" }];
    await writeFileEnsured(routesFile, JSON.stringify(routes, null, 2));

    const { code, stdout, stderr } = await runGenerate({
        cwd: tmpRoot,
        outDir,
    });

    const out = stdout + stderr;
    assert.equal(code, 0);
    assert.match(out, /done\.\s+generated=1\s+skipped=0\s+failed=0/i);

    const htmlPath = path.join(outClient, "index.html");
    const html = await readFile(htmlPath);
    assert.equal(html.startsWith("<!doctype html>"), true, "should prepend doctype");
    assert.match(html, /<html>/i);
    assert.match(html, /<title>OK<\/title>/);
    assert.match(html, />\s*<div>Done<\/div>/);

    const updatedRoutes = JSON.parse(await readFile(routesFile));
    assert.equal(Array.isArray(updatedRoutes), true);
    assert.equal(updatedRoutes[0].generated, true, "manifest should be updated with generated flag");
});

test("generate (CLI): mixed static + dynamic -> dynamic untouched; statics generated", async () => {
    const tmpRoot = await makeTempDir();
    const outDir = path.join(tmpRoot, "dist");
    const outClient = path.join(outDir, "client");
    const outServer = path.join(outDir, "server");
    const pagesDir = path.join(tmpRoot, "src", "pages");
    const routesFile = path.join(outServer, "routes.json");

    // Prepare sources and SSR bundles
    await writeFileEnsured(path.join(pagesDir, "index.jsx"), "// src home");
    await writeFileEnsured(path.join(pagesDir, "about", "index.jsx"), "// src about");
    await writeFileEnsured(path.join(pagesDir, "blog", "[slug]", "index.jsx"), "// src dynamic");
    await writeFileEnsured(
        path.join(outServer, "index.js"),
        `export default () => "<html><head><title>Home</title></head><body><div>H</div></body></html>";`,
    );
    await writeFileEnsured(
        path.join(outServer, "about", "index.js"),
        `export function jsx(){ return "<html><head><title>About</title></head><body><div>A</div></body></html>"; }`,
    );

    // Manifest: two static + one dynamic
    const routes = [
        { filename: "index.html", jsx: "src/pages/index.jsx" },
        { path: "about", filename: "about/index.html", jsx: "src/pages/about/index.jsx" },
        { path: "blog/[slug]", filename: "blog/[slug]/index.html", jsx: "src/pages/blog/[slug]/index.jsx" },
    ];
    await writeFileEnsured(routesFile, JSON.stringify(routes, null, 2));

    const { code, stdout, stderr } = await runGenerate({ cwd: tmpRoot, outDir });
    const out = stdout + stderr;
    assert.equal(code, 0);
    assert.match(out, /generated=2/);
    assert.match(out, /failed=0/);

    // Static pages generated
    const home = await readFile(path.join(outClient, "index.html"));
    const about = await readFile(path.join(outClient, "about", "index.html"));
    assert.match(home, /<title>Home<\/title>/);
    assert.match(about, /<title>About<\/title>/);

    // Dynamic untouched (no file created)
    let dynamicExists = true;
    try {
        await fs.access(path.join(outClient, "blog", "[slug]", "index.html"));
        dynamicExists = true;
    } catch {
        dynamicExists = false;
    }
    assert.equal(dynamicExists, false, "dynamic route should not be generated");

    // Manifest flags updated only for static routes
    const updated = JSON.parse(await readFile(routesFile));
    const byFile = (f) => updated.find((r) => r.filename === f);
    assert.equal(byFile("index.html").generated, true);
    assert.equal(byFile("about/index.html").generated, true);
    assert.ok(!updated.find((r) => r.filename === "blog/[slug]/index.html").generated);
});

test("generate (CLI): idempotency -> second run skips already-generated", async () => {
    const tmpRoot = await makeTempDir();
    const outDir = path.join(tmpRoot, "dist");
    const outServer = path.join(outDir, "server");
    const pagesDir = path.join(tmpRoot, "src", "pages");
    const routesFile = path.join(outServer, "routes.json");

    // Prepare two static routes
    await writeFileEnsured(path.join(pagesDir, "index.jsx"), "// src home");
    await writeFileEnsured(path.join(pagesDir, "about", "index.jsx"), "// src about");
    await writeFileEnsured(
        path.join(outServer, "index.js"),
        `export default () => "<html><head><title>H</title></head><body>1</body></html>";`,
    );
    await writeFileEnsured(
        path.join(outServer, "about", "index.js"),
        `export default () => "<html><head><title>A</title></head><body>2</body></html>";`,
    );

    const routes = [
        { filename: "index.html", jsx: "src/pages/index.jsx" },
        { path: "about", filename: "about/index.html", jsx: "src/pages/about/index.jsx" },
    ];
    await writeFileEnsured(routesFile, JSON.stringify(routes, null, 2));

    // First run: generate both
    const r1 = await runGenerate({ cwd: tmpRoot, outDir });
    assert.equal(r1.code, 0);
    assert.match(r1.stdout + r1.stderr, /generated=2/);

    // Second run: skip both
    const r2 = await runGenerate({ cwd: tmpRoot, outDir });
    assert.equal(r2.code, 0);
    const out2 = r2.stdout + r2.stderr;
    assert.match(out2, /generated=0/);
    assert.match(out2, /skipped=2/);
    assert.match(out2, /failed=0/);
});

test("generate (CLI): asset injection minimal (PUBLIC_PATH='/')", async () => {
    const tmpRoot = await makeTempDir();
    const outDir = path.join(tmpRoot, "dist");
    const outServer = path.join(outDir, "server");
    const outClient = path.join(outDir, "client");
    const pagesDir = path.join(tmpRoot, "src", "pages");
    const routesFile = path.join(outServer, "routes.json");

    // One static route with assets
    await writeFileEnsured(path.join(pagesDir, "index.jsx"), "// src home");
    await writeFileEnsured(
        path.join(outServer, "index.js"),
        `export default () => ${JSON.stringify(ssrHtml({ title: "Assets", body: "<div>Body</div>" }))};`,
    );

    const routes = [
        {
            filename: "index.html",
            jsx: "src/pages/index.jsx",
            entryPoints: ["src/pages/index.client.js", "src/pages/global.css"],
            assets: {
                css: ["global.A1.css", "index.B2.css"],
                js: ["index.B2.js"],
            },
        },
    ];
    await writeFileEnsured(routesFile, JSON.stringify(routes, null, 2));

    const res = await runGenerate({ cwd: tmpRoot, outDir, extraEnv: { PUBLIC_PATH: "/" } });
    assert.equal(res.code, 0);

    const html = await readFile(path.join(outClient, "index.html"));
    assert.match(html, /<link rel="stylesheet" href="\/global\.A1\.css">/);
    assert.match(html, /<link rel="stylesheet" href="\/index\.B2\.css">/);
    assert.match(html, /<script type="module" src="\/index\.B2\.js"><\/script>/);
});

test("generate (CLI): sequential asset injection PUBLIC_PATH '/' then ''", async () => {
    const tmpRoot = await makeTempDir();
    const outDir = path.join(tmpRoot, "dist");
    const outClient = path.join(outDir, "client");
    const outServer = path.join(outDir, "server");
    const pagesDir = path.join(tmpRoot, "src", "pages");
    const routesFile = path.join(outServer, "routes.json");

    // Prepare project structure
    await writeFileEnsured(path.join(pagesDir, "index.jsx"), "// source placeholder");
    await writeFileEnsured(path.join(pagesDir, "about", "index.jsx"), "// source placeholder");
    await writeFileEnsured(path.join(pagesDir, "plain", "index.jsx"), "// source placeholder");

    // Server SSR modules returning full HTML documents
    await writeFileEnsured(
        path.join(outServer, "index.js"),
        `export default () => ${JSON.stringify(ssrHtml({ title: "Home SSR", body: "<div>Welcome Home</div>" }))};`,
    );
    await writeFileEnsured(
        path.join(outServer, "about", "index.js"),
        `export function jsx(){ return ${JSON.stringify(ssrHtml({ title: "About SSR", body: "<div>About Page</div>" }))}; }`,
    );
    await writeFileEnsured(
        path.join(outServer, "plain", "index.js"),
        `export default () => ${JSON.stringify(ssrHtml({ title: "Plain SSR", body: "<div>Plain Page</div>" }))};`,
    );

    // routes.json with per-route assets (client-relative; no PUBLIC_PATH prefix)
    const routes = [
        {
            filename: "index.html",
            jsx: "src/pages/index.jsx",
            entryPoints: ["src/pages/index.client.js", "src/pages/global.css"],
            assets: {
                css: ["global.A1.css", "index.B2.css"],
                js: ["index.B2.js"],
            },
        },
        {
            path: "about",
            filename: "about/index.html",
            jsx: "src/pages/about/index.jsx",
            entryPoints: ["src/pages/about/client/index.js"],
            assets: {
                css: ["about/index.C3.css"],
                js: ["about/index.C3.js"],
            },
        },
        // 'plain' route will be generated in the second run with PUBLIC_PATH=""
    ];
    await writeFileEnsured(routesFile, JSON.stringify(routes, null, 2));

    // First run with PUBLIC_PATH="/"
    const res1 = await runGenerate({ cwd: tmpRoot, outDir, extraEnv: { PUBLIC_PATH: "/" } });
    assert.equal(res1.code, 0);

    const homeHtml1 = await readFile(path.join(outClient, "index.html"));
    assert.match(homeHtml1, /Welcome Home/);
    assert.match(homeHtml1, /<link rel="stylesheet" href="\/global\.A1\.css">/);
    assert.match(homeHtml1, /<link rel="stylesheet" href="\/index\.B2\.css">/);
    assert.match(homeHtml1, /<script type="module" src="\/index\.B2\.js"><\/script>/);

    const aboutHtml1 = await readFile(path.join(outClient, "about", "index.html"));
    assert.match(aboutHtml1, /About Page/);
    assert.match(aboutHtml1, /<link rel="stylesheet" href="\/about\/index\.C3\.css">/);
    assert.match(aboutHtml1, /<script type="module" src="\/about\/index\.C3\.js"><\/script>/);

    // Prepare second run: add a new route (plain) not yet generated
    const updatedRoutes = JSON.parse(await readFile(routesFile));
    updatedRoutes.push({
        path: "plain",
        filename: "plain/index.html",
        jsx: "src/pages/plain/index.jsx",
        entryPoints: ["src/pages/plain/client/index.js"],
        assets: {
            css: ["plain/index.D1.css"],
            js: ["plain/index.D1.js"],
        },
    });
    await writeFileEnsured(routesFile, JSON.stringify(updatedRoutes, null, 2));

    // Second run with PUBLIC_PATH="" (empty preserved)
    const res2 = await runGenerate({ cwd: tmpRoot, outDir, extraEnv: { PUBLIC_PATH: "" } });
    assert.equal(res2.code, 0);

    const plainHtml = await readFile(path.join(outClient, "plain", "index.html"));
    assert.match(plainHtml, /Plain Page/);
    assert.match(plainHtml, /<link rel="stylesheet" href="plain\/index\.D1\.css">/);
    assert.match(plainHtml, /<script type="module" src="plain\/index\.D1\.js"><\/script>/);
});
