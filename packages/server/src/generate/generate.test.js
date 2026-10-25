import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { generateCore, isDynamicRoute } from "./generate.js";

const ssrHtml = ({ title = "Title", body = "<div>Body</div>" } = {}) =>
    ["<html>", "<head>", `  <title>${title}</title>`, "</head>", "<body>", `  ${body}`, "</body>", "</html>", ""].join("\n");

function createMockDeps(files, modules, publicPath = "/") {
    const store = new Map(Object.entries(files));
    const logs = [];
    const errors = [];
    const origLog = console.log;
    const origError = console.error;
    console.log = (...args) => logs.push(args.join(" "));
    console.error = (...args) => errors.push(args.join(" "));

    const deps = {
        routesFile: "/mock/dist/server/routes.json",
        outputDirClient: "/mock/dist/client",
        publicPath,
        readText: async (file) => store.get(file) ?? null,
        writeFile: async (file, content) => store.set(file, content),
        mkdirp: async () => {},
        loadModule: async (jsxPath) => {
            const fn = modules[jsxPath];
            if (!fn) throw new Error(`No valid export found in ${jsxPath}`);
            return fn;
        },
    };

    const restore = () => {
        console.log = origLog;
        console.error = origError;
    };

    return { deps, store, logs, errors, restore };
}

const allOutput = (logs, errors) => [...logs, ...errors].join("\n");

/**
 * Run a test with automatic cleanup of mock dependencies.
 * @param {Function} fn - async test function receiving { deps, store, logs, errors }
 */
async function runTest(fn, files, modules, publicPath = "/") {
    const { deps, store, logs, errors, restore } = createMockDeps(files, modules, publicPath);
    try {
        await fn({ deps, store, logs, errors });
    } finally {
        restore();
    }
}

test("isDynamicRoute detects dynamic and static routes", () => {
    assert.equal(isDynamicRoute({ path: "blog/[slug]", filename: "blog/[slug]/index.html" }), true);
    assert.equal(isDynamicRoute({ filename: "user/[id]/index.html" }), true);
    assert.equal(isDynamicRoute({ path: "about", filename: "about/index.html" }), false);
    assert.equal(isDynamicRoute({ filename: "index.html" }), false);
});

test("generate (core): handles manifest write failure", async (t) => {
    const routeFile = "/mock/dist/server/routes.json";

    await t.test("manifest write fails -> returns ok:false with writeError", () =>
        runTest(
            async ({ deps, _store, errors }) => {
                // Override writeFile to fail on routes.json
                const originalWriteFile = deps.writeFile;
                deps.writeFile = async (file, content) => {
                    if (file === routeFile) {
                        throw new Error("permission denied");
                    }
                    return originalWriteFile(file, content);
                };

                const res = await generateCore(deps);
                assert.equal(res.ok, false, "should return ok:false when manifest write fails");
                assert.equal(res.writeError, "permission denied", "should include writeError in result");
                assert.equal(res.generated, 1, "should still have generated the HTML file");
                assert.match(errors.join(" "), /failed to persist generated flags/i);
            },
            { [routeFile]: JSON.stringify([{ filename: "index.html", jsx: "src/pages/index.jsx" }]) },
            { "src/pages/index.jsx": () => "<html><head><title>Test</title></head><body><div>Test</div></body></html>" },
        ),
    );
});

test("generate (core): handles various error and edge cases", async (t) => {
    const routeFile = "/mock/dist/server/routes.json";

    await t.test("missing manifest -> returns ok:false with helpful message", () =>
        runTest(
            async ({ deps, errors }) => {
                const res = await generateCore(deps);
                assert.equal(res.ok, false);
                assert.match(allOutput([], errors), /Missing or invalid manifest/i);
            },
            {},
            {},
        ),
    );

    await t.test("bad manifest (not an array) -> returns ok:false", () =>
        runTest(
            async ({ deps, errors }) => {
                const res = await generateCore(deps);
                assert.equal(res.ok, false);
                assert.match(allOutput([], errors), /routes manifest is not an array/i);
            },
            { [routeFile]: JSON.stringify({ not: "array" }) },
            {},
        ),
    );

    await t.test("empty routes array -> ok:true, logs none to generate", () =>
        runTest(
            async ({ deps, logs }) => {
                const res = await generateCore(deps);
                assert.equal(res.ok, true);
                assert.equal(res.generated, 0);
                assert.match(allOutput(logs, []), /No routes found in manifest/i);
            },
            { [routeFile]: JSON.stringify([]) },
            {},
        ),
    );

    await t.test("all routes dynamic -> ok:true, no generation performed", () =>
        runTest(
            async ({ deps, logs }) => {
                const res = await generateCore(deps);
                assert.equal(res.ok, true);
                assert.equal(res.generated, 0);
                assert.match(allOutput(logs, []), /No static routes to generate/i);
            },
            {
                [routeFile]: JSON.stringify([
                    { path: "blog/[slug]", filename: "blog/[slug]/index.html", jsx: "src/pages/blog/[slug]/index.jsx" },
                    { filename: "user/[id]/index.html", jsx: "src/pages/user/[id]/index.jsx" },
                ]),
            },
            {},
        ),
    );

    await t.test("generation continues after a route fails and records both outcomes", () =>
        runTest(
            async ({ deps, store }) => {
                const res = await generateCore(deps);

                assert.equal(res.ok, false);
                assert.equal(res.generated, 1);
                assert.equal(res.skipped, 0);
                assert.equal(res.failed, 1);
                assert.equal(store.has("/mock/dist/client/about/index.html"), true);
                const updatedRoutes = JSON.parse(store.get(routeFile));
                assert.equal(updatedRoutes[1].generated, true);
            },
            {
                [routeFile]: JSON.stringify([
                    { filename: "index.html", jsx: "src/pages/index.jsx" },
                    { path: "about", filename: "about/index.html", jsx: "src/pages/about/index.jsx" },
                ]),
            },
            {
                "src/pages/index.jsx": () => {
                    throw new Error("page failed");
                },
                "src/pages/about/index.jsx": () => "<html><head></head><body>About</body></html>",
            },
        ),
    );

    await t.test("invalid SSR export (loadModule throws) -> ok:false and reports error", () =>
        runTest(
            async ({ deps, errors }) => {
                const res = await generateCore(deps);
                assert.equal(res.ok, false);
                assert.match(allOutput([], errors), /No valid export found/i);
            },
            { [routeFile]: JSON.stringify([{ filename: "index.html", jsx: "src/pages/index.jsx" }]) },
            {},
        ),
    );

    await t.test("SSR returns non-HTML -> treats as fragment and does not mark as generated", () =>
        runTest(
            async ({ deps, store, logs }) => {
                const res = await generateCore(deps);
                assert.equal(res.ok, true);
                assert.equal(res.generated, 0);
                assert.equal(res.skipped, 1);
                assert.match(allOutput(logs, []), /skipped: fragment, not html file generated/i);

                // Verify no HTML file was written
                assert.equal(store.has("/mock/dist/client/index.html"), false);

                // Verify route is NOT marked as generated in manifest
                const updatedRoutes = JSON.parse(store.get(routeFile));
                assert.equal(updatedRoutes[0].generated, undefined);
            },
            {
                [routeFile]: JSON.stringify([{ filename: "index.html", jsx: "src/pages/index.jsx" }]),
            },
            { "src/pages/index.jsx": () => "plain text" },
        ),
    );
});

test("generate (core): handles various success scenarios", async (t) => {
    const routeFile = "/mock/dist/server/routes.json";

    await t.test("successful generation writes doctype, HTML, and sets generated flag", () => {
        const html = ssrHtml({ title: "OK", body: "<div>Done</div>" });
        return runTest(
            async ({ deps, store, logs }) => {
                const res = await generateCore(deps);

                assert.equal(res.ok, true);
                assert.equal(res.generated, 1);
                assert.equal(res.skipped, 0);
                assert.match(allOutput(logs, []), /done\.\s+generated=1\s+skipped=0\s+failed=0/i);

                const written = store.get("/mock/dist/client/index.html");
                assert.ok(written, "HTML file should be written");
                assert.equal(written.startsWith("<!doctype html>"), true, "should prepend doctype");
                assert.match(written, /<html>/i);
                assert.match(written, /<title>OK<\/title>/);
                assert.match(written, />\s*<div>Done<\/div>/);

                assert.equal(JSON.parse(store.get(routeFile))[0].generated, true);
            },
            { [routeFile]: JSON.stringify([{ filename: "index.html", jsx: "src/pages/index.jsx" }]) },
            { "src/pages/index.jsx": () => html },
        );
    });

    await t.test("mixed static + dynamic -> dynamic untouched; statics generated", () =>
        runTest(
            async ({ deps, store, logs }) => {
                await generateCore(deps);

                const out = allOutput(logs, []);
                assert.match(out, /generated=2/);
                assert.match(out, /failed=0/);

                const home = store.get("/mock/dist/client/index.html");
                const about = store.get("/mock/dist/client/about/index.html");
                assert.match(home, /<title>Home<\/title>/);
                assert.match(about, /<title>About<\/title>/);
                assert.equal(store.has("/mock/dist/client/blog/[slug]/index.html"), false);

                const updated = JSON.parse(store.get(routeFile));
                const byFile = (f) => updated.find((r) => r.filename === f);
                assert.equal(byFile("index.html").generated, true);
                assert.equal(byFile("about/index.html").generated, true);
                assert.ok(!byFile("blog/[slug]/index.html").generated);
            },
            {
                [routeFile]: JSON.stringify([
                    { filename: "index.html", jsx: "src/pages/index.jsx" },
                    { path: "about", filename: "about/index.html", jsx: "src/pages/about/index.jsx" },
                    { path: "blog/[slug]", filename: "blog/[slug]/index.html", jsx: "src/pages/blog/[slug]/index.jsx" },
                ]),
            },
            {
                "src/pages/index.jsx": () => "<html><head><title>Home</title></head><body><div>H</div></body></html>",
                "src/pages/about/index.jsx": () => "<html><head><title>About</title></head><body><div>A</div></body></html>",
            },
        ),
    );

    await t.test("idempotency -> second run skips already-generated", () => {
        const routes = [
            { filename: "index.html", jsx: "src/pages/index.jsx" },
            { path: "about", filename: "about/index.html", jsx: "src/pages/about/index.jsx" },
        ];
        return runTest(
            async ({ deps, logs }) => {
                const r1 = await generateCore(deps);
                assert.equal(r1.ok, true);
                assert.equal(r1.generated, 2);

                logs.length = 0;
                const r2 = await generateCore(deps);
                assert.equal(r2.ok, true);
                const out2 = allOutput(logs, []);
                assert.match(out2, /generated=0/);
                assert.match(out2, /skipped=2/);
                assert.match(out2, /failed=0/);
            },
            { [routeFile]: JSON.stringify(routes) },
            {
                "src/pages/index.jsx": () => "<html><head><title>H</title></head><body>1</body></html>",
                "src/pages/about/index.jsx": () => "<html><head><title>A</title></head><body>2</body></html>",
            },
        );
    });

    await t.test("asset injection with PUBLIC_PATH='/'", () =>
        runTest(
            async ({ deps, store }) => {
                const res = await generateCore(deps);
                assert.equal(res.ok, true);

                const written = store.get("/mock/dist/client/index.html");
                assert.match(written, /<link rel="stylesheet" href="\/global\.A1\.css">/);
                assert.match(written, /<link rel="stylesheet" href="\/index\.B2\.css">/);
                assert.match(written, /<script type="module" src="\/index\.B2\.js"><\/script>/);
            },
            {
                [routeFile]: JSON.stringify([
                    {
                        filename: "index.html",
                        jsx: "src/pages/index.jsx",
                        entryPoints: ["src/pages/index.client.js", "src/pages/global.css"],
                        assets: { css: ["global.A1.css", "index.B2.css"], js: ["index.B2.js"] },
                    },
                ]),
            },
            { "src/pages/index.jsx": () => ssrHtml({ title: "Assets", body: "<div>Body</div>" }) },
            "/",
        ),
    );
});

test("generate (core): sequential asset injection PUBLIC_PATH '/' then ''", async () => {
    const routeFile = "/mock/dist/server/routes.json";
    const modules = {
        "src/pages/index.jsx": () => ssrHtml({ title: "Home SSR", body: "<div>Welcome Home</div>" }),
        "src/pages/about/index.jsx": () => ssrHtml({ title: "About SSR", body: "<div>About Page</div>" }),
        "src/pages/plain/index.jsx": () => ssrHtml({ title: "Plain SSR", body: "<div>Plain Page</div>" }),
    };

    return runTest(
        async ({ deps, store }) => {
            // First run with PUBLIC_PATH="/"
            const res1 = await generateCore(deps);
            assert.equal(res1.ok, true);

            const home1 = store.get("/mock/dist/client/index.html");
            assert.match(home1, /Welcome Home/);
            assert.match(home1, /<link rel="stylesheet" href="\/global\.A1\.css">/);
            assert.match(home1, /<link rel="stylesheet" href="\/index\.B2\.css">/);
            assert.match(home1, /<script type="module" src="\/index\.B2\.js"><\/script>/);

            const about1 = store.get("/mock/dist/client/about/index.html");
            assert.match(about1, /About Page/);
            assert.match(about1, /<link rel="stylesheet" href="\/about\/index\.C3\.css">/);
            assert.match(about1, /<script type="module" src="\/about\/index\.C3\.js"><\/script>/);

            // Add a new route (plain) not yet generated
            const updatedRoutes = JSON.parse(store.get(routeFile));
            updatedRoutes.push({
                path: "plain",
                filename: "plain/index.html",
                jsx: "src/pages/plain/index.jsx",
                entryPoints: ["src/pages/plain/client/index.js"],
                assets: { css: ["plain/index.D1.css"], js: ["plain/index.D1.js"] },
            });
            store.set(routeFile, JSON.stringify(updatedRoutes));

            // Second run with PUBLIC_PATH="" (empty preserved)
            deps.publicPath = "";
            const res2 = await generateCore(deps);
            assert.equal(res2.ok, true);

            const plain = store.get("/mock/dist/client/plain/index.html");
            assert.match(plain, /Plain Page/);
            assert.match(plain, /<link rel="stylesheet" href="plain\/index\.D1\.css">/);
            assert.match(plain, /<script type="module" src="plain\/index\.D1\.js"><\/script>/);
        },
        {
            [routeFile]: JSON.stringify([
                {
                    filename: "index.html",
                    jsx: "src/pages/index.jsx",
                    entryPoints: ["src/pages/index.client.js", "src/pages/global.css"],
                    assets: { css: ["global.A1.css", "index.B2.css"], js: ["index.B2.js"] },
                },
                {
                    path: "about",
                    filename: "about/index.html",
                    jsx: "src/pages/about/index.jsx",
                    entryPoints: ["src/pages/about/client/index.js"],
                    assets: { css: ["about/index.C3.css"], js: ["about/index.C3.js"] },
                },
            ]),
        },
        modules,
        "/",
    );
});

test("generate (CLI): script entrypoint sets exitCode correctly", async () => {
    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "sxo-generate-cli-"));
    const outDir = path.join(tmpRoot, "dist");
    const routesFile = path.join(outDir, "server", "routes.json");

    await fs.mkdir(path.dirname(routesFile), { recursive: true });
    await fs.writeFile(routesFile, JSON.stringify([]), "utf8");

    const scriptFile = fileURLToPath(new URL("./generate.js", import.meta.url));

    const { code, stdout, stderr } = await new Promise((resolve) => {
        const env = {
            ...process.env,
            SXO_RESOLVED_CONFIG: JSON.stringify({
                command: "build",
                port: 0,
                pagesDir: "src/pages",
                outDir,
                minify: true,
                sourcemap: false,
            }),
        };
        const child = spawn(process.execPath, [scriptFile], { cwd: tmpRoot, env });
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

    assert.equal(code, 0, "empty routes should exit 0");
    assert.match(stdout + stderr, /No routes found in manifest/i);
});
