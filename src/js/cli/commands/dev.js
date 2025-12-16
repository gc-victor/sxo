/**
 * @fileoverview SXO CLI dev command implementation.
 *
 * @module cli/commands/dev
 */

import path from "node:path";
import process from "node:process";

import { resolveConfig } from "../../config.js";
import { absoluteScript, ensureDir, getUrl, prepareFlags, toPosixPath, validatePagesFolder } from "../cli-helpers.js";
import { openWhenReady } from "../open.js";
import { runRuntime, spawnRuntime } from "../spawn.js";
import { createSpinner, log } from "../ui.js";
import { getCliScriptPaths, getErrorMessage } from "./utils.js";

const { ESBUILD_CONFIG_FILE, SERVER_DEV_FILE } = getCliScriptPaths(import.meta.url);

/**
 * Handle the dev command logic.
 *
 * @param {object} flags - Command flags
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

        // Prebuild (explicit) before launching dev server
        const prebuildSpinner = createSpinner("Prebuilding", { enabled: process.stdout.isTTY });
        prebuildSpinner.start();

        cfg.env.DEV = "true";

        const prebuildRes = await impl.runRuntime(ESBUILD_CONFIG_FILE, {
            cwd: root,
            env: cfg.env,
            stdio: "inherit",
        });

        if (!prebuildRes.success) {
            prebuildSpinner.fail("Prebuild failed");
            log.error("Couldn't generate routes with esbuild. Check the error above for details.");
            log.info(`- PAGES_DIR: ${toPosixPath(cfg.pagesDir)}`);
            log.info("- Hint: run with --pages-dir or set PAGES_DIR to your pages root.");
            process.exitCode = prebuildRes.code ?? 1;
            return;
        }
        prebuildSpinner.succeed("Prebuild complete");

        // Ensure dist exists (esbuild config already mkdir -p)
        await impl.ensureDir(cfg.outDir);

        // Spawn dev server (auto-detects runtime internally)
        const { child, wait } = impl.spawnRuntime(absoluteScript(root, SERVER_DEV_FILE), {
            cwd: root,
            env: cfg.env,
            stdio: "inherit",
        });

        // Auto-open if configured
        if (cfg.open) {
            const ctrl = new AbortController();
            child.once("exit", () => ctrl.abort());
            const res = await impl.openWhenReady({
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
        log.error(`dev failed: ${getErrorMessage(e)}`);
        process.exitCode = 1;
    }
}
