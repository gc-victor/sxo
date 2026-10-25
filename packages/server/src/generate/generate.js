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
    const preparation = await prepareRoutes(deps);
    if (preparation.result) return preparation.result;

    const { routes, staticRoutes } = preparation;
    console.log(`generate: Preparing ${staticRoutes.length} page(s)...`);

    const normalizedPublicPath = normalizePublicPath(deps.publicPath);
    const counts = await generateStaticRoutes(staticRoutes, deps, normalizedPublicPath);
    const writeError = await persistGeneratedRoutes(routes, deps);
    const ok = counts.failed === 0 && writeError === null;

    console.log(
        `generate: done. generated=${counts.generated} skipped=${counts.skipped} failed=${counts.failed} total=${staticRoutes.length}`,
    );
    return { ok, ...counts, total: staticRoutes.length, writeError };
}

async function prepareRoutes({ routesFile, readText }) {
    let routes;
    try {
        const txt = await readText(routesFile);
        if (txt === null) {
            throw new Error(`Failed to read file: ${routesFile}`);
        }
        routes = JSON.parse(txt);
    } catch {
        console.error(`generate: Missing or invalid manifest. Did you run "build"? Expected: ${routesFile}`);
        return { result: { ok: false, generated: 0, skipped: 0, total: 0 } };
    }

    if (!Array.isArray(routes)) {
        console.error("generate: routes manifest is not an array");
        return { result: { ok: false, generated: 0, skipped: 0, total: 0 } };
    }

    const candidates = routes.filter(
        (route) => route && typeof route === "object" && typeof route.filename === "string" && typeof route.jsx === "string",
    );
    if (candidates.length === 0) {
        console.log("generate: No routes found in manifest.");
        return { result: { ok: true, generated: 0, skipped: 0, total: 0 } };
    }

    const staticRoutes = candidates.filter((route) => !isDynamicRoute(route));
    if (staticRoutes.length === 0) {
        console.log("generate: No static routes to generate (all appear dynamic).");
        return { result: { ok: true, generated: 0, skipped: 0, total: candidates.length } };
    }

    return { routes, staticRoutes };
}

async function generateStaticRoutes(routes, deps, publicPath) {
    const counts = { generated: 0, skipped: 0, failed: 0 };
    for (const route of routes) {
        const result = await generateStaticRoute(route, deps, publicPath);
        counts[result]++;
    }
    return counts;
}

async function generateStaticRoute(route, { outputDirClient, loadModule, mkdirp, writeFile }, publicPath) {
    const label = `/${route.path ?? ""}`.replace(/\/$/, "") || "/";
    try {
        if (route.generated === true) {
            console.log(`- ${label} (skipped: already-generated-flag)`);
            return "skipped";
        }

        const jsxFn = await loadModule(route.jsx);
        const content = await jsxFn({});
        if (!/^<html[\s>]/i.test(content)) {
            console.log(`- ${label} (skipped: fragment, not html file generated)`);
            return "skipped";
        }

        let output = content;
        if (route.assets && typeof route.assets === "object") {
            output = injectAssets(output, route.assets, publicPath);
        }
        output = `<!doctype html>\n${output}`;

        const htmlPath = path.join(outputDirClient, route.filename);
        await mkdirp(path.dirname(htmlPath));
        await writeFile(htmlPath, output);
        route.generated = true;
        console.log(`- ${label} \u2713`);
        return "generated";
    } catch (error) {
        const message = error && typeof error === "object" && "message" in error ? error.message : String(error);
        console.error(`- ${label} \u2717 ${message}`);
        return "failed";
    }
}

async function persistGeneratedRoutes(routes, { routesFile, writeFile }) {
    try {
        await writeFile(routesFile, JSON.stringify(routes, null, 2));
        return null;
    } catch (error) {
        const message = error && typeof error === "object" && "message" in error ? String(error.message) : String(error);
        console.error(`generate: failed to persist generated flags to routes.json: ${message}`);
        return message;
    }
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
