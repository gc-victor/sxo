import { expect, test } from "@playwright/test";

test.describe("Combobox", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/components/combobox");
        await page.waitForSelector("main", { state: "visible" });
    });

    test("should open dropdown on focus", async ({ page }) => {
        const section = page.locator("main");
        const preview = section.locator('[data-name="preview"]');

        // Click the input to trigger lazy load + open
        const input = preview.locator('[role="combobox"]');
        await input.click();
        await page.waitForTimeout(800);

        // Dropdown should be visible
        const listbox = preview.locator('[role="listbox"]');
        await expect(listbox).toBeVisible();
    });

    test("should filter options as user types", async ({ page }) => {
        const section = page.locator("main");
        const preview = section.locator('[data-name="preview"]');

        // Click to open
        const input = preview.locator('[role="combobox"]');
        await input.click();
        await page.waitForTimeout(800);

        // Type to filter
        await input.fill("Banana");
        await page.waitForTimeout(200);

        // Only matching option should be visible
        await expect(preview.locator('[role="option"]').filter({ hasText: "Banana" })).toBeVisible();
    });

    test("should select option on click", async ({ page }) => {
        const section = page.locator("main");
        const preview = section.locator('[data-name="preview"]');

        // Click input to open
        const input = preview.locator('[role="combobox"]');
        await input.click();
        await page.waitForTimeout(800);

        // Click an option
        const option = preview.locator('[role="option"]').filter({ hasText: "Apple" });
        await option.click();
        await page.waitForTimeout(200);

        // Input should show selected value
        await expect(input).toHaveValue("Apple");
    });

    test("should close dropdown when selecting an option", async ({ page }) => {
        const section = page.locator("main");
        const preview = section.locator('[data-name="preview"]');

        // Click to open
        const input = preview.locator('[role="combobox"]');
        await input.click();
        await page.waitForTimeout(800);

        // Verify dropdown is open
        const listbox = preview.locator('[role="listbox"]');
        await expect(listbox).toBeVisible();

        // Select an option to close
        const option = preview.locator('[role="option"]').filter({ hasText: "Apple" });
        await option.click();
        await page.waitForTimeout(200);

        // Dropdown should close
        await expect(listbox).not.toHaveClass(/open/);
    });

    test("should show no-results when nothing matches", async ({ page }) => {
        const section = page.locator("main");
        const preview = section.locator('[data-name="preview"]');

        // Click to open
        const input = preview.locator('[role="combobox"]');
        await input.click();
        await page.waitForTimeout(800);

        // Type unmatched text
        await input.fill("zzzzz");
        await page.waitForTimeout(200);

        // Should show no results message
        const emptyMsg = preview.locator(".combobox-empty");
        await expect(emptyMsg).toBeVisible();
        await expect(emptyMsg).toHaveText("No results found.");
    });
});
