import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "happy-dom",
        globals: true,
        setupFiles: ["./tests/setup.ts"],
        include: ["tests/**/*.test.ts"],
    },
    resolve: {
        alias: {
            "@": resolve(__dirname, "./src"),
            "@tests": resolve(__dirname, "./tests"),
        },
    },
});
