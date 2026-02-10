/**
 * SXO type definitions barrel file.
 *
 * Provides global type declarations for use across the codebase.
 * Types are made globally available via tsconfig typeRoots.
 */

declare global {
    /**
     * Route manifest entry.
     *
     * Represents a single route in the SXO application, including
     * the source JSX file, output filename, entry points, and assets.
     */
    interface Route {
        /** Output filename (e.g., "index.html") */
        filename: string;
        /** Client entry points */
        entryPoints: string[];
        /** Source JSX path */
        jsx: string;
        /** Route path pattern */
        path?: string;
        /** Whether route is pre-rendered */
        generated?: boolean;
        /** Built assets */
        assets: {
            css: string[];
            js: string[];
        };
        /** Whether assets are hashed */
        hash: boolean;
    }

    /**
     * Logger interface compatible with pino and other structured loggers.
     */
    interface Logger {
        info: (msg: string | object, ...args: unknown[]) => void;
        warn: (msg: string | object, ...args: unknown[]) => void;
        error: (msg: string | object, ...args: unknown[]) => void;
        debug: (msg: string | object, ...args: unknown[]) => void;
        trace?: (...args: unknown[]) => void;
        fatal?: (...args: unknown[]) => void;
    }

    /**
     * SXO command type.
     */
    type Command = "dev" | "build" | "start" | "preview" | "clean" | "add" | "generate";

    /**
     * Merged configuration object before finalization.
     *
     * Represents intermediate state after merging defaults, environment variables,
     * file config, and CLI flags. All properties are optional to allow partial
     * configurations from each source.
     */
    interface ConfigObject {
        port?: number;
        pagesDir?: string;
        outDir?: string;
        open?: boolean;
        verbose?: boolean;
        color?: boolean;
        publicPath?: string;
        clientDir?: string;
        componentsDir?: string;
        // biome-ignore lint/suspicious/noExplicitAny: esbuild config can be any object
        build?: Record<string, any>;
        loaders?: Record<string, string>;
        command?: Command;
        allowMiddlewareSecurityOverride?: boolean;
        securityHeaders?: Record<string, string> | null;
    }

    /**
     * Final resolved configuration with required fields.
     *
     * Represents complete, validated configuration after merging all sources
     * and applying defaults. All required properties are guaranteed to be present
     * and have valid types.
     */
    interface ResolvedConfig {
        command: Command;
        port: number;
        pagesDir: string;
        outDir: string;
        open: boolean;
        verbose: boolean;
        color: boolean;
        publicPath: string;
        clientDir: string;
        componentsDir: string;
        // biome-ignore lint/suspicious/noExplicitAny: esbuild config can be any object
        build?: Record<string, any>;
        loaders?: Record<string, string>;
        env: Record<string, string>;
        configFilePath: string | null;
        allowMiddlewareSecurityOverride: boolean;
        securityHeaders?: Record<string, string> | null;
    }

    /**
     * CLI flags type definition.
     *
     * Represents parsed command-line flags that may override config from other sources.
     * All properties are optional since CLI flags are sparse by design.
     */
    interface FlagConfig {
        port?: number;
        pagesDir?: string;
        outDir?: string;
        open?: boolean;
        verbose?: boolean;
        color?: boolean;
        publicPath?: string;
        clientDir?: string;
        componentsDir?: string;
        // biome-ignore lint/suspicious/noExplicitAny: esbuild config can be any object
        build?: Record<string, any>;
        loaders?: Record<string, string>;
        command?: Command;
        allowMiddlewareSecurityOverride?: boolean;
        securityHeaders?: Record<string, string> | null;
    }

    /**
     * Environment-derived configuration type definition.
     *
     * Represents configuration values sourced from environment variables.
     * All properties are optional since environment variables may not be set.
     */
    interface EnvConfig {
        PORT?: number;
        PAGES_DIR?: string;
        OUTPUT_DIR?: string;
        OPEN?: string | boolean;
        VERBOSE?: string | boolean;
        NO_COLOR?: string | boolean;
        PUBLIC_PATH?: string;
        CLIENT_DIR?: string;
        COMPONENTS_DIR?: string;
        // biome-ignore lint/suspicious/noExplicitAny: esbuild config can be any object
        BUILD?: Record<string, any>;
        LOADERS?: Record<string, string>;
        ALLOW_MIDDLEWARE_SECURITY_OVERRIDE?: string | boolean;
        SECURITY_HEADERS?: Record<string, string> | null;
    }

    /**
     * Configuration resolution options.
     *
     * Options passed to config resolution functions to control resolution behavior.
     */
    interface ResolveOptions {
        cwd?: string;
        command?: Command;
        flags?: Record<string, unknown>;
        flagsExplicit?: Record<string, boolean>;
    }

    /**
     * Spawn environment object.
     *
     * Environment variables for spawning child processes, extending process.env
     * with SXO-specific variables.
     */
    interface SpawnEnv extends NodeJS.ProcessEnv {
        TZ?: string;
        DEV: string;
        PORT: string;
        PAGES_DIR: string;
        OUTPUT_DIR_CLIENT: string;
        OUTPUT_DIR_SERVER: string;
        CLIENT_DIR: string;
        COMPONENTS_DIR: string;
        SXO_COMMAND: Command;
        SXO_RESOLVED_CONFIG: string;
        BUILD?: string;
        LOADERS?: string;
        PUBLIC_PATH?: string;
        ALLOW_MIDDLEWARE_SECURITY_OVERRIDE?: string;
    }

    /** JSX component renderer. */
    var __jsxComponent: (
        Component: string | ((props: Record<string, unknown>) => string | string[] | unknown),
        props: unknown,
        children?: unknown,
    ) => string;
    /** JSX attribute spreader. */
    var __jsxSpread: (obj: Record<string, unknown>) => string;
    /** JSX list joiner. */
    var __jsxList: (value: unknown) => string;
}

export {};
