import assert from "node:assert";
import { afterEach, describe, mock, test } from "node:test";
import { detectTTY, formatBanner, makeColors, printBanner, renderBox, stripAnsi } from "./format.js";

describe("cli/ui/format", () => {
    const originalEnv = { ...process.env };
    const originalIsTTY = process.stdout.isTTY;
    const originalColumns = process.stdout.columns;

    afterEach(() => {
        process.env = { ...originalEnv };
        try {
            Object.defineProperty(process.stdout, "isTTY", {
                value: originalIsTTY,
                configurable: true,
                writable: true,
            });
            Object.defineProperty(process.stdout, "columns", {
                value: originalColumns,
                configurable: true,
                writable: true,
            });
        } catch (_e) {
            // Fallback for environments where stdout properties are not configurable
        }
    });

    describe("detectTTY()", () => {
        test("detects TTY when enabled", () => {
            try {
                Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true });
            } catch (_e) {
                /* ignore */
            }
            delete process.env.NO_COLOR;

            const result = detectTTY();
            // We only assert if we successfully changed it or if it matches the current environment
            if (process.stdout.isTTY) {
                assert.strictEqual(result.isTTY, true);
            }
            assert.strictEqual(result.noColor, false);
        });

        test("detects NO_COLOR environment", () => {
            process.env.NO_COLOR = "1";
            const result = detectTTY();
            assert.strictEqual(result.noColor, true);
        });
    });

    describe("makeColors()", () => {
        test("returns identity functions when disabled", () => {
            const c = makeColors(false);
            assert.strictEqual(c.enabled, false);
            assert.strictEqual(c.red("foo"), "foo");
            assert.strictEqual(c.bold("bar"), "bar");
            assert.strictEqual(c.dim("baz"), "baz");
            assert.strictEqual(c.underline("qux"), "qux");
            assert.strictEqual(c.green("a"), "a");
            assert.strictEqual(c.yellow("b"), "b");
            assert.strictEqual(c.blue("c"), "c");
            assert.strictEqual(c.magenta("d"), "d");
            assert.strictEqual(c.cyan("e"), "e");
            assert.strictEqual(c.gray("f"), "f");
        });

        test("returns ANSI wrappers when enabled", () => {
            const c = makeColors(true);
            assert.strictEqual(c.enabled, true);
            assert.ok(c.red("foo").includes("\x1b[31m"));
            assert.ok(c.bold("bar").includes("\x1b[1m"));
            assert.ok(c.dim("baz").includes("\x1b[2m"));
            assert.ok(c.underline("qux").includes("\x1b[4m"));
            assert.ok(c.green("a").includes("\x1b[32m"));
            assert.ok(c.yellow("b").includes("\x1b[33m"));
            assert.ok(c.blue("c").includes("\x1b[34m"));
            assert.ok(c.magenta("d").includes("\x1b[35m"));
            assert.ok(c.cyan("e").includes("\x1b[36m"));
            assert.ok(c.gray("f").includes("\x1b[90m"));
        });
    });

    describe("stripAnsi()", () => {
        test("removes ANSI codes", () => {
            const colored = "\x1b[31mred\x1b[0m \x1b[1mbold\x1b[0m";
            assert.strictEqual(stripAnsi(colored), "red bold");
        });

        test("handles plain text", () => {
            assert.strictEqual(stripAnsi("plain"), "plain");
        });

        test("handles non-string inputs", () => {
            assert.strictEqual(stripAnsi(123), "123");
            assert.strictEqual(stripAnsi(null), "null");
            assert.strictEqual(stripAnsi(undefined), "undefined");
        });
    });

    describe("renderBox()", () => {
        test("renders a box with default options", () => {
            try {
                Object.defineProperty(process.stdout, "columns", { value: 20, configurable: true });
            } catch (_e) {
                /* ignore */
            }

            const output = renderBox(["hello"], { colorEnabled: false });
            assert.ok(output.includes("hello"));
            assert.ok(output.includes("╭")); // default round top-left
            // The box width is taken from process.stdout.columns (defaulted to 80 if 0/undefined)
            const width = process.stdout.columns || 80;
            assert.ok(output.includes("─".repeat(width - 2)));
        });

        test("supports different border styles", () => {
            const lines = ["test"];
            const single = renderBox(lines, { borderStyle: "single", colorEnabled: false });
            assert.ok(single.includes("┌"));

            const double = renderBox(lines, { borderStyle: "double", colorEnabled: false });
            assert.ok(double.includes("╔"));

            const round = renderBox(lines, { borderStyle: "round", colorEnabled: false });
            assert.ok(round.includes("╭"));

            // Invalid style falls back to round
            // @ts-expect-error
            const invalid = renderBox(lines, { borderStyle: "invalid", colorEnabled: false });
            assert.ok(invalid.includes("╭"));
        });

        test("applies padding", () => {
            const withPadding = renderBox(["a"], { padding: 2, colorEnabled: false });
            // withPadding should have at least 2 spaces before 'a'
            // The structure is: v + " ".repeat(pad) + "a" + ...
            assert.ok(withPadding.includes("  a"));
        });

        test("handles colored input length correctly", () => {
            const colored = "\x1b[31mred\x1b[0m";
            const output = renderBox([colored], { colorEnabled: false });
            assert.ok(output.includes(colored));
            // Should not crash and should align properly
        });

        test("supports border colors", () => {
            const colors = ["red", "green", "yellow", "magenta", "gray", "cyan"];
            for (const color of colors) {
                const output = renderBox(["test"], { borderColor: color, colorEnabled: true });
                assert.ok(output.includes("\x1b["));
            }
            // Unknown color falls back to cyan (default in code is c.cyan if borderColor is present but not in map)
            const unknown = renderBox(["test"], { borderColor: "blue", colorEnabled: true });
            assert.ok(unknown.includes("\x1b[36m")); // cyan code is 36
        });
    });

    describe("formatBanner()", () => {
        test("returns plain text when not using box", () => {
            const output = formatBanner("my-app", "1.0.0", { useBox: false, color: false });
            assert.strictEqual(output, "my-app v1.0.0");
        });

        test("includes subtitle and tagline", () => {
            const output = formatBanner("app", "1", {
                useBox: false,
                color: false,
                subtitle: "sub",
                tagline: "tag",
            });
            assert.ok(output.includes("app v1"));
            assert.ok(output.includes("sub"));
            assert.ok(output.includes("tag"));
        });

        test("returns boxed version when requested", () => {
            const output = formatBanner("app", "1", { useBox: true, color: false });
            assert.ok(output.includes("╭"));
            assert.ok(output.includes("app v1"));
        });

        test("respects explicit color option", () => {
            const output = formatBanner("app", "1", { useBox: false, color: true });
            assert.ok(output.includes("\x1b[1m")); // bold app name
            assert.ok(output.includes("\x1b[36m")); // cyan app name
        });

        test("supports box options in formatBanner", () => {
            const output = formatBanner("app", "1", {
                useBox: true,
                color: false,
                padding: 2,
                borderStyle: "double",
                borderColor: "green",
            });
            assert.ok(output.includes("╔"));
            // We can't easily check color here without color: true, but let's check with color: true
            const colored = formatBanner("app", "1", {
                useBox: true,
                color: true,
                borderColor: "green",
            });
            assert.ok(colored.includes("\x1b[32m")); // green code is 32
        });
    });

    describe("printBanner()", () => {
        test("writes to stdout", () => {
            const writeMock = mock.method(process.stdout, "write", () => {});
            try {
                printBanner("app", "1", { useBox: false, color: false });
                assert.strictEqual(writeMock.mock.callCount(), 1);
                assert.strictEqual(writeMock.mock.calls[0].arguments[0], "app v1\n");
            } finally {
                writeMock.mock.restore();
            }
        });
    });
});
