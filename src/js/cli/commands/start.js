import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { resolveConfig } from "../../config/resolve.js";
import { detectRuntime } from "../../server/shared/runtime.js";
import { absoluteScript, pathExists, prepareFlags } from "../cli-helpers.js";
import { spawnRuntime } from "../spawn.js";
import { log } from "../ui.js";
import { getCliScriptPaths, getErrorMessage, routesJsonExists, routesJsonRelative } from "./utils.js";

const { RESOLVE_ALIASES_HOOK, SERVER_PROD_FILE } = getCliScriptPaths(import.meta.url);

/**
 * Handle the start command logic.
 *
 * @param {Record<string, unknown>} flags - Command flags
 * @param {object} [inject] - Injectable dependencies for testing
 * @param {typeof resolveConfig} [inject.resolveConfig]
 * @param {typeof spawnRuntime} [inject.spawnRuntime]
 * @param {typeof pathExists} [inject.pathExists]
 * @returns {Promise<void>}
 */
export async function handleStartCommand(flags, inject = {}) {
    try {
        const impl = {
            resolveConfig: inject.resolveConfig ?? resolveConfig,
            spawnRuntime: inject.spawnRuntime ?? spawnRuntime,
            pathExists: inject.pathExists ?? pathExists,
        };

        const root = path.resolve(process.cwd());

        // centralized explicit flag handling (see prepareFlags)
        const { flagsForConfig, flagsExplicit } = prepareFlags("start", flags);
        const cfg = await impl.resolveConfig({ cwd: root, flags: flagsForConfig, flagsExplicit, command: "start" });

        const ok = await routesJsonExists(cfg, impl);
        if (!ok) {
            const rel = routesJsonRelative(root, cfg);
            log.error(`Missing ${rel}`);
            log.info("Run `sxo build` to build the project");
            process.exitCode = 1;
            return;
        }

        const runtimeOptions = [];
        if (detectRuntime() === "node" && existsSync(RESOLVE_ALIASES_HOOK)) {
            const tsconfigPath = path.join(root, "tsconfig.json");
            if (existsSync(tsconfigPath)) {
                runtimeOptions.push("--import", RESOLVE_ALIASES_HOOK);
            }
        }
        const { wait } = impl.spawnRuntime(absoluteScript(root, SERVER_PROD_FILE), {
            cwd: root,
            env: { ...cfg.env, NODE_ENV: "production" },
            stdio: "inherit",
            runtimeOptions,
        });

        const result = await wait;
        if (!result.success) process.exitCode = result.code ?? 1;
    } catch (e) {
        log.error(`start failed: ${getErrorMessage(e)}`);
        process.exitCode = 1;
    }
}
