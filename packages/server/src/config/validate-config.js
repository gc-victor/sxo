import * as fs from "node:fs";
import path from "node:path";

const { realpath } = fs.promises;

async function validateProjectDirectory(directory, field, cwd) {
    const resolvedDirectory = path.resolve(cwd, directory);
    let realDirectory;
    try {
        realDirectory = await realpath(resolvedDirectory);
    } catch (_err) {
        // Path doesn't exist yet, fall back to resolved path
        realDirectory = resolvedDirectory;
    }

    const projectRoot = path.resolve(cwd) + path.sep;
    const directoryWithSep = realDirectory.endsWith(path.sep) ? realDirectory : realDirectory + path.sep;
    if (!directoryWithSep.startsWith(projectRoot)) {
        throw new Error(
            `Invalid ${field}: "${directory}" attempts to escape project directory. Path must be within "${cwd}". Resolved to ${realDirectory}`,
        );
    }
}

function validateOutDir(outDir, cwd) {
    if (typeof outDir !== "string" || !path.isAbsolute(outDir)) throw new Error(`Invalid outDir: ${outDir}. Expected an absolute path.`);

    const resolvedOutDir = path.resolve(outDir);
    const normalizedProjectRoot = path.resolve(cwd);
    if (!resolvedOutDir.startsWith(normalizedProjectRoot)) {
        throw new Error(`Invalid outDir: "${outDir}" attempts to escape project directory. Path must be within "${cwd}".`);
    }

    const dangerousPaths = [
        normalizedProjectRoot,
        path.join(normalizedProjectRoot, "src"),
        path.join(normalizedProjectRoot, "node_modules"),
    ];
    const normalizedOutDir = resolvedOutDir.endsWith(path.sep) ? resolvedOutDir.slice(0, -1) : resolvedOutDir;
    for (const dangerousPath of dangerousPaths) {
        const normalizedDangerous = dangerousPath.endsWith(path.sep) ? dangerousPath.slice(0, -1) : dangerousPath;
        if (normalizedOutDir === normalizedDangerous) {
            throw new Error(
                `Invalid outDir: "${outDir}" targets a protected directory. Use a dedicated output directory like "dist" or "build".`,
            );
        }
    }
}

function validateSecurityHeaders(securityHeaders) {
    if (
        securityHeaders !== undefined &&
        securityHeaders !== null &&
        (typeof securityHeaders !== "object" || Array.isArray(securityHeaders))
    ) {
        throw new Error(`Invalid securityHeaders: ${JSON.stringify(securityHeaders)}. Expected an object or null.`);
    }

    if (securityHeaders && typeof securityHeaders === "object") {
        const invalidValues = Object.entries(securityHeaders).filter(([, value]) => typeof value !== "string");
        if (invalidValues.length > 0) {
            const examples = invalidValues.map(([key, value]) => `${key}: ${typeof value}`).join(", ");
            throw new Error(`Invalid securityHeaders values: ${examples}. All values must be strings.`);
        }
    }
}

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
    if (!Number.isInteger(merged.port) || merged.port < 1 || merged.port > 65535)
        throw new Error(`Invalid port: ${merged.port}. Expected an integer between 1 and 65535.`);

    if (typeof merged.pagesDir !== "string" || merged.pagesDir.length === 0)
        throw new Error(`Invalid pagesDir: ${merged.pagesDir}. Expected a non-empty string path.`);
    await validateProjectDirectory(merged.pagesDir, "pagesDir", cwd);

    validateOutDir(merged.outDir, cwd);

    if (
        typeof merged.clientDir !== "string" ||
        merged.clientDir.length === 0 ||
        merged.clientDir.includes("/") ||
        merged.clientDir.includes("\\")
    )
        throw new Error(`Invalid clientDir: ${merged.clientDir}. Expected a non-empty single-segment folder name (e.g., "client").`);

    if (typeof merged.componentsDir !== "string" || merged.componentsDir.length === 0)
        throw new Error(`Invalid componentsDir: ${merged.componentsDir}. Expected a non-empty string path.`);
    await validateProjectDirectory(merged.componentsDir, "componentsDir", cwd);

    validateSecurityHeaders(merged.securityHeaders);
}
