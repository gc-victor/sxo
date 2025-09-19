import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { esbuildMetafilePlugin } from "./esbuild-metafile.plugin.js";

let fixturesRoot;

// Utilities
function writeFileRecursive(filePath, content) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
}

function _rmDirRecursive(dirPath) {
    if (!fs.existsSync(dirPath)) return;
    for (const entry of fs.readdirSync(dirPath)) {
        const cur = path.join(dirPath, entry);
        const stat = fs.lstatSync(cur);
        if (stat.isDirectory()) {
            _rmDirRecursive(cur);
        } else {
            fs.unlinkSync(cur);
        }
    }
    fs.rmdirSync(dirPath);
}

before(() => {
    fixturesRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sxo-metafile-"));
});

after(() => {
    if (fixturesRoot) {
        try {
            fs.rmSync(fixturesRoot, { recursive: true, force: true });
        } catch {}
    }
});

function createPluginAndRun({ clientDir, serverDir, routesFile, metafile, publicPath }) {
    // Configure env for public path normalization
    if (publicPath === undefined) {
        delete process.env.PUBLIC_PATH;
    } else {
        process.env.PUBLIC_PATH = publicPath;
    }

    const plugin = esbuildMetafilePlugin({
        outputDirClient: clientDir,
        outputDirServer: serverDir,
        routesFile,
    });

    let onEndCb;
    const build = {
        onEnd(cb) {
            onEndCb = cb;
        },
    };

    plugin.setup(build);

    return onEndCb({ metafile });
}

function makeCaseDirs(caseName) {
    const base = path.join(fixturesRoot, caseName);
    const clientDir = path.join(base, "dist", "client");
    const serverDir = path.join(base, "dist", "server");
    const routesFile = path.join(serverDir, "routes.json");
    fs.mkdirSync(clientDir, { recursive: true });
    fs.mkdirSync(serverDir, { recursive: true });
    return { base, clientDir, serverDir, routesFile };
}

function makeMetafileFor(clientDir, { jsOutName, cssOutName, jsEntry, cssEntry, jsCssBundleName }) {
    const outputs = {};

    const jsOutAbs = path.join(clientDir, jsOutName);
    const jsOutKey = path.relative(process.cwd(), jsOutAbs);
    const jsCssBundleAbs = path.join(clientDir, jsCssBundleName);
    const jsCssBundleKey = path.relative(process.cwd(), jsCssBundleAbs);

    outputs[jsOutKey] = {
        entryPoint: jsEntry, // must match route entryPoints
        cssBundle: jsCssBundleKey,
    };

    const cssOutAbs = path.join(clientDir, cssOutName);
    const cssOutKey = path.relative(process.cwd(), cssOutAbs);
    outputs[cssOutKey] = {
        entryPoint: cssEntry, // explicit CSS entry
    };

    return { outputs };
}

function writeRoutes(routesFile, routes) {
    writeFileRecursive(routesFile, JSON.stringify(routes, null, 2));
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

// Case 1: routes.json augmented with per-route assets (no HTML generation)
test("metafile plugin augments routes.json with per-route assets (no HTML generation)", async () => {
    const { clientDir, serverDir, routesFile } = makeCaseDirs("case-1");

    // Plugin does not generate HTML; only updates routes.json with per-route assets

    const jsEntry = "src/pages/foo/client/index.js";
    const cssEntry = "src/pages/global.css";

    writeRoutes(routesFile, [
        {
            filename: "foo/index.html",
            entryPoints: [jsEntry, cssEntry],
            scriptLoading: "module",
        },
    ]);

    const metafile = makeMetafileFor(clientDir, {
        jsOutName: path.join("foo", "index.ABC123.js"),
        jsCssBundleName: path.join("foo", "index.ABC123.css"),
        cssOutName: "global.XYZ789.css",
        jsEntry,
        cssEntry,
    });

    await createPluginAndRun({
        clientDir,
        serverDir,
        routesFile,
        metafile,
        publicPath: undefined, // defaults to "/"
    });

    // asset-manifest.json removed; using routes.assets in routes.json

    // Assert routes.json augmented with per-route assets (failing TDD)
    const updatedRoutes = readJson(routesFile);
    assert.equal(Array.isArray(updatedRoutes), true, "routes.json should be an array");
    assert.ok(
        updatedRoutes[0]?.assets && Array.isArray(updatedRoutes[0].assets.css) && Array.isArray(updatedRoutes[0].assets.js),
        "route.assets with css/js arrays should be present",
    );
    assert.ok(updatedRoutes[0].assets.css.includes("global.XYZ789.css"), "assets.css should include global css");
    assert.ok(updatedRoutes[0].assets.css.includes("foo/index.ABC123.css"), "assets.css should include js-emitted css bundle");
    assert.ok(updatedRoutes[0].assets.js.includes("foo/index.ABC123.js"), "assets.js should include client entry bundle");

    // Assert plugin does NOT generate HTML (that is done by the CLI `generate` step)
    const outHtmlPath = path.join(clientDir, "foo", "index.html");
    assert.equal(fs.existsSync(outHtmlPath), false, "HTML output should not be written by the metafile plugin");
});

// Case 2: Client-relative assets written in routes.json (PUBLIC_PATH ignored here)
test("metafile plugin writes client-relative assets in routes.json", async () => {
    const { clientDir, serverDir, routesFile } = makeCaseDirs("case-2");

    // Plugin does not generate HTML; only updates routes.json with per-route assets

    const jsEntry = "src/app/bar/client/index.js";
    const cssEntry = "src/app/global.css";

    writeRoutes(routesFile, [
        {
            filename: "bar/index.html",
            entryPoints: [cssEntry, jsEntry], // swapped order to ensure order-agnostic checks
            scriptLoading: "module",
        },
    ]);

    const metafile = makeMetafileFor(clientDir, {
        jsOutName: path.join("bar", "index.111.js"),
        jsCssBundleName: path.join("bar", "index.111.css"),
        cssOutName: "global.222.css",
        jsEntry,
        cssEntry,
    });

    await createPluginAndRun({
        clientDir,
        serverDir,
        routesFile,
        metafile,
        publicPath: "", // preserved as ""
    });

    // Assert routes.json augmented with per-route assets (client-relative, no PUBLIC_PATH prefix)
    const updatedRoutes2 = readJson(routesFile);
    assert.ok(updatedRoutes2[0]?.assets, "route.assets should be present");
    assert.ok(updatedRoutes2[0].assets.css.includes("global.222.css"), "assets.css should include explicit global css");
    assert.ok(updatedRoutes2[0].assets.css.includes("bar/index.111.css"), "assets.css should include js-emitted css bundle");
    assert.ok(updatedRoutes2[0].assets.js.includes("bar/index.111.js"), "assets.js should include client entry bundle");

    const outHtmlPath2 = path.join(clientDir, "bar", "index.html");
    assert.equal(fs.existsSync(outHtmlPath2), false, "HTML output should not be written by the metafile plugin");
});

// Case 3: routes.json assets remain client-relative regardless of PUBLIC_PATH value
test("metafile plugin normalizes PUBLIC_PATH by ensuring trailing slash", async () => {
    const variations = [
        { p: "/assets", expectedPrefix: "/assets/" },
        { p: "/assets/", expectedPrefix: "/assets/" },
        { p: "https://cdn.example.com/static", expectedPrefix: "https://cdn.example.com/static/" },
        { p: "https://cdn.example.com/static/", expectedPrefix: "https://cdn.example.com/static/" },
    ];

    for (let i = 0; i < variations.length; i++) {
        const { p } = variations[i];
        const { clientDir, serverDir, routesFile } = makeCaseDirs(`case-3-${i}`);

        // Plugin does not generate HTML; only updates routes.json with per-route assets

        const jsEntry = `src/site/case${i}/client/index.js`;
        const cssEntry = `src/site/case${i}/global.css`;

        writeRoutes(routesFile, [
            {
                filename: `site/case${i}/index.html`,
                entryPoints: [jsEntry, cssEntry],
                scriptLoading: "module",
            },
        ]);

        const metafile = makeMetafileFor(clientDir, {
            jsOutName: path.join("site", `case${i}`, "index.JS99.js"),
            jsCssBundleName: path.join("site", `case${i}`, "index.JS99.css"),
            cssOutName: path.join("site", `case${i}`, "global.CS55.css"),
            jsEntry,
            cssEntry,
        });

        await createPluginAndRun({
            clientDir,
            serverDir,
            routesFile,
            metafile,
            publicPath: p,
        });

        const updatedRoutes3 = readJson(routesFile);
        const route3 = updatedRoutes3[0];
        assert.ok(route3?.assets, "route.assets should be present");

        assert.ok(route3.assets.css.includes(`site/case${i}/global.CS55.css`), "assets.css should include explicit css for case");
        assert.ok(route3.assets.css.includes(`site/case${i}/index.JS99.css`), "assets.css should include js-emitted css bundle for case");
        assert.ok(route3.assets.js.includes(`site/case${i}/index.JS99.js`), "assets.js should include client entry bundle for case");
        const outHtmlPath3 = path.join(clientDir, "site", `case${i}`, "index.html");
        assert.equal(fs.existsSync(outHtmlPath3), false, "HTML output should not be written by the metafile plugin");
    }
});
