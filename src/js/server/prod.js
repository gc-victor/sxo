/**
 * Universal production server entry point.
 *
 * This module auto-detects the JavaScript runtime (Node.js, Bun, or Deno)
 * and dynamically imports the appropriate platform-specific prod adapter.
 *
 * Usage:
 *   - Node.js: node src/js/server/prod.js
 *   - Bun: bun src/js/server/prod.js
 *   - Deno: deno run --allow-all src/js/server/prod.js
 *
 * Or simply use the CLI: sxo start
 *
 * The prod server provides:
 *   - Custom 404/500 error pages
 *   - User middleware support
 *   - Static file serving with precompression
 *   - SSR for dynamic routes
 *   - Pre-generated HTML serving for static routes
 *
 * Platform-specific adapters:
 *   - prod/node.js - Uses Node.js http server
 *   - prod/bun.js - Uses Bun.serve
 *   - prod/deno.js - Uses Deno.serve
 *
 * Note: Cloudflare Workers uses a separate factory pattern (prod/cloudflare.js)
 * and is not included in this auto-detection flow.
 *
 * @module sxo/server/prod
 */

import { detectRuntime } from "./shared/runtime.js";

const runtime = detectRuntime();

// Log the detected runtime
const runtimeNames = {
    node: "Node.js",
    bun: "Bun",
    deno: "Deno",
};
console.log(`\x1b[33m▶ Starting production server with ${runtimeNames[runtime]} adapter\x1b[0m`);

// Dynamic import of the platform-specific prod adapter
// Each adapter uses the immediate-execution pattern (starts server on import)
await import(`./prod/${runtime}.js`);
