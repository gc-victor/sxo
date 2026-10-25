import assert from "node:assert/strict";
import { test } from "node:test";
import { getLocation, handleTestFail } from "./test-fail.js";

async function collect(generator) {
    const output = [];
    for await (const chunk of generator) output.push(chunk);
    return output.join("");
}

test("getLocation prefers event coordinates and fills omitted coordinates", () => {
    assert.equal(getLocation(null), "unknown.js:1:1");
    assert.equal(getLocation({ file: "suite.test.js", line: 8 }), "suite.test.js:8");
    assert.equal(
        getLocation({ details: { file: "nested.test.js", line: 4, column: 2 } }),
        "nested.test.js:4:2",
    );
    assert.equal(
        getLocation({
            file: "event.test.js",
            line: 7,
            details: { file: "nested.test.js", line: 4, column: 2 },
        }),
        "event.test.js:7:2",
    );
});

test("getLocation extracts JavaScript locations from plain and file URL stacks", () => {
    assert.equal(
        getLocation({ error: { stack: "Error: failed\n    at run (/work/plain.test.js:12:7)" } }),
        "work/plain.test.js:12:7",
    );
    assert.equal(
        getLocation({ details: { error: { stack: "Error: failed\n    at run (file:///work/url.test.js:3:9)" } } }),
        "/work/url.test.js:3:9",
    );
    assert.equal(getLocation({ error: { stack: "Error without a location" } }), "unknown.js:1:1");
    assert.equal(
        getLocation({
            error: {},
            details: { error: { stack: "Error: failed\n    at run (/work/nested.test.js:6:3)" } },
        }),
        "work/nested.test.js:6:3",
    );
});

test("handleTestFail formats assertion details and increments counters", async () => {
    const counters = { totalTests: 2, failedTests: 0 };
    const output = await collect(handleTestFail({
        data: {
            name: "assertion case",
            file: "case.test.js",
            details: {
                error: {
                    cause: {
                        code: "ERR_ASSERTION",
                        operator: "strictEqual",
                        message: "values differ\nextra detail",
                        expected: "expected",
                        actual: "actual",
                    },
                },
            },
        },
    }, counters));

    assert.deepEqual(counters, { totalTests: 3, failedTests: 1 });
    assert.match(output, /× assertion case\n  at case\.test\.js:1\n/);
    assert.match(output, /AssertionError: strictEqual - values differ/);
    assert.match(output, /Expected: "expected"\n    Actual:   "actual"/);
});

test("handleTestFail formats multiline errors and omits the generic test failure code", async () => {
    const output = await collect(handleTestFail({
        data: {
            details: {
                error: {
                    message: "first line\n  detail\n   \nsecond detail",
                    code: "ERR_CUSTOM",
                },
            },
        },
    }, { totalTests: 0, failedTests: 0 }));

    assert.match(output, /× Unknown test/);
    assert.match(output, /Error: first line\n    detail\n    second detail/);
    assert.match(output, /Code: ERR_CUSTOM/);
    assert.doesNotMatch(output, /ERR_TEST_FAILURE/);
});
