import { expect, test } from "@playwright/test";

test.describe("Tooltip", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/components/tooltip");
        await page.waitForSelector("main", { state: "visible" });
    });

    test("should display tooltip buttons", async ({ page }) => {
        const tooltipSection = page.locator("main");
        const preview = tooltipSection.locator('[data-name="preview"]');

        // Check tooltip buttons exist
        const buttons = preview.locator("button");
        await expect(buttons).toHaveCount(4);

        // Check button texts
        await expect(buttons.filter({ hasText: "Left" })).toBeVisible();
        await expect(buttons.filter({ hasText: "Top" })).toBeVisible();
        await expect(buttons.filter({ hasText: "Bottom" })).toBeVisible();
        await expect(buttons.filter({ hasText: "Right" })).toBeVisible();
    });

    test("should display tooltip content elements", async ({ page }) => {
        const tooltipSection = page.locator("main");
        const preview = tooltipSection.locator('[data-name="preview"]');

        // Check tooltip content elements exist
        const tooltips = preview.locator("[role='tooltip']");
        await expect(tooltips).toHaveCount(4);

        // Check content texts
        await expect(preview.locator("[role='tooltip']").filter({ hasText: "Left" })).toBeAttached();
        await expect(preview.locator("[role='tooltip']").filter({ hasText: "Top" })).toBeAttached();
        await expect(preview.locator("[role='tooltip']").filter({ hasText: "Bottom" })).toBeAttached();
        await expect(preview.locator("[role='tooltip']").filter({ hasText: "Right" })).toBeAttached();
    });
});
