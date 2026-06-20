/**
 * @fileoverview Shared dev server configuration and state management.
 *
 * Provides common configuration and state initialization used by all
 * platform-specific dev adapters (Node.js, Bun, Deno).
 *
 * @module server/dev/shared/platform-config
 */

import path from "node:path";
import { DANGER_OUTPUT_DIR, PORT, ROUTES_FILE, SRC_DIR } from "../../../constants.js";

const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

/**
 * @typedef {object} DevConfig
 * @property {string} staticDir - Resolved static files directory
 * @property {string} srcDir - Resolved source directory
 * @property {number} port - Server port number
 * @property {string} publicPath - Public path for assets
 * @property {string} routesPath - Resolved routes.json path
 * @property {string} hotReplaceClientPath - Path to hot-replace client script
 * @property {object} colors - Color codes for logging
 * @property {string} colors.yellow - Yellow ANSI code
 * @property {string} colors.reset - Reset ANSI code
 */

/**
 * @typedef {object} DevState
 * @property {string} esbuildError - Current esbuild error message (empty string if no error)
 * @property {Array<any>} routes - Current routes array from manifest
 * @property {Map<string, any>} jsxModules - Cache for loaded JSX modules
 */

/**
 * Create dev server configuration with common setup.
 *
 * Normalizes paths, sets default values, and provides color constants
 * for logging across all platforms.
 *
 * @param {object} [overrides] - Overrides for testing
 * @param {string} [overrides.outputDir]
 * @param {string} [overrides.srcDir]
 * @param {number} [overrides.port]
 * @param {string} [overrides.publicPath]
 * @param {string} [overrides.routesFile]
 * @returns {DevConfig} Dev server configuration object
 * @public
 */
export function createDevConfig({
    outputDir = DANGER_OUTPUT_DIR,
    srcDir = SRC_DIR,
    port = PORT,
    publicPath = process.env.PUBLIC_PATH,
    routesFile = ROUTES_FILE,
} = {}) {
    const staticDir = outputDir ? path.join(outputDir, "client") : "./dist/client";
    const resolvedSrcDir = srcDir || "./src";
    const resolvedPort = port || 3000;
    const resolvedPublicPath = publicPath ?? "/";
    const routesPath = routesFile;

    return {
        staticDir: path.resolve(staticDir),
        srcDir: path.resolve(resolvedSrcDir),
        routesPath: path.resolve(routesPath),
        hotReplaceClientPath: path.resolve(new URL(import.meta.url).pathname, "../../hot-replace.client.js"),
        port: resolvedPort,
        publicPath: resolvedPublicPath,
        colors: { yellow: YELLOW, reset: RESET },
    };
}

/**
 * Create dev server error state.
 *
 * Initializes mutable state for esbuild errors and routes.
 * All adapters use this shared state structure.
 *
 * @returns {DevState} Server error state object
 * @public
 */
export function createDevState() {
    return {
        esbuildError: "",
        routes: [],
        jsxModules: new Map(),
    };
}
