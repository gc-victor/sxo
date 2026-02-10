import * as fs from "node:fs";
import path from "node:path";

const { realpath } = fs.promises;

/**
 * Validate resolved configuration values.
 *
 * Throws errors for invalid configuration values.
 *
 * @param {any} merged - Resolved configuration object
 * @param {string} cwd - Current working directory
 * @throws {Error} If configuration is invalid
 */
export async function validateConfig(merged, cwd) {
    const projectRoot = path.resolve(cwd) + path.sep;

    if (!Number.isInteger(merged.port) || merged.port < 1 || merged.port > 65535)
        throw new Error(`Invalid port: ${merged.port}. Expected an integer between 1 and 65535.`);

    if (typeof merged.pagesDir !== "string" || merged.pagesDir.length === 0)
        throw new Error(`Invalid pagesDir: ${merged.pagesDir}. Expected a non-empty string path.`);

    // Resolve symlinks and verify pagesDir stays within project
    const resolvedPagesDir = path.resolve(cwd, merged.pagesDir);
    let realPagesDir;
    try {
        realPagesDir = await realpath(resolvedPagesDir);
    } catch (_err) {
        // Path doesn't exist yet, fall back to resolved path
        realPagesDir = resolvedPagesDir;
    }

    const pagesDirWithSep = realPagesDir.endsWith(path.sep) ? realPagesDir : realPagesDir + path.sep;
    if (!pagesDirWithSep.startsWith(projectRoot)) {
        throw new Error(
            `Invalid pagesDir: "${merged.pagesDir}" attempts to escape project directory. Path must be within "${cwd}". Resolved to ${realPagesDir}`,
        );
    }

    if (typeof merged.outDir !== "string" || !path.isAbsolute(merged.outDir))
        throw new Error(`Invalid outDir: ${merged.outDir}. Expected an absolute path.`);

    // Validate outDir is within project root to prevent accidental deletion of system directories
    const resolvedOutDir = path.resolve(merged.outDir);
    const normalizedProjectRoot = path.resolve(cwd);
    if (!resolvedOutDir.startsWith(normalizedProjectRoot)) {
        throw new Error(`Invalid outDir: "${merged.outDir}" attempts to escape project directory. Path must be within "${cwd}".`);
    }

    // Prevent dangerous outDir values that could delete critical directories
    const normalizedCwd = path.resolve(cwd);
    const dangerousPaths = [normalizedCwd, path.join(normalizedCwd, "src"), path.join(normalizedCwd, "node_modules")];
    const normalizedOutDir = resolvedOutDir.endsWith(path.sep) ? resolvedOutDir.slice(0, -1) : resolvedOutDir;
    for (const dangerousPath of dangerousPaths) {
        const normalizedDangerous = dangerousPath.endsWith(path.sep) ? dangerousPath.slice(0, -1) : dangerousPath;
        if (normalizedOutDir === normalizedDangerous) {
            throw new Error(
                `Invalid outDir: "${merged.outDir}" targets a protected directory. Use a dedicated output directory like "dist" or "build".`,
            );
        }
    }

    if (
        typeof merged.clientDir !== "string" ||
        merged.clientDir.length === 0 ||
        merged.clientDir.includes("/") ||
        merged.clientDir.includes("\\")
    )
        throw new Error(`Invalid clientDir: ${merged.clientDir}. Expected a non-empty single-segment folder name (e.g., "client").`);

    if (typeof merged.componentsDir !== "string" || merged.componentsDir.length === 0)
        throw new Error(`Invalid componentsDir: ${merged.componentsDir}. Expected a non-empty string path.`);

    // Resolve symlinks and verify componentsDir stays within project
    const resolvedComponentsDir = path.resolve(cwd, merged.componentsDir);
    let realComponentsDir;
    try {
        realComponentsDir = await realpath(resolvedComponentsDir);
    } catch (_err) {
        // Path doesn't exist yet, fall back to resolved path
        realComponentsDir = resolvedComponentsDir;
    }

    const componentsDirWithSep = realComponentsDir.endsWith(path.sep) ? realComponentsDir : realComponentsDir + path.sep;
    if (!componentsDirWithSep.startsWith(projectRoot)) {
        throw new Error(
            `Invalid componentsDir: "${merged.componentsDir}" attempts to escape project directory. Path must be within "${cwd}". Resolved to ${realComponentsDir}`,
        );
    }

    if (
        merged.securityHeaders !== undefined &&
        merged.securityHeaders !== null &&
        (typeof merged.securityHeaders !== "object" || Array.isArray(merged.securityHeaders))
    ) {
        throw new Error(`Invalid securityHeaders: ${JSON.stringify(merged.securityHeaders)}. Expected an object or null.`);
    }

    if (merged.securityHeaders && typeof merged.securityHeaders === "object") {
        const invalidValues = Object.entries(merged.securityHeaders).filter(([, v]) => typeof v !== "string");
        if (invalidValues.length > 0) {
            const examples = invalidValues.map(([k, v]) => `${k}: ${typeof v}`).join(", ");
            throw new Error(`Invalid securityHeaders values: ${examples}. All values must be strings.`);
        }
    }
}
