import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { htmlPlugin } from "@craftamap/esbuild-plugin-html";
import esbuild from "esbuild";
import { OUTPUT_DIR_CLIENT, OUTPUT_DIR_SERVER, PAGES_DIR, ROUTES_FILE, SRC_DIR } from "../constants.js";
import { entryPointsConfig } from "./entry-points-config.js";
import { esbuildJsxPlugin } from "./esbuild-jsx.plugin.js";

try {
    const config = entryPointsConfig();

    await mkdir(OUTPUT_DIR_CLIENT, { recursive: true });
    await mkdir(OUTPUT_DIR_SERVER, { recursive: true });

    const manifestFiles = config.map((f) => ({ ...f, filename: f.filename }));
    await writeFile(ROUTES_FILE, JSON.stringify(manifestFiles, null, 2));

    const isDev = process.env.DEV === "true";
    const minify = process.env.MINIFY ? process.env.MINIFY === "true" : true;
    const sourcemap = process.env.SOURCEMAP ? (process.env.SOURCEMAP === "true" ? "inline" : false) : isDev ? "inline" : false;
    let loaders = {};
    if (process.env.LOADERS) {
        try {
            const parsed = JSON.parse(process.env.LOADERS);
            if (parsed && typeof parsed === "object") {
                loaders = parsed;
            }
        } catch (err) {
            console.error("Invalid JSON in LOADERS:", err);
        }
    }

    const serverEntryPoints = config.map((f) => f.jsx); // SSR modules only (no client exposure)
    await Promise.all([
        // Client (public) build
        esbuild.build({
            bundle: true,
            platform: "browser",
            format: "esm",
            outdir: OUTPUT_DIR_CLIENT,
            entryPoints: [...config.flatMap((f) => f.entryPoints)],
            entryNames: process.env.DEV === "true" ? "[dir]/[name]" : "[dir]/[name].[hash]",
            chunkNames: "chunks/[name].[hash]",
            assetNames: "[dir]/[name].[hash]",
            minify: minify,
            sourcemap: sourcemap,
            publicPath: process.env.PUBLIC_PATH ?? "/",
            loader: loaders,
            alias: {
                "@components": path.join(SRC_DIR, "components"),
                "@pages": PAGES_DIR,
                "@utils": path.join(SRC_DIR, "utils"),
            },
            plugins: [
                htmlPlugin({
                    files: config,
                }),
            ],
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
            minify: false,
            sourcemap: false,
            loader: loaders,
            alias: {
                "@components": path.join(SRC_DIR, "components"),
                "@pages": PAGES_DIR,
                "@utils": path.join(SRC_DIR, "utils"),
            },
            plugins: [esbuildJsxPlugin()],
        }),
    ]);
} catch (_) {}
