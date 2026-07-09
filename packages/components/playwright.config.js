import { defineConfig, devices } from "@playwright/test";
import { execSync } from "node:child_process";

// Auto-detect system chromium; falls back to Playwright's bundled browser.
let chromiumPath = null;
try {
    chromiumPath = execSync("which chromium", { encoding: "utf8" }).trim();
} catch (err) {
    console.error("System chromium not found, using bundled:", err.message);
}
const port = process.env.PORT || 3002;

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: "line",
    webServer: {
        command: "pnpm run test:e2e:server",
        url: `http://localhost:${port}`,
        timeout: 120_000,
    },
    use: {
        baseURL: `http://localhost:${port}`,
        trace: "on-first-retry",
        launchOptions: chromiumPath ? { executablePath: chromiumPath } : {},
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
});
