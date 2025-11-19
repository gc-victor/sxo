/**
 * @fileoverview SXO CLI create command implementation.
 *
 * Provides functionality to scaffold a new SXO project with example components,
 * configuration files, and starter pages. Fetches templates recursively from GitHub
 * to ensure the latest version is used.
 *
 * @module cli/create
 */

import fsp from "node:fs/promises";
import path from "node:path";

import { askYesNo, ensureDir, pathExists } from "./cli-helpers.js";
import { log } from "./ui.js";

// Used to list files in the repository (discovery).
// We need this because raw.githubusercontent.com doesn't support directory listing.
const GITHUB_API_BASE = "https://api.github.com/repos/gc-victor/sxo";
// Used to download the actual file content (text or binary) efficiently.
// The API has stricter rate limits and returns JSON/base64, so we prefer raw content for downloads.
const RAW_GITHUB_BASE = "https://raw.githubusercontent.com/gc-victor/sxo/main/";

/**
 * Fetches the list of files in the templates directory from the GitHub repository.
 *
 * Uses the GitHub API with a recursive tree lookup. Unauthenticated requests have a
 * rate limit of 60 requests per hour per IP; for frequent CLI usage in CI/CD, consider
 * adding a GITHUB_TOKEN environment variable to increase the limit to 5000 requests/hour.
 *
 * Potential future optimization—cache the template list locally with a TTL
 * to avoid repeated API calls during development. Could store in ~/.sxo or similar.
 *
 * @returns {Promise<string[]>} List of file paths relative to the templates directory
 */
async function fetchTemplateFileList() {
    try {
        const response = await fetch(`${GITHUB_API_BASE}/git/trees/main:templates?recursive=1`, {
            headers: {
                "User-Agent": "sxo-cli",
                Accept: "application/vnd.github.v3+json",
            },
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error("Templates directory not found in the repository.");
            }
            throw new Error(`GitHub API responded with ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        if (data.truncated) {
            log.warn("Warning: GitHub repository tree is too large, some template files might be missing.");
        }

        // Filter for blobs
        return data.tree.filter((node) => node.type === "blob").map((node) => node.path);
    } catch (error) {
        throw new Error(`Failed to fetch template list from GitHub: ${error.message}`);
    }
}

/**
 * Fetches a file from GitHub and returns it as text (with interpolation) or buffer.
 *
 * Binary files (detected by presence of null bytes) are returned as Buffer without interpolation.
 * Text files are decoded as UTF-8 and have the "project_name" placeholder replaced with the
 * actual project name. The null-byte heuristic is simple but effective for most template files.
 *
 * @param {string} filePath - Path in the repo (e.g. "templates/package.json")
 * @param {string} projectName - Project name to replace in text files
 * @returns {Promise<string|Buffer>} File content (string for text, Buffer for binary)
 *
 * @example
 * // Text file with placeholder
 * const content = await fetchTemplateFile('templates/package.json', 'my-app');
 * // => '{ "name": "my-app" }'
 *
 * // Binary file (image, archive, etc.)
 * const buffer = await fetchTemplateFile('templates/logo.png', 'my-app');
 * // => Buffer(...)  [no interpolation applied]
 */
async function fetchTemplateFile(filePath, projectName) {
    const url = `${RAW_GITHUB_BASE}${filePath}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout for content

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: { "User-Agent": "sxo-cli" },
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`GitHub responded with ${response.status}: ${response.statusText}`);
        }

        // Read as buffer first; we'll check for binary content using null bytes.
        // Binary detection: if the buffer contains a null byte (0x00), treat as binary.
        // This heuristic is simple and works well for common template types.
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Check for null bytes to detect binary files (simple heuristic)
        const isBinary = buffer.includes(0);

        if (isBinary) {
            return buffer;
        }

        let content = buffer.toString("utf8");

        // Replace project_name placeholder with the actual project name
        content = content.replaceAll("project_name", projectName);

        return content;
    } catch (error) {
        clearTimeout(timeoutId);
        throw new Error(`Failed to fetch ${filePath}: ${error.message}`);
    }
}

/**
 * Checks if a directory exists and prompts user for overwrite decision.
 *
 * If the directory already exists, prompts the user to confirm overwriting.
 * When the project name is ".", uses the actual directory name in the prompt.
 *
 * @function checkDirectoryExists
 * @param {string} projectPath - Absolute path to project directory
 * @param {string} [projectName] - Original project name argument (used for context in messaging)
 * @returns {Promise<{exists: boolean, shouldProceed: boolean}>} Decision object
 *
 * @example
 * // Non-existent directory: returns immediately
 * await checkDirectoryExists('/tmp/new-app', 'new-app')
 * // => { exists: false, shouldProceed: true }
 *
 * // Existing directory with TTY: prompts user
 * await checkDirectoryExists('/tmp/existing', 'existing')
 * // => prompts: "Create SXO template in 'existing'? (This will overwrite existing files.) (y/N)"
 * // => { exists: true, shouldProceed: true } if user answers "yes"
 */
export async function checkDirectoryExists(projectPath, _projectName) {
    const exists = await pathExists(projectPath);

    if (!exists) {
        return { exists: false, shouldProceed: true };
    }

    const dirName = path.basename(projectPath);
    const message = `Create SXO template in "${dirName}"? (This will overwrite existing files.)`;
    const shouldOverwrite = await askYesNo(message);

    return { exists: true, shouldProceed: shouldOverwrite };
}

/**
 * Main create command handler.
 *
 * Orchestrates the project creation workflow:
 * 1. Check directory existence
 * 2. Fetch template list from GitHub
 * 3. Download and write all files
 *
 * When `projectName` is ".", creates the project in the current directory
 * (effectively using the current directory name as the project name).
 *
 * @function handleCreateCommand
 * @param {string} projectName - Name of the project to create (or "." for current directory)
 * @param {object} cfg - Resolved SXO configuration object
 * @param {string} cfg.cwd - Current working directory
 * @returns {Promise<boolean>} True if project created successfully
 */
export async function handleCreateCommand(projectName, cfg) {
    const effectiveProjectName = !projectName || projectName === "." ? path.basename(cfg.cwd) : projectName;

    const projectPath = projectName === "." ? cfg.cwd : path.join(cfg.cwd, effectiveProjectName);
    const { exists, shouldProceed } = await checkDirectoryExists(projectPath, projectName);

    if (exists && !shouldProceed) {
        log.info("Project creation cancelled");
        return false;
    }

    try {
        await ensureDir(projectPath);

        log.info("Fetching template list from GitHub...");
        const files = await fetchTemplateFileList();

        if (files.length === 0) {
            throw new Error("No template files found in the repository.");
        }

        log.info(`Found ${files.length} files. Downloading templates...`);

        // Downloads are batched with a concurrency limit of 5 to balance:
        // - GitHub rate limits (avoid overwhelming the API)
        // - Performance (5 parallel requests is a good practical sweet-spot)
        // - Memory usage (large repos don't spike memory consumption)
        // Each batch is awaited fully before proceeding to the next batch.
        const CONCURRENCY_LIMIT = 5;

        const downloadFile = async (file) => {
            const destPath = path.join(projectPath, file);
            await ensureDir(path.dirname(destPath));
            const content = await fetchTemplateFile(`templates/${file}`, effectiveProjectName);
            await fsp.writeFile(destPath, content);
            process.stdout.write(".");
        };

        // Simple concurrency control: divide files into batches and process sequentially.
        // Batch i contains files[i * CONCURRENCY_LIMIT] through files[(i + 1) * CONCURRENCY_LIMIT - 1].
        // All files in a batch are downloaded in parallel via Promise.all.
        for (let i = 0; i < files.length; i += CONCURRENCY_LIMIT) {
            const batch = files.slice(i, i + CONCURRENCY_LIMIT);
            await Promise.all(batch.map(downloadFile));
        }

        process.stdout.write("\n");

        log.success("Project created successfully!");
        log.info("");
        log.info("Next steps:");
        if (projectName !== ".") {
            log.info(`  cd ${effectiveProjectName}`);
        }
        log.info("  pnpm install");
        log.info("  pnpm run dev");
    } catch (error) {
        log.error(`Failed to create project: ${error.message}`);
        return false;
    }

    return true;
}
