/**
 * @fileoverview Tests for error-pages-loader module.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { loadErrorPages } from "./error-pages-loader.js";

describe("loadErrorPages", () => {
    test("loads both 404 and 500 pages successfully", async () => {
        const mock404 = async () => "<html><body>404</body></html>";
        const mock500 = async () => "<html><body>500</body></html>";

        const loadJsxModule = async (path) => {
            if (path === "/pages/404.jsx") return mock404;
            if (path === "/pages/500.jsx") return mock500;
            throw new Error("Not found");
        };

        const { render404, render500 } = await loadErrorPages({
            resolve404Page: () => "/pages/404.jsx",
            resolve500Page: () => "/pages/500.jsx",
            loadJsxModule,
        });

        assert.equal(render404, mock404);
        assert.equal(render500, mock500);
    });

    test("returns null when pages don't exist", async () => {
        const { render404, render500 } = await loadErrorPages({
            resolve404Page: () => null,
            resolve500Page: () => null,
            loadJsxModule: async () => {
                throw new Error("Should not be called");
            },
        });

        assert.equal(render404, null);
        assert.equal(render500, null);
    });

    test("logs errors when page loading fails", async () => {
        const errors = [];

        const logger = {
            error: (data, msg) => {
                errors.push({ data, msg });
            },
        };

        const loadJsxModule = async () => {
            throw new Error("Load failed");
        };

        const { render404, render500 } = await loadErrorPages({
            resolve404Page: () => "/pages/404.jsx",
            resolve500Page: () => "/pages/500.jsx",
            loadJsxModule,
            logger,
        });

        assert.equal(render404, null);
        assert.equal(render500, null);
        assert.equal(errors.length, 2);
        assert.match(errors[0].msg, /Failed to load custom 404 page/);
        assert.match(errors[1].msg, /Failed to load custom 500 page/);
    });

    test("continues on partial failure (one page fails, other succeeds)", async () => {
        const mock500 = async () => "<html><body>500</body></html>";

        const loadJsxModule = async (path) => {
            if (path === "/pages/404.jsx") {
                throw new Error("404 load failed");
            }
            if (path === "/pages/500.jsx") {
                return mock500;
            }
            throw new Error("Not found");
        };

        const { render404, render500 } = await loadErrorPages({
            resolve404Page: () => "/pages/404.jsx",
            resolve500Page: () => "/pages/500.jsx",
            loadJsxModule,
        });

        assert.equal(render404, null);
        assert.equal(render500, mock500);
    });

    test("calls onError callback when loading fails", async () => {
        const errorsCalled = [];

        const loadJsxModule = async () => {
            throw new Error("Load failed");
        };

        await loadErrorPages({
            resolve404Page: () => "/pages/404.jsx",
            resolve500Page: () => "/pages/500.jsx",
            loadJsxModule,
            onError: (err, page) => {
                errorsCalled.push({ message: err.message, page });
            },
        });

        assert.equal(errorsCalled.length, 2);
        assert.equal(errorsCalled[0].message, "Load failed");
        assert.equal(errorsCalled[0].page, "404");
        assert.equal(errorsCalled[1].message, "Load failed");
        assert.equal(errorsCalled[1].page, "500");
    });

    test("works without logger (no crash)", async () => {
        const loadJsxModule = async () => {
            throw new Error("Load failed");
        };

        const { render404, render500 } = await loadErrorPages({
            resolve404Page: () => "/pages/404.jsx",
            resolve500Page: () => "/pages/500.jsx",
            loadJsxModule,
            // No logger provided
        });

        assert.equal(render404, null);
        assert.equal(render500, null);
    });

    test("loads only 404 when 500 path is null", async () => {
        const mock404 = async () => "<html><body>404</body></html>";

        const loadJsxModule = async (path) => {
            if (path === "/pages/404.jsx") return mock404;
            throw new Error("Not found");
        };

        const { render404, render500 } = await loadErrorPages({
            resolve404Page: () => "/pages/404.jsx",
            resolve500Page: () => null,
            loadJsxModule,
        });

        assert.equal(render404, mock404);
        assert.equal(render500, null);
    });

    test("loads only 500 when 404 path is null", async () => {
        const mock500 = async () => "<html><body>500</body></html>";

        const loadJsxModule = async (path) => {
            if (path === "/pages/500.jsx") return mock500;
            throw new Error("Not found");
        };

        const { render404, render500 } = await loadErrorPages({
            resolve404Page: () => null,
            resolve500Page: () => "/pages/500.jsx",
            loadJsxModule,
        });

        assert.equal(render404, null);
        assert.equal(render500, mock500);
    });
});
