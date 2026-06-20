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
        const errorsCalled = [];

        const loadJsxModule = async () => {
            throw new Error("Load failed");
        };

        const { render404, render500 } = await loadErrorPages({
            resolve404Page: () => "/pages/404.jsx",
            resolve500Page: () => "/pages/500.jsx",
            loadJsxModule,
            onError: (err, page) => {
                errorsCalled.push({ message: err.message, page });
            },
        });

        assert.equal(render404, null);
        assert.equal(render500, null);
        assert.equal(errorsCalled.length, 2);
        assert.match(errorsCalled[0].message, /Load failed/);
        assert.equal(errorsCalled[0].page, "404");
        assert.match(errorsCalled[1].message, /Load failed/);
        assert.equal(errorsCalled[1].page, "500");
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

    test("extension precedence: .tsx takes precedence over .jsx", async () => {
        const mock404TsX = async () => "<html><body>404 TSX</body></html>";
        const mock500JsX = async () => "<html><body>500 JSX</body></html>";

        // Mock resolvers to simulate extension precedence
        // .tsx should take precedence over .jsx
        const mockResolve404Page = () => "/pages/404.tsx";
        const mockResolve500Page = () => "/pages/500.jsx";

        let callCount = 0;
        const loadJsxModule = async (path) => {
            callCount++;
            if (path === "/pages/404.tsx") return mock404TsX;
            if (path === "/pages/500.jsx") return mock500JsX;
            throw new Error(`Unexpected path: ${path}`);
        };

        const { render404, render500 } = await loadErrorPages({
            resolve404Page: mockResolve404Page,
            resolve500Page: mockResolve500Page,
            loadJsxModule,
        });

        assert.equal(render404, mock404TsX, "404 should load from .tsx path");
        assert.equal(render500, mock500JsX, "500 should load from .jsx path");
        assert.equal(callCount, 2, "Should load both pages");
    });

    // --- Production error redaction tests ---

    test("redactErrors: true - onError receives redacted messages", async () => {
        const errorsCalled = [];

        const loadJsxModule = async () => {
            throw new Error("Absolute path: /home/user/project/src/pages/404.jsx");
        };

        const { render404, render500 } = await loadErrorPages({
            resolve404Page: () => "/pages/404.jsx",
            resolve500Page: () => "/pages/500.jsx",
            loadJsxModule,
            redactErrors: true,
            onError: (err, page) => {
                errorsCalled.push({ message: err.message, page });
            },
        });

        assert.equal(render404, null);
        assert.equal(render500, null);
        assert.equal(errorsCalled.length, 2);

        // onError should receive redacted messages (no sensitive details)
        assert.equal(errorsCalled[0].message, "Failed to load custom 404 page");
        assert.equal(errorsCalled[1].message, "Failed to load custom 500 page");
    });

    test("redactErrors: false (default) - onError receives original error details", async () => {
        const errorsCalled = [];

        const loadJsxModule = async () => {
            throw new Error("Module not found: /home/user/project/node_modules/pkg/index.js");
        };

        const { render404, render500 } = await loadErrorPages({
            resolve404Page: () => "/pages/404.jsx",
            resolve500Page: () => "/pages/500.jsx",
            loadJsxModule,
            redactErrors: false,
            onError: (err, page) => {
                errorsCalled.push({ message: err.message, page });
            },
        });

        assert.equal(render404, null);
        assert.equal(render500, null);
        assert.equal(errorsCalled.length, 2);

        // onError should receive original error messages (not redacted)
        assert.match(errorsCalled[0].message, /Module not found/);
        assert.match(errorsCalled[1].message, /Module not found/);
    });

    test("redactErrors: true - onError callback receives redacted errors", async () => {
        const errorsCalled = [];

        const loadJsxModule = async () => {
            throw new Error("Sensitive stack trace: at Object.<anonymous> (/src/pages/404.jsx:10:5)");
        };

        await loadErrorPages({
            resolve404Page: () => "/pages/404.jsx",
            resolve500Page: () => "/pages/500.jsx",
            loadJsxModule,
            redactErrors: true,
            onError: (err, page) => {
                errorsCalled.push({ message: err.message, page });
            },
        });

        assert.equal(errorsCalled.length, 2);

        // onError should receive redacted messages (no sensitive details)
        assert.equal(errorsCalled[0].message, "Failed to load custom 404 page");
        assert.equal(errorsCalled[0].page, "404");
        assert.equal(errorsCalled[1].message, "Failed to load custom 500 page");
        assert.equal(errorsCalled[1].page, "500");
    });

    test("redactErrors: false - onError callback receives original errors", async () => {
        const errorsCalled = [];

        const loadJsxModule = async () => {
            throw new Error("Original error with sensitive data");
        };

        await loadErrorPages({
            resolve404Page: () => "/pages/404.jsx",
            resolve500Page: () => "/pages/500.jsx",
            loadJsxModule,
            redactErrors: false,
            onError: (err, page) => {
                errorsCalled.push({ message: err.message, page });
            },
        });

        assert.equal(errorsCalled.length, 2);

        // onError should receive original error messages
        assert.match(errorsCalled[0].message, /Original error with sensitive data/);
        assert.equal(errorsCalled[0].page, "404");
        assert.match(errorsCalled[1].message, /Original error with sensitive data/);
        assert.equal(errorsCalled[1].page, "500");
    });

    test("redactErrors: true - prevents path leakage in multi-page load", async () => {
        const errorsCalled = [];

        let _callCount = 0;
        const loadJsxModule = async (path) => {
            _callCount++;
            if (path === "/pages/404.jsx") {
                throw new Error("Cannot load /home/user/app/src/pages/404.jsx");
            }
            // 500 succeeds
            return async () => "<html><body>500</body></html>";
        };

        const { render404, render500 } = await loadErrorPages({
            resolve404Page: () => "/pages/404.jsx",
            resolve500Page: () => "/pages/500.jsx",
            loadJsxModule,
            redactErrors: true,
            onError: (err, page) => {
                errorsCalled.push({ message: err.message, page });
            },
        });

        assert.equal(render404, null);
        assert.ok(render500 !== null, "500 page should load successfully");
        assert.equal(errorsCalled.length, 1);

        // Only 404 error, message should be redacted
        assert.equal(errorsCalled[0].message, "Failed to load custom 404 page");
        assert.equal(errorsCalled[0].page, "404");
        // Message should NOT contain the path (redacted)
        assert.strictEqual(errorsCalled[0].message.includes("/home/user/app"), false);
    });
});
