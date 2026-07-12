import { expect, test } from "@playwright/test";

test.describe("InputGroup", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/components/input-group");
        await page.waitForSelector("main", { state: "visible" });
    });

    test("should display input group with prepend text", async ({ page }) => {
        const section = page.locator("main");
        const preview = section.locator('[data-name="preview"]');

        // Check the input-group container
        const group = preview.locator(".input-group").first();
        await expect(group).toBeVisible();

        // Check prepend text ($)
        await expect(group.locator('[data-align="start"]')).toHaveText("$");
    });

    test("should display input group with append button", async ({ page }) => {
        const section = page.locator("main");
        const preview = section.locator('[data-name="preview"]');

        // Check with append (third group: button append)
        const withAppend = preview.locator(".input-group").nth(2);
        await expect(withAppend.locator('[data-align="end"]')).toBeVisible();
    });

    test("should display input group with both prepend and append", async ({ page }) => {
        const section = page.locator("main");
        const preview = section.locator('[data-name="preview"]');

        // Check with both prepend and append (first group: $ + USD)
        const both = preview.locator(".input-group").first();
        const texts = both.locator('[data-align="start"], [data-align="end"]');
        await expect(texts).toHaveCount(2);
    });
});
