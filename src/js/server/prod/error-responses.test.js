import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { badRequestResponse, send404, send500, uriTooLongResponse } from "../shared/error-responses.js";
import {
    HTTP_HEADER_CACHE_CONTROL,
    HTTP_HEADER_CONTENT_TYPE,
    HTTP_STATUS_BAD_REQUEST,
    HTTP_STATUS_NOT_FOUND,
    HTTP_STATUS_SERVER_ERROR,
    HTTP_STATUS_URI_TOO_LONG,
} from "../shared/http-constants.js";

describe("error-responses", () => {
    describe("send404", () => {
        it("should return 404 status and plain text by default", async () => {
            const response = await send404();
            assert.equal(response.status, HTTP_STATUS_NOT_FOUND);
            assert.equal(response.headers.get(HTTP_HEADER_CONTENT_TYPE), "text/plain; charset=utf-8");
            assert.equal(response.headers.get(HTTP_HEADER_CACHE_CONTROL), "public, max-age=0, must-revalidate");
            const body = await response.text();
            assert.equal(body, "Not found");
        });

        it("should strip body for HEAD requests", async () => {
            const request = new Request("http://localhost/any", { method: "HEAD" });
            const response = await send404(request);
            assert.equal(response.status, HTTP_STATUS_NOT_FOUND);
            assert.equal(response.body, null);
        });

        it("should apply custom security headers", async () => {
            const securityHeaders = { "X-Test": "Value" };
            const response = await send404(null, { securityHeaders });
            assert.equal(response.headers.get("X-Test"), "Value");
            // Also check default security headers
            assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
        });

        it("should render custom 404 page", async () => {
            const render404Fn = async () => "<html><body>Custom 404</body></html>";
            const response = await send404(null, { renderCustom404: true, render404Fn });
            assert.equal(response.status, HTTP_STATUS_NOT_FOUND);
            assert.equal(response.headers.get(HTTP_HEADER_CONTENT_TYPE), "text/html; charset=utf-8");
            const body = await response.text();
            assert.ok(body.includes("Custom 404"));
            assert.ok(body.startsWith("<!doctype html>"));
        });
    });

    describe("send500", () => {
        it("should return 500 status and HTML by default (per implementation)", async () => {
            const response = await send500();
            assert.equal(response.status, HTTP_STATUS_SERVER_ERROR);
            // Current implementation returns text/html for 500 even for plain text
            assert.equal(response.headers.get(HTTP_HEADER_CONTENT_TYPE), "text/html; charset=utf-8");
            assert.equal(response.headers.get(HTTP_HEADER_CACHE_CONTROL), "no-store");
            const body = await response.text();
            assert.equal(body, "Internal Server Error");
        });

        it("should strip body for HEAD requests", async () => {
            const request = new Request("http://localhost/any", { method: "HEAD" });
            const response = await send500(request);
            assert.equal(response.status, HTTP_STATUS_SERVER_ERROR);
            assert.equal(response.body, null);
        });

        it("should render custom 500 page", async () => {
            const render500Fn = async () => "<html><body>Custom 500</body></html>";
            const response = await send500(null, { renderCustom500: true, render500Fn });
            assert.equal(response.status, HTTP_STATUS_SERVER_ERROR);
            assert.equal(response.headers.get(HTTP_HEADER_CONTENT_TYPE), "text/html; charset=utf-8");
            const body = await response.text();
            assert.ok(body.includes("Custom 500"));
        });
    });

    describe("badRequestResponse", () => {
        it("should return 400 status", () => {
            const response = badRequestResponse();
            assert.equal(response.status, HTTP_STATUS_BAD_REQUEST);
        });
    });

    describe("uriTooLongResponse", () => {
        it("should return 414 status", () => {
            const response = uriTooLongResponse();
            assert.equal(response.status, HTTP_STATUS_URI_TOO_LONG);
        });
    });
});
