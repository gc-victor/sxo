/**
 * esbuild-metafile.plugin.js
 *
 * Custom esbuild plugin that:
 *  - Parses esbuild's metafile after the client build finishes
 *  - Maps original entry points => final output assets (hashed in prod)
 *  - Augments dist/server/routes.json with per‑route assets:
 *    route.assets = { css: string[], js: string[] } (client‑relative paths).
 *
 * Notes:
 *  - It relies on the pre-written routes manifest (written before builds)
 *    at dist/server/routes.json for route metadata.
 *  - This plugin does not write HTML. HTML files are only created by the CLI `generate` step.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { OUTPUT_DIR_CLIENT, ROUTES_FILE } from "../constants.js";

/**
 * Normalize to forward slashes for URLs and manifest stability.
 */
function toPosix(p) {
    return p.replace(/\\/g, "/");
}

/**
 * Build mapping from entryPoint => output path (relative to OUTPUT_DIR_CLIENT).
 * Also collect CSS bundles emitted from JS entry points (metafile.outputs[*].cssBundle).
 */
function buildAssetMaps(metafile, outputDirClientAbs) {
    const entryToOutput = new Map(); // entryPoint -> output (string)
    const entryToCssBundle = new Map(); // entryPoint -> cssBundle (string, path into outputs)

    for (const [outPathKey, outMeta] of Object.entries(metafile.outputs || {})) {
        // esbuild provides paths relative to CWD; normalize to absolute, then make relative to OUTPUT_DIR_CLIENT.
        const outAbs = path.resolve(process.cwd(), outPathKey);
        const relToClient = toPosix(path.relative(outputDirClientAbs, outAbs));

        if (outMeta.entryPoint) {
            const entry = toPosix(outMeta.entryPoint);
            entryToOutput.set(entry, relToClient);

            if (outMeta.cssBundle) {
                // cssBundle is an output path string; normalize the same way
                const cssAbs = path.resolve(process.cwd(), outMeta.cssBundle);
                const cssRel = toPosix(path.relative(outputDirClientAbs, cssAbs));
                entryToCssBundle.set(entry, cssRel);
            }
        }
    }

    return { entryToOutput, entryToCssBundle };
}

/**
 * Write JSON file with pretty formatting.
 */
async function writeJson(filePath, data) {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

export function esbuildMetafilePlugin(options = {}) {
    const {
        // Allow overriding output locations for tests/customization; defaults taken from resolved constants.
        outputDirClient = OUTPUT_DIR_CLIENT,
        routesFile = ROUTES_FILE,
    } = options;

    return {
        name: "sxo-metafile",
        setup(build) {
            build.onEnd(async (result) => {
                try {
                    if (!result || !result.metafile) {
                        // No metafile -> nothing to do. Caller must ensure metafile: true.
                        return;
                    }

                    // Routing manifest written before builds (see esbuild.config.js)
                    let routes = [];
                    try {
                        const txt = await readFile(routesFile, "utf8");
                        routes = JSON.parse(txt);
                    } catch (e) {
                        console.warn("Metafile unable to read routes manifest:", routesFile, e?.message || e);
                        routes = [];
                    }

                    const outputDirClientAbs = path.resolve(outputDirClient);

                    const { entryToOutput, entryToCssBundle } = buildAssetMaps(result.metafile, outputDirClientAbs);

                    // Asset manifest removed: assets are now persisted per-route in routes.json (route.assets).

                    // Compute per-route assets and persist into routes.json (no HTML generation here)
                    for (const route of Array.isArray(routes) ? routes : []) {
                        if (!route || typeof route !== "object") continue;
                        if (typeof route.filename !== "string") continue;

                        const entryPoints = Array.isArray(route.entryPoints) ? route.entryPoints : [];
                        const cssRel = [];
                        const jsRel = [];

                        for (const ep of entryPoints) {
                            const epNorm = toPosix(String(ep));
                            const mapped = entryToOutput.get(epNorm);
                            if (!mapped || mapped.startsWith("..")) continue; // skip anything outside client dir

                            if (/\.(css)$/.test(epNorm)) {
                                // Explicit CSS entry (e.g., global.css)
                                if (!cssRel.includes(mapped)) cssRel.push(mapped);
                            } else if (/\.(m?jsx?|tsx?)$/.test(epNorm)) {
                                // Client JS entry
                                if (!jsRel.includes(mapped)) jsRel.push(mapped);

                                // If JS emitted a CSS bundle, add it
                                const cssBundleRel = entryToCssBundle.get(epNorm);
                                if (cssBundleRel && !cssRel.includes(cssBundleRel)) cssRel.push(cssBundleRel);
                            }
                        }

                        // Persist per-route assets (client-relative paths)
                        route.assets = { css: cssRel, js: jsRel };
                    }

                    // Write routes manifest once with updated assets
                    await writeJson(routesFile, routes);
                } catch (err) {
                    console.error("Metafile onEnd failure:", err);
                }
            });
        },
    };
}
