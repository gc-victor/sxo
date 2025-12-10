/**
 * @fileoverview Tests for Deno dev server adapter.
 *
 * Since the adapter executes immediately at module load, we use pattern validation
 * to verify the code structure without actually importing/executing it.
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("Deno dev adapter pattern validation", () => {
    let adapterCode = "";

    it("should read the adapter file", async () => {
        adapterCode = await readFile("./src/js/server/dev/deno.js", "utf-8");
        assert.ok(adapterCode.length > 0, "Adapter file should not be empty");
    });

    describe("Imports and setup", () => {
        it("should import core utilities", () => {
            assert.match(adapterCode, /import.*from.*["']\.\/core\.js["']/, "Should import from core.js");
            assert.match(adapterCode, /debounce/, "Should use debounce");
            assert.match(adapterCode, /reloadRoutesManifest/, "Should use reloadRoutesManifest");
            assert.match(adapterCode, /buildHotReplacePayload/, "Should use buildHotReplacePayload");
        });

        it("should import required utilities", () => {
            assert.match(adapterCode, /import.*from.*constants/, "Should import constants");
            assert.match(adapterCode, /import.*loadUserDefinedMiddlewares/, "Should import middleware loader");
            assert.match(adapterCode, /routeMatch/, "Should import routeMatch");
            assert.match(adapterCode, /loadJsxModule/, "Should import loadJsxModule");
        });

        it("should read configuration from constants", () => {
            assert.match(adapterCode, /PORT/, "Should reference PORT constant");
            assert.match(adapterCode, /ROUTES_FILE/, "Should reference ROUTES_FILE constant");
            assert.match(adapterCode, /SRC_DIR/, "Should reference SRC_DIR constant");
            assert.match(adapterCode, /ESBUILD_CONFIG_FILE/, "Should reference ESBUILD_CONFIG_FILE");
            assert.match(adapterCode, /PAGES_DIR/, "Should reference PAGES_DIR");
        });

        it("should use PUBLIC_PATH from environment", () => {
            assert.match(adapterCode, /process\.env\.PUBLIC_PATH/, "Should read PUBLIC_PATH from env");
        });
    });

    describe("Immediate execution pattern", () => {
        it("should run esbuild at top level", () => {
            assert.match(adapterCode, /await runEsbuild\(\)/, "Should call runEsbuild at module level");
        });

        it("should load initial routes at top level", () => {
            assert.match(adapterCode, /let routes = await reloadRoutesManifest/, "Should load routes at module level");
        });

        it("should load initial middleware at top level", () => {
            assert.match(adapterCode, /let userMiddlewares = await loadUserDefinedMiddlewares/, "Should load middleware at module level");
        });

        it("should reload all modules at top level", () => {
            assert.match(adapterCode, /await reloadAllModules\(\)/, "Should reload modules at module level");
        });

        it("should start server at module level", () => {
            assert.match(adapterCode, /Deno\.serve\(\{/, "Should start Deno server at module level");
        });
    });

    describe("Module-level state", () => {
        it("should declare module-level state variables", () => {
            assert.match(adapterCode, /let routes =/, "Should declare routes variable");
            assert.match(adapterCode, /const jsxModules = new Map/, "Should declare jsxModules cache");
            assert.match(adapterCode, /let sseClients = \[\]/, "Should declare sseClients array");
            assert.match(adapterCode, /let userMiddlewares =/, "Should declare userMiddlewares");
        });

        it("should declare watcher state for cleanup tracking", () => {
            assert.match(adapterCode, /let _srcWatcherAbort/, "Should declare _srcWatcherAbort variable");
            assert.match(adapterCode, /let _distWatcherAbort/, "Should declare _distWatcherAbort variable");
        });
    });

    describe("Deno-specific APIs", () => {
        it("should use Deno.Command for esbuild", () => {
            assert.match(adapterCode, /new Deno\.Command\(/, "Should use Deno.Command");
            assert.match(adapterCode, /Deno\.execPath\(\)/, "Should get Deno executable path");
            assert.match(adapterCode, /args:.*run.*--allow-all/, "Should use Deno run with permissions");
        });

        it("should use Deno.watchFs for file watching", () => {
            assert.match(adapterCode, /Deno\.watchFs\(/, "Should use Deno.watchFs");
            assert.match(adapterCode, /new AbortController/, "Should use AbortController for cleanup");
        });

        it("should use Deno.open for static file serving", () => {
            assert.match(adapterCode, /Deno\.open\(/, "Should use Deno.open");
            assert.match(adapterCode, /file\.readable/, "Should use readable stream from file");
        });

        it("should use Deno.serve for HTTP server", () => {
            assert.match(adapterCode, /Deno\.serve\(\{/, "Should use Deno.serve");
            assert.match(adapterCode, /port,/, "Should pass port to Deno.serve");
            assert.match(adapterCode, /handler: fetch/, "Should pass fetch handler");
        });

        it("should use Deno.readTextFile for script serving", () => {
            assert.match(adapterCode, /Deno\.readTextFile\(/, "Should use Deno.readTextFile");
        });

        it("should use Deno.stat for file existence checks", () => {
            assert.match(adapterCode, /Deno\.stat\(/, "Should use Deno.stat");
            assert.match(adapterCode, /fileInfo\.isFile/, "Should check isFile property");
        });
    });

    describe("File watching", () => {
        it("should set up src watcher with async iterator", () => {
            assert.match(adapterCode, /Deno\.watchFs\(resolvedSrcDir/, "Should watch src directory");
            assert.match(adapterCode, /for await.*event.*srcWatcher/, "Should use async iteration");
            assert.match(adapterCode, /event\.kind/, "Should check event kind");
            assert.match(adapterCode, /event\.paths\[0\]/, "Should access changed paths");
        });

        it("should set up dist watcher with async iterator", () => {
            assert.match(adapterCode, /Deno\.watchFs\(resolvedStaticDir/, "Should watch dist directory");
            assert.match(adapterCode, /for await.*event.*distWatcher/, "Should use async iteration");
        });

        it("should handle watcher errors gracefully", () => {
            assert.match(adapterCode, /catch.*err/, "Should catch errors");
            assert.match(adapterCode, /logger\.warn/, "Should log warnings");
            assert.match(adapterCode, /Hot-reload may be degraded/, "Should warn about degraded functionality");
            assert.match(adapterCode, /Failed to watch.*Hot-reload disabled/, "Should warn about disabled hot-reload on setup failure");
        });

        it("should handle AbortError specifically", () => {
            assert.match(adapterCode, /err\.name !== "AbortError"/, "Should check for AbortError");
        });
    });

    describe("esbuild integration", () => {
        it("should define runEsbuild function", () => {
            assert.match(adapterCode, /async function runEsbuild\(filename\)/, "Should define runEsbuild function");
        });

        it("should use Deno.Command with proper arguments", () => {
            assert.match(adapterCode, /args:.*ESBUILD_CONFIG_FILE.*PAGES_DIR/, "Should pass esbuild args");
            assert.match(adapterCode, /env:.*DEV.*true/, "Should set DEV environment variable");
            assert.match(adapterCode, /stderr:.*piped/, "Should pipe stderr");
            assert.match(adapterCode, /stdout:.*inherit/, "Should inherit stdout");
        });

        it("should capture and format stderr", () => {
            assert.match(adapterCode, /process\.stderr\.getReader/, "Should get stderr reader");
            assert.match(adapterCode, /stderrChunks/, "Should collect stderr chunks");
            assert.match(adapterCode, /new TextDecoder/, "Should decode stderr text");
            assert.match(adapterCode, /esbuildError \+=/, "Should append to esbuildError");
        });

        it("should clean up esbuild error messages", () => {
            assert.match(adapterCode, /esbuildError\.replace.*\[ERROR\]/, "Should remove error prefix from esbuild output");
            assert.match(adapterCode, /\.replace.*jsx-transform/, "Should remove plugin name from esbuild output");
        });

        it("should use debounced esbuild", () => {
            assert.match(adapterCode, /const debouncedEsbuild = debounce/, "Should create debounced esbuild");
            assert.match(adapterCode, /debouncedEsbuild\(filename\)/, "Should call debounced version in watcher");
        });
    });

    describe("Routes and module management", () => {
        it("should define reloadAllModules function", () => {
            assert.match(adapterCode, /async function reloadAllModules\(\)/, "Should define reloadAllModules function");
            assert.match(adapterCode, /jsxModules\.clear\(\)/, "Should clear jsxModules cache");
        });

        it("should reload modules with bustCache", () => {
            assert.match(adapterCode, /loadJsxModuleUtil\(.*bustCache: true/, "Should reload modules with bustCache enabled");
            assert.match(adapterCode, /returnErrorStub: true/, "Should use returnErrorStub for graceful error handling");
            assert.match(adapterCode, /cache: jsxModules/, "Should pass jsxModules cache");
        });

        it("should define reloadFilesJson with retries", () => {
            assert.match(adapterCode, /async function reloadFilesJson\(retries = 3\)/, "Should define reloadFilesJson with retries");
            assert.match(adapterCode, /for \(let i = 0; i < retries; i\+\+\)/, "Should implement retry loop");
            assert.match(adapterCode, /await new Promise.*setTimeout/, "Should delay between retries");
        });
    });

    describe("Hot-reload SSE", () => {
        it("should handle /hot-replace endpoint", () => {
            assert.match(adapterCode, /pathname === "\/hot-replace"/, "Should check for hot-replace endpoint");
            assert.match(adapterCode, /url\.searchParams\.get\("href"\)/, "Should get href parameter");
        });

        it("should create ReadableStream for SSE", () => {
            assert.match(adapterCode, /new ReadableStream\(\{/, "Should create ReadableStream");
            assert.match(adapterCode, /async start\(controller\)/, "Should define start method");
            assert.match(adapterCode, /cancel\(\)/, "Should define cancel method for cleanup");
        });

        it("should track SSE clients", () => {
            assert.match(adapterCode, /sseClients\.push\(clientRef\)/, "Should add client to tracking array");
            assert.match(adapterCode, /sseClients = sseClients\.filter/, "Should remove client on disconnect");
        });

        it("should enqueue SSE messages via controller", () => {
            assert.match(adapterCode, /controller\.enqueue\(`id: hot-replace/, "Should enqueue SSE messages");
            assert.match(adapterCode, /retry: 250/, "Should set retry interval");
        });

        it("should broadcast to all clients on file changes", () => {
            assert.match(adapterCode, /for \(const client of sseClients\)/, "Should iterate over clients");
            assert.match(adapterCode, /client\.controller\.enqueue/, "Should enqueue to each client's controller");
        });

        it("should handle SSE CORS", () => {
            assert.match(adapterCode, /request\.headers\.get\("origin"\)/, "Should check origin header");
            assert.match(adapterCode, /Access-Control-Allow-Origin/, "Should add CORS header when appropriate");
        });
    });

    describe("Web Standard middleware", () => {
        it("should use Web Standard middleware signature", () => {
            assert.match(adapterCode, /for \(const mw of userMiddlewares\)/, "Should iterate over middleware");
            assert.match(adapterCode, /const result = await mw\(request\)/, "Should call middleware with request");
        });

        it("should check for Response return", () => {
            assert.match(adapterCode, /result instanceof Response/, "Should check if middleware returned Response");
        });

        it("should reload middleware on changes", () => {
            assert.match(adapterCode, /const debouncedReloadMiddleware = debounce/, "Should create debounced middleware reload");
            assert.match(adapterCode, /middleware\.js.*middleware/, "Should detect middleware file changes");
        });
    });

    describe("Static file serving", () => {
        it("should create static handler", () => {
            assert.match(adapterCode, /const handleStaticRequest = createStaticHandler/, "Should create handleStaticRequest");
        });

        it("should check for file extensions", () => {
            assert.match(adapterCode, /\/\\\.\\\w\+\$\/\.test\(pathname\)/, "Should check for file extensions");
        });

        it("should implement path traversal protection", () => {
            assert.match(adapterCode, /!abs\.startsWith\(resolvedStaticDir\)/, "Should check path prefix");
            assert.match(adapterCode, /status: 403/, "Should return 403 for traversal attempts");
        });

        it("should use Deno.stat to check file existence", () => {
            assert.match(adapterCode, /Deno\.stat\(abs\)/, "Should stat file");
            assert.match(adapterCode, /fileInfo\.isFile/, "Should check if path is a file");
        });

        it("should use Deno.open to stream files", () => {
            assert.match(adapterCode, /Deno\.open\(abs.*read: true/, "Should open file for reading");
            assert.match(adapterCode, /file\.readable/, "Should get readable stream");
        });

        it("should set appropriate MIME types", () => {
            assert.match(adapterCode, /const mimeTypes = \{/, "Should define MIME type map");
            assert.match(adapterCode, /\.html.*text\/html/, "Should map .html to text/html");
            assert.match(adapterCode, /\.js.*application\/javascript/, "Should map .js to application/javascript");
        });

        it("should set Cache-Control header", () => {
            assert.match(adapterCode, /Cache-Control.*no-cache/, "Should set no-cache for dev");
        });
    });

    describe("SSR and routing", () => {
        it("should use routeMatch for path matching", () => {
            assert.match(adapterCode, /const found = routeMatch\(/, "Should call routeMatch");
            assert.match(adapterCode, /decodedPathname/, "Should decode pathname before matching");
        });

        it("should handle 404 with custom page", () => {
            assert.match(adapterCode, /resolve404Page\(\)/, "Should resolve custom 404 page");
            assert.match(adapterCode, /status: 404/, "Should return 404 status");
        });

        it("should handle 500 with custom page", () => {
            assert.match(adapterCode, /resolve500Page\(\)/, "Should resolve custom 500 page");
            assert.match(adapterCode, /status: 500/, "Should return 500 status");
        });

        it("should inject CSS assets", () => {
            assert.match(adapterCode, /injectCss\(page, route\.assets\.css/, "Should inject CSS assets");
            assert.match(adapterCode, /normalizePublicPath\(publicPath\)/, "Should normalize public path");
        });

        it("should inject hot-reload script", () => {
            assert.match(adapterCode, /hotReplace.*decodedPathname/, "Should inject hot-reload script with pathname");
            assert.match(adapterCode, /page\.replace.*<\/head>/, "Should inject before closing head tag");
        });

        it("should handle HEAD requests", () => {
            assert.match(adapterCode, /isHead.*request\.method.*HEAD/, "Should check for HEAD method");
            assert.match(adapterCode, /isHead/, "Should have isHead variable");
            assert.match(adapterCode, /new Response\(null/, "Should return null body for HEAD");
        });

        it("should add doctype to HTML responses", () => {
            assert.match(adapterCode, /<!doctype html>/, "Should prepend doctype");
        });
    });

    describe("Logging and error handling", () => {
        it("should log HTTP requests", () => {
            assert.match(adapterCode, /logger\.info\(`\$\{request\.method\}/, "Should log incoming requests with method and path");
        });

        it("should log server startup", () => {
            assert.match(adapterCode, /logger\.info.*listening/, "Should log server start");
        });

        it("should handle SSR errors gracefully", () => {
            assert.match(adapterCode, /catch.*err/, "Should catch SSR errors");
            assert.match(adapterCode, /SSR error/, "Should log SSR error");
            assert.match(adapterCode, /renderErrorHtml/, "Should render error HTML");
        });

        it("should log middleware errors", () => {
            assert.match(adapterCode, /catch.*err/, "Should catch middleware errors");
            assert.match(adapterCode, /Middleware error/, "Should log middleware error");
        });
    });

    describe("Server startup", () => {
        it("should start Deno server at module level", () => {
            assert.match(adapterCode, /Deno\.serve\(\{[^}]*port[^}]*\}\)/, "Should call Deno.serve with port");
            assert.match(adapterCode, /handler: fetch/, "Should pass fetch handler");
        });

        it("should log startup message", () => {
            // Should appear after Deno.serve call
            const serveIndex = adapterCode.indexOf("Deno.serve({");
            const logIndex = adapterCode.indexOf("logger.info(`Dev server listening");
            assert.ok(logIndex > serveIndex, "Startup log should appear after Deno.serve call");
        });
    });

    describe("Code structure", () => {
        it("should have proper JSDoc fileoverview", () => {
            assert.match(adapterCode, /@fileoverview/, "Should have fileoverview");
            assert.match(adapterCode, /Executes immediately/, "Should document immediate execution");
        });

        it("should have proper module annotation", () => {
            assert.match(adapterCode, /@module server\/dev\/deno/, "Should have module annotation");
        });

        it("should not export any functions", () => {
            assert.doesNotMatch(adapterCode, /export.*function/, "Should not export functions");
            assert.doesNotMatch(adapterCode, /export.*const/, "Should not export constants");
            assert.doesNotMatch(adapterCode, /export default/, "Should not have default export");
        });
    });
});
