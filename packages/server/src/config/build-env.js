import path from "node:path";

/**
 * Build spawn environment variables from resolved config.
 *
 * Creates environment object for spawning child processes with all necessary SXO
 * environment variables set.
 *
 * @param {ResolvedConfig} merged - Resolved configuration object
 * @param {Command} command - SXO command
 * @returns {SpawnEnv} Spawn environment object
 */
export function buildSpawnEnv(merged, command) {
    const isDev = command === "dev";

    /** @type {SpawnEnv} */
    const spawnEnv = {
        ...process.env,
        TZ: process.env.TZ || "",
        DEV: isDev ? "true" : "false",
        PORT: String(merged.port),
        PAGES_DIR: merged.pagesDir,
        OUTPUT_DIR_CLIENT: path.join(merged.outDir, "client"),
        OUTPUT_DIR_SERVER: path.join(merged.outDir, "server"),
        CLIENT_DIR: merged.clientDir,
        COMPONENTS_DIR: merged.componentsDir,
        SXO_COMMAND: command,
        SXO_RESOLVED_CONFIG: JSON.stringify({
            command,
            port: merged.port,
            pagesDir: merged.pagesDir,
            outDir: merged.outDir,
            publicPath: merged.publicPath,
            clientDir: merged.clientDir,
            componentsDir: merged.componentsDir,
            build: merged.build,
            loaders: merged.loaders,
            open: merged.open,
            allowMiddlewareSecurityOverride: merged.allowMiddlewareSecurityOverride,
            securityHeaders: merged.securityHeaders,
        }),
    };

    if (command === "build" || command === "dev" || command === "generate") {
        if (merged.build && typeof merged.build === "object" && Object.keys(merged.build).length)
            spawnEnv.BUILD = JSON.stringify(merged.build);
        if (merged.loaders && typeof merged.loaders === "object" && Object.keys(merged.loaders).length)
            spawnEnv.LOADERS = JSON.stringify(merged.loaders);
        spawnEnv.PUBLIC_PATH = typeof merged.publicPath === "string" ? merged.publicPath : "/";
    }

    if (command !== "build" && command !== "dev" && command !== "generate") {
        delete spawnEnv.BUILD;
        delete spawnEnv.LOADERS;
    }

    return spawnEnv;
}
