import { expect, test } from "@playwright/test";

test.describe("Radio Group", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/components/radio-group");
        await page.waitForSelector("main", { state: "visible" });
    });

    test("should display radio group", async ({ page }) => {
        const radioSection = page.locator("main");

        // Check that radio inputs exist (RadioGroup + Radio sections)
        const radios = radioSection.locator("input[type='radio']");
        await expect(radios).toHaveCount(6);

        // Check that labels exist
        const labels = radioSection.locator("label");
        await expect(labels).toHaveCount(6);
    });

    test("should allow selecting radio options", async ({ page }) => {
        const radioSection = page.locator("main");

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
        const radioSection = page.locator("main");

        // Check label texts
        await expect(radioSection.locator("label").filter({ hasText: "Default" })).toBeVisible();
        await expect(radioSection.locator("label").filter({ hasText: "Comfortable" })).toBeVisible();
        await expect(radioSection.locator("label").filter({ hasText: "Compact" })).toBeVisible();
    });

    test("should have same name attribute for group", async ({ page }) => {
        const radioSection = page.locator("main");

        // All radios should have the same name
        const radios = radioSection.locator("input[type='radio']");
        const names = await radios.evaluateAll((radios) => radios.map((radio) => radio.name));

        // RadioGroupItem radios use "appearance", Radio radios use "theme"
        const uniqueNames = [...new Set(names)];
        expect(uniqueNames).toHaveLength(2);
        expect(uniqueNames.sort()).toEqual(["appearance", "theme"]);
    });
});
