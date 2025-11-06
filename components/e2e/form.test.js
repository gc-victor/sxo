import { expect, test } from "@playwright/test";

test.describe("Form", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.waitForSelector("#form", { state: "visible" });
    });

    test("should display form elements", async ({ page }) => {
        const formSection = page.locator("#form");

        // Check form wrapper
        const form = formSection.locator("form");
        await expect(form).toBeVisible();

        // Check text input
        await expect(formSection.locator("input[type='text']")).toBeVisible();

        // Check select
        await expect(formSection.locator("select")).toBeVisible();

        // Check textarea
        await expect(formSection.locator("textarea")).toBeVisible();

        // Check date input
        await expect(formSection.locator("input[type='date']")).toBeVisible();

        // Check radio buttons
        const radios = formSection.locator("input[type='radio']");
        await expect(radios).toHaveCount(3);

        // Check switches (checkboxes with switch class)
        const switches = formSection.locator("input[type='checkbox'].switch");
        await expect(switches).toHaveCount(2);

        // Check submit and reset buttons
        await expect(formSection.locator("button[type='submit']")).toBeVisible();
        await expect(formSection.locator("button[type='reset']")).toBeVisible();
    });

    test("should display form labels and descriptions", async ({ page }) => {
        const formSection = page.locator("#form");

        // Check labels
        const labels = formSection.locator("label");
        await expect(labels).toHaveCount(9); // Various form labels

        // Check descriptions
        const descriptions = formSection.locator(".text-muted-foreground");
        await expect(descriptions).toHaveCount(8); // Description texts

        // Check fieldset and legend
        await expect(formSection.locator("fieldset")).toBeVisible();
        await expect(formSection.locator("legend")).toBeVisible();
    });
});
