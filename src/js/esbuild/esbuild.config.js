import fs from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import esbuild from "esbuild";
import { OUTPUT_DIR_CLIENT, OUTPUT_DIR_SERVER, PAGES_DIR, ROUTES_FILE, SRC_DIR } from "../constants.js";
import { entryPointsConfig } from "./entry-points-config.js";
import { esbuildJsxPlugin } from "./esbuild-jsx.plugin.js";
import { esbuildMetafilePlugin } from "./esbuild-metafile.plugin.js";

/**
 * Generate modules.js with static imports for all SSR page modules.
 *
 * This file is required by adapters to load SSR modules without dynamic imports,
 * which is especially important for bundled environments like Cloudflare Workers.
 *
 * @param {Array<{jsx: string}>} routes - Route manifest entries
 * @returns {Promise<void>}
 */
async function generateModulesFile(routes) {
    const imports = [];
    const moduleMapEntries = [];

    // Get the relative pages directory from env (e.g., "src/pages")
    const pagesDirRelative = process.env.PAGES_DIR || "src/pages";

    routes.forEach((route, index) => {
        const varName = `_${index}`;

        // Convert jsx path to server build path
        // esbuild strips the common base directory (PAGES_DIR) from entry points
        // e.g., "src/pages/about/index.jsx" -> "./about/index.js"
        //       "src/pages/index.jsx" -> "./index.js"
        let serverPath = route.jsx.replace(/\.(jsx|tsx)$/i, ".js");

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

    const modulesPath = path.join(OUTPUT_DIR_SERVER, "modules.js");
    await writeFile(modulesPath, modulesContent);
}

try {
    const routes = entryPointsConfig();

    await mkdir(OUTPUT_DIR_CLIENT, { recursive: true });
    await mkdir(OUTPUT_DIR_SERVER, { recursive: true });

    const manifestFiles = routes.map((f) => ({ ...f, filename: f.filename }));
    await writeFile(ROUTES_FILE, JSON.stringify(manifestFiles, null, 2));

    const isDev = process.env.DEV === "true";

    let buildConfig = {};
    if (process.env.BUILD) {
        try {
            const parsed = JSON.parse(process.env.BUILD);
            if (parsed && typeof parsed === "object") {
                buildConfig = parsed;
            }
        } catch (err) {
            console.error("Invalid JSON in BUILD:", err);
        }
    }

    let serverLoaders = {};
    if (process.env.LOADERS) {
        try {
            const parsed = JSON.parse(process.env.LOADERS);
            if (parsed && typeof parsed === "object") {
                serverLoaders = parsed;
            }
        } catch (err) {
            console.error("Invalid JSON in LOADERS:", err);
        }
    }

    const specialServerEntries = (() => {
        const candidates = ["404.tsx", "404.jsx", "404.ts", "404.js", "500.tsx", "500.jsx", "500.ts", "500.js"];
        const entries = [];
        for (const name of candidates) {
            const abs = path.join(PAGES_DIR, name);
            try {
                fs.accessSync(abs, fs.constants.F_OK);
                const rel = path.relative(process.cwd(), abs).replace(/\\/g, "/");
                entries.push(rel);
            } catch {
                // ignore missing files
            }
        }
        return entries;
    })();

    const serverEntryPoints = [...routes.map((f) => f.jsx), ...specialServerEntries]; // SSR modules only (no client exposure)

    // Deduplicate client entry points (each route includes global.css, esbuild deduplicates during bundling)
    const clientEntryPoints = Array.from(new Set(routes.flatMap((f) => f.entryPoints)));

    await Promise.all([
        // Client (public) build
        esbuild.build({
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
            alias: {
                "@components": path.join(SRC_DIR, "components"),
                "@pages": PAGES_DIR,
                "@utils": path.join(SRC_DIR, "utils"),
            },
            ...buildConfig,
            metafile: true,
            plugins: [esbuildMetafilePlugin()],
        }),
        // Server (private SSR) build
        esbuild.build({
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
            loader: serverLoaders,
            alias: {
                "@components": path.join(SRC_DIR, "components"),
                "@pages": PAGES_DIR,
                "@utils": path.join(SRC_DIR, "utils"),
            },
            plugins: [esbuildJsxPlugin()],
        }),
    ]);

    // Generate modules.js after server build completes
    await generateModulesFile(routes);
} catch (_) {
    // console.error("Build failed:", error);
    process.exit(1);
}
