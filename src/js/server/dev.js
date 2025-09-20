import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

import { DANGER_OUTPUT_DIR, ESBUILD_CONFIG_FILE, PAGES_DIR, PORT, ROUTES_FILE, ROUTES_RELATIVE_PATH } from "../constants.js";
import { loadUserDefinedMiddlewares, runMiddleware } from "./middleware.js"; // AIDEV-NOTE: middleware runner integration
import {
    httpLogger,
    injectCss,
    loadJsxModule,
    logger,
    normalizePublicPath,
    renderErrorHtml,
    resolve404Page,
    resolve500Page,
    routeMatch,
    statics,
} from "./utils/index.js";

const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

let esbuildError = "";
await esbuild();

// Load the router config at startup
let files = JSON.parse(fs.readFileSync(ROUTES_FILE, "utf-8"));

// Cache for loaded JSX modules
const jsxModules = new Map();

// SSE clients for hot reload
let sseClients = [];

// User-defined middleware list (from PAGES_DIR/middleware.js)
let userMiddlewares = [];

/**
 * AIDEV-NOTE: Centralized middleware loader now imported from ./middleware.js
 * We call it here with busting in dev to always pick up changes.
 */
userMiddlewares = await loadUserDefinedMiddlewares();

async function reloadAllModules() {
    jsxModules.clear();
    for (const file of files) {
        if (file.jsx) {
            await loadJsxModule(file.jsx, { bustCache: true, returnErrorStub: true, cache: jsxModules });
        }
    }
}

async function reloadFilesJson(retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const content = fs.readFileSync(ROUTES_FILE, "utf-8");
            files = JSON.parse(content);
            await reloadAllModules();
            return;
        } catch (err) {
            if (i === retries - 1) {
                logger.error(`❌ Failed to reload ${ROUTES_RELATIVE_PATH} after retries:`, err.message);
            } else {
                // Wait a bit before retrying
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
        }
    }
}

// Initial load
await reloadAllModules();

// --- Debounce utility ---
function debounce(fn, delay) {
    let timer = null;
    return (...args) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

// Watch the src directory for changes and run esbuild.config.js (debounced)
const debouncedEsbuild = debounce(async (filename) => {
    if (filename) {
        esbuild(filename);
    }
}, 250);

const debouncedReloadMiddleware = debounce(async (filename) => {
    if (filename && (filename.endsWith("middleware.js") || filename.split(/[\\/]/).includes("middleware"))) {
        // Reload user middleware (dev reload)
        const mw = await loadUserDefinedMiddlewares();
        if (Array.isArray(mw)) userMiddlewares = mw;
    }
}, 500);

const watchPath = path.resolve(PAGES_DIR.replace(/\/pages$/, ""));
fs.watch(watchPath, { recursive: true }, (_, filename) => {
    debouncedReloadMiddleware(filename);
    debouncedEsbuild(filename);
});

function esbuild(filename) {
    return new Promise((resolve) => {
        const child = spawn(process.execPath, [ESBUILD_CONFIG_FILE, PAGES_DIR], {
            env: { ...process.env, DEV: "true" },
            stdio: ["inherit", "inherit", "pipe"],
            cwd: process.cwd(),
        });

        child.stderr.on("data", (data) => {
            const output = data.toString();
            esbuildError += output;
            esbuildError = esbuildError.replace("✘ [ERROR] ", "").replace("[plugin jsx-transform]", "").trim();
        });

        child.on("close", () => {
            if (filename) logger.info(`${YELLOW}${filename}`);
            if (esbuildError) {
                logger.error(`${RESET}${esbuildError}`);
            }
            resolve();
        });
    });
}

// Watch for dist changes (debounced)
const debouncedReloadDist = debounce(async () => {
    await reloadFilesJson();

    // Broadcast to all connected clients
    for (const client of sseClients) {
        try {
            let data;
            if (esbuildError) {
                data = JSON.stringify({ body: renderErrorHtml(esbuildError) });
                esbuildError = "";
            } else {
                data = await hotReplaceData(client);
            }
            client.res.write(`id: hot-replace\ndata: ${data}\nretry: 250\n\n`);
        } catch (err) {
            logger.error(`Error broadcasting hot reload: ${err}`);
        }
    }

    logger.info(`${RESET}page::reloaded`);
}, 250);

// Watch dist directory for changes
fs.watch(DANGER_OUTPUT_DIR, { recursive: true }, () => {
    debouncedReloadDist();
});

const server = http.createServer(async (req, res) => {
    // Parse query string to get href value if present
    const u = new URL(req.url, "http://localhost");
    const href = u.searchParams.get("href");

    if (req.url.startsWith("/hot-replace") && href) {
        // SSE endpoint
        const found = routeMatch(href, files);

        const sseHeaders = {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        };

        // Only add CORS header for same origin (dev SSE convenience)
        const origin = req.headers.origin;
        const host = req.headers.host;
        if (origin?.endsWith(`://${host}`)) {
            sseHeaders["Access-Control-Allow-Origin"] = origin;
        }

        res.writeHead(200, sseHeaders);

        const client = {
            res,
            route: found?.route || files[0],
            params: found?.params || {},
        };
        sseClients.push(client);

        // Send initial payload
        (async () => {
            try {
                res.write(`id: hot-replace\ndata: ${await hotReplaceData(client)}\nretry: 250\n\n`);
            } catch (err) {
                const data = JSON.stringify({ body: renderErrorHtml(err.message) });
                res.write(`id: hot-replace\ndata: ${data}\nretry: 250\n\n`);
            }
        })();

        req.on("close", () => {
            sseClients = sseClients.filter((c) => c !== client);
        });
    } else {
        httpLogger(req, res);

        // Handle preflight OPTIONS requests
        if (req.method === "OPTIONS") {
            res.writeHead(204);
            res.end();
            return;
        }

        // Serve hot-replace.js as the client hot-replace script
        if (req.url === "/hot-replace.js") {
            const hotReplacePath = path.resolve(import.meta.dirname, "hot-replace.client.js");
            fs.readFile(hotReplacePath, "utf-8", (err, js) => {
                if (err) {
                    res.writeHead(404, { "Content-Type": "text/plain" });
                    res.end("Not found", err);
                    return;
                }
                res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" });
                res.end(js);
            });
            return;
        }

        // AIDEV-NOTE: Execute user-defined middleware chain before static/route handling
        if (userMiddlewares.length) {
            try {
                const handledByMw = await runMiddleware(req, res, userMiddlewares);
                if (handledByMw) return;
            } catch (e) {
                logger.error({ err: e }, "User middleware error");
                // Continue to normal handling (do not leak stack in response here)
            }
        }

        const isStatic = await statics(req, res);
        if (isStatic) {
            return;
        }

        let pathname = "/";
        try {
            const u = new URL(req.url, "http://localhost");
            pathname = decodeURIComponent(u.pathname);
        } catch {
            res.writeHead(400, { "Content-Type": "text/plain" });
            res.end("Bad Request");
            return;
        }

        const found = routeMatch(pathname, files);
        if (!found) {
            // Try custom 404 page if present
            try {
                const special404 = resolve404Page();
                if (special404) {
                    const jsx404 = await loadJsxModule(special404, { bustCache: true, returnErrorStub: true, cache: jsxModules });
                    const page404 = await jsx404({});
                    const isHtml404 = /^<html[\s>]/i.test(page404);
                    if (isHtml404) {
                        if (req.method === "HEAD") {
                            res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
                            res.end();
                        } else {
                            res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
                            res.end(`<!doctype html>\n${page404}`);
                        }
                        return;
                    }
                }
            } catch (e) {
                logger.error({ err: e }, "Failed to render custom 404 page");
            }
            if (req.method === "HEAD") {
                res.writeHead(404, { "Content-Type": "text/plain" });
                res.end();
            } else {
                res.writeHead(404, { "Content-Type": "text/plain" });
                res.end("Not found");
            }
            return;
        }
        if (found.invalid) {
            res.writeHead(400, { "Content-Type": "text/plain" });
            res.end("Invalid parameters");
            return;
        }

        const { route, params } = found;
        let page;

        try {
            const jsxFn = await loadJsxModule(route.jsx, { returnErrorStub: true, cache: jsxModules });
            page = await jsxFn(params);
        } catch (e) {
            logger.error({ err: e }, "Request handling failed");
            // Handle JSX rendering errors - attempt custom 500 page if available
            try {
                const special500 = resolve500Page();
                if (special500) {
                    const jsx500 = await loadJsxModule(special500, { bustCache: true, returnErrorStub: true, cache: jsxModules });
                    const page500 = await jsx500({ error: e });
                    const isHtml500 = /^<html[\s>]/i.test(page500);
                    if (isHtml500) {
                        if (req.method === "HEAD") {
                            res.writeHead(500, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
                            res.end();
                        } else {
                            res.writeHead(500, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
                            res.end(`<!doctype html>\n${page500}`);
                        }
                        return;
                    }
                }
            } catch (err500) {
                logger.error({ err: err500 }, "Failed to render custom 500 page");
            }
            if (req.method === "HEAD") {
                res.writeHead(500, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
                res.end();
            } else {
                res.writeHead(500, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
                res.end(renderErrorHtml(e));
            }
            return;
        }

        const isHtml = /^<html[\s>]/i.test(page);
        if (!isHtml) {
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(page);
            return;
        }

        // Inject built assets for non-generated routes
        const publicPath = normalizePublicPath(process.env.PUBLIC_PATH ?? "/");
        if (route?.assets?.css && isHtml) {
            page = injectCss(page, route.assets.css, publicPath);
        }

        const hotReplaceScript = `
            <script type="module">
                import { hotReplace } from "/hot-replace.js";
                hotReplace('${pathname}');
            </script>
        `;
        page = page.replace(/<\/head>/i, `${hotReplaceScript}\n</head>`);
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<!doctype html>\n${page}`);
    }
});

async function hotReplaceData(client) {
    const jsxFn = await loadJsxModule(client.route.jsx, { bustCache: true, returnErrorStub: true, cache: jsxModules });
    const jsxResult = await jsxFn(client.params);

    const mFull = jsxResult.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const body = mFull ? mFull[1] : "";

    return JSON.stringify({ body, assets: client.route.assets, publicPath: normalizePublicPath(process.env.PUBLIC_PATH ?? "/") });
}

server.listen(PORT, () => {
    const routePaths = [{ path: "" }, ...files].filter((f) => f.path !== undefined).map((f) => `"/${f.path === "" ? "" : f.path}"`);

    logger.info(`${YELLOW}http://localhost:${PORT}/`);
    logger.info("Edit src/ files and see hot reloads!");
    logger.info(`Available routes: ${routePaths.join(", ")}`);
});

// Graceful shutdown
process.on("SIGINT", () => {
    logger.info("Shutting down...");
    process.exit(0);
});
process.on("unhandledRejection", (reason) => {
    logger.error({ reason }, "Unhandled Rejection");
});
process.on("uncaughtException", (err) => {
    logger.error({ err }, "Uncaught Exception");
});
