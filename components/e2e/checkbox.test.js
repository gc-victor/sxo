import { expect, test } from "@playwright/test";

test.describe("Checkbox", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.waitForSelector("#checkbox", { state: "visible" });
    });

    test("should display checkboxes with labels", async ({ page }) => {
        const checkboxSection = page.locator("#checkbox");

        // Check that checkboxes exist
        const checkboxes = checkboxSection.locator("input[type='checkbox']");
        await expect(checkboxes).toHaveCount(4);

        // Check that labels exist for each checkbox
        const labels = checkboxSection.locator("label");
        await expect(labels).toHaveCount(4);
    });

    test("should toggle checkbox state", async ({ page }) => {
        const checkbox = page.locator("#checkbox input[type='checkbox']").first();

        // Initially unchecked
        await expect(checkbox).not.toBeChecked();

        // Click to check
        await checkbox.check();
        await expect(checkbox).toBeChecked();

        // Click to uncheck
        await checkbox.uncheck();
        await expect(checkbox).not.toBeChecked();
    });

    test("should handle checkbox with description", async ({ page }) => {
        const checkboxSection = page.locator("#checkbox");

        // Find the checkbox with stacked layout (has description)
        const stackedCheckbox = checkboxSection.locator("input[name='terms-stacked']");

        // Should be able to check/uncheck
        await expect(stackedCheckbox).not.toBeChecked();
        await stackedCheckbox.check();
        await expect(stackedCheckbox).toBeChecked();
    });

    test("should handle disabled checkbox", async ({ page }) => {
        const disabledCheckbox = page.locator("#checkbox input[name='disabled-checkbox']");

        // Should be disabled
        await expect(disabledCheckbox).toBeDisabled();

        // Should not be checkable
        await expect(disabledCheckbox).not.toBeChecked();
    });

    test("should handle checkbox with custom styling", async ({ page }) => {
        const customCheckbox = page.locator("#checkbox input[name='marketing-emails']");

        // Initially checked
        await expect(customCheckbox).toBeChecked();

        // Should be toggleable
        await customCheckbox.uncheck();
        await expect(customCheckbox).not.toBeChecked();

        await customCheckbox.check();
        await expect(customCheckbox).toBeChecked();
    });
});
