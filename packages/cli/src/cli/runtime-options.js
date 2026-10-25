import { existsSync } from "node:fs";
import path from "node:path";

import { detectRuntime } from "@sxo/server/shared/runtime";

/**
 * Returns Node runtime options for loading project aliases.
 * @param {string} root - Project root
 * @param {string} resolveAliasesHook - Alias registration hook path
 * @returns {string[]}
 */
export function getAliasRuntimeOptions(root, resolveAliasesHook) {
    if (detectRuntime() === "node" && existsSync(resolveAliasesHook) && existsSync(path.join(root, "tsconfig.json"))) {
        return ["--import", resolveAliasesHook];
    }

    return [];
}
