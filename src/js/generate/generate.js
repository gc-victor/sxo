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
import { injectAssets, normalizePublicPath } from "../server/utils/inject-assets.js";
import { loadJsxModule } from "../server/utils/load-jsx-module.js";

/* ------------------------------ helpers ------------------------------ */

/**
 * Read and parse JSON from a file.
 * @param {string} file
 * @returns {Promise<any>}
 */
async function readJson(file) {
    const txt = await fs.readFile(file, "utf8");
    return JSON.parse(txt);
}

/**
 * Determine if a route is dynamic (contains [param] segments).
 * @param {{ path?: string, filename: string }} route
 */
function isDynamicRoute(route) {
    const inPath = typeof route.path === "string" ? route.path : "";
    // Consider both the route path and the html filename (defensive).
    return /\[[^/]+?\]/.test(inPath) || /\[[^/]+?\]/.test(route.filename);
}

/* ------------------------------- main ------------------------------- */

export async function generate() {
    // Validate manifest
    let routes;
    try {
        routes = await readJson(ROUTES_FILE);
    } catch {
        console.error(`generate: Missing or invalid manifest. Did you run "build"? Expected: ${ROUTES_FILE}`);
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
            const jsxFn = await loadJsxModule(route.jsx);

            const params = {}; // static routes: empty params
            const content = await jsxFn(params);

            // It is a fragment not a full page
            if (!/^<html[\s>]/i.test(content)) {
                generated++;
                console.log(`- ${label} ✓ (fragment, not html file generated)`);
                continue;
            }
            let out = content;

            // Inject assets from routes.json (client-relative paths) with PUBLIC_PATH normalization
            const publicPath = normalizePublicPath(process.env.PUBLIC_PATH ?? "/");
            if (route.assets && typeof route.assets === "object") {
                out = injectAssets(out, route.assets, publicPath);
            }

            // Prepend doctype
            out = `<!doctype html>\n${out}`;

            // Write to client HTML file
            const htmlPath = path.join(OUTPUT_DIR_CLIENT, route.filename);
            await fs.mkdir(path.dirname(htmlPath), { recursive: true });
            await fs.writeFile(htmlPath, out, "utf8");

            // Mark as generated in manifest
            route.generated = true;

            generated++;
            console.log(`- ${label} ✓`);
        } catch (e) {
            failed++;
            const msg = e && typeof e === "object" && "message" in e ? e.message : String(e);
            console.error(`- ${label} ✗ ${msg}`);
        }
    }

    // Persist updated manifest with generated flags
    try {
        await fs.writeFile(ROUTES_FILE, JSON.stringify(routes, null, 2), "utf8");
    } catch {
        // If we fail to write, surface as non-fatal warning; pages are still generated
        console.error("generate: failed to persist generated flags to routes.json");
    }

    const ok = failed === 0;
    console.log(`generate: done. generated=${generated} skipped=${skipped} failed=${failed} total=${staticRoutes.length}`);
    return { ok, generated, skipped, failed, total: staticRoutes.length };
}

// Allow running as a script
if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
    generate().then((res) => {
        process.exitCode = res.ok ? 0 : 1;
    });
}
