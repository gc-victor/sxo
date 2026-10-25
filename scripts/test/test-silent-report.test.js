import assert from "node:assert/strict";
import { test } from "node:test";
import silentReporter from "./test-silent-report.js";

async function collect(source) {
    const output = [];
    for await (const chunk of silentReporter(source)) output.push(chunk);
    return output.join("");
}

async function* events(items) {
    yield* items;
}

test("silent reporter suppresses passing, skipped, and diagnostic output but summarizes results", async () => {
    const output = await collect(events([
        { type: "test:pass", data: { name: "passed" } },
        { type: "test:skip", data: { name: "skipped" } },
        { type: "test:diagnostic", data: { message: "not displayed" } },
        { type: "test:stdout", data: { chunk: "also hidden" } },
        { type: "test:fail", data: { name: "failed", file: "case.test.js", details: { error: { message: "failure detail" } } } },
    ]));

    assert.match(output, /× failed\n  at case\.test\.js:1/);
    assert.match(output, /Error: failure detail/);
    assert.match(output, /Total:   3\nPassed:  1\nFailed:  1\nSkipped: 1/);
    assert.match(output, /❌ 1 test\(s\) failed/);
    assert.doesNotMatch(output, /not displayed|also hidden|passed\n|skipped\n/);
});

test("silent reporter reports all passing tests when no failures occur", async () => {
    const output = await collect(events([
        { type: "test:pass", data: { name: "first" } },
        { type: "test:pass", data: { name: "second" } },
    ]));

    assert.match(output, /Total:   2\nPassed:  2\nFailed:  0\nSkipped: 0/);
    assert.match(output, /✅ All 2 test\(s\) passed/);
});
