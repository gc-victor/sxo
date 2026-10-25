import assert from "node:assert/strict";
import { test } from "node:test";
import coverageReporter from "./test-coverage-report.js";

async function collect(source) {
    const output = [];
    for await (const chunk of coverageReporter(source)) output.push(chunk);
    return output.join("");
}

async function* events(items) {
    yield* items;
}

function coverageData(files) {
    return {
        summary: {
            workingDirectory: "/workspace",
            files,
            totals: { coveredLinePercent: 75, coveredBranchPercent: 50, coveredFunctionPercent: 80 },
        },
    };
}

function file(path, lines = []) {
    return {
        path,
        coveredLinePercent: 50,
        coveredBranchPercent: 25,
        coveredFunctionPercent: 100,
        lines,
    };
}

test("coverage reporter filters package files and formats uncovered line ranges", async () => {
    const previous = process.env.TEST_FILTERS;
    process.env.TEST_FILTERS = JSON.stringify(["packages/cli/src"]);

    try {
        const output = await collect(events([
            { type: "test:coverage", data: coverageData([
                file("/workspace/packages/cli/src/runner.js", [
                    { line: 2, count: 0 },
                    { line: 3, count: 0 },
                    { line: 5, count: 0 },
                ]),
                file("/workspace/packages/server/src/ignored.js", [{ line: 9, count: 0 }]),
                file("/workspace/node_modules/dependency/index.js", [{ line: 1, count: 0 }]),
            ]) },
        ]));

        assert.match(output, /runner\.js/);
        assert.match(output, /50\.00\s+\|\s+25\.00\s+\|\s+100\.00\s+\| 2-3 5/);
        assert.match(output, /all files/);
        assert.doesNotMatch(output, /ignored\.js|dependency/);
    } finally {
        if (previous === undefined) delete process.env.TEST_FILTERS;
        else process.env.TEST_FILTERS = previous;
    }
});

test("coverage reporter prints relevant diagnostics and failure counts before coverage", async () => {
    const previous = process.env.TEST_FILTERS;
    process.env.TEST_FILTERS = "[]";

    try {
        const output = await collect(events([
            { type: "test:diagnostic", data: { message: "suite started" } },
            { type: "test:diagnostic", data: { message: "tests 2" } },
            { type: "test:stdout", data: { chunk: "suppressed output" } },
            { type: "test:pass", data: { name: "passed" } },
            { type: "test:skip", data: { name: "skipped" } },
            { type: "test:fail", data: { name: "failed", details: { error: { message: "broken" } } } },
            { type: "test:coverage", data: coverageData([file("/workspace/packages/server/src/index.js")]) },
        ]));

        assert.match(output, /ℹ suite started/);
        assert.doesNotMatch(output, /tests 2|suppressed output/);
        assert.match(output, /× failed/);
        assert.match(output, /Total:   3\nPassed:  1\nFailed:  1\nSkipped: 1/);
        assert.match(output, /❌ 1 test\(s\) failed/);
        assert.match(output, /index\.js/);
    } finally {
        if (previous === undefined) delete process.env.TEST_FILTERS;
        else process.env.TEST_FILTERS = previous;
    }
});
