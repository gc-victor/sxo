/**
 * Generate pre-renderer module
 *
 * Usage (as a script after a successful build):
 *   node sxo/src/js/generate/generate.js
 *
 * Responsibilities:
 * - Read the built routes manifest (dist/server/routes.json)
 * - For each non-dynamic route, import its SSR module and produce the HTML
 * - Inject rendered content into the built HTML shell and apply head()
 * - Mark the document as generated and overwrite the corresponding dist/client HTML file
 *
 * Notes:
 * - Dynamic routes (directories containing [param]) are skipped.
 * - This runs after "build". If outputs are missing, instruct the user to build first.
 * - Persists a generated flag in routes.json (idempotent if already true).
 *
 * Node >= 20, ESM
 */

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { OUTPUT_DIR_CLIENT, ROUTES_FILE } from "../constants.js";
import { createFileReader } from "../server/shared/file-readers.js";
import { loadJsxModule } from "../server/shared/module-loader.js";
import { injectAssets, normalizePublicPath } from "../server/utils/inject-assets.js";

/**
 * Determine if a route is dynamic (contains [param] segments).
 * @param {{ path?: string, filename: string }} route
 * @returns {boolean}
 */
export function isDynamicRoute(route) {
    const inPath = typeof route.path === "string" ? route.path : "";
    return /\[[^/]+?\]/.test(inPath) || /\[[^/]+?\]/.test(route.filename);
}

/**
 * @typedef {object} GenerateDeps
 * @property {string} routesFile - Absolute path to routes.json manifest
 * @property {string} outputDirClient - Absolute path to client output directory
 * @property {string} publicPath - PUBLIC_PATH value (raw, will be normalized)
 * @property {(file: string) => Promise<string | null>} readText - Read a file as UTF-8 text
 * @property {(file: string, content: string) => Promise<void>} writeFile - Write a file
 * @property {(dir: string) => Promise<void>} mkdirp - Ensure directory exists
 * @property {(jsxPath: string) => Promise<Function>} loadModule - Load an SSR module and return its render function
 */

/**
 * @typedef {object} GenerateResult
 * @property {boolean} ok
 * @property {number} generated
 * @property {number} skipped
 * @property {number} [failed]
 * @property {number} total
 * @property {string | null} [writeError]
 */

/**
 * Core generate logic with explicit dependencies (no module-level side effects).
 *
 * @param {GenerateDeps} deps
 * @returns {Promise<GenerateResult>}
 */
export async function generateCore(deps) {
    const { routesFile, outputDirClient, publicPath: rawPublicPath, readText, writeFile, mkdirp, loadModule } = deps;

    // Read and validate manifest
    let routes;
    try {
        const txt = await readText(routesFile);
        if (txt === null) {
            throw new Error(`Failed to read file: ${routesFile}`);
        }
        routes = JSON.parse(txt);
    } catch {
        console.error(`generate: Missing or invalid manifest. Did you run "build"? Expected: ${routesFile}`);
        return { ok: false, generated: 0, skipped: 0, total: 0 };
    }

    if (!Array.isArray(routes)) {
        console.error("generate: routes manifest is not an array");
        return { ok: false, generated: 0, skipped: 0, total: 0 };
    }

    // Filter static routes
    const candidates = routes.filter((r) => r && typeof r === "object" && typeof r.filename === "string" && typeof r.jsx === "string");
    const staticRoutes = candidates.filter((r) => !isDynamicRoute(r));

    if (candidates.length === 0) {
        console.log("generate: No routes found in manifest.");
        return { ok: true, generated: 0, skipped: 0, total: 0 };
    }

    if (staticRoutes.length === 0) {
        console.log("generate: No static routes to generate (all appear dynamic).");
        return { ok: true, generated: 0, skipped: 0, total: candidates.length };
    }

    let generated = 0;
    let skipped = 0;
    let failed = 0;

    console.log(`generate: Preparing ${staticRoutes.length} page(s)...`);

    const normalizedPublicPath = normalizePublicPath(rawPublicPath);

    for (const route of staticRoutes) {
        const label = `/${route.path ?? ""}`.replace(/\/$/, "") || "/";
        try {
            // Skip when already generated per manifest flag
            if (route.generated === true) {
                skipped++;
                console.log(`- ${label} (skipped: already-generated-flag)`);
                continue;
            }

            // SSR the route's module
            const jsxFn = await loadModule(route.jsx);

            const params = {}; // static routes: empty params
            const content = await jsxFn(params);

            // It is a fragment not a full page
            if (!/^<html[\s>]/i.test(content)) {
                skipped++;
                console.log(`- ${label} (skipped: fragment, not html file generated)`);
                continue;
            }
            let out = content;

            // Inject assets from routes.json (client-relative paths) with PUBLIC_PATH normalization
            if (route.assets && typeof route.assets === "object") {
                out = injectAssets(out, route.assets, normalizedPublicPath);
            }

            // Prepend doctype
            out = `<!doctype html>\n${out}`;

            // Write to client HTML file
            const htmlPath = path.join(outputDirClient, route.filename);
            await mkdirp(path.dirname(htmlPath));
            await writeFile(htmlPath, out);

            // Mark as generated in manifest
            route.generated = true;

            generated++;
            console.log(`- ${label} \u2713`);
        } catch (e) {
            failed++;
            const msg = e && typeof e === "object" && "message" in e ? e.message : String(e);
            console.error(`- ${label} \u2717 ${msg}`);
        }
    }

    // Persist updated manifest with generated flags
    let writeError = null;
    try {
        await writeFile(routesFile, JSON.stringify(routes, null, 2));
    } catch (e) {
        writeError = e && typeof e === "object" && "message" in e ? String(e.message) : String(e);
        console.error(`generate: failed to persist generated flags to routes.json: ${writeError}`);
    }

    const ok = failed === 0 && writeError === null;
    console.log(`generate: done. generated=${generated} skipped=${skipped} failed=${failed} total=${staticRoutes.length}`);
    return { ok, generated, skipped, failed, total: staticRoutes.length, writeError };
}

/**
 * High-level generate entry point that reads paths from constants/env
 * and delegates to generateCore.
 *
 * @returns {Promise<GenerateResult>}
 */
export async function generate() {
    const fileReader = createFileReader();

    return generateCore({
        routesFile: ROUTES_FILE,
        outputDirClient: OUTPUT_DIR_CLIENT,
        publicPath: process.env.PUBLIC_PATH ?? "/",
        readText: (file) => fileReader.readText(file),
        writeFile: (file, content) => fs.writeFile(file, content, "utf8"),
        mkdirp: (dir) => fs.mkdir(dir, { recursive: true }).then(() => {}),
        loadModule: (jsxPath) => loadJsxModule(jsxPath),
    });
}

// Allow running as a script
if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
    generate().then((res) => {
        process.exitCode = res.ok ? 0 : 1;
    });
}
