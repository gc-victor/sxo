/**
 * Universal development server entry point.
 *
 * This module auto-detects the JavaScript runtime (Node.js, Bun, or Deno)
 * and dynamically imports the appropriate platform-specific dev adapter.
 *
 * Usage:
 *   - Node.js: node src/js/server/dev.js
 *   - Bun: bun src/js/server/dev.js
 *   - Deno: deno run --allow-all src/js/server/dev.js
 *
 * Or simply use the CLI: sxo dev
 *
 * The dev server provides:
 *   - Hot reload via SSE
 *   - File watching with automatic rebuild
 *   - Dynamic middleware reloading
 *   - esbuild integration
 *
 * Platform-specific adapters:
 *   - dev/node.js - Uses Node.js http, fs.watch, child_process
 *   - dev/bun.js - Uses Bun.serve, Bun.spawn, native file watching
 *   - dev/deno.js - Uses Deno.serve, Deno.Command, Deno.watchFs
 *
 * @module sxo/server/dev
 */

import { detectRuntime } from "./shared/runtime.js";

const runtime = detectRuntime();

// Log the detected runtime
const runtimeNames = {
    node: "Node.js",
    bun: "Bun",
    deno: "Deno",
};
console.log(`\x1b[36m▶ Starting dev server with ${runtimeNames[runtime]} adapter\x1b[0m`);

// Dynamic import of the platform-specific dev adapter
// Each adapter uses the immediate-execution pattern (starts server on import)
await import(`./dev/${runtime}.js`);
