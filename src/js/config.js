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
 * @property {Record<string, boolean>} [flagsExplicit] // AIDEV-NOTE: true if user explicitly provided the flag
 * @property {"dev"|"build"|"start"|"preview"|"clean"} [command]
 *
 * @typedef {Object} SXOResolvedConfig
 * @property {"dev"|"build"|"start"|"preview"|"clean"} command
 * @property {number} port
 * @property {string} pagesDir    // normalized POSIX-style relative path (e.g., "src/pages")
 * @property {string} outDir      // absolute path
 * @property {boolean} open
 * @property {boolean} verbose
 * @property {boolean} color
 * @property {boolean} minify
 * @property {boolean} sourcemap
 * @property {string} publicPath
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
    // AIDEV-NOTE: If provided by the caller, only explicit flags will override file/env/defaults
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
        minify: normalized.minify,
        sourcemap: normalized.sourcemap,
        publicPath: normalized.publicPath,
        clientDir: normalized.clientDir,
        env: spawnEnv,
        configFilePath: configFilePath,
    };
}

export async function resolveRuntimeConfig(opts = {}) {
    const json = process.env.SXO_RESOLVED_CONFIG;
    if (json) {
        try {
            const fromParent = JSON.parse(json);
            const loaders = fromParent.loaders;
            return {
                command: fromParent.command,
                port: fromParent.port,
                pagesDir: fromParent.pagesDir,
                outDir: fromParent.outDir,
                minify: fromParent.minify,
                sourcemap: fromParent.sourcemap,
                publicPath: fromParent.publicPath,
                loaders,
                clientDir: fromParent.clientDir,
            };
        } catch {
            // fall through to recompute
        }
    }

    const flags = {
        port: process.env.PORT,
        pagesDir: process.env.PAGES_DIR,
        outDir: process.env.OUTPUT_DIR,
        minify: process.env.MINIFY,
        sourcemap: process.env.SOURCEMAP,
        publicPath: process.env.PUBLIC_PATH,
        clientDir: process.env.CLIENT_DIR,
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
        minify: env.MINIFY,
        sourcemap: env.SOURCEMAP,
        publicPath: env.PUBLIC_PATH,
        loaders: env.LOADERS,
        clientDir: env.CLIENT_DIR,
    };
}

/**
 * Command-aware default config
 * @param {"dev"|"build"|"start"|"preview"|"clean"} command
 * @param {string} cwd
 */
function defaultConfigForCommand(command, cwd) {
    const openDefault = command === "dev" || command === "preview";
    // For "dev": esbuild config already uses inline sourcemaps; we keep boolean here for higher-level flags
    const sourcemapDefault = command === "dev";
    return {
        port: 3000,
        pagesDir: "src/pages",
        outDir: path.resolve(cwd, "dist"),
        open: openDefault,
        verbose: false,
        color: true,
        minify: true,
        sourcemap: sourcemapDefault,
        publicPath: "/", // default; can be ""
        clientDir: "client",
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
 * @param {"dev"|"build"|"start"|"preview"|"clean"} ctx.command
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

        const minify = get("minify");
        if (minify !== undefined) norm.minify = toBool(minify);

        const sourcemap = get("sourcemap");
        if (sourcemap !== undefined) norm.sourcemap = toBool(sourcemap);

        // Preserve empty string if explicitly provided
        const publicPath = get("publicPath", "public-path");
        if (publicPath !== undefined) norm.publicPath = String(publicPath);

        const cfgPath = get("config");
        if (cfgPath !== undefined) norm.config = String(cfgPath);

        const loaders = get("loaders", "loader");
        if (loaders !== undefined) {
            norm.loaders = normalizeLoaders(loaders);
        }

        const clientDir = get("clientDir", "client-dir");
        if (clientDir !== undefined) norm.clientDir = String(clientDir);

        return norm;
    };

    const d = normalizeLayer(defaults);
    const e = normalizeLayer(env);
    const f = normalizeLayer(file);
    const gRaw = normalizeLayer(flags);

    // AIDEV-NOTE: If explicitness was provided, only allow explicitly-passed flags to override
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
        minify: pickDefined(g.minify, f.minify, e.minify, d.minify),
        sourcemap: pickDefined(g.sourcemap, f.sourcemap, e.sourcemap, d.sourcemap),
        publicPath: pickDefined(g.publicPath, f.publicPath, e.publicPath, d.publicPath),
        loaders: pickDefined(g.loaders, f.loaders, e.loaders, d.loaders),
        clientDir: pickDefined(g.clientDir, f.clientDir, e.clientDir, d.clientDir),
    };

    // Step 3: final normalization adjustments
    merged.port = clampPort(merged.port, 3000);
    merged.pagesDir = toPosixRelativePath(merged.pagesDir, cwd);
    merged.outDir = toAbsolutePath(merged.outDir, cwd);

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
}

/**
 * Build environment variables for child processes.
 * DEV is true only for "dev" command; otherwise false.
 * SOURCEMAP is "true" when enabled (esbuild config will map to "inline" in our setup).
 * @param {ReturnType<typeof normalizeConfig>} cfg
 * @param {"dev"|"build"|"start"|"preview"|"clean"} command
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
    };

    env.SXO_COMMAND = command;
    env.SXO_RESOLVED_CONFIG = JSON.stringify({
        command,
        port: cfg.port,
        pagesDir: cfg.pagesDir,
        outDir: cfg.outDir,
        minify: cfg.minify,
        sourcemap: cfg.sourcemap,
        publicPath: cfg.publicPath,
        loaders: cfg.loaders,
        clientDir: cfg.clientDir,
    });

    // Build-only controls that esbuild.config.js honors via env
    if (command === "build" || command === "dev") {
        if (typeof cfg.minify === "boolean") {
            env.MINIFY = cfg.minify ? "true" : "false";
        }
        if (typeof cfg.sourcemap === "boolean") {
            env.SOURCEMAP = cfg.sourcemap ? "true" : "false";
        }
        if (cfg.loaders && typeof cfg.loaders === "object" && Object.keys(cfg.loaders).length) {
            env.LOADERS = JSON.stringify(cfg.loaders);
        }
        env.PUBLIC_PATH = typeof cfg.publicPath === "string" ? cfg.publicPath : "/";
    }

    if (command !== "build" && command !== "dev") {
        delete env.LOADERS;
    }
    return env;
}

/* ------------------------- helpers ------------------------- */

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

/**
 * Normalize "loaders" into a canonical map of ".ext" -> "loader".
 *
 * Accepts:
 * - Object: { ".svg": "file", "ts": "tsx" } (leading dot optional on keys)
 * - JSON string: '{" .svg":"file"," .ts":"tsx"}'
 * - Comma/equals string: "svg=file,ts=tsx"
 *
 * Returns a plain object with trimmed, dot-prefixed extensions, or undefined if nothing valid
 * was provided.
 *
 * Trims keys/values, ignores null/undefined entries, and drops empty tokens.
 *
 * @param {Record<string, string>|string|any} val
 * @returns {Record<string, string>|undefined}
 */
function normalizeLoaders(val) {
    if (val == null) return undefined;
    if (typeof val === "object" && !Array.isArray(val)) {
        const out = {};
        for (const [k, v] of Object.entries(val)) {
            if (v === undefined || v === null) continue;
            let ext = String(k).trim();
            const loader = String(v).trim();
            if (!ext || !loader) continue;
            if (!ext.startsWith(".")) ext = `.${ext}`;
            out[ext] = loader;
        }
        return Object.keys(out).length ? out : undefined;
    }
    const s = String(val).trim();
    if (!s) return undefined;
    try {
        const obj = JSON.parse(s);
        return normalizeLoaders(obj);
    } catch {}
    const out = {};
    for (const token of s.split(",")) {
        const [rawExt, rawLoader] = token.split("=");
        if (!rawExt || !rawLoader) continue;
        let ext = String(rawExt).trim();
        const loader = String(rawLoader).trim();
        if (!ext || !loader) continue;
        if (!ext.startsWith(".")) ext = `.${ext}`;
        out[ext] = loader;
    }
    return Object.keys(out).length ? out : undefined;
}
