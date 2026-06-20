import { buildSpawnEnv } from "./build-env.js";
import { finalizeConfig, getDefaults } from "./defaults-finalize.js";
import { findConfigFilePath, loadFileConfig } from "./resolve-file.js";
import { filterExplicitFlags, processFlags } from "./resolve-flags.js";
import { mergeSrc, pickDefined, toBool } from "./resolve-utils.js";
import { validateConfig } from "./validate-config.js";

/**
 * Safely parse JSON from an environment variable.
 *
 * Returns undefined if the variable is not set or if parsing fails.
 *
 * @param {string|undefined} value - The environment variable value
 * @returns {unknown} Parsed value or undefined
 */
function safeJsonParse(value) {
    if (!value) return undefined;
    try {
        return JSON.parse(value);
    } catch {
        return undefined;
    }
}

/**
 * Loads configuration from environment variables.
 *
 * Parses BUILD, LOADERS, and SECURITY_HEADERS from JSON and extracts all env-based config values.
 *
 * @returns {Partial<ConfigObject>} Environment configuration object
 */
function loadEnvConfig() {
    const boolFromEnv = (/** @type {string} */ key) => (process.env[key] !== undefined ? toBool(process.env[key]) : undefined);

    const config = {
        port: process.env.PORT ? parseInt(process.env.PORT, 10) : undefined,
        pagesDir: process.env.PAGES_DIR,
        outDir: process.env.OUTPUT_DIR,
        open: boolFromEnv("OPEN"),
        verbose: boolFromEnv("VERBOSE"),
        color: process.env.NO_COLOR === undefined ? undefined : process.env.NO_COLOR === "false",
        publicPath: process.env.PUBLIC_PATH,
        clientDir: process.env.CLIENT_DIR,
        componentsDir: process.env.COMPONENTS_DIR,
        allowMiddlewareSecurityOverride: boolFromEnv("ALLOW_MIDDLEWARE_SECURITY_OVERRIDE"),
        build: /** @type {Record<string, any>|undefined} */ (safeJsonParse(process.env.BUILD)),
        loaders: /** @type {Record<string, string>|undefined} */ (safeJsonParse(process.env.LOADERS)),
        securityHeaders: /** @type {Record<string, string>|undefined} */ (safeJsonParse(process.env.SECURITY_HEADERS)),
    };

    return /** @type {Partial<ConfigObject>} */ (Object.fromEntries(Object.entries(config).filter(([_, v]) => v !== undefined)));
}

/** @type {Array<{key: string, type?: 'number'|'boolean'|'string'}>} */
const CONFIG_KEYS = [
    { key: "port", type: "number" },
    { key: "pagesDir" },
    { key: "outDir" },
    { key: "open", type: "boolean" },
    { key: "verbose", type: "boolean" },
    { key: "color", type: "boolean" },
    { key: "publicPath" },
    { key: "clientDir" },
    { key: "componentsDir" },
    { key: "allowMiddlewareSecurityOverride", type: "boolean" },
    { key: "build" },
    { key: "loaders" },
    { key: "securityHeaders" },
];

/**
 * Merges configuration from multiple sources with precedence: flags > file > env > defaults.
 *
 * @param {{defaults: Partial<ConfigObject>, env: Partial<ConfigObject>, file: Partial<ConfigObject>}} sources - Normalized config sources
 * @param {Partial<ConfigObject>} filteredFlags - Filtered flag configuration
 * @returns {Partial<ConfigObject>} Merged configuration object
 */
function mergeConfigSources(sources, filteredFlags) {
    const { defaults: def, env, file } = sources;
    const flags = filteredFlags;

    /** @type {Partial<ConfigObject>} */
    const merged = {};

    for (const { key } of CONFIG_KEYS) {
        /** @type {Record<string, any>} */ (merged)[key] = pickDefined(
            flags[/** @type {keyof typeof flags} */ (key)],
            file[/** @type {keyof typeof file} */ (key)],
            env[/** @type {keyof typeof env} */ (key)],
            def[/** @type {keyof typeof def} */ (key)],
        );
    }

    return merged;
}

/**
 * Builds final configuration object with spawn environment and file path.
 *
 * @param {Partial<ConfigObject>} merged - Merged configuration
 * @param {Partial<ConfigObject>} defaults - Default configuration
 * @param {Command} command - Current command (dev, build, start, etc.)
 * @param {string} cwd - Current working directory
 * @returns {Promise<ResolvedConfig>} Final configuration object
 */
async function buildFinalConfig(merged, defaults, command, cwd) {
    finalizeConfig(merged, defaults, cwd);
    merged.command = command;

    await validateConfig(merged, cwd);

    const spawnEnv = buildSpawnEnv(/** @type {ResolvedConfig} */ (merged), command);
    const configFilePath = await findConfigFilePath(cwd);

    return {
        .../** @type {ResolvedConfig} */ (merged),
        env: /** @type {Record<string, string>} */ (spawnEnv),
        configFilePath,
    };
}

/**
 * Resolve final CLI configuration with normalized fields.
 *
 * Merges config from multiple sources with precedence:
 * flags > file > env > defaults
 *
 * @param {ResolveOptions} [opts={}] - Resolution options
 * @returns {Promise<ResolvedConfig>} Resolved configuration
 */
export async function resolveConfig(opts = {}) {
    const cwd = opts.cwd || process.cwd();
    const command = opts.command || "dev";
    const flags = opts.flags || {};
    const flagsExplicit = opts.flagsExplicit && typeof opts.flagsExplicit === "object" ? opts.flagsExplicit : {};

    const defaults = getDefaults(command, cwd);
    const fileConfig = await loadFileConfig(cwd);
    const envConfig = loadEnvConfig();

    const sources = {
        defaults: mergeSrc(/** @type {Record<string, unknown>} */ (defaults), cwd),
        env: mergeSrc(envConfig, cwd),
        file: mergeSrc(/** @type {Record<string, unknown>} */ (fileConfig), cwd),
        flags: /** @type {Record<string, unknown>} */ (processFlags(flags, cwd)),
    };

    const filteredFlags = filterExplicitFlags(/** @type {Record<string, unknown>} */ (sources.flags), flagsExplicit);
    const merged = mergeConfigSources(sources, filteredFlags);

    return buildFinalConfig(merged, defaults, command, cwd);
}

/**
 * Extracts flags from environment variables for fallback resolution.
 *
 * @returns {Record<string, string|undefined>} Flags from environment
 */
function getEnvFlags() {
    return {
        port: process.env.PORT,
        pagesDir: process.env.PAGES_DIR,
        outDir: process.env.OUTPUT_DIR,
        publicPath: process.env.PUBLIC_PATH,
        clientDir: process.env.CLIENT_DIR,
        componentsDir: process.env.COMPONENTS_DIR,
        allowMiddlewareSecurityOverride: process.env.ALLOW_MIDDLEWARE_SECURITY_OVERRIDE,
    };
}

/**
 * Determines the command from environment or options.
 *
 * @param {ResolveOptions} opts - Resolution options
 * @returns {Command} The determined command
 */
function resolveCommand(opts) {
    return opts.command || /** @type {Command} */ (process.env.SXO_COMMAND) || (process.env.DEV === "true" ? "dev" : "build");
}

/**
 * Resolve config for runtime use.
 *
 * Attempts to load config from SXO_RESOLVED_CONFIG environment variable,
 * or falls back to env-based resolution.
 *
 * @param {ResolveOptions} [opts={}] - Resolution options
 * @returns {Promise<ResolvedConfig>} Runtime configuration
 */
export async function resolveRuntimeConfig(opts = {}) {
    const json = process.env.SXO_RESOLVED_CONFIG;
    const cwd = opts.cwd || process.cwd();

    if (json) {
        try {
            const fromParent = JSON.parse(json);
            const requiredFields = ["command", "port", "pagesDir", "outDir"];
            const missing = requiredFields.filter((f) => fromParent[f] === undefined);

            if (missing.length === 0) {
                return {
                    ...fromParent,
                    env: fromParent.env || {},
                    configFilePath: fromParent.configFilePath || null,
                };
            }

            console.error(`SXO_RESOLVED_CONFIG is missing required fields: ${missing.join(", ")}`);
        } catch (err) {
            console.error(`Failed to parse SXO_RESOLVED_CONFIG: ${/** @type {Error} */ (err).message}`);
        }
    }

    return resolveConfig({
        cwd,
        command: resolveCommand(opts),
        flags: getEnvFlags(),
    });
}
