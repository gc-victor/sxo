import path from "node:path";

/**
 * Normalize to POSIX-style relative path (forward slashes).
 * If absolute, converts to relative from cwd. Removes trailing slashes.
 *
 * Handles:
 * - Backslashes → forward slashes (Windows paths)
 * - Trailing slashes removal
 * - Absolute → relative conversion
 * - Cross-platform path normalization
 *
 * @param {string} p - Path to normalize
 * @param {string} cwd - Current working directory (for absolute conversion)
 * @returns {string} POSIX-style relative path
 *
 * @example
 * ```js
 * toRelativePosixPath("src/pages", "/project") // "src/pages"
 * toRelativePosixPath("src\\pages", "/project") // "src/pages"
 * toRelativePosixPath("/project/src/pages", "/project") // "src/pages"
 * toRelativePosixPath("src/pages/", "/project") // "src/pages"
 * ```
 */
export function toRelativePosixPath(p, cwd) {
    if (!p) return "src/pages";
    let candidate = p;

    // Convert absolute to relative if needed
    if (path.isAbsolute(candidate)) {
        candidate = path.relative(cwd, candidate);
    }

    // Normalize to platform-agnostic path, then convert backslashes to forward slashes
    candidate = path.normalize(candidate);
    candidate = candidate.replace(/\\/g, "/");

    // Remove trailing slashes
    candidate = candidate.replace(/\/+$/, "");

    return candidate || ".";
}

/**
 * Normalize to absolute path.
 *
 * @param {string} p - Path to normalize
 * @param {string} cwd - Current working directory
 * @returns {string} Absolute path
 *
 * @example
 * ```js
 * toAbsolutePath("dist", "/project") // "/project/dist"
 * toAbsolutePath("/abs/path", "/project") // "/abs/path"
 * ```
 */
export function toAbsolutePath(p, cwd) {
    if (!p) return path.resolve(cwd, "dist");
    const abs = path.isAbsolute(p) ? p : path.resolve(cwd, p);
    return path.normalize(abs);
}
