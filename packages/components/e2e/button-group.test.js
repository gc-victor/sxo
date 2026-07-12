import { expect, test } from "@playwright/test";

test.describe("ButtonGroup", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/components/button-group");
        await page.waitForSelector("main", { state: "visible" });
    });

    test("should display horizontal button group", async ({ page }) => {
        const section = page.locator("main");
        const preview = section.locator('[data-name="preview"]');

        // Check the first btn-group container exists
        const groups = preview.locator(".btn-group");
        await expect(groups.first()).toBeVisible();

        // Check it contains child buttons
        const buttons = groups.first().locator(".btn");
        await expect(buttons).toHaveCount(3);
    });

    test("should display vertical button group", async ({ page }) => {
        const section = page.locator("main");
        const preview = section.locator('[data-name="preview"]');

        // Check vertical variant
        const verticalGroup = preview.locator(".btn-group-vertical");
        await expect(verticalGroup).toBeVisible();

        // Check vertical group contains child buttons
        const buttons = verticalGroup.locator(".btn");
        await expect(buttons).toHaveCount(3);
    });

    test("should support variant and size props", async ({ page }) => {
        const section = page.locator("main");
        const preview = section.locator('[data-name="preview"]');

        // Check outline variant group
        const outlineGroup = preview.locator(".btn-group.btn-group-outline");
        await expect(outlineGroup).toBeVisible();
    });
});
