import { expect, test } from "@playwright/test";

test.describe("Progress", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.waitForSelector("#progress", { state: "visible" });
    });

    test("should display determinate progress bar", async ({ page }) => {
        const section = page.locator("#progress");
        const preview = section.locator('[data-name="preview"]');

        // Check progress element exists
        const progress = preview.locator("progress.progress").first();
        await expect(progress).toBeVisible();

        // Check value and max attributes
        await expect(progress).toHaveAttribute("value", "60");
        await expect(progress).toHaveAttribute("max", "100");
    });

    test("should display indeterminate progress bar", async ({ page }) => {
        const section = page.locator("#progress");
        const preview = section.locator('[data-name="preview"]');

        // Check indeterminate variant (no value attribute)
        const indeterminate = preview.locator("progress.progress").nth(1);
        await expect(indeterminate).toBeVisible();
        await expect(indeterminate).not.toHaveAttribute("value");
    });

    test("should display custom max progress bar", async ({ page }) => {
        const section = page.locator("#progress");
        const preview = section.locator('[data-name="preview"]');

        // Check progress with custom max
        const custom = preview.locator("progress.progress").nth(2);
        await expect(custom).toHaveAttribute("value", "5");
        await expect(custom).toHaveAttribute("max", "10");
    });
});
