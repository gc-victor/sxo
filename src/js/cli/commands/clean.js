/**
 * @fileoverview SXO CLI clean command implementation.
 *
 * @module cli/commands/clean
 */

import fsp from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { resolveConfig } from "../../config.js";
import { askYesNo, pathExists, prepareFlags, toPosixPath } from "../cli-helpers.js";
import { createSpinner, log } from "../ui.js";
import { getErrorMessage } from "./utils.js";

/**
 * Handle the clean command logic.
 *
 * @param {object} flags - Command flags
 * @param {object} [inject] - Injectable dependencies for testing
 * @param {typeof resolveConfig} [inject.resolveConfig]
 * @param {typeof pathExists} [inject.pathExists]
 * @param {typeof askYesNo} [inject.askYesNo]
 * @param {typeof fsp.rm} [inject.rm]
 * @returns {Promise<void>}
 */
export async function handleCleanCommand(flags, inject = {}) {
    try {
        const impl = {
            resolveConfig: inject.resolveConfig ?? resolveConfig,
            pathExists: inject.pathExists ?? pathExists,
            askYesNo: inject.askYesNo ?? askYesNo,
            rm: inject.rm ?? fsp.rm,
        };

        const root = path.resolve(process.cwd());

        // centralized explicit flag handling (see prepareFlags)
        const { flagsForConfig, flagsExplicit } = prepareFlags("clean", flags);
        const cfg = await impl.resolveConfig({ cwd: root, flags: flagsForConfig, flagsExplicit, command: "clean" });

        const target = cfg.outDir;
        const exists = await impl.pathExists(target);
        if (!exists) {
            log.info(`Nothing to clean: ${toPosixPath(target)}`);
            return;
        }

        let proceed = !!(flags.yes || flags.y);
        if (!proceed && process.stdout.isTTY) {
            proceed = await impl.askYesNo(`Remove ${toPosixPath(target)}?`);
        }
        if (!proceed) {
            log.warn("Cancelled");
            return;
        }

        const s = createSpinner(`Removing ${toPosixPath(target)}...`, { enabled: process.stdout.isTTY });
        s.start();
        await impl.rm(target, { recursive: true, force: true, maxRetries: 2 });
        s.succeed("Cleaned");
    } catch (e) {
        log.error(`clean failed: ${getErrorMessage(e)}`);
        process.exitCode = 1;
    }
}
