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
 * @param {string} filePath - Path in the repo (e.g. "templates/package.json")
 * @param {string} projectName - Project name to replace in text files
 * @returns {Promise<string|Buffer>} File content
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

        // Check for binary content using content-type or null bytes
        // GitHub raw usually returns text/plain for text, but checking buffer is safer
        // However, to support interpolation, we prefer text.
        // Simplified strategy: Read as buffer. If it has null bytes, treat as binary.
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
 * @function checkDirectoryExists
 * @param {string} projectPath - Absolute path to project directory
 * @returns {Promise<{exists: boolean, shouldProceed: boolean}>} Decision object
 */
export async function checkDirectoryExists(projectPath) {
    const exists = await pathExists(projectPath);

    if (!exists) {
        return { exists: false, shouldProceed: true };
    }

    const shouldOverwrite = await askYesNo(`Directory "${path.basename(projectPath)}" already exists. Overwrite?`);

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
 * @function handleCreateCommand
 * @param {string} projectName - Name of the project to create
 * @param {object} cfg - Resolved SXO configuration object
 * @param {string} cfg.cwd - Current working directory
 * @returns {Promise<boolean>} True if project created successfully
 */
export async function handleCreateCommand(projectName, cfg) {
    const effectiveProjectName = !projectName || projectName === "." ? path.basename(cfg.cwd) : projectName;

    const projectPath = projectName === "." ? cfg.cwd : path.join(cfg.cwd, effectiveProjectName);
    const { exists, shouldProceed } = await checkDirectoryExists(projectPath);

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

        // Download files in parallel with concurrency limit for better performance
        const CONCURRENCY_LIMIT = 5;

        const downloadFile = async (file) => {
            const destPath = path.join(projectPath, file);
            await ensureDir(path.dirname(destPath));
            const content = await fetchTemplateFile(`templates/${file}`, effectiveProjectName);
            await fsp.writeFile(destPath, content);
            process.stdout.write(".");
        };

        // Simple concurrency control: divide files into batches and process sequentially
        for (let i = 0; i < files.length; i += CONCURRENCY_LIMIT) {
            const batch = files.slice(i, i + CONCURRENCY_LIMIT);
            await Promise.all(batch.map(downloadFile));
        }

        process.stdout.write("\n");

        log.success("Project created successfully!");
        log.info("");
        log.info("Next steps:");
        log.info(`  cd ${effectiveProjectName}`);
        log.info("  pnpm install");
        log.info("  pnpm run dev");
    } catch (error) {
        log.error(`Failed to create project: ${error.message}`);
        return false;
    }

    return true;
}
