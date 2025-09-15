import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
    DANGER_OUTPUT_DIR,
    ESBUILD_CONFIG_FILE,
    OUTPUT_DIR_CLIENT,
    PAGES_DIR,
    PORT,
    ROUTES_FILE,
    ROUTES_RELATIVE_PATH,
} from "../constants.js";
import { loadUserDefinedMiddlewares, runMiddleware } from "./middleware.js"; // AIDEV-NOTE: middleware runner integration
import {
    applyHead,
    extractLinkTag,
    extractScriptTags,
    httpLogger,
    injectPageContent,
    jsxBundlePath,
    logger,
    renderErrorHtml,
    routeMatch,
    statics,
} from "./utils/index.js";

const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

// AIDEV-NOTE: Built-in CORS handling removed in dev server. Users now add a CORS middleware
// inside PAGES_DIR/middleware.js (see example) to set CORS headers and handle OPTIONS.

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

async function loadJsxModule(jsxPath, bustCache = false) {
    const modulePath = jsxBundlePath(jsxPath);
    const cacheKey = jsxPath;

    if (bustCache || !jsxModules.has(cacheKey)) {
        try {
            const moduleUrl = `${pathToFileURL(modulePath).href}?t=${Date.now()}`;
            const module = await import(moduleUrl);
            const jsxFn = module.default || module.jsx;
            if (typeof jsxFn !== "function") {
                throw new Error(`No valid export found in ${modulePath}`);
            }
            jsxModules.set(cacheKey, jsxFn);
        } catch (err) {
            logger.error(`❌ Failed to load ${jsxPath}:`, err);
            jsxModules.set(cacheKey, () => `<pre style="color:red;">Error loading ${jsxPath}: ${err.message}</pre>`);
        }
    }

    return jsxModules.get(cacheKey);
}

async function reloadAllModules() {
    jsxModules.clear();
    for (const file of files) {
        if (file.jsx) {
            await loadJsxModule(file.jsx, true);
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

// esbuildError declared above

function esbuild(filename) {
    return new Promise((resolve) => {
        const child = spawn("node", [ESBUILD_CONFIG_FILE, PAGES_DIR], {
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
                data = JSON.stringify({ html: renderErrorHtml(`✘ [ERROR] ${esbuildError}`) });
                esbuildError = "";
            } else {
                data = await hotReplaceData(client);
            }
            const message = `id: hot-replace\ndata: ${data}\nretry: 200\n\n`;
            client.res.write(message);
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
                const data = await hotReplaceData(client);
                res.write(`id: hot-replace\ndata: ${data}\nretry: 250\n\n`);
            } catch (err) {
                const data = JSON.stringify({ html: renderErrorHtml(err.message) });
                res.write(`id: hot-replace\ndata: ${data}\nretry: 250\n\n`);
            }
        })();

        req.on("close", () => {
            sseClients = sseClients.filter((c) => c !== client);
        });
    } else {
        httpLogger(req, res);

        // AIDEV-NOTE: CORS headers are no longer applied here; add a CORS middleware in pages/middleware.js.

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
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("Not found");
            return;
        }
        if (found.invalid) {
            res.writeHead(400, { "Content-Type": "text/plain" });
            res.end("Invalid parameters");
            return;
        }

        const { route, params } = found;
        const htmlPath = path.resolve(OUTPUT_DIR_CLIENT, route.filename);
        fs.readFile(htmlPath, "utf-8", async (err, html) => {
            if (err) {
                res.writeHead(500, { "Content-Type": "text/plain" });
                res.end(`Failed to load ${route.filename}`);
                return;
            }

            let page;
            try {
                const jsxFn = await loadJsxModule(route.jsx);
                const jsxResult = await jsxFn(params);

                // Replace <script type="module"> with <script type="text/hot-script">
                html = html.replace(/<script([^>]*?)type=["']module["']([^>]*)>/g, '<script$1type="text/hot-script"$2>');
                page = injectPageContent(html, jsxResult);

                // AIDEV-NOTE: Apply new head export (object or function) to document head (idempotent)
                const modulePath = jsxBundlePath(route.jsx);
                const moduleUrl = `${pathToFileURL(modulePath).href}?t=${Date.now()}`;
                const module = await import(moduleUrl);
                page = applyHead(page, module.head, params);
            } catch (e) {
                // Use consistent injection helper. `renderErrorHtml` returns a full container,
                const errHtml = renderErrorHtml(e.message);
                page = injectPageContent(html, errHtml);
            }

            // Hot-replace client script to inject
            const hotReplaceScript = `
                <script type="module" data-skip-hot-replace="true">
                    import { hotReplace } from "/hot-replace.js";
                    hotReplace('${pathname}');
                </script>
            `;
            page = page.replace(/<\/head>/i, `${hotReplaceScript}\n</head>`);
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(page);
        });
    }
});

async function hotReplaceData(client) {
    const htmlPath = path.resolve(OUTPUT_DIR_CLIENT, client.route.filename);
    const html = fs.readFileSync(htmlPath, "utf-8");
    const jsxFn = await loadJsxModule(client.route.jsx, true);
    const page = await jsxFn(client.params);
    return JSON.stringify({ page, link: extractLinkTag(html), scripts: extractScriptTags(html) });
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
