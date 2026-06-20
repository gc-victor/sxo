import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/**
 * Detects Windows symlink privilege errors that occur when creating symlinks
 * without elevated privileges. Windows uses different error codes/messages
 * than Unix systems for symlink permission failures.
 *
 * @param {any} err - Error object from failed symlink operation
 * @returns {boolean} True if the error indicates a Windows symlink privilege issue
 */
export function isWindowsSymlinkPrivilegeError(err) {
    if (!err || typeof err !== "object") {
        return false;
    }

    // Primary error codes for permission/access denied on symlink operations
    const privilegeErrorCodes = ["EPERM", "EACCES"];

    if (err.code && privilegeErrorCodes.includes(err.code)) {
        return true;
    }

    // Fallback: Check for known Windows-specific error messages
    // These messages can vary by Windows version but are commonly observed
    if (err.message) {
        const lowerMessage = err.message.toLowerCase();

        // Known Windows symlink privilege error patterns
        const windowsPrivilegePatterns = [
            /privilege.*not held/i,
            /required.*privilege.*not held/i,
            /symlink.*privilege/i,
            /symbolic.*link.*privilege/i,
            /security.*policy.*requires/i,
            /not.*able.*to.*create.*symlink/i,
            /cannot.*create.*symlink.*permission/i,
            /administrator.*required/i,
            /elevated.*privileges/i,
        ];

        return windowsPrivilegePatterns.some((pattern) => pattern.test(lowerMessage));
    }

    return false;
}

/**
 * Detects if the current platform supports creating symlinks.
 *
 * Performs a quick test by attempting to create a symlink in a temporary directory.
 * This accurately detects Windows systems without elevated privileges where
 * symlink creation fails.
 *
 * @returns {Promise<boolean>} True if symlinks can be created on this platform
 */
export async function canCreateSymlinks() {
    const testDir = await fsp.mkdtemp(path.join(os.tmpdir(), "symlink-test-"));
    const target = path.join(testDir, "target");
    const link = path.join(testDir, "link");

    try {
        await fsp.mkdir(target, { recursive: true });
        await fsp.symlink(target, link);
        return true;
    } catch {
        return false;
    } finally {
        await fsp.rm(testDir, { recursive: true, force: true });
    }
}

/**
 * Creates a test directory structure with symlinks for security testing.
 *
 * This helper is used for testing symlink escape detection in configuration
 * validation. It creates symlinks that point both outside and within the project
 * directory to test security boundary enforcement.
 *
 * @param {string} baseDir - Base directory for test structure
 * @param {string} testName - Unique name for the test
 * @returns {Promise<{
 *   projectDir: string,
 *   outsideDir: string,
 *   symlinks: {
 *     pagesOutside: string,
 *     componentsOutside: string,
 *     pagesValid: string,
 *     componentsValid: string,
 *   }
 * }>}
 * @throws {Error & {skipPlatform?: string; symlinkTest?: boolean}} With skip message if symlinks cannot be created on this platform
 */
export async function createSymlinkTestStructure(baseDir, testName = "test") {
    const projectDir = path.join(baseDir, `project-${testName}`);
    const outsideDir = path.join(baseDir, `outside-${testName}`);

    await fsp.mkdir(projectDir, { recursive: true });
    await fsp.mkdir(outsideDir, { recursive: true });

    // Create symlinks pointing outside project
    const pagesSymlink = path.join(projectDir, "pages-symlink");
    const componentsSymlink = path.join(projectDir, "components-symlink");

    try {
        await fsp.symlink(outsideDir, pagesSymlink);
        await fsp.symlink(outsideDir, componentsSymlink);
    } catch (err) {
        if (isWindowsSymlinkPrivilegeError(err)) {
            /** @type {Error & {skipPlatform?: string; symlinkTest?: boolean}} */
            const error = new Error("Symlink test skipped - requires elevated privileges on Windows");
            error.skipPlatform = "windows";
            error.symlinkTest = true;
            throw error;
        }
        throw err;
    }

    // Create valid symlinks within project
    const validSymlinkTarget = path.join(projectDir, "target");
    await fsp.mkdir(validSymlinkTarget, { recursive: true });

    const validPagesSymlink = path.join(projectDir, "pages-valid");
    const validComponentsSymlink = path.join(projectDir, "components-valid");

    await fsp.symlink(validSymlinkTarget, validPagesSymlink);
    await fsp.symlink(validSymlinkTarget, validComponentsSymlink);

    return {
        projectDir,
        outsideDir,
        symlinks: {
            pagesOutside: pagesSymlink,
            componentsOutside: componentsSymlink,
            pagesValid: validPagesSymlink,
            componentsValid: validComponentsSymlink,
        },
    };
}

/**
 * Environment keys captured and restored during tests.
 *
 * ## Purpose
 *
 * This list isolates SXO-specific environment variables that could pollute test
 * results if left modified between tests. By capturing and restoring these keys,
 * withEnvCapture ensures tests run in a predictable environment state.
 *
 * ## Inclusion Policy
 *
 * A key should be included if:
 * - It is used by SXO's config resolution or runtime behavior
 * - Tests frequently modify it to verify configuration behavior
 * - It could cause flaky tests if left set from a previous test run
 *
 * Keys are grouped by their functional area:
 * - Server: PORT, OPEN
 * - Build: MINIFY, SOURCEMAP
 * - Paths: PAGES_DIR, OUTPUT_DIR, PUBLIC_PATH, CLIENT_DIR, COMPONENTS_DIR
 * - Features: LOADERS (custom file loaders)
 * - Logging: VERBOSE, NO_COLOR
 *
 * @type {string[]}
 */
const KEYS = [
    // Server configuration
    "PORT", // Server listen port
    "OPEN", // Auto-open browser flag
    // Build configuration
    "MINIFY", // Minify output
    "SOURCEMAP", // Generate source maps
    // Path configuration
    "PAGES_DIR", // Pages directory
    "OUTPUT_DIR", // Output directory
    "PUBLIC_PATH", // Public base URL
    "CLIENT_DIR", // Per-route client entry directory
    "COMPONENTS_DIR", // Components directory
    // Feature flags
    "LOADERS", // Custom esbuild file loaders
    "VERBOSE", // Verbose logging
    "NO_COLOR", // Disable color output
];

/**
 * Runs a function within an isolated temporary directory.
 *
 * Creates a temporary directory, executes the provided function with the directory path,
 * and ensures cleanup on completion (success or failure).
 *
 * @template T
 * @param {(dir: string) => Promise<T>} fn - Async function to execute within temp directory
 * @returns {Promise<T>} Result from the provided function
 *
 * @example
 * ```js
 * await withTempProject(async (dir) => {
 *   await writeFile(dir, "test.txt", "content");
 *   const content = await fsp.readFile(path.join(dir, "test.txt"), "utf8");
 *   assert.equal(content, "content");
 * });
 * ```
 */
export async function withTempProject(fn) {
    const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), "sxo-test-"));
    try {
        return await fn(tmp);
    } finally {
        // Cleanup temp directory
        try {
            await fsp.rm(tmp, { recursive: true, force: true, maxRetries: 2 });
        } catch {
            // ignore
        }
    }
}

/**
 * Writes a text file, ensuring parent directories exist.
 *
 * Creates any necessary directories in the path and writes the file content.
 *
 * @param {string} dir - Base directory path
 * @param {string} rel - Relative path from dir (e.g., "subdir/file.txt")
 * @param {string} content - File content to write
 * @returns {Promise<string>} Absolute path to the written file
 *
 * @example
 * ```js
 * const filePath = await writeFile(tempDir, "config/test.json", '{"port": 3000}');
 * assert.equal(path.basename(filePath), "test.json");
 * ```
 */
export async function writeFile(dir, rel, content) {
    const abs = path.join(dir, rel);
    await fsp.mkdir(path.dirname(abs), { recursive: true });
    await fsp.writeFile(abs, content, "utf8");
    return abs;
}

/**
 * Captures and restores selected environment keys for test isolation.
 *
 * Isolates SXO-specific environment variables defined in the KEYS list.
 * This prevents test pollution where one test's environment modifications
 * could affect subsequent tests. After the function completes (success or failure),
 * all captured keys are restored to their original state.
 *
 * Keys not in the KEYS list are not captured or restored.
 *
 * @template T
 * @param {() => Promise<T>} fn - Async function to execute with env isolation
 * @returns {Promise<T>} Result from the provided function
 *
 * @example
 * ```js
 * await withEnvCapture(async () => {
 *   process.env.PORT = "4100";
 *   const cfg = await resolveConfig({ cwd: dir, command: "dev", flags: {} });
 *   assert.equal(cfg.port, 4100);
 * });
 * // PORT is restored to its original value here
 * ```
 */
export function withEnvCapture(fn) {
    const snapshot = /** @type {Record<string, string>} */ ({});
    for (const k of KEYS) {
        if (Object.hasOwn(process.env, k)) snapshot[k] = process.env[k] || "";
    }
    return (async () => {
        try {
            return await fn();
        } finally {
            for (const k of KEYS) {
                if (Object.hasOwn(snapshot, k)) process.env[k] = snapshot[k];
                else delete process.env[k];
            }
        }
    })();
}

/**
 * Mocks console.warn to capture warning messages using test runner's automatic cleanup.
 *
 * Uses `mock.method()` from node:test for automatic restoration after each test.
 * Prevents leaks between tests by ensuring console is restored automatically.
 *
 * @param {import("node:test").TestContext} t - Test context for automatic cleanup
 * @returns {{ getWarnings: () => string[] }} Object with method to retrieve captured warnings
 *   getWarnings - Returns a copy of captured warnings
 *
 * @example
 * ```javascript
 * test("example", (t) => {
 *   const mock = mockConsoleWarn(t);
 *   console.warn("Test warning");
 *   assert.equal(mock.getWarnings().length, 1);
 * }); // console.warn is automatically restored here
 * ```
 */
export function mockConsoleWarn(t) {
    if (!t?.mock) {
        throw new Error("mockConsoleWarn requires test context 't' for automatic cleanup");
    }
    /** @type {string[]} */
    const warnings = [];

    t.mock.method(console, "warn", (/** @type {any[]} */ ...args) => {
        warnings.push(args.join(" "));
    });

    return {
        getWarnings: () => warnings.slice(),
    };
}

/**
 * Mocks console.error to capture error messages using test runner's automatic cleanup.
 *
 * Uses `mock.method()` from node:test for automatic restoration after each test.
 * Prevents leaks between tests by ensuring console is restored automatically.
 *
 * @param {import("node:test").TestContext} t - Test context for automatic cleanup
 * @returns {{ getErrors: () => string[] }} Object with method to retrieve captured errors
 *   getErrors - Returns a copy of captured errors
 *
 * @example
 * ```javascript
 * test("example", (t) => {
 *   const mock = mockConsoleError(t);
 *   console.error("Test error");
 *   assert.equal(mock.getErrors().length, 1);
 * }); // console.error is automatically restored here
 * ```
 */
export function mockConsoleError(t) {
    if (!t?.mock) {
        throw new Error("mockConsoleError requires test context 't' for automatic cleanup");
    }
    /** @type {string[]} */
    const errors = [];

    t.mock.method(console, "error", (/** @type {any[]} */ ...args) => {
        errors.push(args.join(" "));
    });

    return {
        getErrors: () => errors.slice(),
    };
}
