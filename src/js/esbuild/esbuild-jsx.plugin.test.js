import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_PLUGIN_PATH = path.join(__dirname, "esbuild-jsx.plugin.js");
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

// We'll import a modified copy of the plugin that uses a local stub transformer
// and reads the real helpers file from the original source directory.
let esbuildJsxPlugin;

before(async () => {
    TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "sxo-jsx-plugin-"));

    // 1) Create stub transformer
    const stubPath = path.join(TMP_DIR, "stub-transformer.js");
    writeFile(
        stubPath,
        [
            "export function jsx(source){",
            '  if (typeof source !== "string") throw new Error("unexpected input type");',
            '  if (source.includes("TRANSFORM_THROW")) throw new Error("Transformer parse error");',
            '  return "/* transformed-stub */\\n" + source;',
            "}",
            "",
        ].join("\n"),
    );

    // 2) Read and rewrite plugin source: replace transformer import and helpers path
    const original = fs.readFileSync(SRC_PLUGIN_PATH, "utf8");

    // Replace the transformer import path with our stub
    let modified = original.replace(
        /import\s+\{\s*jsx\s*\}\s+from\s+["'][^"']*jsx_transformer\.js["'];?/,
        'import { jsx } from "./stub-transformer.js";',
    );

    // Hard-code HELPERS_PATH to the absolute path of the real helpers file
    const helpersAbs = SRC_HELPERS_PATH.replace(/\\/g, "/");
    modified = modified.replace(/const\s+HELPERS_PATH\s*=\s*[^;]+;/, `const HELPERS_PATH = ${JSON.stringify(helpersAbs)};`);

    // 3) Write modified plugin into temp dir and import it
    const testablePluginPath = path.join(TMP_DIR, "esbuild-jsx.plugin.testable.js");
    fs.writeFileSync(testablePluginPath, modified, "utf8");

    const mod = await import(pathToFileURL(testablePluginPath).href);
    esbuildJsxPlugin = mod.esbuildJsxPlugin;
});

after(() => {
    if (TMP_DIR) {
        try {
            fs.rmSync(TMP_DIR, { recursive: true, force: true });
        } catch {}
    }
});

function setupPlugin() {
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

    const plugin = esbuildJsxPlugin();
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
    assert.match(result.contents, /__jsxList/);
});

test("onLoad: transforms .jsx file, prepends helpers import, and sets loader=jsx", async () => {
    const { loads } = setupPlugin();

    const fileLoad = loads.find((l) => l.opts?.filter?.test("file.jsx") && !l.opts.namespace);
    assert.ok(fileLoad, "file onLoad hook should be registered for .jsx/.tsx files");

    const jsxPath = path.join(TMP_DIR, "comp.jsx");
    writeFile(jsxPath, ["// jsx sample", "function View(){", '  return <div className="x">ok</div>;', "}"].join("\n"));

    const result = await fileLoad.cb({ path: jsxPath });
    assert.equal(result.loader, "jsx");
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

test("onEnd: renames hashed index files to index.js", async () => {
    const { ends } = setupPlugin();
    assert.ok(ends.length > 0, "onEnd hook should be registered");
    const onEnd = ends[0];

    // Create a fake output file that ends with "index.js" but has a prefix like "name.index.js"
    const outDir = path.join(TMP_DIR, "out");
    ensureDir(outDir);
    const beforeAbs = path.join(outDir, "widget.index.js");
    writeFile(beforeAbs, "// placeholder");

    const beforeRel = path.relative(process.cwd(), beforeAbs);

    // Call onEnd with a metafile that references our output key
    await onEnd({
        metafile: {
            outputs: {
                [beforeRel]: {},
            },
        },
    });

    // The plugin's onEnd uses async rename inside a forEach without awaiting;
    // wait a brief moment to let the async rename finish.
    await new Promise((r) => setTimeout(r, 25));

    const afterAbs = path.join(outDir, "index.js");
    assert.ok(fs.existsSync(afterAbs), "should rename to index.js");
    assert.ok(!fs.existsSync(beforeAbs), "original hashed index should be moved");
});
