/**
 * @fileoverview Tests for HTTP constants module.
 * @module server/shared/http-constants.test
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
    HTTP_METHOD_GET,
    HTTP_METHOD_HEAD,
    HTTP_METHOD_POST,
    HTTP_STATUS_FORBIDDEN,
    HTTP_STATUS_NOT_FOUND,
    HTTP_STATUS_OK,
    HTTP_STATUS_SERVER_ERROR,
} from "./http-constants.js";

describe("HTTP Status Codes", () => {
    test("HTTP_STATUS_OK should be 200", () => {
        assert.strictEqual(HTTP_STATUS_OK, 200);
    });

    test("HTTP_STATUS_FORBIDDEN should be 403", () => {
        assert.strictEqual(HTTP_STATUS_FORBIDDEN, 403);
    });

    test("HTTP_STATUS_NOT_FOUND should be 404", () => {
        assert.strictEqual(HTTP_STATUS_NOT_FOUND, 404);
    });

    test("HTTP_STATUS_SERVER_ERROR should be 500", () => {
        assert.strictEqual(HTTP_STATUS_SERVER_ERROR, 500);
    });
});

describe("HTTP Methods", () => {
    test("HTTP_METHOD_GET should be 'GET'", () => {
        assert.strictEqual(HTTP_METHOD_GET, "GET");
    });

    test("HTTP_METHOD_POST should be 'POST'", () => {
        assert.strictEqual(HTTP_METHOD_POST, "POST");
    });

    test("HTTP_METHOD_HEAD should be 'HEAD'", () => {
        assert.strictEqual(HTTP_METHOD_HEAD, "HEAD");
    });
});
