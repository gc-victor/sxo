/**
 * @fileoverview Tests for routes-loader module.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { withTempProject, writeFile } from "../../test-utils.js";
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

    test("loads routes with the default file reader", async () => {
        await withTempProject(async (dir) => {
            const expectedRoutes = [{ filename: "index.html", jsx: "src/pages/index.jsx" }];
            const routesPath = await writeFile(dir, "routes.json", JSON.stringify(expectedRoutes));

            assert.deepEqual(await loadRoutesManifest(routesPath), expectedRoutes);
        });
    });

    test("retries on JSON parse error", async (t) => {
        t.mock.timers.enable({ apis: ["setTimeout"] });
        let attempts = 0;
        const mockRoutes = [{ filename: "index.html", jsx: "src/pages/index.jsx" }];

        const readFile = async () => {
            attempts++;
            if (attempts < 3) {
                throw new Error("File being written");
            }
            return JSON.stringify(mockRoutes);
        };

        const promise = loadRoutesManifest("/fake/path.json", {
            readFile,
            retries: 3,
        });

        for (let i = 0; i < 10; i++) {
            await Promise.resolve();
            t.mock.timers.tick(50);
        }

        const routes = await promise;

        assert.equal(attempts, 3);
        assert.deepEqual(routes, mockRoutes);
    });

    test("throws after exhausting retries", async (t) => {
        t.mock.timers.enable({ apis: ["setTimeout"] });
        const readFile = async () => {
            throw new Error("Persistent error");
        };

        const promise = loadRoutesManifest("/fake/path.json", {
            readFile,
            retries: 2,
        });

        for (let i = 0; i < 10; i++) {
            await Promise.resolve();
            t.mock.timers.tick(50);
        }

        await assert.rejects(async () => await promise, { message: /Failed to load routes after 2 attempts/ });
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

    test("calls onError callback on retry attempts", async (t) => {
        t.mock.timers.enable({ apis: ["setTimeout"] });
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

        const promise = loadRoutesManifest("/fake/path.json", {
            readFile,
            retries: 3,
            onError: (err, attempt) => {
                errors.push({ message: err.message, attempt });
            },
        });

        for (let i = 0; i < 10; i++) {
            await Promise.resolve();
            t.mock.timers.tick(50);
        }

        await promise;

        assert.equal(errors.length, 1);
        assert.equal(errors[0].message, "Attempt 1");
        assert.equal(errors[0].attempt, 1);
    });

    test("uses custom source name in validation errors", async () => {
        const readFile = async () => JSON.stringify({ not: "an array" });

        await assert.rejects(
            async () =>
                await loadRoutesManifest("/fake/path.json", {
                    readFile,
                    retries: 1,
                    source: "custom/source.json",
                }),
            { message: /custom\/source\.json is not an array/ },
        );
    });

    test("waits 100ms between retry attempts", async (t) => {
        t.mock.timers.enable({ apis: ["setTimeout"] });
        let attempts = 0;
        const mockRoutes = [{ filename: "index.html", jsx: "src/pages/index.jsx" }];

        const readFile = async () => {
            attempts++;
            if (attempts < 3) {
                throw new Error("Retry");
            }
            return JSON.stringify(mockRoutes);
        };

        const promise = loadRoutesManifest("/fake/path.json", {
            readFile,
            retries: 3,
        });

        // Flush microtasks so first readFile() rejects and setTimeout(100) is scheduled
        for (let i = 0; i < 5; i++) await Promise.resolve();
        assert.equal(attempts, 1, "First attempt happened synchronously");

        // Tick 99ms — second attempt should not have fired yet
        t.mock.timers.tick(99);
        for (let i = 0; i < 5; i++) await Promise.resolve();
        assert.equal(attempts, 1, "Should not retry before 100ms");

        // Tick 1ms more — triggers second attempt, which fails and schedules another 100ms
        t.mock.timers.tick(1);
        for (let i = 0; i < 5; i++) await Promise.resolve();
        assert.equal(attempts, 2, "Should retry after 100ms");

        // Tick another 100ms — third attempt fires and succeeds
        t.mock.timers.tick(100);
        for (let i = 0; i < 5; i++) await Promise.resolve();

        const routes = await promise;
        assert.equal(attempts, 3);
        assert.deepEqual(routes, mockRoutes);
    });

    test("uses custom reader when provided", async () => {
        const mockRoutes = [{ filename: "index.html", jsx: "src/pages/index.jsx" }];

        const readFile = async () => JSON.stringify(mockRoutes);

        const routes = await loadRoutesManifest("/fake/path.json", {
            readFile,
        });

        assert.deepEqual(routes, mockRoutes);
    });

    test("handles non-Error objects thrown by reader", async () => {
        const readFile = async () => {
            throw "string error";
        };

        await assert.rejects(
            async () =>
                await loadRoutesManifest("/fake/path.json", {
                    readFile,
                    retries: 1,
                }),
            { message: /Failed to load routes after 1 attempts/ },
        );
    });

    test("handles retries = 1 (single attempt)", async () => {
        let attempts = 0;

        const readFile = async () => {
            attempts++;
            throw new Error("Persistent error");
        };

        await assert.rejects(
            async () =>
                await loadRoutesManifest("/fake/path.json", {
                    readFile,
                    retries: 1,
                }),
            { message: /Failed to load routes after 1 attempts/ },
        );

        // Should only try once with retries=1
        assert.strictEqual(attempts, 1);
    });
});
