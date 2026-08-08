/**
 * sxo - Sleek cross-platform CLI
 * Node >= 20, ESM
 *
 * Commands:
 *  - dev:      Start the development server (prebuild + auto-open by default)
 *  - build:    Build the project with esbuild (env-driven minify/sourcemap)
 *  - start:    Start the production server
 *  - clean:    Remove the output directory
 *  - generate: Generate static HTML into dist from built routes
 *  - create:   Create a new SXO project
 *  - add:      Add a component from SXO
 */

import path from "node:path";

import { fileURLToPath } from "node:url";
import { createFileReader } from "@sxo/server/shared/file-readers";
import cac from "cac";
import { registerCommonOptions } from "./cli-helpers.js";
import { handleAddCommand } from "./commands/add.js";
import { handleBuildCommand } from "./commands/build.js";
import { handleCleanCommand } from "./commands/clean.js";
import { handleCreateCommand } from "./commands/create.js";
import { handleDevCommand } from "./commands/dev.js";
import { handleGenerateCommand } from "./commands/generate.js";
import { handleStartCommand } from "./commands/start.js";
import { shutdownHandler } from "./signal-handler.js";
import { printBanner } from "./ui.js";

const NAME = "sxo";
let VERSION = "0.0.0";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create file reader and read version from the nearest package.json whose name
// identifies the CLI package ("sxo" or "@sxo/cli"). This resolves correctly in
// the dev workspace, the monolith tarball, and a @sxo/cli-only tarball.
const fileReader = createFileReader();
try {
    let dir = __dirname;
    for (let depth = 0; depth < 8; depth += 1) {
        const pkgTxt = await fileReader.readText(path.join(dir, "package.json"));
        if (pkgTxt !== null) {
            const pkg = JSON.parse(pkgTxt);
            if (pkg.name === "sxo" || pkg.name === "@sxo/cli") {
                VERSION = pkg.version || VERSION;
                break;
            }
        }
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
} catch (err) {
    const verbose = process.env.VERBOSE === "true" || process.argv.includes("--verbose");
    if (verbose) {
        console.error(`Failed to read package.json: ${err instanceof Error ? err.message : String(err)}`);
    }
}

const cli = cac(NAME);

printBanner(`${NAME}`, VERSION, {});

cli.help();

/* dev */
registerCommonOptions(
    cli
        .command("dev", "Start the development server (prebuild + auto-open)")
        .option("--minify", "Enable minification for dev prebuild")
        .option("--no-minify", "Disable minification for dev prebuild")
        .option("--sourcemap", "Enable sourcemaps for dev prebuild")
        .option("--no-sourcemap", "Disable sourcemaps for dev prebuild")
        .option("--loaders <ext=loader>", "Loader mapping (.ext=loader). Repeat to set multiple"),
).action(handleDevCommand);

/* build */
registerCommonOptions(
    cli
        .command("build", "Build the project with esbuild")
        .option("--loaders <ext=loader>", "Loader mapping (.ext=loader). Repeat to set multiple"),
).action(handleBuildCommand);

/* start */
registerCommonOptions(cli.command("start", "Start the production server")).action(handleStartCommand);

/* clean */
registerCommonOptions(cli.command("clean", "Remove the output directory"))
    .option("-y, --yes", "Skip confirmation")
    .action(handleCleanCommand);

/* generate */
cli.command("generate", "Generate static HTML into dist from built routes")
    .option("--out-dir <dir>", "Output directory (default: dist)")
    .option("--public-path <path>", "Public base URL for assets (default: /)")
    .option("--client-dir <name>", "Per-route client subdirectory (default: client)")
    .option("--verbose", "Verbose output")
    .option("--no-color", "Disable colors")
    .action(handleGenerateCommand);

/* create */
cli.command("create [project-name]", "Create a new SXO project").action(handleCreateCommand);

/* add */
registerCommonOptions(cli.command("add <component>", "Add a component from SXO")).action(handleAddCommand);

cli.parse();

// Setup global shutdown handler for clean terminal output
shutdownHandler();
