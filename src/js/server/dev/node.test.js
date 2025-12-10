/**
 * @fileoverview Tests for Node.js dev server adapter.
 *
 * NOTE: This adapter uses immediate-execution pattern and cannot be tested
 * via import in Node.js (importing would start a server). Tests here verify
 * the module structure and implementation patterns.
 *
 * Covers:
 * - Module structure validation
 * - Node.js-specific API usage
 * - SSE endpoint implementation
 * - File watching patterns
 * - Middleware integration
 * - Static file serving
 * - Hot-reload injection
 */

import { ok, strictEqual } from "node:assert";
import { describe, test } from "node:test";

describe("Node.js dev adapter - structure validation", () => {
    test("should use immediate-execution pattern (not factory)", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "node.js");

        const content = await fs.readFile(modulePath, "utf-8");

        // Check for immediate-execution markers
        ok(content.includes("server.listen(port,"), "Should call server.listen() at module level");
        ok(content.includes("await runEsbuild()"), "Should await initial esbuild run");
        ok(content.includes("await reloadRoutesManifest"), "Should await initial route load");
        ok(!content.includes("export function createDevHandler"), "Should NOT export factory function");
        ok(!content.includes("export async function createDevHandler"), "Should NOT export async factory");
    });

    test("should use Node.js http.createServer", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "node.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes('import http from "node:http"'), "Should import http module");
        ok(content.includes("http.createServer("), "Should use http.createServer");
    });

    test("should use Node.js child_process.spawn for esbuild", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "node.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes('import { spawn } from "node:child_process"'), "Should import spawn");
        ok(content.includes("spawn(process.execPath"), "Should use spawn for esbuild");
    });

    test("should use Node.js fs.watch for file watching", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "node.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("fs.watch("), "Should use fs.watch for file watching");
        ok(content.includes("recursive: true"), "Should enable recursive watching");
    });

    test("should import core utilities from core.js", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "node.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(
            content.includes('import { getWatcherErrorHandler, debounce, reloadRoutesManifest } from "./core.js"'),
            "Should import core utilities",
        );
    });
});

describe("SSE implementation - pattern validation", () => {
    test("should use Node.js res.write for SSE endpoint", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "node.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes('if (pathname === "/hot-replace" && href)'), "Should handle /hot-replace endpoint");
        ok(content.includes("res.writeHead(200, sseHeaders)"), "Should write SSE headers");
        ok(content.includes("res.write("), "Should use res.write for SSE messages");
    });

    test("should support SSE with hot-reload payload", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "node.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("id: hot-replace"), "Should use SSE id field");
        ok(content.includes("data:"), "Should use SSE data field");
        ok(content.includes("retry: 250"), "Should set SSE retry interval");
    });

    test("should handle SSE client tracking", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "node.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("let sseClients = []"), "Should track SSE clients array");
        ok(content.includes("sseClients.push(client)"), "Should add clients to array");
        ok(content.includes("sseClients.filter("), "Should remove disconnected clients");
    });

    test("should handle client disconnection with req.on('close')", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "node.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes('req.on("close"'), "Should listen for close event");
    });
});

describe("Static file serving - pattern validation", () => {
    test("should use createStaticHandler() from shared/static-handler", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "node.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes('from "../shared/static-handler.js"'), "Should import from shared/static-handler");
        ok(content.includes("createStaticHandler"), "Should import createStaticHandler utility");
        ok(content.includes("const handleStaticRequest = createStaticHandler"), "Should create static handler");
        ok(content.includes("await handleStaticRequest(webRequest)"), "Should call static handler with Web Standard Request");
    });
});

describe("Middleware integration - pattern validation", () => {
    test("should use Web Standard middleware execution", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "node.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("if (userMiddlewares.length)"), "Should check for middlewares");
        ok(content.includes("new Request("), "Should convert Node.js req to Web Standard Request");
        ok(content.includes("for (const mw of userMiddlewares)"), "Should iterate over middlewares");
        ok(content.includes("await mw(webRequest)"), "Should call middleware with Web Standard Request");
        ok(content.includes("instanceof Response"), "Should check for Response return");
    });

    test("should execute middleware before static files", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "node.js");
        const content = await fs.readFile(modulePath, "utf-8");

        const middlewareIndex = content.indexOf("// --- Middleware execution");
        const staticIndex = content.indexOf("await handleStaticRequest(webRequest)");

        ok(middlewareIndex > 0, "Should have middleware execution");
        ok(staticIndex > 0, "Should have static file serving");
        ok(middlewareIndex < staticIndex, "Middleware should execute before static files");
    });
});

describe("esbuild integration - pattern validation", () => {
    test("should use child_process.spawn for esbuild", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "node.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("function runEsbuild(filename)"), "Should define runEsbuild function");
        ok(content.includes("spawn(process.execPath"), "Should use spawn");
        ok(content.includes('stdio: ["inherit", "inherit", "pipe"]'), "Should pipe stderr");
        ok(content.includes('child.stderr.on("data"'), "Should capture stderr");
    });

    test("should debounce esbuild runs", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "node.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("const debouncedEsbuild = debounce("), "Should debounce esbuild");
        ok(content.includes("250"), "Should use 250ms debounce delay");
    });
});

describe("Hot-reload broadcast - pattern validation", () => {
    test("should broadcast to all SSE clients on dist changes", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "node.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("for (const client of sseClients)"), "Should iterate over clients");
        ok(content.includes("client.res.write("), "Should write to each client response");
        ok(content.includes("buildHotReplacePayload"), "Should build hot-replace payload");
    });

    test("should handle broadcast errors gracefully", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "node.js");
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
        const modulePath = path.join(import.meta.dirname, "node.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("resolve404Page()"), "Should resolve custom 404 page");
        ok(content.includes("const jsx404 = await loadJsxModuleUtil(special404"), "Should load 404 module");
        ok(content.includes("const page404 = await jsx404({})"), "Should render 404 page");
    });

    test("should support custom 500 page", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "node.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("resolve500Page()"), "Should resolve custom 500 page");
        ok(content.includes("const jsx500 = await loadJsxModuleUtil(special500"), "Should load 500 module");
        ok(content.includes("const page500 = await jsx500({ error: err })"), "Should pass error to 500 page");
    });

    test("should fallback to generic error on custom page failure", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "node.js");
        const content = await fs.readFile(modulePath, "utf-8");

        const custom404Section = content.substring(content.indexOf("resolve404Page()"), content.indexOf('"Not found"'));
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
        const modulePath = path.join(import.meta.dirname, "node.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes('if (req.method === "HEAD")'), "Should detect HEAD requests");
        ok(content.includes("res.end()"), "Should end response without body for HEAD");
    });
});

describe("File watching - pattern validation", () => {
    test("should watch src directory recursively", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "node.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("srcWatcher = fs.watch(resolvedSrcDir"), "Should watch src directory");
        ok(content.includes("recursive: true"), "Should enable recursive watching");
    });

    test("should watch dist directory recursively", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "node.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("distWatcher = fs.watch(resolvedStaticDir"), "Should watch dist directory");
    });

    test("should handle watcher errors gracefully", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "node.js");
        const content = await fs.readFile(modulePath, "utf-8");

        const srcWatcherStart = content.indexOf("// Watch src directory for changes");
        const distWatcherStart = content.indexOf("// Watch dist directory for changes");
        strictEqual(srcWatcherStart > 0, true, "Should find src watcher section");
        strictEqual(distWatcherStart > srcWatcherStart, true, "Dist watcher should come after src watcher");

        const srcWatcherSection = content.substring(srcWatcherStart, distWatcherStart);
        ok(srcWatcherSection.includes("try {"), "Should wrap src watcher in try-catch");
        ok(srcWatcherSection.includes("catch"), "Should catch src watcher errors");
        ok(srcWatcherSection.includes("logger.warn("), "Should log watcher warnings");
    });
});

describe("Module cache busting - pattern validation", () => {
    test("should use bustCache: true for all JSX module loads", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "node.js");
        const content = await fs.readFile(modulePath, "utf-8");

        const loadModuleCalls = content.match(/loadJsxModuleUtil\([^)]+\)/g) || [];
        ok(loadModuleCalls.length > 0, "Should call loadJsxModuleUtil");

        for (const call of loadModuleCalls) {
            ok(call.includes("bustCache: true"), `Module load should use bustCache: ${call}`);
        }
    });

    test("should clear module cache on reload", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "node.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("async function reloadAllModules()"), "Should define reloadAllModules");
        ok(content.includes("jsxModules.clear()"), "Should clear module cache");
    });
});

describe("CSS injection - pattern validation", () => {
    test("should inject CSS assets into HTML", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "node.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("if (route?.assets?.css && isHtml)"), "Should check for CSS assets");
        ok(content.includes("page = injectCss("), "Should call injectCss utility");
    });

    test("should inject hot-reload script before </head>", async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const modulePath = path.join(import.meta.dirname, "node.js");
        const content = await fs.readFile(modulePath, "utf-8");

        ok(content.includes("const hotReplaceScript ="), "Should define hot-reload script");
        ok(content.includes('import { hotReplace } from "/hot-replace.js"'), "Should import hotReplace");
        ok(content.includes("page.replace(/<\\/head>/i"), "Should replace </head> tag");
    });
});
