import { expect, test } from "@playwright/test";

test.describe("Radio Group", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.waitForSelector("#radio-group", { state: "visible" });
    });

    test("should display radio group", async ({ page }) => {
        const radioSection = page.locator("#radio-group");

        // Check that radio inputs exist
        const radios = radioSection.locator("input[type='radio']");
        await expect(radios).toHaveCount(3);

        // Check that labels exist
        const labels = radioSection.locator("label");
        await expect(labels).toHaveCount(3);
    });

    test("should allow selecting radio options", async ({ page }) => {
        const radioSection = page.locator("#radio-group");

        // Get radio inputs
        const defaultRadio = radioSection.locator("input[value='default']");
        const comfortableRadio = radioSection.locator("input[value='comfortable']");
        const compactRadio = radioSection.locator("input[value='compact']");

        // Initially, default should be checked
        await expect(defaultRadio).toBeChecked();
        await expect(comfortableRadio).not.toBeChecked();
        await expect(compactRadio).not.toBeChecked();

        // Select comfortable by clicking label
        await radioSection.locator("label").filter({ hasText: "Comfortable" }).click();
        await expect(defaultRadio).not.toBeChecked();
        await expect(comfortableRadio).toBeChecked();
        await expect(compactRadio).not.toBeChecked();

        // Select compact by clicking label
        await radioSection.locator("label").filter({ hasText: "Compact" }).click();
        await expect(defaultRadio).not.toBeChecked();
        await expect(comfortableRadio).not.toBeChecked();
        await expect(compactRadio).toBeChecked();
    });

    test("should display correct labels", async ({ page }) => {
        const radioSection = page.locator("#radio-group");

        // Check label texts
        await expect(radioSection.locator("label").filter({ hasText: "Default" })).toBeVisible();
        await expect(radioSection.locator("label").filter({ hasText: "Comfortable" })).toBeVisible();
        await expect(radioSection.locator("label").filter({ hasText: "Compact" })).toBeVisible();
    });

    test("should have same name attribute for group", async ({ page }) => {
        const radioSection = page.locator("#radio-group");

        // All radios should have the same name
        const radios = radioSection.locator("input[type='radio']");
        const names = await radios.evaluateAll((radios) => radios.map((radio) => radio.name));

        // All should have the same name
        const uniqueNames = [...new Set(names)];
        expect(uniqueNames).toHaveLength(1);
        expect(uniqueNames[0]).toBe("appearance");
    });
});
