/**
 * Config resolver for the sxo CLI
 *
 * Responsibilities:
 * - Load dotenv files (.env then .env.local) without overwriting existing process.env values
 * - Load user config from sxo.config.(mjs|js|cjs|json) with ESM/CJS support
 * - Merge with precedence: flags > config file > env > defaults
 * - Normalize and validate: port, pagesDir, outDir, open, verbose, color, minify, sourcemap
 * - Provide command-aware defaults (e.g., open default true for dev/preview)
 * - Produce an env object suitable for spawning child processes
 *
 * Node >= 20, ESM
 */

import fs from "node:fs";
import fsp from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";

/**
 * @typedef {Object} ResolveOptions
 * @property {string} [cwd]
 * @property {Record<string, any>} [flags]
 * @property {Record<string, boolean>} [flagsExplicit] // true if user explicitly provided the flag
 * @property {"dev"|"build"|"start"|"preview"|"clean"|"add"} [command]
 *
 * @typedef {Object} SXOResolvedConfig
 * @property {"dev"|"build"|"start"|"preview"|"clean"|"add"} command
 * @property {number} port
 * @property {string} pagesDir    // normalized POSIX-style relative path (e.g., "src/pages")
 * @property {string} outDir      // absolute path
 * @property {boolean} open
 * @property {boolean} verbose
 * @property {boolean} color
 * @property {string} publicPath
 * @property {string} componentsDir // normalized POSIX-style relative path (e.g., "src/components")
 * @property {Record<string,any>} [build] // custom esbuild client config to merge
 * @property {Record<string,string>} [loaders] // custom esbuild loaders for server build
 * @property {Record<string,string>} env   // environment variables to pass to child processes
 * @property {string|null} configFilePath
 */

/**
 * Resolve the final CLI configuration with normalized fields and spawn-ready env.
 * @param {ResolveOptions} [opts]
 * @returns {Promise<SXOResolvedConfig>}
 */
export async function resolveConfig(opts = {}) {
    const cwd = opts.cwd || process.cwd();
    const command = opts.command || "dev";
    const flags = opts.flags || {};
    // If provided by the caller, only explicit flags will override file/env/defaults
    const flagsExplicit = opts.flagsExplicit && typeof opts.flagsExplicit === "object" ? opts.flagsExplicit : null;

    // 1) Load dotenv (non-destructive)
    await loadDotenv(cwd);

    // 2) Load user config file (optional)
    const { config: fileConfig, path: configFilePath } = await loadUserConfig(cwd, flags.config);

    // 3) Build sources per precedence: flags > config file > env > defaults
    const defaults = defaultConfigForCommand(command, cwd);

    const envValues = readEnvConfig(process.env);

    // Normalize inputs from each source
    const normalized = normalizeConfig({
        defaults,
        env: envValues,
        file: fileConfig || {},
        flags,
        flagsExplicit,
        cwd,
        command,
    });

    // Validate result
    validateConfig(normalized);

    // Prepare env for child processes
    const spawnEnv = toSpawnEnv(normalized, command);

    return {
        command,
        port: normalized.port,
        pagesDir: normalized.pagesDir,
        outDir: normalized.outDir,
        open: normalized.open,
        verbose: normalized.verbose,
        color: normalized.color,
        publicPath: normalized.publicPath,
        clientDir: normalized.clientDir,
        componentsDir: normalized.componentsDir,
        build: normalized.build,
        loaders: normalized.loaders,
        env: spawnEnv,
        configFilePath: configFilePath,
    };
}

export async function resolveRuntimeConfig(opts = {}) {
    const json = process.env.SXO_RESOLVED_CONFIG;
    if (json) {
        try {
            const fromParent = JSON.parse(json);
            const build = fromParent.build;
            const loaders = fromParent.loaders;
            return {
                command: fromParent.command,
                port: fromParent.port,
                pagesDir: fromParent.pagesDir,
                outDir: fromParent.outDir,
                publicPath: fromParent.publicPath,
                clientDir: fromParent.clientDir,
                componentsDir: fromParent.componentsDir,
                build,
                loaders,
            };
        } catch {
            // fall through to recompute
        }
    }

    const flags = {
        port: process.env.PORT,
        pagesDir: process.env.PAGES_DIR,
        outDir: process.env.OUTPUT_DIR,
        publicPath: process.env.PUBLIC_PATH,
        clientDir: process.env.CLIENT_DIR,
        componentsDir: process.env.COMPONENTS_DIR,
    };

    const command = opts.command || process.env.SXO_COMMAND || (process.env.DEV === "true" ? "dev" : "build");

    return resolveConfig({ cwd: opts.cwd || process.cwd(), command, flags });
}

/**
 * Load .env and .env.local (if present) into process.env without overwriting existing values.
 * .env is loaded first, then .env.local overrides .env (but still not overriding existing process.env).
 * @param {string} cwd
 */
async function loadDotenv(cwd) {
    const files = [".env", ".env.local"].map((f) => path.join(cwd, f));

    const applyParsed = (parsed) => {
        if (!parsed) return;
        for (const [k, v] of Object.entries(parsed)) {
            if (!(k in process.env)) {
                process.env[k] = String(v);
            }
        }
    };

    for (const p of files) {
        if (!fs.existsSync(p)) continue;
        try {
            const text = await fsp.readFile(p, "utf8");
            applyParsed(dotenv.parse(text));
        } catch {
            // ignore dotenv read/parse errors
        }
    }
}

/**
 * Attempt to load user config from path or well-known filenames.
 * @param {string} cwd
 * @param {string|undefined} explicitPath
 * @returns {Promise<{ config: any|null, path: string|null }>}
 */
async function loadUserConfig(cwd, explicitPath) {
    const candidates = explicitPath
        ? [path.isAbsolute(explicitPath) ? explicitPath : path.resolve(cwd, explicitPath)]
        : [
              path.join(cwd, "sxo.config.mjs"),
              path.join(cwd, "sxo.config.js"),
              path.join(cwd, "sxo.config.cjs"),
              path.join(cwd, "sxo.config.json"),
          ];

    const loaders = {
        ".mjs": async (p) => unwrapConfigExport(await import(pathToFileURL(p).href)),
        ".js": async (p) => unwrapConfigExport(await import(pathToFileURL(p).href)),
        ".cjs": async (p) => {
            const req = createRequire(import.meta.url);
            return unwrapConfigExport(req(p));
        },
        ".json": async (p) => {
            const txt = await fsp.readFile(p, "utf8");
            return JSON.parse(txt);
        },
    };

    for (const p of candidates) {
        if (!fs.existsSync(p)) continue;

        const ext = path.extname(p).toLowerCase();
        const loader = loaders[ext];
        if (!loader) continue;

        try {
            const cfg = await loader(p);
            return { config: cfg, path: p };
        } catch (e) {
            const msg = e && typeof e === "object" && "message" in e ? e.message : String(e);
            throw new Error(`Failed to load config file at ${p}: ${msg}`);
        }
    }
    return { config: null, path: null };
}

/**
 * Unwrap default or module.exports config; allow function returning object for flexibility.
 * @param {any} mod
 * @returns {any}
 */
function unwrapConfigExport(mod) {
    let cfg = mod?.default ?? mod;
    if (typeof cfg === "function") {
        cfg = cfg();
    }
    if (cfg && typeof cfg === "object") return cfg;
    throw new Error("Config export must be an object or a function returning an object");
}

/**
 * Read env-based config values from process.env
 * @param {NodeJS.ProcessEnv} env
 */
function readEnvConfig(env) {
    return {
        port: env.PORT,
        pagesDir: env.PAGES_DIR,
        outDir: env.OUTPUT_DIR,
        open: env.OPEN,
        verbose: env.VERBOSE,
        noColor: env.NO_COLOR,
        publicPath: env.PUBLIC_PATH,
        clientDir: env.CLIENT_DIR,
        componentsDir: env.COMPONENTS_DIR,
        build: env.BUILD,
        loaders: env.LOADERS,
    };
}

/**
 * Command-aware default config
 * @param {"dev"|"build"|"start"|"preview"|"clean"|"add"} command
 * @param {string} cwd
 */
function defaultConfigForCommand(command, cwd) {
    const openDefault = command === "dev" || command === "preview";
    return {
        port: 3000,
        pagesDir: "src/pages",
        outDir: path.resolve(cwd, "dist"),
        open: openDefault,
        verbose: false,
        color: true,
        publicPath: "/", // default; can be ""
        clientDir: "client",
        componentsDir: "src/components",
    };
}

/**
 * Normalize and merge with precedence: flags > file > env > defaults
 * @param {Object} ctx
 * @param {any} ctx.defaults
 * @param {any} ctx.env
 * @param {any} ctx.file
 * @param {Record<string,any>} ctx.flags
 * @param {Record<string,boolean>|null} [ctx.flagsExplicit]
 * @param {string} ctx.cwd
 * @param {"dev"|"build"|"start"|"preview"|"clean"|"add"} ctx.command
 */
function normalizeConfig({ defaults, env, file, flags, flagsExplicit, cwd, command }) {
    // Step 1: coerce each layer to normalized primitive types (without applying precedence)
    const normalizeLayer = (src) => {
        if (!src || typeof src !== "object") return {};
        const get = (...keys) => {
            for (const k of keys) {
                if (k in src && src[k] !== undefined) return src[k];
            }
            return undefined;
        };

        const norm = {};

        const port = get("port");
        if (port !== undefined) norm.port = toNumber(port);

        const pages = get("pagesDir", "pages-dir");
        if (pages !== undefined) norm.pagesDir = toPosixRelativePath(String(pages), cwd);

        const out = get("outDir", "out-dir");
        if (out !== undefined) norm.outDir = toAbsolutePath(String(out), cwd);

        const open = get("open");
        if (open !== undefined) norm.open = toBool(open);

        const verbose = get("verbose");
        if (verbose !== undefined) norm.verbose = toBool(verbose);

        const color = get("color");
        const noColor = get("noColor", "no-color");
        if (color !== undefined) norm.color = toBool(color);
        if (noColor !== undefined) norm.color = !toBool(noColor);

        // Preserve empty string if explicitly provided
        const publicPath = get("publicPath", "public-path");
        if (publicPath !== undefined) norm.publicPath = String(publicPath);

        const cfgPath = get("config");
        if (cfgPath !== undefined) norm.config = String(cfgPath);

        const clientDir = get("clientDir", "client-dir");
        if (clientDir !== undefined) norm.clientDir = String(clientDir);

        const componentsDir = get("componentsDir", "components-dir");
        if (componentsDir !== undefined) norm.componentsDir = toPosixRelativePath(String(componentsDir), cwd);

        const build = get("build");
        if (build !== undefined && typeof build === "object" && build !== null) {
            norm.build = build;
        }

        const loaders = get("loaders", "loader"); // support both singular and plural
        if (loaders !== undefined) {
            if (typeof loaders === "object" && !Array.isArray(loaders) && loaders !== null) {
                // Already an object map, normalize keys (add dot prefix if missing)
                const normalized = {};
                for (const [k, v] of Object.entries(loaders)) {
                    let key = String(k).trim();
                    if (!key.startsWith(".")) key = `.${key}`;
                    normalized[key] = String(v);
                }
                if (Object.keys(normalized).length > 0) {
                    norm.loaders = normalized;
                }
            } else if (Array.isArray(loaders)) {
                // Array of strings (repeatable flag), merge them all
                const merged = {};
                for (const item of loaders) {
                    const parsed = parseLoadersString(String(item));
                    Object.assign(merged, parsed);
                }
                if (Object.keys(merged).length > 0) {
                    norm.loaders = merged;
                }
            } else if (typeof loaders === "string") {
                // Single string value; may be JSON object or key=value format
                const s = String(loaders).trim();
                let result = {};

                // Try JSON parse first (for env var LOADERS="{...}")
                if (s.startsWith("{")) {
                    try {
                        const parsed = JSON.parse(s);
                        if (typeof parsed === "object" && !Array.isArray(parsed)) {
                            // Normalize keys
                            for (const [k, v] of Object.entries(parsed)) {
                                let key = String(k).trim();
                                if (!key.startsWith(".")) key = `.${key}`;
                                result[key] = String(v);
                            }
                        }
                    } catch {
                        // Fall through to string parsing
                    }
                }

                // If JSON parse failed or wasn't JSON, try key=value format
                if (Object.keys(result).length === 0) {
                    result = parseLoadersString(s);
                }

                if (Object.keys(result).length > 0) {
                    norm.loaders = result;
                }
            }
        }

        return norm;
    };

    const d = normalizeLayer(defaults);
    const e = normalizeLayer(env);
    const f = normalizeLayer(file);
    const gRaw = normalizeLayer(flags);

    // If explicitness was provided, only allow explicitly-passed flags to override
    const g = { ...gRaw };
    if (flagsExplicit && typeof flagsExplicit === "object") {
        for (const k of Object.keys(g)) {
            if (!flagsExplicit[k]) {
                delete g[k];
            }
        }
    }

    // Ensure default outDir/pagesDir are normalized
    if (d.outDir === undefined) d.outDir = toAbsolutePath(defaults.outDir, cwd);
    if (d.pagesDir === undefined) d.pagesDir = toPosixRelativePath(defaults.pagesDir, cwd);

    // Step 2: merge with precedence flags > file > env > defaults
    const merged = {
        port: pickDefined(g.port, f.port, e.port, d.port),
        pagesDir: pickDefined(g.pagesDir, f.pagesDir, e.pagesDir, d.pagesDir),
        outDir: pickDefined(g.outDir, f.outDir, e.outDir, d.outDir),
        open: pickDefined(g.open, f.open, e.open, d.open),
        verbose: pickDefined(g.verbose, f.verbose, e.verbose, d.verbose),
        color: pickDefined(g.color, f.color, e.color, d.color),
        publicPath: pickDefined(g.publicPath, f.publicPath, e.publicPath, d.publicPath),
        clientDir: pickDefined(g.clientDir, f.clientDir, e.clientDir, d.clientDir),
        componentsDir: pickDefined(g.componentsDir, f.componentsDir, e.componentsDir, d.componentsDir),
        build: pickDefined(g.build, f.build, e.build, d.build),
        loaders: pickDefined(g.loaders, f.loaders, e.loaders, d.loaders),
    };

    // Step 3: final normalization adjustments
    merged.port = clampPort(merged.port, 3000);
    merged.pagesDir = toPosixRelativePath(merged.pagesDir, cwd);
    merged.outDir = toAbsolutePath(merged.outDir, cwd);
    merged.componentsDir = toPosixRelativePath(merged.componentsDir, cwd);

    // open default depends on command; but precedence already set, so if undefined use defaults
    if (merged.open === undefined || merged.open === null) {
        const def = defaultConfigForCommand(command, cwd);
        merged.open = def.open;
    }

    return merged;
}

/**
 * Validate final config
 * @param {any} cfg
 */
function validateConfig(cfg) {
    if (!Number.isInteger(cfg.port) || cfg.port < 1 || cfg.port > 65535) {
        throw new Error(`Invalid port: ${cfg.port}. Expected an integer between 1 and 65535.`);
    }
    if (typeof cfg.pagesDir !== "string" || cfg.pagesDir.length === 0) {
        throw new Error(`Invalid pagesDir: ${cfg.pagesDir}. Expected a non-empty string path.`);
    }
    if (typeof cfg.outDir !== "string" || !path.isAbsolute(cfg.outDir)) {
        throw new Error(`Invalid outDir: ${cfg.outDir}. Expected an absolute path.`);
    }
    if (typeof cfg.clientDir !== "string" || cfg.clientDir.length === 0 || cfg.clientDir.includes("/") || cfg.clientDir.includes("\\")) {
        throw new Error(`Invalid clientDir: ${cfg.clientDir}. Expected a non-empty single-segment folder name (e.g., "client").`);
    }
    if (typeof cfg.componentsDir !== "string" || cfg.componentsDir.length === 0) {
        throw new Error(`Invalid componentsDir: ${cfg.componentsDir}. Expected a non-empty string path.`);
    }
}

/**
 * Build environment variables for child processes.
 * DEV is true only for "dev" command; otherwise false.
 * SOURCEMAP is "true" when enabled (esbuild config will map to "inline" in our setup).
 * @param {ReturnType<typeof normalizeConfig>} cfg
 * @param {"dev"|"build"|"start"|"preview"|"clean"|"add"} command
 */
function toSpawnEnv(cfg, command) {
    const isDev = command === "dev";
    /** @type {Record<string,string>} */
    const env = {
        ...process.env,
        DEV: isDev ? "true" : "false",
        PORT: String(cfg.port),
        PAGES_DIR: cfg.pagesDir,
        OUTPUT_DIR_CLIENT: path.join(cfg.outDir, "client"), // public client build output
        OUTPUT_DIR_SERVER: path.join(cfg.outDir, "server"), // private server (SSR) build output
        CLIENT_DIR: cfg.clientDir,
        COMPONENTS_DIR: cfg.componentsDir,
    };

    env.SXO_COMMAND = command;
    env.SXO_RESOLVED_CONFIG = JSON.stringify({
        command,
        port: cfg.port,
        pagesDir: cfg.pagesDir,
        outDir: cfg.outDir,
        publicPath: cfg.publicPath,
        clientDir: cfg.clientDir,
        componentsDir: cfg.componentsDir,
        build: cfg.build,
        loaders: cfg.loaders,
    });

    // Build-only controls that esbuild.config.js honors via env
    if (command === "build" || command === "dev") {
        if (cfg.build && typeof cfg.build === "object" && Object.keys(cfg.build).length) {
            env.BUILD = JSON.stringify(cfg.build);
        }
        if (cfg.loaders && typeof cfg.loaders === "object" && Object.keys(cfg.loaders).length) {
            env.LOADERS = JSON.stringify(cfg.loaders);
        }
        env.PUBLIC_PATH = typeof cfg.publicPath === "string" ? cfg.publicPath : "/";
    }

    if (command !== "build" && command !== "dev") {
        delete env.BUILD;
        delete env.LOADERS;
    }
    return env;
}

/* ------------------------- helpers ------------------------- */

/**
 * Parse a loaders string into an object map.
 * Accepts:
 *  - ".svg=file" → {".svg":"file"}
 *  - "svg=file,ts=tsx" → {".svg":"file",".ts":"tsx"}
 *  - ".svg=file,.ts=tsx" → {".svg":"file",".ts":"tsx"}
 * Returns a stable object map (sorted by key).
 * @param {string} raw
 * @returns {Record<string,string>}
 */
function parseLoadersString(raw) {
    const parts = String(raw).split(",");
    const out = {};
    for (const p of parts) {
        const [extRaw, loaderRaw] = String(p).split("=");
        if (!extRaw || !loaderRaw) continue;
        let ext = String(extRaw).trim();
        const loader = String(loaderRaw).trim();
        if (!ext || !loader) continue;
        if (!ext.startsWith(".")) ext = `.${ext}`;
        out[ext] = loader;
    }
    // Deterministic order
    const ordered = {};
    for (const k of Object.keys(out).sort()) ordered[k] = out[k];
    return ordered;
}

function pickDefined(...values) {
    for (const v of values) {
        if (v !== undefined && v !== null) return v;
    }
    return undefined;
}

function toNumber(x) {
    if (typeof x === "number" && Number.isFinite(x)) return Math.trunc(x);
    const n = parseInt(String(x), 10);
    return Number.isFinite(n) ? n : undefined;
}

function toBool(x) {
    if (typeof x === "boolean") return x;
    const s = String(x).toLowerCase().trim();
    if (["1", "true", "yes", "on"].includes(s)) return true;
    if (["0", "false", "no", "off"].includes(s)) return false;
    return undefined;
}

function clampPort(port, fallback) {
    const n = typeof port === "number" ? port : toNumber(port);
    if (!Number.isInteger(n) || n < 1 || n > 65535) return fallback;
    return n;
}

/**
 * Normalize to POSIX-style relative path (forward slashes). If absolute, convert to relative from cwd.
 * Ensure no trailing slash.
 * @param {string} p
 * @param {string} cwd
 */
function toPosixRelativePath(p, cwd) {
    if (!p) return "src/pages";
    let candidate = p;
    if (path.isAbsolute(candidate)) {
        candidate = path.relative(cwd, candidate);
    }
    // Normalize and then convert backslashes to forward slashes
    candidate = path.normalize(candidate);
    candidate = candidate.replace(/\\/g, "/");
    // Remove trailing slashes
    candidate = candidate.replace(/\/+$/, "");
    return candidate || ".";
}

/**
 * Normalize to absolute path.
 * @param {string} p
 * @param {string} cwd
 */
function toAbsolutePath(p, cwd) {
    if (!p) return path.resolve(cwd, "dist");
    const abs = path.isAbsolute(p) ? p : path.resolve(cwd, p);
    return path.normalize(abs);
}
