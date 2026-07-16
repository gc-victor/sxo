import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { esbuildJsxPlugin } from "./esbuild-jsx.plugin.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_HELPERS_PATH = path.join(__dirname, "jsx-helpers.js");
let TMP_DIR;

// Small FS helpers for tests
function ensureDir(p) {
    fs.mkdirSync(p, { recursive: true });
}
function writeFile(p, c) {
    ensureDir(path.dirname(p));
    fs.writeFileSync(p, c);
}
function cleanOutDir() {
    const outDir = path.join(TMP_DIR, "out");
    if (fs.existsSync(outDir)) {
        fs.rmSync(outDir, { recursive: true, force: true });
    }
}

// Stub transformer
function stubTransformer(source) {
    if (typeof source !== "string") throw new Error("unexpected input type");
    if (source.includes("TRANSFORM_THROW")) throw new Error("Transformer parse error");
    return `/* transformed-stub */\n${source}`;
}

before(() => {
    TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "sxo-jsx-plugin-"));
});

after(() => {
    if (TMP_DIR) {
        try {
            fs.rmSync(TMP_DIR, { recursive: true, force: true });
        } catch {}
    }
});

function setupPlugin(options = {}) {
    const resolves = [];
    const loads = [];
    const ends = [];

    const build = {
        onResolve(opts, cb) {
            resolves.push({ opts, cb });
        },
        onLoad(opts, cb) {
            loads.push({ opts, cb });
        },
        onEnd(cb) {
            ends.push(cb);
        },
    };

    const plugin = esbuildJsxPlugin({
        transformer: stubTransformer,
        ...options,
    });
    plugin.setup(build);

    return { resolves, loads, ends };
}

test("onResolve: virtual helpers resolves to 'jsx-helpers' namespace", async () => {
    const { resolves } = setupPlugin();

    const resHook = resolves.find((r) => r.opts?.filter?.test("virtual:jsx-helpers"));
    assert.ok(resHook, "onResolve hook for virtual:jsx-helpers should be registered");

    const resolved = await resHook.cb({ path: "virtual:jsx-helpers", importer: "/abs/some/file.js" });
    assert.equal(resolved.path, "virtual:jsx-helpers");
    assert.equal(resolved.namespace, "jsx-helpers");
});

test("onLoad: helpers virtual module returns JS loader and actual helpers content", async () => {
    const { loads } = setupPlugin();

    const helpersLoad = loads.find((l) => l.opts && l.opts.namespace === "jsx-helpers");
    assert.ok(helpersLoad, "helpers onLoad hook should be registered");

    const result = await helpersLoad.cb({ path: "virtual:jsx-helpers", namespace: "jsx-helpers" });
    assert.equal(result.loader, "js");
    assert.ok(typeof result.contents === "string" && result.contents.length > 0, "helpers contents should be a non-empty string");

    // sanity check: known symbols from helpers
    assert.match(result.contents, /__jsxComponent/);
    assert.match(result.contents, /__jsxSpread/);
    assert.match(result.contents, /__jsxRender/);
});

test("onLoad: transforms .jsx file, prepends helpers import, and sets loader=jsx", async () => {
    const { loads } = setupPlugin();

    const fileLoad = loads.find((l) => l.opts?.filter?.test("file.jsx") && !l.opts.namespace);
    assert.ok(fileLoad, "file onLoad hook should be registered for .jsx/.tsx files");

    const jsxPath = path.join(TMP_DIR, "comp.jsx");
    writeFile(jsxPath, ["// jsx sample", "function View(){", '  return <div className="x">ok</div>;', "}"].join("\n"));

    const result = await fileLoad.cb({ path: jsxPath });
    assert.equal(result.loader, "js");
    assert.ok(result.contents.startsWith('import "virtual:jsx-helpers";'), 'output should start by importing "virtual:jsx-helpers"');
    assert.match(result.contents, /\/\* transformed-stub \*\//, "should include transformed marker");
    assert.match(result.contents, /className="x"/);
});

test("onLoad: transforms .tsx file and sets loader=tsx", async () => {
    const { loads } = setupPlugin();

    const fileLoad = loads.find((l) => l.opts?.filter?.test("file.tsx") && !l.opts.namespace);
    assert.ok(fileLoad, "file onLoad hook should be registered for .jsx/.tsx files");

    const tsxPath = path.join(TMP_DIR, "comp.tsx");
    writeFile(tsxPath, ["// tsx sample", "type P = {x:number};", "export const C = (p:P) => <span>{p.x}</span>;"].join("\n"));

    const result = await fileLoad.cb({ path: tsxPath });
    assert.equal(result.loader, "tsx");
    assert.ok(result.contents.includes('import "virtual:jsx-helpers";'), "helpers import should be injected");
    assert.match(result.contents, /\/\* transformed-stub \*\//);
});

test("onLoad: returns structured error when readFile fails", async () => {
    const { loads } = setupPlugin();

    const fileLoad = loads.find((l) => l.opts?.filter?.test("file.jsx") && !l.opts.namespace);
    assert.ok(fileLoad, "file onLoad hook should be registered");

    const missing = path.join(TMP_DIR, "missing.jsx");
    const result = await fileLoad.cb({ path: missing });
    assert.ok(Array.isArray(result.errors) && result.errors.length > 0, "should return errors array");
    assert.match(result.errors[0].text, /Failed to read file:/);
    assert.match(result.errors[0].text, /missing\.jsx/);
});

test("onLoad: returns structured error when transformer throws", async () => {
    const { loads } = setupPlugin();

    const fileLoad = loads.find((l) => l.opts?.filter?.test("file.jsx") && !l.opts.namespace);
    assert.ok(fileLoad, "file onLoad hook should be registered");

    const badPath = path.join(TMP_DIR, "bad.jsx");
    writeFile(badPath, "/* TRANSFORM_THROW */\nconst Nope = <div/>;");

    const result = await fileLoad.cb({ path: badPath });
    assert.ok(Array.isArray(result.errors) && result.errors.length > 0, "should return errors array");
    assert.match(result.errors[0].text, /Transformer parse error/);
});

test("onEnd: renames <name>.index.js to index.js (consolidation)", async () => {
    cleanOutDir();
    const { ends } = setupPlugin();
    assert.ok(ends.length > 0, "onEnd hook should be registered");
    const onEnd = ends[0];

    // Create a hashed flat file like "home.index.js"
    const outDir = path.join(TMP_DIR, "out");
    ensureDir(outDir);
    const hashedPath = path.join(outDir, "home.index.js");
    writeFile(hashedPath, "// home.index.js content");

    const hashedRel = path.relative(process.cwd(), hashedPath);

    // Call onEnd with a metafile that references our output
    await onEnd({
        metafile: {
            outputs: {
                [hashedRel]: {},
            },
        },
    });

    // Verify file is renamed to index.js (consolidation)
    const indexJsPath = path.join(outDir, "index.js");
    assert.ok(fs.existsSync(indexJsPath), "should rename home.index.js to index.js");
    assert.ok(!fs.existsSync(hashedPath), "original home.index.js should be moved");
});

test("onEnd: does NOT rename plain index.js to index.jsx.js", async () => {
    cleanOutDir();
    const { ends } = setupPlugin();
    const onEnd = ends[0];

    // Create a plain index.js file (not hashed)
    const outDir = path.join(TMP_DIR, "out");
    ensureDir(outDir);
    const indexJsPath = path.join(outDir, "index.js");
    writeFile(indexJsPath, "// index.js content");

    const indexRel = path.relative(process.cwd(), indexJsPath);

    // Call onEnd with a metafile
    await onEnd({
        metafile: {
            outputs: {
                [indexRel]: {},
            },
        },
    });

    // Verify index.js is NOT renamed
    assert.ok(fs.existsSync(indexJsPath), "plain index.js should NOT be renamed");
    const indexJsxJsPath = path.join(outDir, "index.jsx.js");
    assert.ok(!fs.existsSync(indexJsxJsPath), "index.jsx.js should NOT be created");
});

test("onEnd: does NOT touch files outside outputDir when outputDir is set", async () => {
    cleanOutDir();
    const outDir = path.join(TMP_DIR, "out");

    // Setup plugin with outputDir as RELATIVE path (matching production usage)
    // In production, OUTPUT_DIR_SERVER is like "dist/server", not absolute
    const outputDirRelative = path.relative(process.cwd(), outDir);
    const { ends } = setupPlugin({ outputDir: outputDirRelative });
    const onEnd = ends[0];

    // Create files: one inside outputDir, one outside
    const nestedDir = path.join(TMP_DIR, "nested");
    ensureDir(nestedDir);
    ensureDir(outDir);
    const outsideFile = path.join(nestedDir, "test.index.js");
    const insideFile = path.join(outDir, "home.index.js");
    writeFile(outsideFile, "// other content");
    writeFile(insideFile, "// out content");

    const outsideRel = path.relative(process.cwd(), outsideFile);
    const insideRel = path.relative(process.cwd(), insideFile);

    // Call onEnd with metafile referencing both
    await onEnd({
        metafile: {
            outputs: {
                [outsideRel]: {},
                [insideRel]: {},
            },
        },
    });

    // Verify file inside outputDir is renamed
    assert.ok(fs.existsSync(path.join(outDir, "index.js")), "file in outputDir should be renamed to index.js");
    assert.ok(!fs.existsSync(insideFile), "original file in outputDir should be moved");

    // Verify file outside outputDir is NOT touched
    assert.ok(fs.existsSync(outsideFile), "file outside outputDir should NOT be touched");
    assert.ok(!fs.existsSync(path.join(nestedDir, "index.js")), "file outside outputDir should NOT be renamed");
});

test("onEnd: no-op when no <name>.index.js files exist in output", async () => {
    cleanOutDir();
    const { ends } = setupPlugin();
    const onEnd = ends[0];

    // Create output files that do NOT match the <name>.index.js pattern
    const outDir = path.join(TMP_DIR, "out");
    ensureDir(outDir);
    const otherPath = path.join(outDir, "other.js");
    const plainIndexPath = path.join(outDir, "index.js");
    writeFile(otherPath, "// other.js content");
    writeFile(plainIndexPath, "// index.js content");

    const otherRel = path.relative(process.cwd(), otherPath);
    const indexRel = path.relative(process.cwd(), plainIndexPath);

    // Call onEnd with metafile containing non-matching files
    await onEnd({
        metafile: {
            outputs: {
                [otherRel]: {},
                [indexRel]: {},
            },
        },
    });

    // Verify original files still exist (no renaming occurred)
    assert.ok(fs.existsSync(otherPath), "other.js should not be renamed");
    assert.ok(fs.existsSync(plainIndexPath), "plain index.js should not be renamed");
});

test("onEnd: handles missing metafile gracefully", async () => {
    cleanOutDir();
    const { ends } = setupPlugin();
    const onEnd = ends[0];

    // Create fake output file
    const outDir = path.join(TMP_DIR, "out");
    ensureDir(outDir);
    const hashedPath = path.join(outDir, "home.index.js");
    writeFile(hashedPath, "// home.index.js content");

    // Call onEnd without metafile
    await onEnd({});

    // Verify file is NOT renamed (early return)
    assert.ok(fs.existsSync(hashedPath), "files should not be renamed when metafile is missing");
    const indexJsPath = path.join(outDir, "index.js");
    assert.ok(!fs.existsSync(indexJsPath), "index.js should not be created");
});

test("onEnd: renames multiple <name>.index.js files in separate directories concurrently", async () => {
    cleanOutDir();
    const { ends } = setupPlugin();
    const onEnd = ends[0];

    // Create multiple hashed index files in separate directories
    // (matches real esbuild output structure where each route has its own dir)
    const outDir = path.join(TMP_DIR, "out");
    const homeDir = path.join(outDir, "home");
    const aboutDir = path.join(outDir, "about");
    const blogDir = path.join(outDir, "blog");

    ensureDir(homeDir);
    ensureDir(aboutDir);
    ensureDir(blogDir);

    const hashed1 = path.join(homeDir, "home.index.js");
    const hashed2 = path.join(aboutDir, "about.index.js");
    const hashed3 = path.join(blogDir, "blog.index.js");

    writeFile(hashed1, "// home.index.js content");
    writeFile(hashed2, "// about.index.js content");
    writeFile(hashed3, "// blog.index.js content");

    const hashed1Rel = path.relative(process.cwd(), hashed1);
    const hashed2Rel = path.relative(process.cwd(), hashed2);
    const hashed3Rel = path.relative(process.cwd(), hashed3);

    // Call onEnd with metafile containing multiple hashed index files
    await onEnd({
        metafile: {
            outputs: {
                [hashed1Rel]: {},
                [hashed2Rel]: {},
                [hashed3Rel]: {},
            },
        },
    });

    // Verify each file is renamed to index.js in its respective directory
    assert.ok(fs.existsSync(path.join(homeDir, "index.js")), "home.index.js should be renamed to index.js");
    assert.ok(fs.existsSync(path.join(aboutDir, "index.js")), "about.index.js should be renamed to index.js");
    assert.ok(fs.existsSync(path.join(blogDir, "index.js")), "blog.index.js should be renamed to index.js");

    // Original hashed files should be gone
    assert.ok(!fs.existsSync(hashed1), "home.index.js should be moved");
    assert.ok(!fs.existsSync(hashed2), "about.index.js should be moved");
    assert.ok(!fs.existsSync(hashed3), "blog.index.js should be moved");
});

test("helpers: read only once with concurrent calls", async () => {
    // We use a custom reader to count reads
    let readCount = 0;
    const customReader = {
        async readText(p) {
            if (p === SRC_HELPERS_PATH) {
                readCount++;
                return fs.readFileSync(p, "utf8");
            }
            return null;
        },
    };

    const { loads } = setupPlugin({
        reader: customReader,
        helpersPath: SRC_HELPERS_PATH,
    });

    const helpersLoad = loads.find((l) => l.opts && l.opts.namespace === "jsx-helpers");
    assert.ok(helpersLoad, "helpers onLoad hook should be registered");

    // Make concurrent calls to the helpers load callback
    const concurrentCalls = 10;
    const promises = Array.from({ length: concurrentCalls }, () =>
        helpersLoad.cb({ path: "virtual:jsx-helpers", namespace: "jsx-helpers" }),
    );
    await Promise.all(promises);

    assert.equal(readCount, 1, "helpers file should be read only once despite concurrent calls");
});

test("helpers: retry read on failure", async () => {
    let readCount = 0;
    const customReader = {
        async readText(_p) {
            readCount++;
            if (readCount === 1) {
                throw new Error("Temporary failure");
            }
            return "/* mock helpers */";
        },
    };

    const { loads } = setupPlugin({
        reader: customReader,
        helpersPath: "any-path",
    });

    const helpersLoad = loads.find((l) => l.opts && l.opts.namespace === "jsx-helpers");

    // First call should fail
    await assert.rejects(helpersLoad.cb({ path: "virtual:jsx-helpers", namespace: "jsx-helpers" }), /Temporary failure/);

    // Second call should succeed because cache was reset on error
    const result = await helpersLoad.cb({ path: "virtual:jsx-helpers", namespace: "jsx-helpers" });
    assert.equal(result.contents, "/* mock helpers */");
    assert.equal(readCount, 2);
});

test("onLoad: returns error when reader returns null for helpers", async () => {
    const customReader = {
        async readText() {
            return null;
        },
    };

    const { loads } = setupPlugin({
        reader: customReader,
        helpersPath: "missing-helpers",
    });

    const helpersLoad = loads.find((l) => l.opts && l.opts.namespace === "jsx-helpers");

    await assert.rejects(
        helpersLoad.cb({ path: "virtual:jsx-helpers", namespace: "jsx-helpers" }),
        /Failed to read helpers file: missing-helpers/,
    );
});
