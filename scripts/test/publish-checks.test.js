import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const manifestChecker = path.join(repoRoot, "scripts/publish/check-manifests.mjs");
const exportChecker = path.join(repoRoot, "scripts/publish/check-exports.mjs");
const requiredDependencies = ["alien-signals", "cac", "esbuild", "pino", "pino-http", "pino-pretty"];

function createTarball(t, { manifest = {}, nestedManifests = [], includeWasm = true } = {}) {
    const root = mkdtempSync(path.join(os.tmpdir(), "sxo-publish-test-"));
    t.after(() => rmSync(root, { recursive: true, force: true }));

    const packageDir = path.join(root, "package");
    mkdirSync(packageDir, { recursive: true });
    writeFileSync(path.join(packageDir, "package.json"), JSON.stringify({
        name: "sxo",
        version: "1.0.0",
        dependencies: Object.fromEntries(requiredDependencies.map((dep) => [dep, "1.0.0"])),
        ...manifest,
    }));

    for (const [relativePath, value] of nestedManifests) {
        const file = path.join(packageDir, relativePath);
        mkdirSync(path.dirname(file), { recursive: true });
        writeFileSync(file, JSON.stringify(value));
    }

    if (includeWasm) {
        const wasm = path.join(packageDir, "packages/cli/jsx-transformer/jsx_transformer_bg.wasm");
        mkdirSync(path.dirname(wasm), { recursive: true });
        writeFileSync(wasm, "wasm");
    }

    const tarball = path.join(root, "sxo.tgz");
    execFileSync("tar", ["-czf", tarball, "-C", root, "package"]);
    return tarball;
}

function runManifestChecker(tarball) {
    return spawnSync(process.execPath, [manifestChecker, tarball], { encoding: "utf8" });
}

describe("publish tarball validation", () => {
    describe("manifest and contents checks", () => {
        test("valid tarball passes all manifest and WASM checks", (t) => {
            const result = runManifestChecker(createTarball(t));

            assert.equal(result.status, 0, result.stderr);
            assert.match(result.stdout, /Tarball check OK/);
        });

        test("workspace specifiers in nested manifests are rejected", (t) => {
            const tarball = createTarball(t, {
                nestedManifests: [["packages/client/package.json", { dependencies: { sxo: "workspace:*" } }]],
            });
            const result = runManifestChecker(tarball);

            assert.equal(result.status, 1);
            assert.match(result.stderr, /workspace:/);
        });

        test("missing root runtime dependencies are rejected", (t) => {
            const manifest = { dependencies: Object.fromEntries(requiredDependencies.slice(1).map((dep) => [dep, "1.0.0"])) };
            const result = runManifestChecker(createTarball(t, { manifest }));

            assert.equal(result.status, 1);
            assert.match(result.stderr, /missing runtime dependency alien-signals/);
        });

        test("scoped internal dependencies in any root dependency field are rejected", (t) => {
            const result = runManifestChecker(createTarball(t, {
                manifest: { optionalDependencies: { "@sxo/server": "^1.0.0" } },
            }));

            assert.equal(result.status, 1);
            assert.match(result.stderr, /forbidden scoped dependency @sxo\/server/);
        });

        test("tarballs without the WASM transformer are rejected", (t) => {
            const result = runManifestChecker(createTarball(t, { includeWasm: false }));

            assert.equal(result.status, 1);
            assert.match(result.stderr, /missing jsx_transformer_bg\.wasm/);
        });
    });

    describe("installed export resolution", () => {
        function createFixture(t, { missingClient = false } = {}) {
            const root = mkdtempSync(path.join(os.tmpdir(), "sxo-export-test-"));
            t.after(() => rmSync(root, { recursive: true, force: true }));

            const pkgDir = path.join(root, "node_modules/sxo");
            mkdirSync(pkgDir, { recursive: true });
            writeFileSync(path.join(pkgDir, "package.json"), JSON.stringify({
                type: "module",
                exports: { ".": "./index.js", "./client": "./client.js" },
            }));
            writeFileSync(path.join(pkgDir, "index.js"), "export {};\n");
            if (!missingClient) writeFileSync(path.join(pkgDir, "client.js"), "export {};\n");
            copyFileSync(exportChecker, path.join(root, "check-exports.mjs"));
            return root;
        }

        function runExportChecker(fixture) {
            return spawnSync(process.execPath, ["check-exports.mjs"], { cwd: fixture, encoding: "utf8" });
        }

        test("all installed export targets resolve to files in the package", (t) => {
            const result = runExportChecker(createFixture(t));

            assert.equal(result.status, 0, result.stderr);
            assert.match(result.stdout, /Export resolution OK \(2 exports\)/);
        });

        test("missing installed export targets are rejected", (t) => {
            const result = runExportChecker(createFixture(t, { missingClient: true }));

            assert.equal(result.status, 1);
            assert.match(result.stderr, /sxo\/client/);
        });
    });
});
