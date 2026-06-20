/**
 * @fileoverview Coverage-specific tests for core-handler.js.
 */

import { strictEqual } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { createDevHandler } from "./core-handler.js";

describe("core-handler.js coverage", () => {
    const mockLogger = { info: () => {}, error: () => {}, warn: () => {} };
    const mockGetRoutes = () => [{ path: "/", jsx: "index.jsx" }];
    const mockLoadJsxModule = async () => () => "<html><body>OK</body></html>";
    const mockGetEsbuildError = () => "";
    const mockReadFile = async () => "content";

    let handler;

    beforeEach(() => {
        handler = createDevHandler({
            getRoutes: mockGetRoutes,
            loadJsxModule: mockLoadJsxModule,
            publicPath: "/",
            getEsbuildError: mockGetEsbuildError,
            hotReplaceClientPath: "/hot.js",
            readFile: mockReadFile,
            logger: mockLogger,
        });
    });

    it("should handle successful SSR request", async () => {
        const request = new Request("http://localhost:3000/");
        const response = await handler(request);
        strictEqual(response.status, 200);
        const text = await response.text();
        strictEqual(text.includes("OK"), true);
    });

    it("should return 400 for malformed URI component", async () => {
        // Trigger decodeURIComponentSafe catch block in core-handler.js
        const request = new Request("http://localhost:3000/test%");
        const response = await handler(request);
        strictEqual(response.status, 400);
    });

    it("should return 400 for invalid parameters in route match", async () => {
        handler = createDevHandler({
            getRoutes: () => [{ path: "blog/[slug]", jsx: "blog.jsx" }],
            loadJsxModule: mockLoadJsxModule,
            publicPath: "/",
            getEsbuildError: mockGetEsbuildError,
            hotReplaceClientPath: "/hot.js",
            readFile: mockReadFile,
            logger: mockLogger,
        });

        // Using a space in the slug should fail SLUG_REGEX and return {invalid: true}
        const request = new Request("http://localhost:3000/blog/%20");
        const response = await handler(request);
        strictEqual(response.status, 400);
        strictEqual(await response.text(), "Invalid parameters");
    });
});
