import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Import the WASM-powered JSX transformer
import { jsx } from "../../../jsx-transformer/jsx_transformer.js";

// Path to helpers (used for the virtual module)
const HELPERS_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "./jsx-helpers.js");
const HELPERS_VIRTUAL_MODULE = "virtual:jsx-helpers";

let helpersCache = null;
async function getHelpers() {
    if (!helpersCache) {
        helpersCache = await fs.readFile(HELPERS_PATH, "utf8");
    }
    return helpersCache;
}

/**
 * esbuild plugin: esbuild-jsx
 * Transforms JSX in .jsx/.tsx files using the WASM-powered jsx_transformer.js.
 */
export function esbuildJsxPlugin() {
    const filter = /\.(jsx|tsx)$/;

    return {
        name: "jsx-transform",
        setup(build) {
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

            // Transform .jsx/.tsx files and import the helpers module
            build.onLoad({ filter }, async (args) => {
                // Read the source file
                let source;
                try {
                    source = await fs.readFile(args.path, "utf8");
                } catch (err) {
                    return {
                        errors: [
                            {
                                text: `Failed to read file: ${path.relative(process.cwd(), args.path)}\n${err}`,
                            },
                        ],
                    };
                }

                // Transform the code using the WASM-powered jsx function
                let transformed;
                try {
                    transformed = jsx(source);
                } catch (err) {
                    return {
                        errors: [
                            {
                                text: `${err}`,
                            },
                        ],
                    };
                }

                // Import the helpers virtual module at the top
                const finalOutput = `import "${HELPERS_VIRTUAL_MODULE}";\n\n${transformed}`;

                return {
                    // Use jsx/tsx loader so esbuild can still parse any residual JSX the WASM
                    // transformer intentionally leaves (e.g. fragments) instead of erroring with "loader: js".
                    contents: finalOutput,
                    loader: args.path.endsWith(".tsx") ? "tsx" : "jsx",
                };
            });

            // This hook renames hashed index files
            build.onEnd((result) => {
                if (!result.metafile || !result.metafile.outputs) {
                    return;
                }

                const outputs = result.metafile.outputs;
                Object.keys(outputs).forEach(async (path) => {
                    if (path.endsWith("index.js")) {
                        const newPath = path.replace(/\/([^/]+\.index.js)$/, "/index.js");
                        await fs.rename(path, newPath);
                    }
                });
            });
        },
    };
}
