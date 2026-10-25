import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { resolveConfig } from "@sxo/server/config";
import { detectRuntime } from "@sxo/server/shared/runtime";
import { convertToPosixSlashes } from "../../shared/path-utils.js";
import { absoluteScript, ensureDir, getUrl, prepareFlags, validatePagesFolder } from "../cli-helpers.js";
import { openWhenReady } from "../open.js";
import { runRuntime, spawnRuntime } from "../spawn.js";
import { createSpinner, log } from "../ui.js";
import { getCliScriptPaths, getErrorMessage } from "./utils.js";

const { ESBUILD_CONFIG_FILE, RESOLVE_ALIASES_HOOK, SERVER_DEV_FILE } = getCliScriptPaths(import.meta.url);

async function prebuildDevServer(cfg, root, impl) {
    const spinner = createSpinner("Prebuilding", { enabled: process.stdout.isTTY });
    spinner.start();

    cfg.env.DEV = "true";
    cfg.env.SXO_ESBUILD_CONFIG_FILE = ESBUILD_CONFIG_FILE;
    const result = await impl.runRuntime(ESBUILD_CONFIG_FILE, {
        cwd: root,
        env: cfg.env,
        stdio: "inherit",
    });

    if (!result.success) {
        spinner.fail("Prebuild failed");
        log.error("Couldn't generate routes with esbuild. Check the error above for details.");
        log.info(`- PAGES_DIR: ${convertToPosixSlashes(cfg.pagesDir)}`);
        log.info("- Hint: run with --pages-dir or set PAGES_DIR to your pages root.");
        process.exitCode = result.code ?? 1;
        return false;
    }

    spinner.succeed("Prebuild complete");
    return true;
}

function getDevRuntimeOptions(root) {
    const options = [];
    if (detectRuntime() === "node" && existsSync(RESOLVE_ALIASES_HOOK)) {
        const tsconfigPath = path.join(root, "tsconfig.json");
        if (existsSync(tsconfigPath)) {
            options.push("--import", RESOLVE_ALIASES_HOOK);
        }
    }
    return options;
}

async function openDevBrowser(cfg, child, impl) {
    if (!cfg.open) return;

    const controller = new AbortController();
    child.once("exit", () => controller.abort());
    const result = await impl.openWhenReady({
        port: cfg.port,
        pathname: "/",
        timeoutMs: 12000,
        signal: controller.signal,
        verbose: Boolean(cfg.verbose),
    });

    if (result.timedOut) {
        log.warn(`Timed out waiting for ${getUrl(cfg.port)}`);
    }
}

async function startDevServer(cfg, root, impl) {
    await impl.ensureDir(cfg.outDir);
    const { child, wait } = impl.spawnRuntime(absoluteScript(root, SERVER_DEV_FILE), {
        cwd: root,
        env: cfg.env,
        stdio: "inherit",
        runtimeOptions: getDevRuntimeOptions(root),
    });

    await openDevBrowser(cfg, child, impl);
    const result = await wait;
    if (!result.success) process.exitCode = result.code ?? 1;
}

/**
 * Handle the dev command logic.
 *
 * @param {Record<string, unknown>} flags - Command flags
 * @param {object} [inject] - Injectable dependencies for testing
 * @param {typeof resolveConfig} [inject.resolveConfig]
 * @param {typeof runRuntime} [inject.runRuntime]
 * @param {typeof spawnRuntime} [inject.spawnRuntime]
 * @param {typeof validatePagesFolder} [inject.validatePagesFolder]
 * @param {typeof ensureDir} [inject.ensureDir]
 * @param {typeof openWhenReady} [inject.openWhenReady]
 * @returns {Promise<void>}
 */
export async function handleDevCommand(flags, inject = {}) {
    try {
        const impl = {
            resolveConfig: inject.resolveConfig ?? resolveConfig,
            runRuntime: inject.runRuntime ?? runRuntime,
            spawnRuntime: inject.spawnRuntime ?? spawnRuntime,
            validatePagesFolder: inject.validatePagesFolder ?? validatePagesFolder,
            ensureDir: inject.ensureDir ?? ensureDir,
            openWhenReady: inject.openWhenReady ?? openWhenReady,
        };

        const root = path.resolve(process.cwd());

        // centralized explicit flag handling (see prepareFlags)
        const { flagsForConfig, flagsExplicit } = prepareFlags("dev", flags);
        const cfg = await impl.resolveConfig({ cwd: root, flags: flagsForConfig, flagsExplicit, command: "dev" });

        await impl.validatePagesFolder(cfg.pagesDir);
        if (!(await prebuildDevServer(cfg, root, impl))) return;
        await startDevServer(cfg, root, impl);
    } catch (e) {
        log.error(`dev failed: ${getErrorMessage(e)}`);
        process.exitCode = 1;
    }
}
