import fs from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";
import { resolveAliases } from "../config/aliases.js";
import { OUTPUT_DIR_CLIENT, OUTPUT_DIR_SERVER, PAGES_DIR, ROUTES_FILE, SRC_DIR } from "../constants.js";
import { entryPointsConfig } from "./entry-points-config.js";
import { esbuildJsxPlugin } from "./esbuild-jsx.plugin.js";
import { esbuildMetafilePlugin } from "./esbuild-metafile.plugin.js";

/**
 * Discover special server entry point files (404, 500 error pages) in the pages directory.
 *
 * Checks for error page files with various extensions in the order:
 * .tsx, .jsx, .ts, .js. Returns paths relative to the current working directory.
 *
 * @param {string} pagesDir - Absolute path to the pages directory
 * @returns {string[]} Array of relative paths to existing error page files
 */
export function discoverSpecialServerEntries(pagesDir) {
    const candidates = ["404.tsx", "404.jsx", "404.ts", "404.js", "500.tsx", "500.jsx", "500.ts", "500.js"];
    const entries = [];

    for (const name of candidates) {
        const absPath = path.join(pagesDir, name);
        try {
            fs.accessSync(absPath, fs.constants.F_OK);
            const relativePath = path.relative(process.cwd(), absPath).replace(/\\/g, "/");
            entries.push(relativePath);
        } catch {
            // File doesn't exist, ignore it
        }
    }

    return entries;
}

/**
 * @typedef {{filename: string, entryPoints: string[], jsx: string, scriptLoading: string, hash: boolean, path?: string, isErrorPage?: boolean}} Route
 */

/**
 * Generate modules.js with static imports for all SSR page modules.
 *
 * This file is required by adapters to load SSR modules without dynamic imports,
 * which is especially important for bundled environments like Cloudflare Workers.
 *
 * @param {Array<Route>} routes - Route manifest entries
 * @param {string} outDir - Output directory (defaults to OUTPUT_DIR_SERVER)
 * @returns {Promise<void>}
 */
export async function generateModulesFile(routes, outDir = OUTPUT_DIR_SERVER) {
    /** @type {string[]} */
    const imports = [];
    /** @type {string[]} */
    const moduleMapEntries = [];

    // Get the relative pages directory from env (e.g., "src/pages")
    const pagesDirRelative = process.env.PAGES_DIR || "src/pages";

    routes.forEach((route, index) => {
        const varName = `_${index}`;

        // Convert jsx path to server build path
        // esbuild strips the common base directory (PAGES_DIR) from entry points
        // e.g., "src/pages/about/index.jsx" -> "./about/index.js"
        //       "src/pages/index.jsx" -> "./index.js"
        let serverPath = route.jsx.replace(/\.(jsx|tsx|ts)$/i, ".js");

        // Strip PAGES_DIR prefix (e.g., "src/pages/")
        if (serverPath.startsWith(`${pagesDirRelative}/`)) {
            serverPath = serverPath.slice(pagesDirRelative.length + 1); // +1 for trailing slash
        } else if (serverPath === pagesDirRelative) {
            serverPath = "index.js"; // Edge case: if jsx is exactly pagesDirRelative
        }

        imports.push(`import * as ${varName} from "./${serverPath}";`);
        moduleMapEntries.push(`    "${route.jsx}": ${varName}`);
    });

    const modulesContent = `/**
 * Auto-generated SSR modules file.
 * DO NOT EDIT - regenerated on each build.
 */

${imports.join("\n")}

export default {
${moduleMapEntries.join(",\n")}
};
`;

    const modulesPath = path.join(outDir, "modules.js");
    await writeFile(modulesPath, modulesContent);
}

/**
 * Allowed BUILD env override keys for client builds.
 * These are safe, intentional options that do not compromise build integrity.
 *
 * @type {string[]}
 */
const ALLOWED_BUILD_KEYS = [
    "minify",
    "sourcemap",
    "target",
    "format",
    "define",
    "drop",
    "external",
    "keepNames",
    "mangleProps",
    "reserveProps",
    "treeShaking",
    "ignoreAnnotations",
    "charset",
    "legalComments",
    "lineLimit",
];

/**
 * Filter build config to only allow safe override keys.
 *
 * @param {object} config - Raw config from BUILD env variable
 * @returns {object} Filtered config with only allowed keys
 */
export function filterBuildConfig(config) {
    /** @type {Record<string, unknown>} */
    const filtered = {};
    for (const key of ALLOWED_BUILD_KEYS) {
        if (key in config) {
            filtered[key] = config[key];
        }
    }
    return filtered;
}

/**
 * Parse JSON from environment variable with safe error handling.
 *
 * @param {string} key - Environment variable name (e.g., "BUILD", "LOADERS")
 * @param {object} defaultValue - Default value to return if parsing fails or env var is unset
 * @returns {object} Parsed JSON object or default value
 */
export function parseEnvJson(key, defaultValue = {}) {
    if (!process.env[key]) {
        return defaultValue;
    }

    try {
        const parsed = JSON.parse(process.env[key]);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return parsed;
        }
    } catch (err) {
        console.error(`Invalid JSON in ${key}:`, err);
    }

    return defaultValue;
}

/**
 * Run the build process.
 *
 * @param {object} [options] - Build options for testing
 * @param {() => Array<Route>} [options.getConfig] - Function to get entry points config
 * @param {typeof esbuild.build} [options.build] - esbuild build function
 * @param {typeof writeFile} [options.write] - fs writeFile function
 * @param {typeof mkdir} [options.makeDir] - fs mkdir function
 * @param {typeof process.exit} [options.exit] - process exit function
 * @returns {Promise<void>}
 */
export async function run({
    getConfig = entryPointsConfig,
    build = esbuild.build,
    write = writeFile,
    makeDir = mkdir,
    exit = process.exit,
} = {}) {
    try {
        /** @type {Array<Route>} */
        const routes = getConfig();

        await makeDir(OUTPUT_DIR_CLIENT, { recursive: true });
        await makeDir(OUTPUT_DIR_SERVER, { recursive: true });

        const manifestFiles = routes.map((f) => ({ ...f, filename: f.filename }));
        await write(ROUTES_FILE, JSON.stringify(manifestFiles, null, 2));

        const isDev = process.env.DEV === "true";

        const rawBuildConfig = parseEnvJson("BUILD", {});
        const buildConfig = filterBuildConfig(rawBuildConfig);
        const serverLoaders = parseEnvJson("LOADERS", {});

        const sharedAliases = resolveAliases(SRC_DIR, PAGES_DIR);

        const specialServerEntries = discoverSpecialServerEntries(PAGES_DIR);

        const serverEntryPoints = [...routes.map((f) => f.jsx), ...specialServerEntries]; // SSR modules only (no client exposure)

        // Deduplicate client entry points (each route includes global.css, esbuild deduplicates during bundling)
        const clientEntryPoints = Array.from(new Set(routes.flatMap((f) => f.entryPoints)));

        await Promise.all([
            // Client (public) build
            build({
                bundle: true,
                platform: "browser",
                format: "esm",
                outdir: OUTPUT_DIR_CLIENT,
                entryPoints: clientEntryPoints,
                entryNames: process.env.DEV === "true" ? "[dir]/[name]" : "[dir]/[name].[hash]",
                chunkNames: "chunks/[name].[hash]",
                assetNames: "[dir]/[name].[hash]",
                minify: true,
                sourcemap: isDev ? "inline" : false,
                legalComments: "none",
                splitting: true,
                publicPath: process.env.PUBLIC_PATH ?? "/",
                define: {
                    "process.env.NODE_ENV": JSON.stringify(
                        process.env.DEV === "true" || process.env.NODE_ENV === "test" ? "development" : "production",
                    ),
                },
                alias: sharedAliases,
                ...buildConfig,
                metafile: true,
                plugins: [/** @type {esbuild.Plugin} */ (esbuildMetafilePlugin())],
            }),
            // Server (private SSR) build
            build({
                bundle: true,
                platform: "node",
                format: "esm",
                outdir: OUTPUT_DIR_SERVER,
                jsx: "preserve",
                entryPoints: serverEntryPoints,
                entryNames: "[dir]/[name]",
                chunkNames: "chunks/[name].[hash]",
                minify: true,
                sourcemap: false,
                legalComments: "none",
                loader: /** @type {Record<string, esbuild.Loader>} */ (serverLoaders),
                alias: sharedAliases,
                plugins: [esbuildJsxPlugin({ outputDir: OUTPUT_DIR_SERVER })],
            }),
        ]);

        // Generate modules.js after server build completes
        await generateModulesFile(routes);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`\x1b[31m■ \x1b[0m${errorMessage}`);
        exit(1);
    }
}

// Run if this is the main module
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    run();
}
