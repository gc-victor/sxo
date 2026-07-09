import { expect, test } from "@playwright/test";

test.describe("Theme Toggle", () => {
    const toggleButton = '[aria-label="Toggle theme"]';

    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForSelector(toggleButton, { state: "visible" });
        await page.waitForTimeout(1000); // Wait for client script to load and define to run
    });

    test("should display theme toggle in header", async ({ page }) => {
        const button = page.locator(toggleButton);
        await expect(button).toBeVisible();

        // Check both icons are present (one hidden based on theme)
        const icons = button.locator("svg");
        await expect(icons).toHaveCount(2);
    });

    test("should toggle theme on click", async ({ page }) => {
        const button = page.locator(toggleButton);

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
        const button = page.locator(toggleButton);

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
        await page.waitForSelector(toggleButton, { state: "visible" });

        // Check theme persisted
        const afterReloadClass = await page.evaluate(() => document.documentElement.className);
        const afterHasDark = afterReloadClass.includes("dark");
        expect(afterHasDark).toBe(nowHasDark);
    });

    test("should handle keyboard navigation", async ({ page }) => {
        const button = page.locator(toggleButton);

        // Get initial
        const initialClass = await page.evaluate(() => document.documentElement.className);
        const hasDark = initialClass.includes("dark");

        // Focus the button
        await button.focus();
        await expect(button).toBeFocused();

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
