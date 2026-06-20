/**
 * @module constants
 * @description
 * Project-wide constants derived from the runtime configuration and environment.
 * These constants are used to resolve paths for build artifacts, source directories,
 * and server configuration.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveRuntimeConfig } from "./config/resolve.js";

/**
 * Resolves project constants based on current runtime configuration.
 *
 * This function allows fresh resolution of constants, which is useful for testing
 * with different environment configurations.
 *
 * @returns {Promise<Record<string, any>>} Resolved constants object
 */
export async function resolveConstants() {
    const cfg = await resolveRuntimeConfig();

    const pagesDir = path.resolve(process.cwd(), cfg.pagesDir);
    const outputDirClient = path.join(cfg.outDir, "client");
    const outputDirServer = path.join(cfg.outDir, "server");
    const routesFilename = "routes.json";

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    return {
        PORT: cfg.port,
        PAGES_DIR: pagesDir,
        SRC_DIR: path.dirname(pagesDir),
        PAGES_RELATIVE_DIR: path.relative(process.cwd(), pagesDir),
        DANGER_OUTPUT_DIR: cfg.outDir,
        OUTPUT_DIR_CLIENT: outputDirClient,
        OUTPUT_DIR_SERVER: outputDirServer,
        CLIENT_DIR: cfg.clientDir,
        ALLOW_MIDDLEWARE_SECURITY_OVERRIDE: cfg.allowMiddlewareSecurityOverride,
        SECURITY_HEADERS: cfg.securityHeaders ?? null,
        LOADERS: cfg.loaders,
        SERVER_DEV_FILE: path.resolve(__dirname, "server/dev.js"),
        SERVER_PROD_FILE: path.resolve(__dirname, "server/prod.js"),
        ROUTES_FILENAME: routesFilename,
        ROUTES_FILE: path.resolve(outputDirServer, routesFilename),
        ROUTES_RELATIVE_PATH: path.relative(process.cwd(), path.join(outputDirServer, routesFilename)),
    };
}

// Initial resolution for top-level exports
const resolved = await resolveConstants();

/**
 * The port the server will listen on.
 * @type {number}
 */
export const PORT = resolved.PORT;

/**
 * Absolute path to the directory containing page components.
 * @type {string}
 */
export const PAGES_DIR = resolved.PAGES_DIR;

/**
 * Absolute path to the source directory.
 * @type {string}
 */
export const SRC_DIR = resolved.SRC_DIR;

/**
 * Relative path to the pages directory from the current working directory.
 * @type {string}
 */
export const PAGES_RELATIVE_DIR = resolved.PAGES_RELATIVE_DIR;

/**
 * Root directory for build output.
 * @type {string}
 */
export const DANGER_OUTPUT_DIR = resolved.DANGER_OUTPUT_DIR;

/**
 * Directory where client-side assets are bundled.
 * @type {string}
 */
export const OUTPUT_DIR_CLIENT = resolved.OUTPUT_DIR_CLIENT;

/**
 * Directory where server-side bundles and manifest are stored.
 * @type {string}
 */
export const OUTPUT_DIR_SERVER = resolved.OUTPUT_DIR_SERVER;

/**
 * Subdirectory for client-side entry points.
 * @type {string}
 */
export const CLIENT_DIR = resolved.CLIENT_DIR;

/**
 * Security flag to allow middleware to override default security headers.
 * @type {boolean}
 */
export const ALLOW_MIDDLEWARE_SECURITY_OVERRIDE = resolved.ALLOW_MIDDLEWARE_SECURITY_OVERRIDE;

/**
 * Custom security headers to apply to all responses.
 * @type {Record<string, string>|null}
 */
export const SECURITY_HEADERS = resolved.SECURITY_HEADERS;

/**
 * Optional loaders mapping for esbuild, sourced from config.
 * @type {Record<string, string>|undefined}
 */
export const LOADERS = resolved.LOADERS;

/**
 * Absolute path to the development server entry point.
 * @type {string}
 */
export const SERVER_DEV_FILE = resolved.SERVER_DEV_FILE;

/**
 * Absolute path to the production server entry point.
 * @type {string}
 */
export const SERVER_PROD_FILE = resolved.SERVER_PROD_FILE;

/**
 * The filename for the route manifest.
 * @type {string}
 * @default "routes.json"
 */
export const ROUTES_FILENAME = resolved.ROUTES_FILENAME;

/**
 * Absolute path to the route manifest file.
 * @type {string}
 */
export const ROUTES_FILE = resolved.ROUTES_FILE;

/**
 * Relative path to the route manifest file from the current working directory.
 * @type {string}
 */
export const ROUTES_RELATIVE_PATH = resolved.ROUTES_RELATIVE_PATH;
