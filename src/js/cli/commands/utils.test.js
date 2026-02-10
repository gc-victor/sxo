import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getErrorMessage } from "./utils.js";

describe("cli/commands/utils", () => {
    describe("getErrorMessage", () => {
        it("extracts message from Error object", () => {
            const err = new Error("Something went wrong");
            assert.equal(getErrorMessage(err), "Something went wrong");
        });

        it("extracts message from plain object with message property", () => {
            const err = { message: "Custom error message" };
            assert.equal(getErrorMessage(err), "Custom error message");
        });

        it("returns stringified value for non-objects", () => {
            assert.equal(getErrorMessage("just a string"), "just a string");
            assert.equal(getErrorMessage(404), "404");
            assert.equal(getErrorMessage(true), "true");
        });

        it("returns stringified value for null/undefined", () => {
            assert.equal(getErrorMessage(null), "null");
            assert.equal(getErrorMessage(undefined), "undefined");
        });

        it("returns stringified value for object without message", () => {
            const err = { code: "ENOENT" };
            assert.equal(getErrorMessage(err), "[object Object]");
        });
    });
});
