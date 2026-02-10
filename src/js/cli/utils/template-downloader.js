import fsp from "node:fs/promises";
import path from "node:path";
import { ensureDir } from "../cli-helpers.js";
import { log } from "../ui.js";

// Used to list files in the repository (discovery).
// We need this because raw.githubusercontent.com doesn't support directory listing.
const GITHUB_API_BASE = "https://api.github.com/repos/gc-victor/sxo";
// Used to download the actual file content (text or binary) efficiently.
// The API has stricter rate limits and returns JSON/base64, so we prefer raw content for downloads.
const RAW_GITHUB_BASE = "https://raw.githubusercontent.com/gc-victor/sxo/main/";

/**
 * Fetches the list of files in a templates directory from the GitHub repository.
 *
 * Uses the GitHub API with a recursive tree lookup. Unauthenticated requests have a
 * rate limit of 60 requests per hour per IP; for frequent CLI usage in CI/CD, consider
 * adding a GITHUB_TOKEN environment variable to increase the limit to 5000 requests/hour.
 *
 * Request is aborted after 10 seconds to prevent indefinite hangs on slow networks
 * or GitHub API issues. This matches the timeout behavior of fetchTemplateFile().
 *
 * Potential future optimization—cache the template list locally with a TTL
 * to avoid repeated API calls during development. Could store in ~/.sxo or similar.
 *
 * @param {string} runtime - Runtime to fetch templates for (node, bun, deno, workers)
 * @returns {Promise<string[]>} List of file paths relative to templates directory
 *
 * @example
 * const files = await fetchTemplateFileList('node');
 * // => ['package.json', 'src/index.js', 'assets/logo.png']
 */
export async function fetchTemplateFileList(runtime) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
        const response = await fetch(`${GITHUB_API_BASE}/git/trees/main:templates/${runtime}?recursive=1`, {
            signal: controller.signal,
            headers: {
                "User-Agent": "sxo-cli",
                Accept: "application/vnd.github.v3+json",
            },
        });
        clearTimeout(timeoutId);

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
        return data.tree
            .filter((/** @type {{ type: string, path: string }} */ node) => node.type === "blob")
            .map((/** @type {{ type: string, path: string }} */ node) => node.path);
    } catch (error) {
        clearTimeout(timeoutId);
        throw new Error(`Failed to fetch template list from GitHub: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Fetches a file from GitHub and returns it as text (with interpolation) or buffer.
 *
 * Binary files (detected by presence of null bytes) are returned as Buffer without interpolation.
 * Text files are decoded as UTF-8 and have "project_name" placeholder replaced with
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
export async function fetchTemplateFile(filePath, projectName) {
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
        // Binary detection: if buffer contains a null byte (0x00), treat as binary.
        // This heuristic is simple and works well for common template types.
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Check for null bytes to detect binary files (simple heuristic)
        const isBinary = buffer.includes(0x00);

        if (isBinary) {
            return buffer;
        }

        // For text files, decode as UTF-8 and interpolate project_name placeholder
        const content = buffer.toString("utf8");
        return content.replaceAll("project_name", projectName);
    } catch (error) {
        clearTimeout(timeoutId);
        throw new Error(`Failed to fetch ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Downloads all template files for a given runtime to the specified project directory.
 *
 * Orchestrates the template download process:
 * 1. Fetches the list of template files from GitHub
 * 2. Downloads each file with concurrency control (5 parallel requests)
 * 3. Writes files to disk, creating directories as needed
 * 4. Interpolates "project_name" placeholder in text files
 *
 * @param {string} runtime - Runtime to fetch templates for (node, bun, deno, workers)
 * @param {string} projectName - Project name to use for placeholder interpolation
 * @param {string} projectPath - Absolute path to project directory
 * @returns {Promise<void>}
 *
 * @throws {Error} When template list is empty or downloads fail
 *
 * @example
 * await downloadTemplates('node', 'my-app', '/path/to/my-app');
 * // Downloads and writes all node template files to /path/to/my-app
 */
export async function downloadTemplates(runtime, projectName, projectPath) {
    log.info("Fetching template list from GitHub...");
    const files = await fetchTemplateFileList(runtime);

    if (files.length === 0) {
        throw new Error("No template files found in the repository.");
    }

    log.info(`Found ${files.length} files. Downloading templates...`);

    // Downloads are batched with a concurrency limit of 5 to balance:
    // - GitHub rate limits (avoid overwhelming: API)
    // - Performance (5 parallel requests is a good practical sweet-spot)
    // - Memory usage (large repos don't spike memory consumption)
    // Each batch is awaited fully before proceeding to the next batch.
    const CONCURRENCY_LIMIT = 5;

    const downloadFile = async (/** @type {string} */ file) => {
        const destPath = path.join(projectPath, file);
        const resolvedDest = path.resolve(destPath);
        const resolvedRoot = path.resolve(projectPath);

        if (!resolvedDest.startsWith(resolvedRoot + path.sep) && resolvedDest !== resolvedRoot) {
            throw new Error(`Refusing to write outside project root: ${file}`);
        }

        await ensureDir(path.dirname(destPath));
        const content = await fetchTemplateFile(`templates/${runtime}/${file}`, projectName);
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
}
