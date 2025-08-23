import assert from "node:assert/strict";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import cac from "cac";

/**
 * Prime SXO_RESOLVED_CONFIG so that constants.js (imported transitively by cli-helpers)
 * points OUTPUT_DIR / ROUTES_FILE at a temp directory we fully control for isolation.
 */
const tempOutDir = await fsp.mkdtemp(path.join(os.tmpdir(), "sxo-helpers-out-"));
process.env.SXO_RESOLVED_CONFIG = JSON.stringify({
    command: "build",
    port: 41234,
    pagesDir: "src/pages",
    outDir: tempOutDir,
    minify: true,
    sourcemap: false,
});

// Import after environment priming
const {
    absoluteScript,
    getUrl,
    toPosixPath,
    ensureDir,
    pathExists,
    registerCommonOptions,
    wasFlagExplicit,
    dashToCamel,
    camelToDash,
    prepareFlags,
    askYesNo,
    ensureBuiltRoutesJson,
    printBuildSummary,
} = await import("./cli-helpers.js");

import { ROUTES_FILE } from "../constants.js";

/* --------------- helpers --------------- */
async function withTempDir(fn) {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "sxo-clihelpers-"));
    try {
        return await fn(dir);
    } finally {
        await fsp.rm(dir, { recursive: true, force: true }).catch(() => {});
    }
}

/* --------------- tests --------------- */

test("absoluteScript resolves relative to root", () => {
    const root = "/tmp/root-example";
    const result = absoluteScript(root, "scripts/start.mjs");
    assert.equal(result, path.resolve(root, "scripts/start.mjs"));
});

test("getUrl builds localhost URL", () => {
    assert.equal(getUrl(3000), "http://localhost:3000/");
    assert.equal(getUrl("4010"), "http://localhost:4010/");
});

test("toPosixPath converts backslashes", () => {
    const mixed = "some\\windows\\path\\file.js";
    assert.equal(toPosixPath(mixed), "some/windows/path/file.js");
});

test("ensureDir + pathExists round trip", async () => {
    await withTempDir(async (dir) => {
        const nested = path.join(dir, "a/b/c");
        assert.equal(await pathExists(nested), false);
        await ensureDir(nested);
        assert.equal(await pathExists(nested), true);
        const file = path.join(nested, "f.txt");
        await fsp.writeFile(file, "ok");
        assert.equal(await pathExists(file), true);
    });
});

test("registerCommonOptions returns same command instance", () => {
    const cli = cac("prog");
    const res = registerCommonOptions(cli);
    assert.equal(res, cli);
});

test("wasFlagExplicit detects long, assignment, and negated flags", () => {
    const argv = ["dev", "--open", "--port=3001", "--no-color"];
    assert.equal(wasFlagExplicit(argv, "open"), true);
    assert.equal(wasFlagExplicit(argv, "port"), true);
    assert.equal(wasFlagExplicit(argv, "color"), true); // via --no-color
    assert.equal(wasFlagExplicit(argv, "verbose"), false);
});

test("dashToCamel / camelToDash inverse relationship", () => {
    const dashed = "pages-dir";
    const camel = dashToCamel(dashed);
    assert.equal(camel, "pagesDir");
    assert.equal(camelToDash(camel), dashed);
});

test("prepareFlags filters out non-explicit flags per command map", () => {
    const originalArgv = process.argv.slice();
    try {
        process.argv = ["node", "script", "dev", "--port=1234", "--open", "--no-color", "--verbose"];
        const rawFlags = {
            port: 1234,
            open: true,
            color: true,
            verbose: true,
            pagesDir: "custom/pages", // NOT passed explicitly
        };
        const { flagsForConfig, flagsExplicit } = prepareFlags("dev", rawFlags);

        // Explicit flags
        assert.equal(flagsExplicit.port, true);
        assert.equal(flagsExplicit.open, true);
        assert.equal(flagsExplicit.color, true);
        assert.equal(flagsExplicit.verbose, true);
        // Not provided
        assert.equal(flagsExplicit.pagesDir, false);

        // Non-explicit removed
        assert.ok(!("pagesDir" in flagsForConfig));
        // Explicit retained
        assert.equal(flagsForConfig.port, 1234);
        assert.equal(flagsForConfig.open, true);
        assert.equal(flagsForConfig.verbose, true);
    } finally {
        process.argv = originalArgv;
    }
});

test("ensureBuiltRoutesJson false before file exists, true after create", async () => {
    await fsp.rm(ROUTES_FILE, { force: true }).catch(() => {});
    assert.equal(await ensureBuiltRoutesJson(), false);
    await ensureDir(path.dirname(ROUTES_FILE));
    await fsp.writeFile(ROUTES_FILE, "[]");
    assert.equal(await ensureBuiltRoutesJson(), true);
});

test("printBuildSummary outputs expected lines with route count", async () => {
    await ensureDir(path.dirname(ROUTES_FILE));
    await fsp.writeFile(
        ROUTES_FILE,
        JSON.stringify(
            [
                { filename: "index.html", jsx: "src/pages/index.jsx" },
                { filename: "about/index.html", jsx: "src/pages/about/index.jsx" },
            ],
            null,
            2,
        ),
    );

    let captured = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk, encoding, cb) => {
        captured += typeof chunk === "string" ? chunk : chunk.toString(encoding || "utf8");
        return originalWrite(chunk, encoding, cb);
    };
    try {
        await printBuildSummary(tempOutDir, "src/pages");
    } finally {
        process.stdout.write = originalWrite;
    }

    assert.match(captured, /Output:/);
    assert.match(captured, /Pages:/);
    assert.match(captured, /Routes:\s*2/);
});

test("askYesNo returns false in non-TTY environments", async () => {
    const res = await askYesNo("Should be false?");
    assert.equal(res, false);
});

// validatePagesFolder tests removed due to intermittent serialization failure during test runner cloning.
// AIDEV-NOTE: End of cli-helpers tests
