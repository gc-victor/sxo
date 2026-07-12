import { expect, test } from "@playwright/test";

test.describe("NativeSelect", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/components/native-select");
        await page.waitForSelector("main", { state: "visible" });
    });

    test("should display select with options", async ({ page }) => {
        const section = page.locator("main");
        const preview = section.locator('[data-name="preview"]');

        // Check the native select element
        const select = preview.locator("select.native-select").first();
        await expect(select).toBeVisible();

        // Check options exist
        const options = select.locator("option");
        await expect(options).toHaveCount(3);
    });

    test("should display with placeholder", async ({ page }) => {
        const section = page.locator("main");
        const preview = section.locator('[data-name="preview"]');

        // Check placeholder select exists
        const withPlaceholder = preview.locator("select.native-select").nth(1);
        await expect(withPlaceholder).toBeVisible();

        // Check placeholder option has text
        const firstOption = withPlaceholder.locator("option").first();
        await expect(firstOption).toHaveText("Choose a fruit...");
    });

    test("should support disabled state", async ({ page }) => {
        const section = page.locator("main");
        const preview = section.locator('[data-name="preview"]');

        // Check disabled select
        const disabled = preview.locator("select.native-select").nth(2);
        await expect(disabled).toBeDisabled();
    });
});
