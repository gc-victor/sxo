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
 *  - It relies on pre-written routes manifest (written before builds)
 *    at dist/server/routes.json for route metadata.
 *  - This plugin does not write HTML. HTML files are only created by CLI `generate` step.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { OUTPUT_DIR_CLIENT, ROUTES_FILE } from "sxo/server/constants";
import { createFileReader } from "sxo/server/shared/file-readers";
import { convertToPosixSlashes } from "../shared/path-utils.js";

// Create file reader
const fileReader = createFileReader();

/**
 * Build mapping from entryPoint => output path (relative to OUTPUT_DIR_CLIENT).
 * Also collect CSS bundles emitted from JS entry points (metafile.outputs[*].cssBundle).
 *
 * @param {{ outputs?: Record<string, { entryPoint?: string, cssBundle?: string }> }} metafile - esbuild metafile
 * @param {string} outputDirClientAbs - Absolute path to output client directory
 * @returns {{ entryToOutput: Map<string, string>, entryToCssBundle: Map<string, string> }} Asset mapping
 */
function buildAssetMaps(metafile, outputDirClientAbs) {
    const entryToOutput = new Map(); // entryPoint -> output (string)
    const entryToCssBundle = new Map(); // entryPoint -> cssBundle (string, path into outputs)

    for (const [outPathKey, outMeta] of Object.entries(metafile.outputs || {})) {
        // esbuild provides paths relative to CWD; normalize to absolute, then make relative to OUTPUT_DIR_CLIENT.
        const outAbs = path.resolve(process.cwd(), outPathKey);
        const relToClient = convertToPosixSlashes(path.relative(outputDirClientAbs, outAbs));

        if (outMeta.entryPoint) {
            const entry = convertToPosixSlashes(outMeta.entryPoint);
            entryToOutput.set(entry, relToClient);

            if (outMeta.cssBundle) {
                // cssBundle is an output path string; normalize the same way
                const cssAbs = path.resolve(process.cwd(), outMeta.cssBundle);
                const cssRel = convertToPosixSlashes(path.relative(outputDirClientAbs, cssAbs));
                entryToCssBundle.set(entry, cssRel);
            }
        }
    }

    return { entryToOutput, entryToCssBundle };
}

/**
 * Write JSON file with pretty formatting.
 *
 * @param {string} filePath - Path to write file
 * @param {object} data - Data to write as JSON
 * @returns {Promise<void>}
 */
async function writeJson(filePath, data) {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

async function readRoutesManifest(routesFile) {
    try {
        const text = await fileReader.readText(routesFile);
        return text ? JSON.parse(text) : [];
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn("Metafile unable to read routes manifest:", routesFile, message);
        return [];
    }
}

function addEntryAssets(entryPoint, maps, assets) {
    const normalizedEntry = convertToPosixSlashes(String(entryPoint));
    const mappedOutput = maps.entryToOutput.get(normalizedEntry);
    if (!mappedOutput || mappedOutput.startsWith("..")) return;

    if (/\.(css)$/.test(normalizedEntry)) {
        if (!assets.css.includes(mappedOutput)) assets.css.push(mappedOutput);
        return;
    }
    if (!/\.(m?jsx?|tsx?)$/.test(normalizedEntry)) return;

    if (!assets.js.includes(mappedOutput)) assets.js.push(mappedOutput);
    const cssBundle = maps.entryToCssBundle.get(normalizedEntry);
    if (cssBundle && !assets.css.includes(cssBundle)) assets.css.push(cssBundle);
}

function collectRouteAssets(entryPoints, maps) {
    const assets = { css: [], js: [] };
    for (const entryPoint of Array.isArray(entryPoints) ? entryPoints : []) {
        addEntryAssets(entryPoint, maps, assets);
    }
    return assets;
}

function updateRouteAssets(routes, maps) {
    for (const route of Array.isArray(routes) ? routes : []) {
        if (!route || typeof route !== "object" || typeof route.filename !== "string") continue;
        route.assets = collectRouteAssets(route.entryPoints, maps);
    }
}

async function handleMetafileEnd(result, outputDirClient, routesFile) {
    if (!result?.metafile) return;

    try {
        const routes = await readRoutesManifest(routesFile);
        const maps = buildAssetMaps(result.metafile, path.resolve(outputDirClient));
        updateRouteAssets(routes, maps);
        await writeJson(routesFile, routes);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Metafile onEnd failure:", error);
        return {
            errors: [{ text: `Metafile plugin failed to persist manifest: ${message}` }],
        };
    }
}

/**
 * Create esbuild metafile plugin.
 *
 * @param {{ outputDirClient?: string, routesFile?: string }} [options={}] - Plugin options
 * @returns {{ name: string, setup: Function }} esbuild plugin
 */
export function esbuildMetafilePlugin(options = {}) {
    const {
        // Allow overriding output locations for tests/customization; defaults taken from resolved constants.
        outputDirClient = OUTPUT_DIR_CLIENT,
        routesFile = ROUTES_FILE,
    } = options;

    return {
        name: "sxo-metafile",
        /** @param {{ onEnd: (callback: (result: { metafile?: unknown }) => Promise<void | { errors: { text: string }[] }>) => void }} build */
        setup(build) {
            build.onEnd((/** @type {{ metafile?: unknown }} */ result) => handleMetafileEnd(result, outputDirClient, routesFile));
        },
    };
}
