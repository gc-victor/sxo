import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ui } from "./ui.js";

describe("ui façade", () => {
    test("should provide a named aggregate with all UI utilities", () => {
        assert.strictEqual(typeof ui.formatBanner, "function");
        assert.strictEqual(typeof ui.printBanner, "function");
        assert.strictEqual(typeof ui.createSpinner, "function");
        assert.strictEqual(typeof ui.log, "object");
    });
});
