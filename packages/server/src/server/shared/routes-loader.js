/**
 * @fileoverview Routes manifest loading and validation utilities.
 *
 * Provides shared functionality for loading and validating route manifests
 * used by both dev and prod servers across all runtime adapters.
 *
 * Features:
 * - Load routes.json with retry support (useful when esbuild is writing the file)
 * - Validate route manifest schema
 * - Platform-agnostic file reading (accepts custom readers)
 * - Comprehensive error messages
 *
 * @module server/shared/routes-loader
 */

import { logger } from "../utils/logger.js";
import { createFileReader } from "./file-readers.js";

// Create default file reader
const defaultFileReader = createFileReader();

/**
 * Route manifest entry.
 * @typedef {object} Route
 * @property {string} filename - Output filename (e.g., "index.html")
 * @property {string[]} entryPoints - Client entry points
 * @property {string} jsx - Source JSX path
 * @property {string} [path] - Route path pattern
 * @property {boolean} [generated] - Whether route is pre-rendered
 * @property {{ css: string[], js: string[] }} assets - Built assets
 * @property {boolean} hash - Whether assets are hashed
 */

/**
 * Validate route manifest schema.
 *
 * Ensures all required fields are present and have correct types.
 * Used by both dev and prod servers to catch configuration errors early.
 *
 * @param {unknown} data - Parsed JSON data
 * @param {string} [source="routes.json"] - Source name for error messages
 * @returns {Route[]} Validated routes array
 * @throws {Error} If validation fails
 * @public
 *
 * @example
 * ```javascript
 * const data = JSON.parse(routesJson);
 * const routes = validateRoutes(data, "dist/server/routes.json");
 * ```
 */
export function validateRoutes(data, source = "routes.json") {
    if (!Array.isArray(data)) {
        throw new Error(`${source} is not an array`);
    }

    for (const f of data) {
        if (!f || typeof f !== "object") {
            throw new Error("Invalid route entry");
        }
        if (typeof f.filename !== "string" || typeof f.jsx !== "string") {
            throw new Error("Route missing filename or jsx");
        }
        if (f.path && typeof f.path !== "string") {
            throw new Error("Route path must be string if provided");
        }
    }

    return data;
}

async function loadRoutesAttempt(routesPath, readFile, source) {
    let content;
    if (readFile) {
        content = await readFile(routesPath);
    } else {
        const text = await defaultFileReader.readText(routesPath);
        if (text === null) {
            throw new Error(`Failed to read routes file: ${routesPath}`);
        }
        content = text;
    }

    return validateRoutes(JSON.parse(content), source);
}

function handleRoutesLoadError(err, attemptIndex, retries, onError) {
    const error = err instanceof Error ? err : new Error(String(err));
    if (onError) onError(error, attemptIndex + 1);

    if (attemptIndex === retries - 1) {
        const message = `Failed to load routes after ${retries} attempts: ${error.message}`;
        logger.error(message);
        throw new Error(message);
    }
}

/**
 * Load and validate routes manifest with retry support.
 *
 * Attempts to read and parse the routes.json file, with optional retry logic
 * for handling concurrent writes (e.g., esbuild writing the file during dev).
 *
 * @param {string} routesPath - Absolute path to routes.json
 * @param {object} [options] - Load options
 * @param {number} [options.retries=3] - Number of retry attempts on parse errors
 * @param {(path: string) => Promise<string> | string} [options.readFile] - Platform-specific file reader (defaults to fs.readFileSync)
 * @param {string} [options.source] - Source name for error messages (defaults to routesPath)
 * @param {(err: Error, attempt: number) => void} [options.onError] - Error callback for retry attempts
 * @returns {Promise<Route[]>} Validated routes array
 * @throws {Error} After exhausting all retries or on validation failure
 * @public
 *
 * @example
 * ```javascript
 * // Node.js with default reader
 * const routes = await loadRoutesManifest("/path/to/routes.json", {
 *   retries: 3,
 * });
 *
 * // Custom file reader (Bun)
 * const routes = await loadRoutesManifest("/path/to/routes.json", {
 *   readFile: async (path) => await Bun.file(path).text(),
 * });
 *
 * // With error callback (dev mode)
 * const routes = await loadRoutesManifest("/path/to/routes.json", {
 *   retries: 5,
 *   onError: (err, attempt) => console.log(`Retry ${attempt}: ${err.message}`),
 * });
 * ```
 */
export async function loadRoutesManifest(routesPath, options = {}) {
    const { retries = 3, readFile, source = routesPath, onError } = options;

    for (let i = 0; i < retries; i++) {
        try {
            return await loadRoutesAttempt(routesPath, readFile, source);
        } catch (err) {
            handleRoutesLoadError(err, i, retries, onError);
            // Wait before retrying (file may still be written by esbuild)
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }

    // This should never be reached due to throw above, but TypeScript needs it
    throw new Error(`Failed to load routes after ${retries} attempts`);
}
