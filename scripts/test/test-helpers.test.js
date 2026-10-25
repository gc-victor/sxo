import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test } from "node:test";
import { waitForChild } from "./test-helpers.js";

test("waitForChild treats signal termination as failure", async () => {
    const child = new EventEmitter();
    const exitCode = waitForChild(child);

    child.emit("close", null, "SIGTERM");

    assert.equal(await exitCode, 1);
});
