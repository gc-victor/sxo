import { expect, test } from "@playwright/test";

test.describe("InputGroup", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.waitForSelector("#input-group", { state: "visible" });
    });

    test("should display input group with prepend text", async ({ page }) => {
        const section = page.locator("#input-group");
        const preview = section.locator('[data-name="preview"]');

        // Check the input-group container
        const group = preview.locator(".input-group").first();
        await expect(group).toBeVisible();

        // Check prepend text
        await expect(group.locator('[data-align="start"]')).toHaveText("https://");
    });

    test("should display input group with append button", async ({ page }) => {
        const section = page.locator("#input-group");
        const preview = section.locator('[data-name="preview"]');

        // Check with append
        const withAppend = preview.locator(".input-group").nth(1);
        await expect(withAppend.locator('[data-align="end"]')).toBeVisible();
    });

    test("should display input group with both prepend and append", async ({ page }) => {
        const section = page.locator("#input-group");
        const preview = section.locator('[data-name="preview"]');

        // Check with both prepend and append
        const both = preview.locator(".input-group").nth(2);
        const texts = both.locator('[data-align="start"], [data-align="end"]');
        await expect(texts).toHaveCount(2);
    });
});
