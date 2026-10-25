import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, relative } from "node:path";
import { test } from "node:test";

const runner = "scripts/test/test.js";

function runRunner(args) {
    const env = { ...process.env };
    delete env.NODE_TEST_CONTEXT;
    return spawnSync(process.execPath, [runner, ...args], {
        cwd: process.cwd(),
        encoding: "utf8",
        env,
    });
}

test("test runner rejects absolute paths and paths that escape the project root", () => {
    const absolute = runRunner(["/etc/passwd"]);
    assert.equal(absolute.status, 1);
    assert.match(absolute.stderr, /Invalid path: must be relative, not absolute/);

    const outside = runRunner(["../../outside.test.js"]);
    assert.equal(outside.status, 1);
    assert.match(outside.stderr, /Invalid path: resolves outside project root/);
});

test("test mode runs a selected test file through the silent reporter", () => {
    const result = runRunner(["scripts/test/test-fail.test.js"]);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Test Summary/);
    assert.match(result.stdout, /Passed:  5/);
    assert.match(result.stdout, /✅ All 5 test\(s\) passed/);
});

test("runner maps source files to sibling tests and skips hidden directories", () => {
    const dir = mkdtempSync(join(process.cwd(), ".test-runner-"));
    const hidden = join(dir, ".hidden");
    mkdirSync(hidden);
    const source = join(dir, "sample.js");
    writeFileSync(source, "throw new Error('source file should not run');\n");
    writeFileSync(join(dir, "sample.test.js"), "import { test } from 'node:test'; test('mapped test', () => {});\n");
    writeFileSync(join(hidden, "hidden.test.js"), "throw new Error('hidden test should not run');\n");

    try {
        const mapped = runRunner([relative(process.cwd(), source)]);
        assert.equal(mapped.status, 0, mapped.stderr);
        assert.match(mapped.stdout, /Passed:  1/);

        const scanned = runRunner([relative(process.cwd(), dir)]);
        assert.equal(scanned.status, 0, scanned.stderr);
        assert.match(scanned.stdout, /Passed:  1/);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("coverage mode emits the package-only coverage report for a selected scripts test", () => {
    const result = runRunner(["coverage", "scripts/test/test-fail.test.js"]);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Test Summary/);
    assert.match(result.stdout, /all files/);
    assert.doesNotMatch(result.stdout, /test-fail\.js/);
    assert.match(result.stdout, /ℹ end of coverage report/);
});
