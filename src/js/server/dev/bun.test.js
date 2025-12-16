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
        ok(content.includes("await runEsbuild({"), "Should await initial esbuild run with config object");
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
        ok(content.includes("async fetch(request)"), "Should use fetch API handler");
        ok(content.includes("return handler(request)"), "Should delegate to shared handler");
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

        // Bun supports Node.js fs.watch with recursive option
        ok(content.includes("fs.watch("), "Should use fs.watch for file watching");
        ok(content.includes("recursive: true"), "Should use recursive option");
    });

    test("should import core utilities from core.js", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes('from "./core.js"'), "Should import core utilities from core.js");
        ok(content.includes("debounce"), "Should import debounce");
        ok(content.includes("runEsbuild"), "Should import runEsbuild");
        ok(content.includes("reloadRoutesManifest"), "Should import reloadRoutesManifest");
    });
});

describe("Handler delegation - pattern validation", () => {
    test("should delegate SSE and hot-reload to shared handler", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        // SSE implementation is now in core-handler.js, bun.js just delegates
        ok(content.includes("createDevHandler"), "Should use shared createDevHandler");
        ok(content.includes("return handler(request)"), "Should delegate to shared handler");
    });

    test("should provide hot-reload client path to handler", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("hotReplaceClientPath"), "Should define hot-replace client path");
        ok(content.includes("../hot-replace.client.js"), "Should resolve shared hot-replace client script path");
    });

    test("should call broadcastReload on file changes", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("handler.broadcastReload"), "Should call handler's broadcastReload method");
        ok(content.includes("await handler.broadcastReload(reloadFilesJson)"), "Should pass reload callback");
    });
});

describe("Static file serving - pattern validation", () => {
    test("should use shared static handler with Bun file reader", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("const handleStaticRequest = createStaticHandler"), "Should create static handler");
        ok(content.includes("bunFileReader"), "Should use Bun-specific file reader");
        ok(content.includes("skipCompression: true"), "Should skip compression in dev");
    });

    test("should check for file extensions before serving static files", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("hasFileExtension(pathname)"), "Should check for file extension");
        ok(content.includes("await handleStaticRequest(request)"), "Should call static handler");
    });
});

describe("Middleware integration - pattern validation", () => {
    test("should load user-defined middlewares", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("loadUserDefinedMiddlewares"), "Should load user middleware");
        ok(content.includes("let userMiddlewares ="), "Should store middleware reference");
    });

    test("should provide middleware getter to handler", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("getMiddleware: () => userMiddlewares"), "Should provide middleware getter");
    });

    test("should reload middleware on file changes", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("debouncedReloadMiddleware"), "Should debounce middleware reload");
        ok(content.includes("isMiddlewareFile(filename)"), "Should check if changed file is middleware");
    });
});

describe("esbuild integration - pattern validation", () => {
    test("should define platform-specific esbuild spawner", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("const spawnEsbuild = async ()"), "Should define spawnEsbuild function");
        ok(content.includes("Bun.spawn("), "Should use Bun.spawn");
        ok(content.includes("proc.stderr.getReader()"), "Should read stderr stream");
        ok(content.includes("proc.exited.then("), "Should wait for process exit");
    });

    test("should call runEsbuild from core with spawner", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("await runEsbuild({"), "Should call runEsbuild with config object");
        ok(content.includes("spawnEsbuild"), "Should pass spawnEsbuild function");
    });

    test("should debounce esbuild runs on file changes", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("const debouncedEsbuild = debounce("), "Should debounce esbuild");
        ok(content.includes("250"), "Should use 250ms debounce delay");
    });
});

describe("Hot-reload broadcast - pattern validation", () => {
    test("should trigger broadcast on file changes", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("await handler.broadcastReload"), "Should call handler's broadcastReload");
        ok(content.includes("reloadFilesJson"), "Should pass reload callback");
    });
});

describe("Custom error pages - pattern validation", () => {
    test("should provide error page resolvers to handler", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("resolve404Page"), "Should pass resolve404Page to handler");
        ok(content.includes("resolve500Page"), "Should pass resolve500Page to handler");
    });
});

describe("Request handling - pattern validation", () => {
    test("should delegate request handling to shared handler", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        // HEAD and other request methods are handled by core-handler
        ok(content.includes("return handler(request)"), "Should delegate to shared handler");
    });
});

describe("File watching - pattern validation", () => {
    test("should watch src directory recursively", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("fs.watch(resolvedSrcDir"), "Should watch src directory");
        ok(content.includes("recursive: true"), "Should use recursive option");
    });

    test("should handle watcher errors gracefully", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        const watcherStart = content.indexOf("// --- Set up file watcher ---");
        strictEqual(watcherStart > 0, true, "Should find file watcher section");

        ok(content.includes("try {"), "Should wrap fs.watch in try-catch");
        ok(content.includes("catch (err)"), "Should catch watcher errors");
        ok(content.includes("logger.warn("), "Should log watcher warnings");
    });
});

describe("Module cache busting - pattern validation", () => {
    test("should use shared module loader with standard dynamic imports", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        // Bun adapter uses shared module-loader.js with standard dynamic imports.
        // Cache busting is handled via query strings by the module-loader.
        ok(content.includes("importer: (url) => import(url)"), "Should use inline arrow function for importer");

        // Should NOT use file:// URL pattern
        ok(!content.includes("file://${"), "Should NOT use file:// protocol");

        // Should NOT use blob URL pattern (old implementation)
        ok(!content.includes("new Blob([content]"), "Should NOT use Blob pattern");
        ok(!content.includes("URL.createObjectURL"), "Should NOT use createObjectURL");
        ok(!content.includes("URL.revokeObjectURL"), "Should NOT use revokeObjectURL");

        // Should use shared loadAllModules with inline importer
        ok(content.includes("loadAllModules(routes, {"), "Should use shared loadAllModules");
        ok(content.includes("bustCache: true"), "Should enable cache busting");

        // Should provide loadJsxModuleShared to handler with inline importer
        ok(content.includes("loadJsxModule: (jsxPath) =>"), "Should pass loader to handler");
        ok(content.includes("loadJsxModuleShared(jsxPath, {"), "Should use shared loadJsxModuleShared");
    });

    test("should use shared module cache with loadAllModules", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        // Module cache management is now handled by shared loadAllModules
        ok(content.includes("const jsxModules = new Map()"), "Should define module cache Map");
        ok(content.includes("cache: jsxModules"), "Should pass cache to loadAllModules");
        ok(content.includes("returnErrorStub: true"), "Should use error stubs on load failure");
    });
});

describe("Handler configuration - pattern validation", () => {
    test("should configure handler with all required callbacks", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "bun.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("const handler = createDevHandler({"), "Should create handler with config");
        ok(content.includes("getRoutes: () => routes"), "Should provide getRoutes");
        ok(content.includes("loadJsxModule:"), "Should provide loadJsxModule");
        ok(content.includes("publicPath"), "Should provide publicPath");
        ok(content.includes("getEsbuildError: () => esbuildError"), "Should provide getEsbuildError");
        ok(content.includes("hotReplaceClientPath"), "Should provide hotReplaceClientPath");
        ok(content.includes("readFile:"), "Should provide readFile");
        ok(content.includes("getMiddleware: () => userMiddlewares"), "Should provide getMiddleware");
        ok(content.includes("resolve404Page"), "Should provide resolve404Page");
        ok(content.includes("resolve500Page"), "Should provide resolve500Page");
        ok(content.includes("logger"), "Should provide logger");
    });
});
