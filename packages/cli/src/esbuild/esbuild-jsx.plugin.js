import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
// Import file reader for unified file reading
import { createFileReader } from "@sxo/server/shared/file-readers";
// Import WASM-powered JSX transformer
import { jsx } from "../../jsx-transformer/jsx_transformer.js";

// Path to helpers (used for virtual module)
const HELPERS_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "./jsx-helpers.js");

// Create file reader
const fileReader = createFileReader();
const HELPERS_VIRTUAL_MODULE = "virtual:jsx-helpers";

/**
 * @typedef {import("../server/shared/file-readers.js").FileReader} FileReader
 */

/**
 * esbuild plugin: esbuild-jsx
 * Transforms JSX in .jsx/.tsx files using the WASM-powered jsx_transformer.js.
 *
 * @param {object} [options] - Plugin options for testing
 * @param {typeof jsx} [options.transformer] - JSX transformer function
 * @param {string} [options.helpersPath] - Path to jsx-helpers.js
 * @param {FileReader} [options.reader] - File reader with readText method
 * @param {string} [options.outputDir] - Output directory to scope rename operations to
 */
export function esbuildJsxPlugin({ transformer = jsx, helpersPath = HELPERS_PATH, reader = fileReader, outputDir } = {}) {
    const filter = /\.(jsx|tsx)$/;

    let helpersCache = null;
    let helpersPromise = null;
    async function getHelpers() {
        if (helpersCache) return helpersCache;
        if (helpersPromise) return helpersPromise;
        helpersPromise = (async () => {
            const content = await reader.readText(helpersPath);
            if (content === null) {
                throw new Error(`Failed to read helpers file: ${helpersPath}`);
            }
            helpersCache = content;
            helpersPromise = null;
            return helpersCache;
        })();
        try {
            return await helpersPromise;
        } catch (err) {
            helpersPromise = null;
            throw err;
        }
    }

    return {
        name: "jsx-transform",
        setup(/** @type {import("esbuild").PluginBuild} */ build) {
            // Register the virtual module for helpers
            build.onResolve({ filter: new RegExp(`^${HELPERS_VIRTUAL_MODULE}$`) }, () => ({
                path: HELPERS_VIRTUAL_MODULE,
                namespace: "jsx-helpers",
            }));

            build.onLoad({ filter: /.*/, namespace: "jsx-helpers" }, async () => {
                const helpers = await getHelpers();
                return {
                    contents: helpers,
                    loader: "js",
                };
            });

            // Transform JSX using the WASM transformer and inject helpers
            build.onLoad({ filter }, async (args) => {
                // Read the source file
                let source;
                try {
                    source = await fsp.readFile(args.path, "utf8");
                } catch (err) {
                    return {
                        errors: [
                            {
                                text: `Failed to read file: ${path.relative(process.cwd(), args.path)}\n${err}`,
                            },
                        ],
                    };
                }

                // Apply the WASM JSX transformer
                let transformed;
                try {
                    transformed = transformer(source);
                } catch (err) {
                    return {
                        errors: [
                            {
                                text: `Transformer parse error: ${err.message || err}`,
                            },
                        ],
                    };
                }

                // Import the helpers virtual module at the top
                const finalOutput = `import "${HELPERS_VIRTUAL_MODULE}";\n\n${transformed}`;

                // tsx files still need TypeScript type stripping; jsx files are plain JS after transform
                return {
                    contents: finalOutput,
                    loader: args.path.endsWith(".tsx") ? "tsx" : "js",
                };
            });

            // This hook consolidates hashed index files (<name>.index.js) to index.js
            // within the server output directory
            build.onEnd(async (result) => {
                if (!result.metafile?.outputs) {
                    return;
                }

                const outputs = result.metafile.outputs;
                await Promise.all(
                    Object.keys(outputs).map(async (p) => {
                        // Only rename files matching <name>.index.js pattern (not plain index.js)
                        // Regex captures: (directory/)(name.index.js)
                        const match = p.match(/^(.*\/)([^/]+\.index\.js)$/);
                        if (match && (!outputDir || p.startsWith(outputDir))) {
                            // Replace <name>.index.js with index.js (consolidation)
                            const dir = match[1];
                            const newPath = `${dir}index.js`;
                            await fsp.rename(p, newPath);
                        }
                    }),
                );
            });
        },
    };
}
