/**
 * @fileoverview SXO CLI build command implementation.
 *
 * @module cli/commands/build
 */

import path from "node:path";
import process from "node:process";

import { resolveConfig } from "../../config.js";
import { pathExists, prepareFlags, printBuildSummary, validatePagesFolder } from "../cli-helpers.js";
import { runRuntime } from "../spawn.js";
import { createSpinner, log } from "../ui.js";
import { getCliScriptPaths, getErrorMessage, routesJsonExists, routesJsonRelative } from "./utils.js";

const { ESBUILD_CONFIG_FILE } = getCliScriptPaths(import.meta.url);

/**
 * Handle the build command logic.
 *
 * @param {object} flags - Command flags
 * @param {object} [inject] - Injectable dependencies for testing
 * @param {typeof resolveConfig} [inject.resolveConfig]
 * @param {typeof runRuntime} [inject.runRuntime]
 * @param {typeof validatePagesFolder} [inject.validatePagesFolder]
 * @param {typeof pathExists} [inject.pathExists]
 * @param {typeof printBuildSummary} [inject.printBuildSummary]
 * @returns {Promise<void>}
 */
export async function handleBuildCommand(flags, inject = {}) {
    try {
        const impl = {
            resolveConfig: inject.resolveConfig ?? resolveConfig,
            runRuntime: inject.runRuntime ?? runRuntime,
            validatePagesFolder: inject.validatePagesFolder ?? validatePagesFolder,
            pathExists: inject.pathExists ?? pathExists,
            printBuildSummary: inject.printBuildSummary ?? printBuildSummary,
        };

        const root = path.resolve(process.cwd());

        // centralized explicit flag handling (see prepareFlags)
        const { flagsForConfig, flagsExplicit } = prepareFlags("build", flags);
        const cfg = await impl.resolveConfig({ cwd: root, flags: flagsForConfig, flagsExplicit, command: "build" });

        await impl.validatePagesFolder(cfg.pagesDir);

        const s = createSpinner("Building...", { enabled: process.stdout.isTTY });
        s.start();

        const res = await impl.runRuntime(ESBUILD_CONFIG_FILE, {
            cwd: root,
            env: cfg.env,
            stdio: "inherit",
        });

        if (!res.success) {
            s.fail("Build failed");
            log.error("esbuild process failed. Check the error above for details.");
            process.exitCode = res.code ?? 1;
            return;
        }

        const ok = await routesJsonExists(cfg, impl);
        if (!ok) {
            const rel = routesJsonRelative(root, cfg);
            s.fail(`Build did not produce ${rel} (check pages and templates)`);
            log.error(`Missing ${rel} after build.`);
            process.exitCode = 1;
            return;
        }

        s.succeed("Build complete");
        await impl.printBuildSummary(cfg.outDir, cfg.pagesDir);
    } catch (e) {
        log.error(`build failed: ${getErrorMessage(e)}`);
        process.exitCode = 1;
    }
}
