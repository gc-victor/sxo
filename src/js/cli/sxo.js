/**
 * sxo - Sleek cross-platform CLI
 * Node >= 20, ESM
 *
 * Commands:
 *  - dev:     Start the development server (prebuild + auto-open by default)
 *  - build:   Build the project with esbuild (env-driven minify/sourcemap)
 *  - start:   Start the production server
 *  - clean:   Remove the output directory
 */

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { fileURLToPath } from "node:url";
import cac from "cac";
import { resolveConfig } from "../config.js";
import { ESBUILD_CONFIG_FILE, ROUTES_RELATIVE_PATH, SERVER_DEV_FILE, SERVER_PROD_FILE } from "../constants.js";
import { handleAddCommand } from "./add.js";
import {
    absoluteScript,
    askYesNo,
    ensureBuiltRoutesJson,
    ensureDir,
    getUrl,
    pathExists,
    prepareFlags,
    printBuildSummary,
    registerCommonOptions,
    toPosixPath,
    validatePagesFolder,
} from "./cli-helpers.js";
import { openWhenReady } from "./open.js";
import { runNode, spawnNode } from "./spawn.js";
import { createSpinner, log, printBanner } from "./ui.js";

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
).action(async (_flags) => {
    const root = path.resolve(process.cwd());

    try {
        // centralized explicit flag handling (see prepareFlags)
        const { flagsForConfig, flagsExplicit } = prepareFlags("dev", _flags);
        const cfg = await resolveConfig({ cwd: root, flags: flagsForConfig, flagsExplicit, command: "dev" });

        await validatePagesFolder(cfg.pagesDir);

        // Prebuild (explicit) before launching dev server
        const prebuildSpinner = createSpinner("Prebuilding", { enabled: process.stdout.isTTY });
        prebuildSpinner.start();

        cfg.env.DEV = "true";

        const prebuildRes = await runNode(ESBUILD_CONFIG_FILE, {
            cwd: root,
            env: cfg.env,
            stdio: "inherit",
        });

        if (!prebuildRes.success) {
            prebuildSpinner.fail("Prebuild failed");
            log.error("Couldn't generate routes with esbuild.");
            log.info(`- PAGES_DIR: ${toPosixPath(cfg.pagesDir)}`);
            log.info(`- Expected: ${toPosixPath(cfg.pagesDir)}/index.html`);
            log.info("- Hint: run with --pages-dir or set PAGES_DIR to your pages root (e.g., examples/basic/src/pages).");
            process.exitCode = prebuildRes.code ?? 1;
            return;
        } else {
            prebuildSpinner.succeed("Prebuild complete");
        }

        // Ensure dist exists (esbuild config already mkdir -p)
        await ensureDir(cfg.outDir);

        // Spawn dev server
        const { child, wait } = spawnNode(absoluteScript(root, SERVER_DEV_FILE), {
            cwd: root,
            env: cfg.env,
            stdio: "inherit",
        });

        // Auto-open if configured
        if (cfg.open) {
            const ctrl = new AbortController();
            child.once("exit", () => ctrl.abort());
            const res = await openWhenReady({
                port: cfg.port,
                pathname: "/",
                timeoutMs: 12000,
                signal: ctrl.signal,
                verbose: !!cfg.verbose,
            });

            if (res.timedOut) {
                log.warn(`Timed out waiting for ${getUrl(cfg.port)}`);
            }
        }

        const result = await wait;
        if (!result.success) process.exitCode = result.code ?? 1;
    } catch (e) {
        const msg = e && typeof e === "object" && "message" in e ? e.message : String(e);
        log.error(`dev failed: ${msg}`);
        process.exitCode = 1;
    }
});

/* build */
registerCommonOptions(
    cli
        .command("build", "Build the project with esbuild")
        .option("--loaders <ext=loader>", "Loader mapping (.ext=loader). Repeat to set multiple"),
).action(async (_flags) => {
    const root = path.resolve(process.cwd());

    try {
        log.info("Starting build process...");
        // centralized explicit flag handling (see prepareFlags)
        const { flagsForConfig, flagsExplicit } = prepareFlags("build", _flags);
        log.info("Flags for config:", flagsForConfig, "Explicit flags:", flagsExplicit);
        const cfg = await resolveConfig({ cwd: root, flags: flagsForConfig, flagsExplicit, command: "build" });

        log.info(`Validating pages folder: ${toPosixPath(cfg.pagesDir)}`);
        await validatePagesFolder(cfg.pagesDir);

        const s = createSpinner("Building...", { enabled: process.stdout.isTTY });
        s.start();

        log.info("Running build...");
        const res = await runNode(ESBUILD_CONFIG_FILE, {
            cwd: root,
            env: cfg.env,
            stdio: "inherit",
        });

        if (!res.success) {
            s.fail("Build failed");
            log.error("esbuild process failed.");
            process.exitCode = res.code ?? 1;
            return;
        }

        log.info("Checking generated routes JSON...");
        const hasFiles = await ensureBuiltRoutesJson();
        if (!hasFiles) {
            s.fail(`Build did not produce ${ROUTES_RELATIVE_PATH} (check pages and templates)`);
            log.error(`Missing ${ROUTES_RELATIVE_PATH} after build.`);
            process.exitCode = 1;
            return;
        }

        s.succeed("Build complete");
        await printBuildSummary(cfg.outDir, cfg.pagesDir);
    } catch (e) {
        const msg = e && typeof e === "object" && "message" in e ? e.message : String(e);
        log.error(`build failed: ${msg}`);
        process.exitCode = 1;
    }
});

/* start */
registerCommonOptions(cli.command("start", "Start the production server")).action(async (_flags) => {
    const root = path.resolve(process.cwd());
    try {
        // centralized explicit flag handling (see prepareFlags)
        const { flagsForConfig, flagsExplicit } = prepareFlags("start", _flags);
        const cfg = await resolveConfig({ cwd: root, flags: flagsForConfig, flagsExplicit, command: "start" });

        const filesJsonOk = await ensureBuiltRoutesJson();
        if (!filesJsonOk) {
            log.error(`Missing ${ROUTES_RELATIVE_PATH}`);
            log.info("Run `sxo build` to build the project");
            process.exitCode = 1;
            return;
        }

        const { wait } = spawnNode(absoluteScript(root, SERVER_PROD_FILE), {
            cwd: root,
            env: { ...cfg.env, NODE_ENV: "production" },
            stdio: "inherit",
        });

        const result = await wait;
        if (!result.success) process.exitCode = result.code ?? 1;
    } catch (e) {
        const msg = e && typeof e === "object" && "message" in e ? e.message : String(e);
        log.error(`start failed: ${msg}`);
        process.exitCode = 1;
    }
});

/* clean */
registerCommonOptions(cli.command("clean", "Remove the output directory"))
    .option("--yes", "Skip confirmation")
    .action(async (_flags) => {
        const root = path.resolve(process.cwd());
        try {
            // centralized explicit flag handling (see prepareFlags)
            const { flagsForConfig, flagsExplicit } = prepareFlags("clean", _flags);
            const cfg = await resolveConfig({ cwd: root, flags: flagsForConfig, flagsExplicit, command: "clean" });

            const target = cfg.outDir;
            const exists = await pathExists(target);
            if (!exists) {
                log.info(`Nothing to clean: ${toPosixPath(target)}`);
                return;
            }

            let proceed = !!_flags.yes;
            if (!proceed && process.stdout.isTTY) {
                proceed = await askYesNo(`Remove ${toPosixPath(target)}?`);
            }
            if (!proceed) {
                log.warn("Cancelled");
                return;
            }

            const s = createSpinner(`Removing ${toPosixPath(target)}...`, { enabled: process.stdout.isTTY });
            s.start();
            await fsp.rm(target, { recursive: true, force: true, maxRetries: 2 });
            s.succeed("Cleaned");
        } catch (e) {
            const msg = e && typeof e === "object" && "message" in e ? e.message : String(e);
            log.error(`clean failed: ${msg}`);
            process.exitCode = 1;
        }
    });

/* generate */
registerCommonOptions(cli.command("generate", "Generate static HTML into dist from built routes")).action(async (_flags) => {
    const root = path.resolve(process.cwd());
    try {
        // Reuse build flags set; generation uses built outputs
        const { flagsForConfig, flagsExplicit } = prepareFlags("build", _flags);
        const cfg = await resolveConfig({ cwd: root, flags: flagsForConfig, flagsExplicit, command: "build" });

        const filesJsonOk = await ensureBuiltRoutesJson();
        if (!filesJsonOk) {
            log.error(`Missing ${ROUTES_RELATIVE_PATH}`);
            log.info("Run `sxo build` first to build the project");
            process.exitCode = 1;
            return;
        }

        // Ensure the generate module sees resolved OUTPUT_DIR_* and related env
        Object.assign(process.env, cfg.env);

        const { generate } = await import("../generate/generate.js");

        const s = createSpinner("Generating...", { enabled: process.stdout.isTTY });
        s.start();
        const res = await generate();
        if (!res || res.ok === false) {
            s.fail("Generate failed");
            process.exitCode = 1;
            return;
        }
        s.succeed("Generate complete");
    } catch (e) {
        const msg = e && typeof e === "object" && "message" in e ? e.message : String(e);
        log.error(`generate failed: ${msg}`);
        process.exitCode = 1;
    }
});

/* add */
registerCommonOptions(cli.command("add <component>", "Add a component from SXO")).action(async (component, _flags) => {
    const root = path.resolve(process.cwd());

    try {
        // centralized explicit flag handling (see prepareFlags)
        const { flagsForConfig, flagsExplicit } = prepareFlags("add", _flags);
        const cfg = await resolveConfig({ cwd: root, flags: flagsForConfig, flagsExplicit, command: "add" });

        const success = await handleAddCommand(component, { ...cfg, cwd: root });
        if (!success) {
            process.exitCode = 1;
        }
    } catch (e) {
        const msg = e && typeof e === "object" && "message" in e ? e.message : String(e);
        log.error(`add failed: ${msg}`);
        process.exitCode = 1;
    }
});

cli.parse();
