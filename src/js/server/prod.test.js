import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fsp from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

/**
 * Tests for prod server:
 * - Generated routes: served as-is (skip SSR), Cache-Control: public, max-age=300
 * - Non-generated routes: SSR per request, assets injected, Cache-Control: public, max-age=0, must-revalidate
 * - HEAD handling returns 200 with no body
 * - 404 for unknown routes
 */

async function makeTempDir(prefix = "sxo-prod-test-") {
    return await fsp.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function writeFileEnsured(filePath, content) {
    await fsp.mkdir(path.dirname(filePath), { recursive: true });
    await fsp.writeFile(filePath, content, "utf8");
}

function prodScriptPath() {
    return fileURLToPath(new URL("./prod.js", import.meta.url));
}

async function getFreePort() {
    return await new Promise((resolve, reject) => {
        const s = http.createServer(() => {});
        s.listen(0, "127.0.0.1", () => {
            const addr = s.address();
            s.close(() => resolve(addr.port));
        });
        s.on("error", reject);
    });
}

async function waitForReady({ port, pathname = "/", timeoutMs = 3000 }) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            const res = await fetch(`http://127.0.0.1:${port}${pathname}`, { method: "HEAD" });
            // prod readiness: any status < 500 means server is up
            if (res.status < 500) return true;
        } catch {
            // retry
        }
        await new Promise((r) => setTimeout(r, 50));
    }
    return false;
}

function spawnProd({ cwd, outDir, pagesDirRel, port, extraEnv = {} }) {
    const env = {
        ...process.env,
        SXO_RESOLVED_CONFIG: JSON.stringify({
            command: "start",
            port,
            pagesDir: pagesDirRel,
            outDir,
            minify: true,
            sourcemap: false,
        }),
        ...extraEnv,
    };
    const child = spawn(process.execPath, [prodScriptPath()], { cwd, env, stdio: "pipe" });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
        stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
        stderr += d.toString();
    });

    return {
        child,
        get logs() {
            return { stdout, stderr };
        },
    };
}

async function httpGet(port, pathname, { method = "GET", headers = {} } = {}) {
    const res = await fetch(`http://127.0.0.1:${port}${pathname}`, { method, headers });
    const text = await res.text();
    const hdrs = {};
    res.headers.forEach((v, k) => {
        hdrs[k.toLowerCase()] = v;
    });
    return { status: res.status, headers: hdrs, body: text };
}

test("When routes are generated vs SSR in prod, then caching and asset injection behave as specified", async () => {
    const tmp = await makeTempDir();
    const outDir = path.join(tmp, "dist");
    const outClient = path.join(outDir, "client");
    const outServer = path.join(outDir, "server");
    const pagesDirRel = "src/pages";
    const pagesDirAbs = path.join(tmp, "src", "pages");

    // Structure:
    // - Generated route (root): dist/client/index.html (pre-rendered) + manifest entry with generated: true
    // - SSR route (about): dist/server/about/index.js SSR module; manifest entry without generated; with assets to inject
    const generatedHtml = [
        "<!doctype html>",
        "<html>",
        "<head><title>Home Generated</title></head>",
        '<body><div id="page">HOME</div></body>',
        "</html>",
        "",
    ].join("\n");

    await writeFileEnsured(path.join(outClient, "index.html"), generatedHtml);
    await writeFileEnsured(path.join(pagesDirAbs, "index.jsx"), "// src placeholder for generated route");

    const ssrAboutModule = `export default function render(){
    return "<html><head><title>About SSR</title></head><body><div id=\\"page\\">ABOUT</div></body></html>";
  }
  `;
    await writeFileEnsured(path.join(pagesDirAbs, "about", "index.jsx"), "// src about");
    await writeFileEnsured(path.join(outServer, "about", "index.js"), ssrAboutModule);

    const routes = [
        { filename: "index.html", jsx: "src/pages/index.jsx", generated: true },
        {
            path: "about",
            filename: "about/index.html",
            jsx: "src/pages/about/index.jsx",
            assets: {
                css: ["about/index.A1.css"],
                js: ["about/index.A1.js"],
            },
        },
    ];
    await writeFileEnsured(path.join(outServer, "routes.json"), JSON.stringify(routes, null, 2));

    const port = await getFreePort();
    const { child } = spawnProd({
        cwd: tmp,
        outDir,
        pagesDirRel,
        port,
        extraEnv: {
            PUBLIC_PATH: "/",
            // reasonable timeouts to avoid test hanging
            REQUEST_TIMEOUT_MS: "5000",
            HEADER_TIMEOUT_MS: "5000",
        },
    });

    try {
        const ready = await waitForReady({ port, pathname: "/" });
        assert.equal(ready, true, "prod server should become ready");

        // 1) Generated route (root)
        {
            const res = await httpGet(port, "/");
            assert.equal(res.status, 200);
            assert.equal(res.headers["content-type"]?.startsWith("text/html"), true);
            assert.equal(res.headers["cache-control"], "public, max-age=300");
            assert.ok(res.body.startsWith("<!doctype html>"), "Generated HTML should be served as-is (doctype preserved)");
            assert.ok(res.body.includes("<title>Home Generated</title>"));
            // Should not inject assets for generated route in prod path
            assert.equal(/<script type="module"/.test(res.body), false);
            assert.equal(/<link rel="stylesheet"/.test(res.body), false);
        }

        // 2) Non-generated SSR route: HEAD (no body) and caching headers
        {
            const head = await httpGet(port, "/about", { method: "HEAD" });
            assert.equal(head.status, 200);
            assert.equal(head.headers["content-type"]?.startsWith("text/html"), true);
            assert.equal(head.headers["cache-control"], "public, max-age=0, must-revalidate");
            assert.equal(head.body.length, 0, "HEAD must not include body");
        }

        // 3) Non-generated SSR route: GET with injected assets and doctype
        {
            const res = await httpGet(port, "/about");
            assert.equal(res.status, 200);
            assert.equal(res.headers["content-type"]?.startsWith("text/html"), true);
            assert.equal(res.headers["cache-control"], "public, max-age=0, must-revalidate");
            assert.ok(res.body.startsWith("<!doctype html>"), "SSR response should prepend doctype");
            assert.ok(res.body.includes("<title>About SSR</title>"));
            // Asset injection with PUBLIC_PATH="/"
            assert.match(res.body, /<link rel="stylesheet" href="\/about\/index\.A1\.css">/);
            assert.match(res.body, /<script type="module" src="\/about\/index\.A1\.js"><\/script>/);
        }

        // 4) 404 for unknown route
        {
            const res = await httpGet(port, "/missing");
            assert.equal(res.status, 404);
        }
    } finally {
        try {
            child.kill("SIGINT");
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
});

test("When making HEAD to missing route in prod without custom 404, then fallback 404 has no body", async () => {
    const tmp = await makeTempDir();
    const outDir = path.join(tmp, "dist");
    const outClient = path.join(outDir, "client");
    const outServer = path.join(outDir, "server");
    const pagesDirRel = "src/pages";
    const pagesDirAbs = path.join(tmp, "src", "pages");

    // Root generated route for readiness
    const generatedHtml = [
        "<!doctype html>",
        "<html>",
        "<head><title>Home</title></head>",
        '<body><div id="page">HOME</div></body>',
        "</html>",
        "",
    ].join("\n");
    await writeFileEnsured(path.join(outClient, "index.html"), generatedHtml);
    await writeFileEnsured(path.join(pagesDirAbs, "index.jsx"), "// src placeholder");

    // No custom 404 provided

    // Minimal manifest
    const routes = [{ filename: "index.html", jsx: "src/pages/index.jsx", generated: true }];
    await writeFileEnsured(path.join(outServer, "routes.json"), JSON.stringify(routes, null, 2));

    const port = await getFreePort();
    const { child } = spawnProd({
        cwd: tmp,
        outDir,
        pagesDirRel,
        port,
        extraEnv: { PUBLIC_PATH: "/", REQUEST_TIMEOUT_MS: "5000", HEADER_TIMEOUT_MS: "5000" },
    });

    try {
        const ready = await waitForReady({ port, pathname: "/" });
        assert.equal(ready, true, "prod server should become ready");

        const res = await httpGet(port, "/missing", { method: "HEAD" });
        assert.equal(res.status, 404);
        assert.equal(res.headers["content-type"], "text/plain; charset=utf-8");
        assert.equal(res.headers["cache-control"], "public, max-age=0, must-revalidate");
        assert.equal(res.body.length, 0, "HEAD must not include body");
    } finally {
        try {
            child.kill("SIGINT");
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
});

test("When making HEAD to an SSR error route in prod without custom 500, then fallback 500 has no body", async () => {
    const tmp = await makeTempDir();
    const outDir = path.join(tmp, "dist");
    const outClient = path.join(outDir, "client");
    const outServer = path.join(outDir, "server");
    const pagesDirRel = "src/pages";
    const pagesDirAbs = path.join(tmp, "src", "pages");

    // Root generated route for readiness
    const generatedHtml = [
        "<!doctype html>",
        "<html>",
        "<head><title>Home</title></head>",
        '<body><div id="page">HOME</div></body>',
        "</html>",
        "",
    ].join("\n");
    await writeFileEnsured(path.join(outClient, "index.html"), generatedHtml);
    await writeFileEnsured(path.join(pagesDirAbs, "index.jsx"), "// src placeholder");

    // Route that throws on SSR
    await writeFileEnsured(path.join(pagesDirAbs, "boom", "index.jsx"), "// src boom placeholder");
    const ssrBoom = `export default function render(){ throw new Error("Boom"); }`;
    await writeFileEnsured(path.join(outServer, "boom", "index.js"), ssrBoom);

    // No custom 500 provided

    // Manifest includes generated root and SSR boom route
    const routes = [
        { filename: "index.html", jsx: "src/pages/index.jsx", generated: true },
        { path: "boom", filename: "boom/index.html", jsx: "src/pages/boom/index.jsx" },
    ];
    await writeFileEnsured(path.join(outServer, "routes.json"), JSON.stringify(routes, null, 2));

    const port = await getFreePort();
    const { child } = spawnProd({
        cwd: tmp,
        outDir,
        pagesDirRel,
        port,
        extraEnv: { PUBLIC_PATH: "/", REQUEST_TIMEOUT_MS: "5000", HEADER_TIMEOUT_MS: "5000" },
    });

    try {
        const ready = await waitForReady({ port, pathname: "/" });
        assert.equal(ready, true, "prod server should become ready");

        const res = await httpGet(port, "/boom", { method: "HEAD" });
        assert.equal(res.status, 500);
        assert.equal(res.headers["content-type"], "text/html; charset=utf-8");
        assert.equal(res.headers["cache-control"], "no-store");
        assert.equal(res.body.length, 0, "HEAD must not include body");
    } finally {
        try {
            child.kill("SIGINT");
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
});
