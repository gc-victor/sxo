import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import benchmarkReporter from "./test-benchmark.js";

async function collect(source) {
    const output = [];
    for await (const chunk of benchmarkReporter(source)) output.push(chunk);
    return output.join("");
}

async function* events(items) {
    yield* items;
}

test("benchmark reporter counts events and displays the slowest threshold-matching failure", async () => {
    const oldTop = process.env.BENCH_TOP;
    const oldThreshold = process.env.BENCH_THRESHOLD;
    process.env.BENCH_TOP = "1";
    process.env.BENCH_THRESHOLD = "50";

    try {
        const output = await collect(events([
            { type: "test:diagnostic", data: { message: "ignored" } },
            { type: "test:pass", data: { name: "quick", file: "quick.test.js", details: { duration_ms: 10 } } },
            { type: "test:skip", data: { name: "skipped" } },
            { type: "test:fail", data: { name: "slow failure", file: "slow.test.js", details: { duration_ms: 80 } } },
            { type: "test:pass", data: { name: "slow pass", file: "pass.test.js", details: { duration_ms: 60 } } },
        ]));

        assert.match(output, /Total Tests: 4 \(Passed: 2, Failed: 1, Skipped: 1\)/);
        assert.match(output, /Threshold: 50ms \(showing 2\/3 tests\)/);
        assert.match(output, /slow\.test\.js/);
        assert.match(output, /slow failure ❌/);
        assert.match(output, /❌ 1 test\(s\) failed/);
        assert.doesNotMatch(output, /pass\.test\.js|ignored/);
    } finally {
        if (oldTop === undefined) delete process.env.BENCH_TOP;
        else process.env.BENCH_TOP = oldTop;
        if (oldThreshold === undefined) delete process.env.BENCH_THRESHOLD;
        else process.env.BENCH_THRESHOLD = oldThreshold;
    }
});

test("benchmark CLI maps source paths to tests and skips hidden directories", () => {
    const dir = mkdtempSync(join(tmpdir(), "sxo-benchmark-"));
    const hidden = join(dir, ".hidden");
    mkdirSync(hidden);
    writeFileSync(join(dir, "example.js"), "throw new Error('source should not run');\n");
    writeFileSync(join(dir, "example.test.js"), "import { test } from 'node:test'; test('mapped test', () => {});\n");
    writeFileSync(join(hidden, "hidden.test.js"), "throw new Error('hidden test should not run');\n");

    try {
        const env = { ...process.env };
        delete env.NODE_TEST_CONTEXT;
        const result = spawnSync(process.execPath, [
            "scripts/test/test-benchmark.js",
            "--top=1",
            dir,
        ], { encoding: "utf8", env });

        const output = `${result.stdout}${result.stderr}`;
        assert.equal(result.status, 0, output);
        assert.match(output, /Total Tests: 1/);
        assert.match(output, /mapped test/);
        assert.doesNotMatch(output, /hidden test/);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("benchmark CLI rejects a non-positive top count", () => {
    const result = spawnSync(process.execPath, ["scripts/test/test-benchmark.js", "--top=0"], { encoding: "utf8" });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Error: --top must be a positive integer/);
});
