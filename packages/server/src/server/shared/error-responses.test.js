import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { send404 } from "./error-responses.js";

describe("custom error responses", () => {
    it("adds a doctype and injects assets into rendered HTML", async () => {
        const response = await send404(null, {
            renderCustom404: true,
            render404Fn: async () => "<html><head></head><body></body></html>",
            assets: { css: ["style.css"], js: ["app.js"] },
            publicPath: "/public",
        });

        const body = await response.text();
        assert.equal(response.status, 404);
        assert.ok(body.startsWith("<!doctype html>\n<html>"));
        assert.ok(body.includes('href="/public/style.css"'));
        assert.ok(body.includes('src="/public/app.js"'));
    });

    it("falls back to the standard response when custom rendering fails", async () => {
        const response = await send404(null, {
            renderCustom404: true,
            render404Fn: async () => {
                throw new Error("render failed");
            },
            securityHeaders: { "X-Test": "present" },
        });

        const body = await response.text();
        assert.equal(response.status, 404);
        assert.ok(body.includes("<title>Not Found</title>"));
        assert.equal(response.headers.get("X-Test"), "present");
    });
});
