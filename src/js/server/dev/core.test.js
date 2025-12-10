/**
 * @fileoverview Tests for platform-agnostic dev server core utilities.
 *
 * Covers:
 * - debounce() timing and cancellation behavior
 * - reloadRoutesManifest() with retry logic
 * - extractBodyFromHtml() body content extraction
 * - buildHotReplacePayload() SSE payload building
 * - getWatcherErrorHandler() graceful error handling
 */

import { deepStrictEqual, ok, rejects, strictEqual } from "node:assert";
import fsp from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";

// These imports will fail initially (RED phase) until implementation exists
import { buildHotReplacePayload, debounce, extractBodyFromHtml, getWatcherErrorHandler, reloadRoutesManifest } from "./core.js";

// --- debounce() tests ---

describe("debounce", () => {
    describe("timing behavior", () => {
        test("should delay function execution by specified milliseconds", async () => {
            // Arrange
            let callCount = 0;
            const fn = () => {
                callCount++;
            };
            const debounced = debounce(fn, 50);

            // Act
            debounced();

            // Assert - should not have been called immediately
            strictEqual(callCount, 0, "Function should not be called immediately");

            // Wait for delay
            await new Promise((resolve) => setTimeout(resolve, 60));
            strictEqual(callCount, 1, "Function should be called after delay");
        });

        test("should cancel previous timer when called multiple times within delay", async () => {
            // Arrange
            let callCount = 0;
            const fn = () => {
                callCount++;
            };
            const debounced = debounce(fn, 50);

            // Act - call multiple times rapidly
            debounced();
            debounced();
            debounced();

            // Assert - wait for delay and check only called once
            await new Promise((resolve) => setTimeout(resolve, 60));
            strictEqual(callCount, 1, "Function should only be called once after multiple rapid calls");
        });

        test("should pass all arguments to debounced function", async () => {
            // Arrange
            let receivedArgs = null;
            const fn = (...args) => {
                receivedArgs = args;
            };
            const debounced = debounce(fn, 20);

            // Act
            debounced("arg1", "arg2", 123);

            // Wait for execution
            await new Promise((resolve) => setTimeout(resolve, 30));

            // Assert
            deepStrictEqual(receivedArgs, ["arg1", "arg2", 123]);
        });

        test("should handle async functions correctly", async () => {
            // Arrange
            let resolved = false;
            const asyncFn = async () => {
                await new Promise((resolve) => setTimeout(resolve, 10));
                resolved = true;
            };
            const debounced = debounce(asyncFn, 20);

            // Act
            debounced();

            // Assert - async function should complete
            await new Promise((resolve) => setTimeout(resolve, 50));
            strictEqual(resolved, true, "Async function should complete execution");
        });
    });
});

// --- reloadRoutesManifest() tests ---

describe("reloadRoutesManifest", () => {
    let tempDir;
    let routesPath;

    beforeEach(async () => {
        // Create temp directory for test fixtures
        tempDir = await fsp.mkdtemp(path.join("/tmp", "core-test-"));
        routesPath = path.join(tempDir, "routes.json");
    });

    afterEach(async () => {
        // Cleanup temp directory
        await fsp.rm(tempDir, { recursive: true, force: true });
    });

    test("should parse valid routes.json on first attempt", async () => {
        // Arrange
        const routes = [
            { path: "", jsx: "dist/server/index.js" },
            { path: "about", jsx: "dist/server/about.js" },
        ];
        await fsp.writeFile(routesPath, JSON.stringify(routes), "utf-8");

        // Act
        const result = await reloadRoutesManifest(routesPath);

        // Assert
        deepStrictEqual(result, routes);
    });

    test("should retry up to 3 times on parse errors", async () => {
        // Arrange - write invalid JSON initially
        await fsp.writeFile(routesPath, "not valid json", "utf-8");

        // Write valid JSON after a delay (simulating file being written)
        setTimeout(async () => {
            const routes = [{ path: "", jsx: "index.js" }];
            await fsp.writeFile(routesPath, JSON.stringify(routes), "utf-8");
        }, 150);

        // Act
        const result = await reloadRoutesManifest(routesPath, { retries: 3 });

        // Assert - should have successfully parsed after retry
        deepStrictEqual(result, [{ path: "", jsx: "index.js" }]);
    });

    test("should throw after exhausting retries on persistent parse errors", async () => {
        // Arrange - write invalid JSON that won't be fixed
        await fsp.writeFile(routesPath, "{ invalid json }", "utf-8");

        // Act & Assert
        await rejects(async () => reloadRoutesManifest(routesPath, { retries: 2 }), /Failed to load routes after 2 attempts/);
    });

    test("should return parsed routes array on success", async () => {
        // Arrange
        const routes = [{ path: "test", jsx: "test.js", assets: { css: [], js: [] } }];
        await fsp.writeFile(routesPath, JSON.stringify(routes), "utf-8");

        // Act
        const result = await reloadRoutesManifest(routesPath);

        // Assert
        ok(Array.isArray(result), "Result should be an array");
        strictEqual(result.length, 1);
        strictEqual(result[0].path, "test");
    });
});

// --- extractBodyFromHtml() tests ---

describe("extractBodyFromHtml", () => {
    test("should extract content between <body> and </body> tags", () => {
        // Arrange
        const html = "<html><head></head><body><div>Hello World</div></body></html>";

        // Act
        const result = extractBodyFromHtml(html);

        // Assert
        strictEqual(result, "<div>Hello World</div>");
    });

    test("should handle case-insensitive tags", () => {
        // Arrange
        const htmlUpper = "<HTML><HEAD></HEAD><BODY><p>Content</p></BODY></HTML>";
        const htmlMixed = "<html><head></head><Body><span>Mixed</span></Body></html>";

        // Act
        const resultUpper = extractBodyFromHtml(htmlUpper);
        const resultMixed = extractBodyFromHtml(htmlMixed);

        // Assert
        strictEqual(resultUpper, "<p>Content</p>");
        strictEqual(resultMixed, "<span>Mixed</span>");
    });

    test("should preserve inner HTML exactly including whitespace and nested tags", () => {
        // Arrange
        const html = `<html><body>
    <div class="wrapper">
        <h1>Title</h1>
        <p>Paragraph</p>
    </div>
</body></html>`;

        // Act
        const result = extractBodyFromHtml(html);

        // Assert
        ok(result.includes('<div class="wrapper">'), "Should preserve class attribute");
        ok(result.includes("<h1>Title</h1>"), "Should preserve nested tags");
        ok(result.includes("    "), "Should preserve whitespace");
    });

    test("should return empty string if no body tags found", () => {
        // Arrange
        const html = "<html><head><title>No Body</title></head></html>";

        // Act
        const result = extractBodyFromHtml(html);

        // Assert
        strictEqual(result, "");
    });

    test("should handle body with attributes", () => {
        // Arrange
        const html = '<html><body class="dark" data-theme="night"><main>Content</main></body></html>';

        // Act
        const result = extractBodyFromHtml(html);

        // Assert
        strictEqual(result, "<main>Content</main>");
    });
});

// --- buildHotReplacePayload() tests ---

describe("buildHotReplacePayload", () => {
    test("should return JSON string with body, assets, publicPath keys", async () => {
        // Arrange
        const route = {
            jsx: "test.js",
            assets: { css: ["style.css"], js: ["main.js"] },
        };
        const params = {};
        const jsxFn = async () => "<html><body><p>Test</p></body></html>";
        const publicPath = "/";

        // Act
        const result = await buildHotReplacePayload({ route, params, jsxFn, publicPath });
        const parsed = JSON.parse(result);

        // Assert
        ok("body" in parsed, "Should have body key");
        ok("assets" in parsed, "Should have assets key");
        ok("publicPath" in parsed, "Should have publicPath key");
    });

    test("should include css and js arrays from route.assets", async () => {
        // Arrange
        const route = {
            jsx: "test.js",
            assets: { css: ["a.css", "b.css"], js: ["x.js"] },
        };
        const jsxFn = async () => "<html><body>Content</body></html>";

        // Act
        const result = await buildHotReplacePayload({
            route,
            params: {},
            jsxFn,
            publicPath: "/",
        });
        const parsed = JSON.parse(result);

        // Assert
        deepStrictEqual(parsed.assets.css, ["a.css", "b.css"]);
        deepStrictEqual(parsed.assets.js, ["x.js"]);
    });

    test("should normalize publicPath preserving empty string", async () => {
        // Arrange
        const route = { jsx: "test.js", assets: { css: [], js: [] } };
        const jsxFn = async () => "<html><body></body></html>";

        // Act - empty string publicPath
        const resultEmpty = await buildHotReplacePayload({
            route,
            params: {},
            jsxFn,
            publicPath: "",
        });
        const parsedEmpty = JSON.parse(resultEmpty);

        // Act - non-empty publicPath
        const resultPath = await buildHotReplacePayload({
            route,
            params: {},
            jsxFn,
            publicPath: "/static",
        });
        const parsedPath = JSON.parse(resultPath);

        // Assert
        strictEqual(parsedEmpty.publicPath, "", "Empty string should be preserved");
        ok(parsedPath.publicPath.endsWith("/"), "Non-empty path should end with trailing slash");
    });

    test("should extract body from HTML if route module returns full document", async () => {
        // Arrange
        const route = { jsx: "test.js", assets: { css: [], js: [] } };
        const jsxFn = async () => '<html><head></head><body><div id="app">App Content</div></body></html>';

        // Act
        const result = await buildHotReplacePayload({
            route,
            params: {},
            jsxFn,
            publicPath: "/",
        });
        const parsed = JSON.parse(result);

        // Assert
        strictEqual(parsed.body, '<div id="app">App Content</div>');
    });

    test("should handle routes without assets gracefully", async () => {
        // Arrange
        const route = { jsx: "test.js" }; // No assets property
        const jsxFn = async () => "<html><body>Content</body></html>";

        // Act
        const result = await buildHotReplacePayload({
            route,
            params: {},
            jsxFn,
            publicPath: "/",
        });
        const parsed = JSON.parse(result);

        // Assert
        deepStrictEqual(parsed.assets.css, []);
        deepStrictEqual(parsed.assets.js, []);
    });
});

// --- getWatcherErrorHandler() tests ---

describe("getWatcherErrorHandler", () => {
    test("should return a function that accepts an Error", () => {
        // Arrange
        const mockLogger = { warn: () => {} };

        // Act
        const handler = getWatcherErrorHandler("src", mockLogger);

        // Assert
        strictEqual(typeof handler, "function");
    });

    test("should log warning message with context on error", () => {
        // Arrange
        let loggedMessage = null;
        const mockLogger = {
            warn: (msg) => {
                loggedMessage = msg;
            },
        };
        const handler = getWatcherErrorHandler("src directory", mockLogger);
        const error = new Error("ENOSPC: System limit reached");

        // Act
        handler(error);

        // Assert
        ok(loggedMessage, "Should have logged a message");
        ok(loggedMessage.includes("src directory"), "Should include context");
        ok(loggedMessage.includes("ENOSPC"), "Should include error message");
    });

    test("should not throw or crash when called", () => {
        // Arrange
        const mockLogger = { warn: () => {} };
        const handler = getWatcherErrorHandler("test", mockLogger);
        const error = new Error("Some error");

        // Act & Assert - should not throw
        handler(error);
        ok(true, "Handler should not throw");
    });

    test("should include error message in log output", () => {
        // Arrange
        let loggedMessage = null;
        const mockLogger = {
            warn: (msg) => {
                loggedMessage = msg;
            },
        };
        const handler = getWatcherErrorHandler("dist", mockLogger);
        const error = new Error("EMFILE: too many open files");

        // Act
        handler(error);

        // Assert
        ok(loggedMessage.includes("EMFILE: too many open files"));
    });

    test("should indicate hot-reload may be degraded", () => {
        // Arrange
        let loggedMessage = null;
        const mockLogger = {
            warn: (msg) => {
                loggedMessage = msg;
            },
        };
        const handler = getWatcherErrorHandler("src", mockLogger);

        // Act
        handler(new Error("Watch error"));

        // Assert
        ok(
            loggedMessage.toLowerCase().includes("hot-reload") ||
                loggedMessage.toLowerCase().includes("degraded") ||
                loggedMessage.toLowerCase().includes("watcher"),
            "Should indicate watcher/hot-reload issue",
        );
    });
});
