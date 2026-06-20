import { expect, test } from "@playwright/test";

test.describe("Select", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.waitForSelector("#select", { state: "visible" });
    });

    test("should display select dropdowns", async ({ page }) => {
        const selectSection = page.locator("#select");

        // Check that select elements exist
        const selects = selectSection.locator("select");
        await expect(selects).toHaveCount(2);

        // Check optgroups
        const optgroup = selectSection.locator("optgroup");
        await expect(optgroup).toHaveCount(1);
    });

    test("should allow selecting fruit options", async ({ page }) => {
        const fruitSelect = page.locator("#select select").first();

        // Select Apple
        await fruitSelect.selectOption("apple");
        await expect(fruitSelect).toHaveValue("apple");

        // Select Banana
        await fruitSelect.selectOption("banana");
        await expect(fruitSelect).toHaveValue("banana");

        // Select Blueberry
        await fruitSelect.selectOption("blueberry");
        await expect(fruitSelect).toHaveValue("blueberry");
    });

    test("should handle optgroup selection", async ({ page }) => {
        const chartSelect = page.locator("#select select").nth(1);

        // Select Bar
        await chartSelect.selectOption("bar");
        await expect(chartSelect).toHaveValue("bar");

        // Select Line
        await chartSelect.selectOption("line");
        await expect(chartSelect).toHaveValue("line");

        // Select Pie
        await chartSelect.selectOption("pie");
        await expect(chartSelect).toHaveValue("pie");
    });

    test("should display placeholder text", async ({ page }) => {
        const fruitSelect = page.locator("#select select").first();

        // Check that first option is disabled placeholder
        const firstOption = fruitSelect.locator("option").first();
        await expect(firstOption).toHaveAttribute("disabled");
        await expect(firstOption).toHaveText("Fruits");
    });
});
