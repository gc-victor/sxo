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

import fs from "node:fs";
import path from "node:path";

import { fileURLToPath } from "node:url";
import cac from "cac";
import { registerCommonOptions } from "./cli-helpers.js";
import {
    handleAddCommand,
    handleBuildCommand,
    handleCleanCommand,
    handleCreateCommand,
    handleDevCommand,
    handleGenerateCommand,
    handleStartCommand,
} from "./commands.js";
import { printBanner } from "./ui.js";

/* ----------------------------- constants ----------------------------- */

const NAME = "sxo";
let VERSION = "0.0.0";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
try {
    const pkgTxt = fs.readFileSync(path.resolve(__dirname, "../../../package.json"), "utf8");
    VERSION = JSON.parse(pkgTxt).version || VERSION;
} catch {}

/* ------------------------------ commands ------------------------------ */

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
registerCommonOptions(cli.command("generate", "Generate static HTML into dist from built routes")).action(handleGenerateCommand);

/* create */
cli.command("create <project-name>", "Create a new SXO project").action(handleCreateCommand);

/* add */
registerCommonOptions(cli.command("add <component>", "Add a component from SXO")).action(handleAddCommand);

cli.parse();
