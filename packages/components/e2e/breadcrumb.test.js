import { expect, test } from "@playwright/test";

test.describe("Breadcrumb", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.waitForSelector("#breadcrumb", { state: "visible" });
    });

    test("should display breadcrumb navigation", async ({ page }) => {
        const breadcrumbSection = page.locator("#breadcrumb");
        const preview = breadcrumbSection.locator('[data-name="preview"]');

        // Check breadcrumb list
        const list = preview.locator("ol");
        await expect(list).toBeVisible();

        // Check breadcrumb items
        const items = preview.locator("li");
        await expect(items).toHaveCount(5); // 3 items + 2 separators

        // Check links
        await expect(preview.locator("a").filter({ hasText: "Home" })).toBeVisible();
        await expect(preview.locator("a").filter({ hasText: "Components" })).toBeVisible();

        // Check current page
        await expect(preview.locator("span").filter({ hasText: "Breadcrumb" })).toBeVisible();

        // Check separators
        const separators = preview.locator("svg, .separator");
        await expect(separators).toHaveCount(2);
    });
});
