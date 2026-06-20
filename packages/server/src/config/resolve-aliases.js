/**
 * Entry point for Node.js loader hook that resolves path aliases.
 *
 * Registered via --import flag when spawning the dev server.
 * Computes the alias map via resolveAliases() and registers
 * the resolve hook from aliases.js.
 */

import { register } from "node:module";
import { fileURLToPath } from "node:url";
import { PAGES_DIR, SRC_DIR } from "../constants.js";
import { resolveAliases } from "./aliases.js";

const projectRoot = process.cwd();
const aliasMap = resolveAliases(SRC_DIR, PAGES_DIR, projectRoot);

if (aliasMap && Object.keys(aliasMap).length > 0) {
    const hookPath = fileURLToPath(new URL("./aliases.js", import.meta.url));
    register(hookPath, import.meta.url, {
        data: { aliasMap, projectRoot },
    });
}
