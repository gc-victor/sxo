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
    ensureDir,
    pathExists,
    registerCommonOptions,
    wasFlagExplicit,
    dashToCamel,
    camelToDash,
    prepareFlags,
    askYesNo,
    printBuildSummary,
    validatePagesFolder,
} = await import("./cli-helpers.js");

import { withTempProject } from "../test-utils.js";

test("absoluteScript resolves relative to root", () => {
    const root = "/tmp/root-example";
    const result = absoluteScript(root, "scripts/start.mjs");
    assert.equal(result, path.resolve(root, "scripts/start.mjs"));
});

test("getUrl builds localhost URL", () => {
    assert.equal(getUrl(3000), "http://localhost:3000/");
    assert.equal(getUrl("4010"), "http://localhost:4010/");
});

test("ensureDir + pathExists round trip", async () => {
    await withTempProject(async (dir) => {
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

test("registerCommonOptions does not include inert --config flag", () => {
    const cli = cac("prog");
    registerCommonOptions(cli);
    // --config was previously registered but never implemented; ensure it stays removed
    const configOption = cli.globalCommand.options.find((o) => o.name === "config");
    assert.equal(configOption, undefined, "--config flag should not be registered (not implemented)");
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

test("printBuildSummary outputs expected lines with route count", async () => {
    const routesFile = path.join(tempOutDir, "server", "routes.json");
    await ensureDir(path.dirname(routesFile));
    await fsp.writeFile(
        routesFile,
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

test("prepareFlags honors --public-path explicitness (including empty string)", () => {
    const originalArgv = process.argv.slice();
    try {
        // Not explicit: raw flag should be stripped
        process.argv = ["node", "script", "build", "--port=1"];
        const rawFlags1 = { publicPath: "/file", port: 1 };
        const { flagsForConfig: f1, flagsExplicit: e1 } = prepareFlags("build", rawFlags1);
        assert.equal(e1.publicPath, false);
        assert.ok(!("publicPath" in f1));

        // Explicit with non-empty value
        process.argv = ["node", "script", "build", "--public-path=/cdn"];
        const rawFlags2 = { publicPath: "/cdn" };
        const { flagsForConfig: f2, flagsExplicit: e2 } = prepareFlags("build", rawFlags2);
        assert.equal(e2.publicPath, true);
        assert.equal(f2.publicPath, "/cdn");

        // Explicit with empty string value
        process.argv = ["node", "script", "build", "--public-path="];
        const rawFlags3 = { publicPath: "" };
        const { flagsForConfig: f3, flagsExplicit: e3 } = prepareFlags("build", rawFlags3);
        assert.equal(e3.publicPath, true);
        assert.equal(f3.publicPath, "");
    } finally {
        process.argv = originalArgv;
    }
});

test("prepareFlags fixes cac's conversion of empty string to 0 for --public-path", () => {
    const originalArgv = process.argv.slice();
    try {
        // cac converts empty string to 0, but prepareFlags should restore it
        process.argv = ["node", "script", "build", "--public-path", ""];
        const rawFlags = { publicPath: 0 }; // cac gives us 0
        const { flagsForConfig, flagsExplicit } = prepareFlags("build", rawFlags);
        assert.equal(flagsExplicit.publicPath, true);
        assert.equal(flagsForConfig.publicPath, ""); // Should be restored to empty string

        // Assignment style
        process.argv = ["node", "script", "build", "--public-path="];
        const rawFlags2 = { publicPath: 0 }; // cac gives us 0
        const { flagsForConfig: f2 } = prepareFlags("build", rawFlags2);
        assert.equal(f2.publicPath, ""); // Should be restored to empty string

        // With quotes (some shells)
        process.argv = ["node", "script", "build", '--public-path=""'];
        const rawFlags3 = { publicPath: 0 }; // cac gives us 0
        const { flagsForConfig: f3 } = prepareFlags("build", rawFlags3);
        assert.equal(f3.publicPath, ""); // Should be restored to empty string
    } finally {
        process.argv = originalArgv;
    }
});

test("prepareFlags honors --client-dir explicitness", () => {
    const originalArgv = process.argv.slice();
    try {
        // Explicit with value via assignment
        process.argv = ["node", "script", "build", "--client-dir=assets"];
        const rawFlags = { clientDir: "assets" };
        const { flagsForConfig, flagsExplicit } = prepareFlags("build", rawFlags);
        assert.equal(flagsExplicit.clientDir, true);
        assert.equal(flagsForConfig.clientDir, "assets");

        // Explicit with separated value
        process.argv = ["node", "script", "dev", "--client-dir", "pkg"];
        const rawFlags2 = { clientDir: "pkg" };
        const { flagsForConfig: f2, flagsExplicit: e2 } = prepareFlags("dev", rawFlags2);
        assert.equal(e2.clientDir, true);
        assert.equal(f2.clientDir, "pkg");
    } finally {
        process.argv = originalArgv;
    }
});

test("prepareFlags filters out non-explicit clientDir", () => {
    const originalArgv = process.argv.slice();
    try {
        // Not explicit: raw flag should be stripped
        process.argv = ["node", "script", "start", "--port=3000"];
        const rawFlags = { clientDir: "pkg" };
        const { flagsForConfig, flagsExplicit } = prepareFlags("start", rawFlags);
        assert.equal(flagsExplicit.clientDir, false);
        assert.ok(!("clientDir" in flagsForConfig));
    } finally {
        process.argv = originalArgv;
    }
});

test("validatePagesFolder throws when folder does not exist", async () => {
    const missingFolder = path.join(os.tmpdir(), `sxo-missing-${Date.now()}`);

    await assert.rejects(
        async () => validatePagesFolder(missingFolder),
        (e) => e instanceof Error && e.message.includes("does not exist"),
        "should throw when path does not exist",
    );
});

test("validatePagesFolder throws when path is not a directory", async () => {
    await withTempProject(async (dir) => {
        const filePath = path.join(dir, "not-a-dir.txt");
        await fsp.writeFile(filePath, "content");

        await assert.rejects(
            async () => validatePagesFolder(filePath),
            (e) => e instanceof Error && e.message.includes("is not a directory"),
            "should throw when path is not a directory",
        );
    });
});

test("printBuildSummary handles read errors gracefully", async () => {
    // Force a read error by using a non-existent output directory
    const nonExistentDir = path.join(tempOutDir, "does-not-exist");

    let captured = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk, encoding, cb) => {
        captured += typeof chunk === "string" ? chunk : chunk.toString(encoding || "utf8");
        return originalWrite(chunk, encoding, cb);
    };
    try {
        await printBuildSummary(nonExistentDir, "src/pages");
    } finally {
        process.stdout.write = originalWrite;
    }

    assert.match(captured, /Routes:\s*0/);
});

test("prepareFlags: handles unknown command", () => {
    const { flagsForConfig, flagsExplicit } = prepareFlags("unknown", { someFlag: true });
    assert.deepEqual(flagsExplicit, {});
    assert.deepEqual(flagsForConfig, { someFlag: true });
});

test("prepareFlags: exercises different commands", () => {
    const originalArgv = process.argv;
    try {
        process.argv = ["node", "script", "add", "--components-dir", "my-comps", "--color"];
        const { flagsForConfig, flagsExplicit } = prepareFlags("add", { componentsDir: "my-comps", color: true, verbose: false });

        assert.strictEqual(flagsExplicit.componentsDir, true);
        assert.strictEqual(flagsExplicit.color, true);
        assert.strictEqual(flagsExplicit.verbose, false);

        assert.strictEqual(flagsForConfig.componentsDir, "my-comps");
        assert.strictEqual(flagsForConfig.color, true);
        assert.ok(!("verbose" in flagsForConfig));

        process.argv = ["node", "script", "clean", "--out-dir", "dist", "--verbose"];
        const { flagsForConfig: fClean, flagsExplicit: eClean } = prepareFlags("clean", { outDir: "dist", verbose: true, color: false });
        assert.strictEqual(eClean.outDir, true);
        assert.strictEqual(eClean.verbose, true);
        assert.strictEqual(fClean.outDir, "dist");
        assert.strictEqual(fClean.verbose, true);
        assert.ok(!("color" in fClean));

        process.argv = ["node", "script", "generate", "--public-path", "/static"];
        const { flagsForConfig: fGen, flagsExplicit: eGen } = prepareFlags("generate", { publicPath: "/static", clientDir: "client" });
        assert.strictEqual(eGen.publicPath, true);
        assert.strictEqual(eGen.clientDir, false);
        assert.strictEqual(fGen.publicPath, "/static");
        assert.ok(!("clientDir" in fGen));
    } finally {
        process.argv = originalArgv;
    }
});

test("prepareFlags handles negated and zero-valued flags", () => {
    const originalArgv = process.argv.slice();
    try {
        // Negated flag
        process.argv = ["node", "script", "dev", "--no-open"];
        const rawFlags1 = { open: false };
        const { flagsForConfig: f1, flagsExplicit: e1 } = prepareFlags("dev", rawFlags1);
        assert.equal(e1.open, true);
        assert.equal(f1.open, false);

        // Zero flag value (not from empty string)
        process.argv = ["node", "script", "dev", "--port", "0"];
        const rawFlags2 = { port: 0 };
        const { flagsForConfig: f2, flagsExplicit: e2 } = prepareFlags("dev", rawFlags2);
        assert.equal(e2.port, true);
        assert.equal(f2.port, 0);
    } finally {
        process.argv = originalArgv;
    }
});

test("prepareFlags restores empty string from space-separated arg", () => {
    const originalArgv = process.argv.slice();
    try {
        // Space-separated empty string (not using =)
        process.argv = ["node", "script", "build", "--public-path", ""];
        const rawFlags = { publicPath: 0 }; // cac coerces to 0
        const { flagsForConfig } = prepareFlags("build", rawFlags);
        assert.equal(flagsForConfig.publicPath, "");
    } finally {
        process.argv = originalArgv;
    }
});

test("prepareFlags restores empty string from quoted args", () => {
    const originalArgv = process.argv.slice();
    try {
        // Double quotes
        process.argv = ["node", "script", "build", '--public-path=""'];
        const rawFlags1 = { publicPath: 0 };
        const { flagsForConfig: f1 } = prepareFlags("build", rawFlags1);
        assert.equal(f1.publicPath, "");

        // Single quotes
        process.argv = ["node", "script", "build", "--public-path=''"];
        const rawFlags2 = { publicPath: 0 };
        const { flagsForConfig: f2 } = prepareFlags("build", rawFlags2);
        assert.equal(f2.publicPath, "");
    } finally {
        process.argv = originalArgv;
    }
});

test("prepareFlags ignores empty string when flag not in argv or is negated", () => {
    const originalArgv = process.argv.slice();
    try {
        // case 1: flag not in argv at all
        process.argv = ["node", "script", "build", "--port=3000"];
        const rawFlags1 = { publicPath: 0, port: 3000 };
        const { flagsForConfig: f1 } = prepareFlags("build", rawFlags1);
        assert.ok(!("publicPath" in f1));

        // case 2: flag is negated (--no-public-path)
        // wasFlagExplicit will be true, but index will be -1 in restoreEmptyStringFlag
        process.argv = ["node", "script", "build", "--no-public-path"];
        const rawFlags2 = { publicPath: 0 };
        const { flagsForConfig: f2 } = prepareFlags("build", rawFlags2);
        // It should return early at line 123 and NOT restore to ""
        assert.equal(f2.publicPath, 0);
    } finally {
        process.argv = originalArgv;
    }
});
