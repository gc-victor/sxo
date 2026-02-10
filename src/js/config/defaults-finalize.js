import path from "node:path";
import { clampPort } from "./resolve-utils.js";

/**
 * Get default configuration values.
 *
 * Returns default config with command-specific defaults for dev/preview commands.
 *
 * @param {Command} command - SXO command
 * @param {string} cwd - Current working directory
 * @returns {Partial<ConfigObject>} Default configuration object
 */
export function getDefaults(command, cwd) {
    const openDefault = command === "dev" || command === "preview";
    return {
        port: 3000,
        pagesDir: "src/pages",
        outDir: path.resolve(cwd, "dist"),
        open: openDefault,
        verbose: false,
        color: true,
        publicPath: "/",
        clientDir: "client",
        componentsDir: "src/components",
        allowMiddlewareSecurityOverride: false,
        securityHeaders: null,
    };
}

/**
 * Finalize merged configuration values.
 *
 * Applies defaults to undefined values, clamps port, normalizes paths,
 * and applies command-specific logic.
 *
 * @param {any} merged - Merged configuration object
 * @param {any} defaults - Default configuration
 * @param {string} cwd - Current working directory
 * @returns {any} Finalized configuration object
 */
export function finalizeConfig(merged, defaults, cwd) {
    // Apply defaults for undefined values
    if (merged.outDir === undefined || merged.outDir === null) merged.outDir = defaults.outDir;
    if (merged.pagesDir === undefined || merged.pagesDir === null) merged.pagesDir = defaults.pagesDir;

    // Clamp port
    merged.port = clampPort(merged.port, 3000);

    // Normalize paths
    merged.pagesDir = merged.pagesDir.replace(/\\/g, "/");
    merged.outDir = path.isAbsolute(merged.outDir) ? merged.outDir : path.resolve(cwd, merged.outDir);
    merged.componentsDir = merged.componentsDir.replace(/\\/g, "/");

    // Apply command-specific defaults
    if (merged.open === undefined || merged.open === null) merged.open = defaults.open;
    if (merged.allowMiddlewareSecurityOverride === undefined || merged.allowMiddlewareSecurityOverride === null)
        merged.allowMiddlewareSecurityOverride = defaults.allowMiddlewareSecurityOverride;

    if (merged.securityHeaders === undefined) merged.securityHeaders = defaults.securityHeaders;

    return merged;
}
