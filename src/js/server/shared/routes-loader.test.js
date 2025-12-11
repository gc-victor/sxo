/**
 * @fileoverview Tests for routes-loader module.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { loadRoutesManifest, validateRoutes } from "./routes-loader.js";

describe("validateRoutes", () => {
    test("validates valid routes array", () => {
        const routes = [
            { filename: "index.html", jsx: "src/pages/index.jsx" },
            { filename: "about.html", jsx: "src/pages/about.jsx", path: "/about" },
        ];

        const result = validateRoutes(routes);
        assert.deepEqual(result, routes);
    });

    test("throws if data is not an array", () => {
        assert.throws(() => validateRoutes({ filename: "index.html" }), { message: /not an array/ });
    });

    test("throws if route entry is not an object", () => {
        assert.throws(() => validateRoutes(["not-an-object"]), { message: /Invalid route entry/ });
    });

    test("throws if route missing filename", () => {
        assert.throws(() => validateRoutes([{ jsx: "src/pages/index.jsx" }]), { message: /missing filename or jsx/ });
    });

    test("throws if route missing jsx", () => {
        assert.throws(() => validateRoutes([{ filename: "index.html" }]), { message: /missing filename or jsx/ });
    });

    test("throws if path is not a string", () => {
        assert.throws(() => validateRoutes([{ filename: "index.html", jsx: "src/pages/index.jsx", path: 123 }]), {
            message: /path must be string/,
        });
    });

    test("accepts routes with optional fields", () => {
        const routes = [
            {
                filename: "index.html",
                jsx: "src/pages/index.jsx",
                path: "/",
                generated: true,
                assets: { css: ["styles.css"], js: ["main.js"] },
                hash: true,
            },
        ];

        const result = validateRoutes(routes);
        assert.deepEqual(result, routes);
    });

    test("includes source name in error messages", () => {
        assert.throws(() => validateRoutes({}, "custom/routes.json"), { message: /custom\/routes\.json/ });
    });
});

describe("loadRoutesManifest", () => {
    test("loads valid routes from custom reader", async () => {
        const mockRoutes = [{ filename: "index.html", jsx: "src/pages/index.jsx" }];

        const readFile = async () => JSON.stringify(mockRoutes);

        const routes = await loadRoutesManifest("/fake/path.json", {
            readFile,
        });

        assert.deepEqual(routes, mockRoutes);
    });

    test("retries on JSON parse error", async () => {
        let attempts = 0;
        const mockRoutes = [{ filename: "index.html", jsx: "src/pages/index.jsx" }];

        const readFile = async () => {
            attempts++;
            if (attempts < 3) {
                throw new Error("File being written");
            }
            return JSON.stringify(mockRoutes);
        };

        const routes = await loadRoutesManifest("/fake/path.json", {
            readFile,
            retries: 3,
        });

        assert.equal(attempts, 3);
        assert.deepEqual(routes, mockRoutes);
    });

    test("throws after exhausting retries", async () => {
        const readFile = async () => {
            throw new Error("Persistent error");
        };

        await assert.rejects(
            async () =>
                await loadRoutesManifest("/fake/path.json", {
                    readFile,
                    retries: 2,
                }),
            { message: /Failed to load routes after 2 attempts/ },
        );
    });

    test("validates routes after loading", async () => {
        const invalidRoutes = [{ filename: "index.html" }]; // missing jsx

        const readFile = async () => JSON.stringify(invalidRoutes);

        await assert.rejects(
            async () =>
                await loadRoutesManifest("/fake/path.json", {
                    readFile,
                }),
            { message: /missing filename or jsx/ },
        );
    });

    test("calls onError callback on retry attempts", async () => {
        const errors = [];
        let attempts = 0;
        const mockRoutes = [{ filename: "index.html", jsx: "src/pages/index.jsx" }];

        const readFile = async () => {
            attempts++;
            if (attempts < 2) {
                throw new Error(`Attempt ${attempts}`);
            }
            return JSON.stringify(mockRoutes);
        };

        await loadRoutesManifest("/fake/path.json", {
            readFile,
            retries: 3,
            onError: (err, attempt) => {
                errors.push({ message: err.message, attempt });
            },
        });

        assert.equal(errors.length, 1);
        assert.equal(errors[0].message, "Attempt 1");
        assert.equal(errors[0].attempt, 1);
    });

    test("uses custom source name in errors", async () => {
        const readFile = async () => {
            throw new Error("Read error");
        };

        const logger = {
            error: (msg) => {
                assert.match(msg, /custom\/source\.json/);
            },
        };

        await assert.rejects(
            async () =>
                await loadRoutesManifest("/fake/path.json", {
                    readFile,
                    retries: 1,
                    logger,
                    source: "custom/source.json",
                }),
        );
    });

    test("waits 100ms between retry attempts", async () => {
        let attempts = 0;
        const timestamps = [];
        const mockRoutes = [{ filename: "index.html", jsx: "src/pages/index.jsx" }];

        const readFile = async () => {
            timestamps.push(Date.now());
            attempts++;
            if (attempts < 3) {
                throw new Error("Retry");
            }
            return JSON.stringify(mockRoutes);
        };

        await loadRoutesManifest("/fake/path.json", {
            readFile,
            retries: 3,
        });

        // Check that at least 100ms passed between attempts
        const delay1 = timestamps[1] - timestamps[0];
        const delay2 = timestamps[2] - timestamps[1];
        assert.ok(delay1 >= 90, `First delay was ${delay1}ms, expected >= 90ms`);
        assert.ok(delay2 >= 90, `Second delay was ${delay2}ms, expected >= 90ms`);
    });
});
