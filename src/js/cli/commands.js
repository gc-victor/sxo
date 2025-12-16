/**
 * @fileoverview CLI command handlers (re-exported from commands/ directory).
 *
 * Each handler encapsulates the core logic for a CLI command,
 * making it easier to test error conditions without running the full CLI.
 *
 * Handlers support dependency injection via the `inject` parameter,
 * using the `impl` namespace pattern to access injected implementations.
 *
 * @module cli/commands
 */

export { handleAddCommand } from "./commands/add.js";
export { handleBuildCommand } from "./commands/build.js";
export { handleCleanCommand } from "./commands/clean.js";
export { handleCreateCommand } from "./commands/create.js";
export { handleDevCommand } from "./commands/dev.js";
export { handleGenerateCommand } from "./commands/generate.js";
export { handleStartCommand } from "./commands/start.js";
