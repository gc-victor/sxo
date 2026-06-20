/**
 * @fileoverview Tests for runtime detection utilities.
 *
 * Tests the detection of JavaScript runtimes (Node.js, Bun, Deno).
 * Since tests run in Node.js, we verify:
 * - Default Node.js detection works
 * - Mock Bun/Deno globals are detected correctly
 */

import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { detectRuntime, isBun, isDeno, isNode } from "./runtime.js";

// Store original global values to restore after tests
const originalBun = globalThis.Bun;
const originalDeno = globalThis.Deno;

afterEach(() => {
    // Restore original values
    if (originalBun === undefined) {
        delete globalThis.Bun;
    } else {
        globalThis.Bun = originalBun;
    }
    if (originalDeno === undefined) {
        delete globalThis.Deno;
    } else {
        globalThis.Deno = originalDeno;
    }
});

// =============================================================================
// detectRuntime() tests
// =============================================================================

describe("detectRuntime()", () => {
    it("should return 'node' when running in Node.js (default)", () => {
        // Clean up any mocks
        delete globalThis.Bun;
        delete globalThis.Deno;

        const runtime = detectRuntime();
        assert.equal(runtime, "node");
    });

    it("should return 'bun' when globalThis.Bun is defined", () => {
        // Mock Bun runtime
        globalThis.Bun = { version: "1.0.0" };
        delete globalThis.Deno;

        const runtime = detectRuntime();
        assert.equal(runtime, "bun");
    });

    it("should return 'deno' when globalThis.Deno is defined", () => {
        // Mock Deno runtime
        delete globalThis.Bun;
        globalThis.Deno = { version: { deno: "1.0.0" } };

        const runtime = detectRuntime();
        assert.equal(runtime, "deno");
    });

    it("should prioritize Bun over Deno when both are defined", () => {
        // Mock both runtimes (edge case, shouldn't happen in practice)
        globalThis.Bun = { version: "1.0.0" };
        globalThis.Deno = { version: { deno: "1.0.0" } };

        const runtime = detectRuntime();
        assert.equal(runtime, "bun", "Bun should take precedence");
    });
});

// =============================================================================
// isBun() tests
// =============================================================================

describe("isBun()", () => {
    it("should return false when running in Node.js", () => {
        delete globalThis.Bun;
        assert.equal(isBun(), false);
    });

    it("should return true when globalThis.Bun is defined", () => {
        globalThis.Bun = { version: "1.0.0" };
        assert.equal(isBun(), true);
    });

    it("should return true even for empty Bun object", () => {
        globalThis.Bun = {};
        assert.equal(isBun(), true);
    });
});

// =============================================================================
// isDeno() tests
// =============================================================================

describe("isDeno()", () => {
    it("should return false when running in Node.js", () => {
        delete globalThis.Deno;
        assert.equal(isDeno(), false);
    });

    it("should return true when globalThis.Deno is defined", () => {
        globalThis.Deno = { version: { deno: "1.0.0" } };
        assert.equal(isDeno(), true);
    });

    it("should return true even for empty Deno object", () => {
        globalThis.Deno = {};
        assert.equal(isDeno(), true);
    });
});

// =============================================================================
// isNode() tests
// =============================================================================

describe("isNode()", () => {
    it("should return true when running in Node.js", () => {
        delete globalThis.Bun;
        delete globalThis.Deno;
        assert.equal(isNode(), true);
    });

    it("should return false when globalThis.Bun is defined", () => {
        globalThis.Bun = { version: "1.0.0" };
        delete globalThis.Deno;
        assert.equal(isNode(), false);
    });

    it("should return false when globalThis.Deno is defined", () => {
        delete globalThis.Bun;
        globalThis.Deno = { version: { deno: "1.0.0" } };
        assert.equal(isNode(), false);
    });

    it("should return false when both Bun and Deno are defined", () => {
        globalThis.Bun = { version: "1.0.0" };
        globalThis.Deno = { version: { deno: "1.0.0" } };
        assert.equal(isNode(), false);
    });
});
