/**
 * @fileoverview Tests for Bun dev server adapter.
 *
 * NOTE: This adapter uses immediate-execution pattern and cannot be tested
 * in Node.js environment (requires Bun runtime). Tests here verify the
 * module structure and exported utilities that can be tested.
 *
 * For full integration testing, use Bun test runner:
 *   bun test src/js/server/dev/bun.test.js
 *
 * Covers:
 * - Module loads without errors
 * - Helper functions (handleStaticRequest logic via shared static-handler)
 * - SSE stream construction patterns
 * - Middleware integration patterns
 */

import { ok, strictEqual } from "node:assert";
import { describe, test } from "node:test";

describe("Bun dev adapter - structure validation", () => {
    test("should use immediate-execution pattern (not factory)", async () => {
        // This test verifies the module exports nothing (side-effect only)
        // Actual module cannot be imported in Node.js (uses Bun.spawn, Bun.serve)

        // We validate the file exists and has correct structure markers
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");

        const content = await fs.readFile(modulePath, "utf-8");

        // Check for immediate-execution markers
        ok(content.includes("Bun.serve({"), "Should use Bun.serve() at module level");
        ok(content.includes("await runEsbuild()"), "Should await initial esbuild run");
        ok(content.includes("await reloadRoutesManifest"), "Should await initial route load");
        ok(!content.includes("export function createDevHandler"), "Should NOT export factory function");
        ok(!content.includes("export async function createDevHandler"), "Should NOT export async factory");
    });

    test("should use Web Standard APIs for middleware", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        // Middleware should use Web Standard Request/Response
        ok(content.includes("async function fetch(request)"), "Should use fetch API handler");
        ok(content.includes("new Response("), "Should use Web Standard Response");
        ok(content.includes("new ReadableStream("), "Should use ReadableStream for SSE");
    });

    test("should use Bun-specific APIs", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        // Check for Bun-specific APIs
        ok(content.includes("Bun.spawn("), "Should use Bun.spawn for esbuild");
        ok(content.includes("Bun.file("), "Should use Bun.file for static serving");
        ok(content.includes("Bun.serve({"), "Should use Bun.serve for HTTP server");
    });

    test("should use Node.js fs.watch for file watching", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        // Bun supports Node.js fs.watch
        ok(content.includes("fs.watch("), "Should use fs.watch for file watching");
        ok(content.includes("getAllDirs"), "Should recursively find all directories");
        ok(!content.includes("recursive: true"), "Should not use recursive option");
    });

    test("should import core utilities from core.js", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(
            content.includes('import { buildHotReplacePayload, debounce, reloadRoutesManifest } from "./core.js"'),
            "Should import core utilities",
        );
    });
});

describe("SSE implementation - pattern validation", () => {
    test("should use ReadableStream for SSE endpoint", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        // Check SSE implementation uses ReadableStream
        ok(content.includes("new ReadableStream({"), "Should create ReadableStream");
        ok(content.includes("async start(controller)"), "Should use controller in start callback");
        ok(content.includes("controller.enqueue("), "Should enqueue SSE messages");
        ok(content.includes("cancel()"), "Should implement cancel for cleanup");
    });

    test("should support SSE with hot-reload payload", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes('pathname === "/hot-replace"'), "Should handle /hot-replace endpoint");
        ok(content.includes("id: hot-replace"), "Should use SSE id field");
        ok(content.includes("data:"), "Should use SSE data field");
        ok(content.includes("retry: 250"), "Should set SSE retry interval");
    });

    test("should handle SSE client tracking", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("let sseClients = []"), "Should track SSE clients array");
        ok(content.includes("sseClients.push(client)"), "Should add clients to array");
        ok(content.includes("sseClients.filter("), "Should remove disconnected clients");
    });
});

describe("Static file serving - pattern validation", () => {
    test("should use Bun.file() for static serving", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("const handleStaticRequest = createStaticHandler"), "Should create static handler");
        ok(content.includes("Bun.file(abs)"), "Should use Bun.file()");
        ok(content.includes("await file.exists()"), "Should check file existence");
    });

    test("should include path traversal protection", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("!abs.startsWith(resolvedStaticDir)"), "Should check path prefix");
        ok(content.includes("Forbidden"), "Should return 403 for traversal attempts");
    });

    test("should include MIME type mapping", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("const mimeTypes ="), "Should define MIME types object");
        ok(content.includes('".html"'), "Should map .html");
        ok(content.includes('".css"'), "Should map .css");
        ok(content.includes('".js"'), "Should map .js");
    });
});

describe("Middleware integration - pattern validation", () => {
    test("should execute middleware before static files", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        // Find positions of middleware and static file code
        const middlewareIndex = content.indexOf("if (userMiddlewares.length)");
        const staticIndex = content.indexOf("if (/\\.\\w+$/.test(pathname))");

        ok(middlewareIndex > 0, "Should have middleware execution");
        ok(staticIndex > 0, "Should have static file serving");
        ok(middlewareIndex < staticIndex, "Middleware should execute before static files");
    });

    test("should support Web Standard middleware signature", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("await mw(request)"), "Should pass Web Standard Request to middleware");
        ok(content.includes("result instanceof Response"), "Should check for Response return");
    });
});

describe("esbuild integration - pattern validation", () => {
    test("should use Bun.spawn for esbuild", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("function runEsbuild(filename)"), "Should define runEsbuild function");
        ok(content.includes("Bun.spawn("), "Should use Bun.spawn");
        ok(content.includes("proc.stderr.getReader()"), "Should read stderr stream");
        ok(content.includes("proc.exited.then("), "Should wait for process exit");
    });

    test("should debounce esbuild runs", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("const debouncedEsbuild = debounce("), "Should debounce esbuild");
        ok(content.includes("250"), "Should use 250ms debounce delay");
    });
});

describe("Hot-reload broadcast - pattern validation", () => {
    test("should broadcast to all SSE clients on src changes", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("for (const client of sseClients)"), "Should iterate over clients");
        ok(content.includes("client.controller.enqueue("), "Should enqueue to each client stream");
        ok(content.includes("buildHotReplacePayload"), "Should create hot-replace payload");
    });

    test("should handle broadcast errors gracefully", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        const broadcastSection = content.substring(content.indexOf("for (const client of sseClients)"));
        ok(broadcastSection.includes("try {"), "Should wrap broadcast in try-catch");
        ok(broadcastSection.includes("catch"), "Should catch broadcast errors");
        ok(broadcastSection.includes("logger.error"), "Should log broadcast errors");
    });
});

describe("Custom error pages - pattern validation", () => {
    test("should support custom 404 page", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("resolve404Page()"), "Should resolve custom 404 page");
        ok(content.includes("const jsx404 = await loadJsxModuleUtil(special404"), "Should load 404 module");
        ok(content.includes("const page404 = await jsx404({})"), "Should render 404 page");
    });

    test("should support custom 500 page", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("resolve500Page()"), "Should resolve custom 500 page");
        ok(content.includes("const jsx500 = await loadJsxModuleUtil(special500"), "Should load 500 module");
        ok(content.includes("const page500 = await jsx500({ error: err })"), "Should pass error to 500 page");
    });

    test("should fallback to generic error on custom page failure", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        // Both 404 and 500 handlers should have try-catch with fallback
        const custom404Section = content.substring(content.indexOf("resolve404Page()"), content.indexOf('return new Response("Not found"'));
        ok(custom404Section.includes("try {"), "404 handler should have try block");
        ok(custom404Section.includes("catch"), "404 handler should catch errors");

        const custom500Section = content.substring(content.indexOf("resolve500Page()"), content.indexOf("renderErrorHtml(err)"));
        ok(custom500Section.includes("try {"), "500 handler should have try block");
        ok(custom500Section.includes("catch"), "500 handler should catch errors");
    });
});

describe("HEAD request handling - pattern validation", () => {
    test("should handle HEAD requests for all routes", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes('const isHead = request.method === "HEAD"'), "Should detect HEAD requests");
        ok(content.includes("if (isHead)"), "Should have HEAD-specific branches");
        ok(content.includes("return new Response(null,"), "Should return null body for HEAD");
    });
});

describe("File watching - pattern validation", () => {
    test("should watch src directory recursively", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("getAllDirs(resolvedSrcDir)"), "Should get all directories recursively");
        ok(content.includes("for (const d of allDirs)"), "Should watch each directory individually");
        ok(content.includes("fs.watch(d,"), "Should use fs.watch on each directory");
    });

    test("should handle watcher errors gracefully", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        const watcherStart = content.indexOf("// --- Set up file watcher ---");
        strictEqual(watcherStart > 0, true, "Should find file watcher section");

        ok(content.includes("try {"), "Should wrap each fs.watch in try-catch");
        ok(content.includes("catch (err)"), "Should catch watcher errors");
        ok(content.includes("logger.warn("), "Should log watcher warnings");
        ok(!content.includes("setupBunWatchFallback"), "Should not fall back to Bun.watch");
    });
});

describe("Module cache busting - pattern validation", () => {
    test("should use Bun-specific module loader with data URL cache busting", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        // Bun adapter uses its own loadJsxModuleBun that reads file content via Bun.file()
        // and imports via data URL to bypass Bun's aggressive ESM module caching
        ok(content.includes("async function loadJsxModuleBun("), "Should define Bun-specific module loader");
        ok(content.includes("Bun.file(modulePath)"), "Should use Bun.file() to read module content");
        ok(content.includes("data:text/javascript;base64,"), "Should use data URL for import");

        // Should use loadJsxModuleBun instead of loadJsxModuleUtil
        const loadModuleCalls = content.match(/loadJsxModuleBun\([^)]+\)/g) || [];
        ok(loadModuleCalls.length >= 5, `Should call loadJsxModuleBun at least 5 times, found ${loadModuleCalls.length}`);

        // Should NOT use loadJsxModuleUtil (the shared utility that doesn't work well with Bun's caching)
        ok(!content.includes("loadJsxModuleUtil("), "Should not use loadJsxModuleUtil, use Bun-specific loader instead");
    });

    test("should clear module cache on reload", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("async function reloadAllModules()"), "Should define reloadAllModules");
        ok(content.includes("jsxModules.clear()"), "Should clear module cache");
    });
});

describe("CSS injection - pattern validation", () => {
    test("should inject CSS assets into HTML", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("if (route?.assets?.css && isHtml)"), "Should check for CSS assets");
        ok(content.includes("page = injectCss("), "Should call injectCss utility");
    });

    test("should inject hot-reload script before </head>", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("const hotReplaceScript ="), "Should define hot-reload script");
        ok(content.includes('import { hotReplace } from "/hot-replace.js"'), "Should import hotReplace");
        ok(content.includes("page.replace(/<\\/head>/i"), "Should replace </head> tag");
    });
});
