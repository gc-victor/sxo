/**
 * @fileoverview Runtime detection utilities.
 *
 * Provides utilities to detect which JavaScript runtime is executing
 * the current code (Node.js, Bun, or Deno).
 *
 * @module sxo/server/shared/runtime
 * @public
 * @since 1.0.0
 */

/**
 * Detected runtime environment.
 * @typedef {"node" | "bun" | "deno"} Runtime
 */

/**
 * Detect the current JavaScript runtime.
 *
 * Detection order:
 * 1. Bun - Check for globalThis.Bun
 * 2. Deno - Check for globalThis.Deno
 * 3. Node.js - Default fallback
 *
 * @returns {Runtime} The detected runtime: "bun", "deno", or "node"
 * @public
 * @since 1.0.0
 *
 * @example
 * ```javascript
 * import { detectRuntime } from "../server/shared/runtime.js";
 *
 * const runtime = detectRuntime();
 * console.log(`Running on ${runtime}`);
 * // Output: "Running on node" or "Running on bun" or "Running on deno"
 * ```
 */
export function detectRuntime() {
    // Check for Bun first (Bun also has process.versions.node)
    if (typeof globalThis.Bun !== "undefined") {
        return "bun";
    }

    // Check for Deno
    if (typeof globalThis.Deno !== "undefined") {
        return "deno";
    }

    // Default to Node.js
    return "node";
}

/**
 * Check if running in Bun runtime.
 *
 * @returns {boolean} True if running in Bun
 * @public
 * @since 1.0.0
 */
export function isBun() {
    return typeof globalThis.Bun !== "undefined";
}

/**
 * Check if running in Deno runtime.
 *
 * @returns {boolean} True if running in Deno
 * @public
 * @since 1.0.0
 */
export function isDeno() {
    return typeof globalThis.Deno !== "undefined";
}

/**
 * Check if running in Node.js runtime.
 *
 * Note: This returns true only if NOT running in Bun or Deno.
 * Bun provides Node.js compatibility, so process.versions.node exists in Bun too.
 *
 * @returns {boolean} True if running in Node.js (not Bun or Deno)
 * @public
 * @since 1.0.0
 */
export function isNode() {
    return !isBun() && !isDeno();
}
