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
        it("should return 404 status and HTML by default", async () => {
            const response = await send404();
            assert.equal(response.status, HTTP_STATUS_NOT_FOUND);
            assert.equal(response.headers.get(HTTP_HEADER_CONTENT_TYPE), "text/html; charset=utf-8");
            assert.equal(response.headers.get(HTTP_HEADER_CACHE_CONTROL), "public, max-age=0, must-revalidate");
            const body = await response.text();
            assert.ok(body.includes("<title>Not Found</title>"));
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
            assert.equal(
                body,
                '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>Internal Server Error</title></head><body><h1>Internal Server Error</h1><p>The server encountered an internal error.</p></body></html>',
            );
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
        it("should return 400 status and HTML by default", async () => {
            const response = badRequestResponse();
            assert.equal(response.status, HTTP_STATUS_BAD_REQUEST);
            assert.equal(response.headers.get(HTTP_HEADER_CONTENT_TYPE), "text/html; charset=utf-8");
            const body = await response.text();
            assert.ok(body.includes("<title>Bad Request</title>"));
        });

        it("should support custom message with HTML response", async () => {
            const response = badRequestResponse(null, { message: "Custom error" });
            assert.equal(response.status, HTTP_STATUS_BAD_REQUEST);
            assert.equal(response.headers.get(HTTP_HEADER_CONTENT_TYPE), "text/html; charset=utf-8");
            const body = await response.text();
            assert.ok(body.includes("Custom error"));
        });

        it("should escape HTML in custom message to prevent XSS", async () => {
            const response = badRequestResponse(null, { message: "<script>alert(1)</script>" });
            assert.equal(response.status, HTTP_STATUS_BAD_REQUEST);
            assert.equal(response.headers.get(HTTP_HEADER_CONTENT_TYPE), "text/html; charset=utf-8");
            const body = await response.text();
            assert.ok(body.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
            assert.ok(!body.includes("<script>"));
        });

        it("should strip body for HEAD requests", async () => {
            const request = new Request("http://test", { method: "HEAD" });
            const response = badRequestResponse(request, { message: "Bad Request" });
            assert.equal(response.status, HTTP_STATUS_BAD_REQUEST);
            assert.equal(response.body, null);
        });
    });

    describe("uriTooLongResponse", () => {
        it("should return 414 status and HTML by default", async () => {
            const response = uriTooLongResponse();
            assert.equal(response.status, HTTP_STATUS_URI_TOO_LONG);
            assert.equal(response.headers.get(HTTP_HEADER_CONTENT_TYPE), "text/html; charset=utf-8");
            const body = await response.text();
            assert.ok(body.includes("<title>URI Too Long</title>"));
        });

        it("should strip body for HEAD requests", async () => {
            const request = new Request("http://test", { method: "HEAD" });
            const response = uriTooLongResponse(request);
            assert.equal(response.status, HTTP_STATUS_URI_TOO_LONG);
            assert.equal(response.body, null);
        });
    });
});
