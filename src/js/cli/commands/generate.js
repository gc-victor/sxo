/**
 * @fileoverview SXO CLI generate command implementation.
 *
 * @module cli/commands/generate
 */

import path from "node:path";
import process from "node:process";

import { resolveConfig } from "../../config.js";
import { pathExists, prepareFlags } from "../cli-helpers.js";
import { createSpinner, log } from "../ui.js";
import { getErrorMessage, routesJsonExists, routesJsonRelative } from "./utils.js";

/**
 * Handle the generate command logic.
 *
 * @param {object} flags - Command flags
 * @param {object} [inject] - Injectable dependencies for testing
 * @param {typeof resolveConfig} [inject.resolveConfig]
 * @param {typeof pathExists} [inject.pathExists]
 * @param {() => Promise<{ generate: () => Promise<{ ok: boolean } | null> }>} [inject.importGenerate]
 * @returns {Promise<void>}
 */
export async function handleGenerateCommand(flags, inject = {}) {
    try {
        const impl = {
            resolveConfig: inject.resolveConfig ?? resolveConfig,
            pathExists: inject.pathExists ?? pathExists,
            importGenerate: inject.importGenerate ?? (async () => import("../../generate/generate.js")),
        };

        const root = path.resolve(process.cwd());

        // Reuse build flags set; generation uses built outputs
        const { flagsForConfig, flagsExplicit } = prepareFlags("generate", flags);
        const cfg = await impl.resolveConfig({ cwd: root, flags: flagsForConfig, flagsExplicit, command: "generate" });

        const ok = await routesJsonExists(cfg, impl);
        if (!ok) {
            const rel = routesJsonRelative(root, cfg);
            log.error(`Missing ${rel}`);
            log.info("Run `sxo build` first to build the project");
            process.exitCode = 1;
            return;
        }

        // Ensure the generate module sees resolved OUTPUT_DIR_* and related env
        Object.assign(process.env, cfg.env);

        const { generate } = await impl.importGenerate();

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
        log.error(`generate failed: ${getErrorMessage(e)}`);
        process.exitCode = 1;
    }
}
