import { expect, test } from "@playwright/test";

test.describe("Theme Toggle", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.waitForSelector("el-theme-toggle", { state: "visible" });
        await page.waitForTimeout(1000); // Wait for client script to load and define to run
    });

    test("should display theme toggle in header", async ({ page }) => {
        const themeToggle = page.locator("el-theme-toggle");
        await expect(themeToggle).toBeVisible();

        // Check button and icons
        const button = themeToggle.locator("button");
        await expect(button).toBeVisible();

        // Check both icons are present (one hidden based on theme)
        const icons = button.locator("svg");
        await expect(icons).toHaveCount(2);
    });

    test("should toggle theme on click", async ({ page }) => {
        const _html = page.locator("html");
        const button = page.locator("el-theme-toggle button");

        // Get initial theme
        const initialClass = await page.evaluate(() => document.documentElement.className);
        const initialTheme = initialClass?.includes("dark") ? "dark" : "light";

        // Click toggle
        await button.click();

        // Wait for reactive update
        await page.waitForTimeout(100);

        // Check class changed
        const newClass = await page.evaluate(() => document.documentElement.className);
        const newTheme = newClass?.includes("dark") ? "dark" : "light";
        expect(newTheme).not.toBe(initialTheme);
    });

    test("should persist theme across page reload", async ({ page }) => {
        const button = page.locator("el-theme-toggle");
        const _html = page.locator("html");

        // Get initial class
        const initialClass = await page.evaluate(() => document.documentElement.className);
        const hasDark = initialClass.includes("dark");

        // Click to toggle
        await button.click();

        // Wait for reactive update
        await page.waitForTimeout(100);

        // Check class changed
        const newClass = await page.evaluate(() => document.documentElement.className);
        const nowHasDark = newClass.includes("dark");
        expect(nowHasDark).not.toBe(hasDark);

        // Reload page
        await page.reload();
        await page.waitForSelector("el-theme-toggle", { state: "visible" });

        // Check theme persisted
        const afterReloadClass = await page.evaluate(() => document.documentElement.className);
        const afterHasDark = afterReloadClass.includes("dark");
        expect(afterHasDark).toBe(nowHasDark);
    });

    test("should handle keyboard navigation", async ({ page }) => {
        const button = page.locator("el-theme-toggle");
        const _html = page.locator("html");

        // Get initial
        const initialClass = await page.evaluate(() => document.documentElement.className);
        const hasDark = initialClass.includes("dark");

        // Focus the toggle element (since click is on it)
        await button.focus();
        // Perhaps focus the button inside
        const btn = button.locator("button");
        await btn.focus();
        await expect(btn).toBeFocused();

        // Press Enter to toggle
        await page.keyboard.press("Enter");

        // Wait for reactive update
        await page.waitForTimeout(100);

        // Check theme changed
        const newClass = await page.evaluate(() => document.documentElement.className);
        const nowHasDark = newClass.includes("dark");
        expect(nowHasDark).not.toBe(hasDark);
    });
});
