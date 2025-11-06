import { expect, test } from "@playwright/test";

test.describe("Select Menu", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.waitForSelector("#select-menu", { state: "visible" });
    });

    test("should display select menu structure", async ({ page }) => {
        const selectMenuSection = page.locator("#select-menu");

        // Check trigger button
        const trigger = selectMenuSection.locator("button[aria-haspopup='listbox']");
        await expect(trigger).toBeVisible();
        await expect(trigger).toHaveAttribute("aria-expanded", "false");

        // Check popover (hidden by default)
        const popover = selectMenuSection.locator("[data-popover]");
        await expect(popover).toBeAttached();
        await expect(popover).toHaveAttribute("aria-hidden", "true");

        // Check listbox
        const listbox = selectMenuSection.locator("[role='listbox']");
        await expect(listbox).toBeAttached();

        // Check options
        const options = listbox.locator("[role='option']");
        await expect(options).toHaveCount(5);

        // Check first option is selected
        const firstOption = options.first();
        await expect(firstOption).toHaveAttribute("aria-selected", "true");
        await expect(firstOption).toHaveText("Apple");

        // Check trigger shows selected value
        await expect(trigger.locator("span.select-label")).toContainText("Apple");
    });

    test("should display search input and groups", async ({ page }) => {
        const selectMenuSection = page.locator("#select-menu");

        // Check search input
        const searchInput = selectMenuSection.locator("input[type='text']");
        await expect(searchInput).toBeAttached();
        await expect(searchInput).toHaveAttribute("placeholder", "Search entries...");

        // Check group
        const group = selectMenuSection.locator("legend").filter({ hasText: "Fruits" });
        await expect(group).toBeAttached();

        // Check options text
        const options = selectMenuSection.locator("[role='option']");
        await expect(options.filter({ hasText: "Banana" })).toBeAttached();
        await expect(options.filter({ hasText: "Blueberry" })).toBeAttached();
        await expect(options.filter({ hasText: "Grapes" })).toBeAttached();
        await expect(options.filter({ hasText: "Pineapple" })).toBeAttached();
    });

    test("should filter options when typing in search input", async ({ page }) => {
        const selectMenuSection = page.locator("#select-menu");

        // Open the select menu
        const trigger = selectMenuSection.locator("button[aria-haspopup='listbox']");
        await trigger.click();

        // Verify popover is open
        const popover = selectMenuSection.locator("[data-popover]");
        await expect(popover).toHaveAttribute("aria-hidden", "false");

        // Type "bana" into the search input
        const searchInput = selectMenuSection.locator("input[type='text']");
        await searchInput.fill("bana");

        // Wait for filtering to apply
        await page.waitForTimeout(100);

        // Check that only "Banana" is visible (aria-hidden="false")
        const bananaOption = selectMenuSection.locator("[role='option'][data-value='banana']");
        await expect(bananaOption).toHaveAttribute("aria-hidden", "false");

        // Check that other options are hidden (aria-hidden="true")
        const appleOption = selectMenuSection.locator("[role='option'][data-value='apple']");
        await expect(appleOption).toHaveAttribute("aria-hidden", "true");

        const blueberryOption = selectMenuSection.locator("[role='option'][data-value='blueberry']");
        await expect(blueberryOption).toHaveAttribute("aria-hidden", "true");

        const grapesOption = selectMenuSection.locator("[role='option'][data-value='grapes']");
        await expect(grapesOption).toHaveAttribute("aria-hidden", "true");

        const pineappleOption = selectMenuSection.locator("[role='option'][data-value='pineapple']");
        await expect(pineappleOption).toHaveAttribute("aria-hidden", "true");
    });

    test("should open select via trigger click", async ({ page }) => {
        const selectMenuSection = page.locator("#select-menu");
        const trigger = selectMenuSection.locator("button[aria-haspopup='listbox']");
        const popover = selectMenuSection.locator("[data-popover]");

        // Initially closed
        await expect(trigger).toHaveAttribute("aria-expanded", "false");
        await expect(popover).toHaveAttribute("aria-hidden", "true");

        // Click trigger to open
        await trigger.click();
        await page.waitForTimeout(200);

        // Should be open
        await expect(trigger).toHaveAttribute("aria-expanded", "true");
        await expect(popover).toHaveAttribute("aria-hidden", "false");
    });

    test("should select options via click", async ({ page }) => {
        const selectMenuSection = page.locator("#select-menu");
        const trigger = selectMenuSection.locator("button[aria-haspopup='listbox']");

        // Open select
        await trigger.click();
        await page.waitForTimeout(200);

        // Click on Banana option
        const bananaOption = selectMenuSection.locator("[role='option'][data-value='banana']");
        await bananaOption.click();
        await page.waitForTimeout(200);

        // Should be closed and show Banana as selected
        await expect(trigger).toHaveAttribute("aria-expanded", "false");
        await expect(trigger.locator("span.select-label")).toContainText("Banana");

        // Hidden input should have banana value
        const hiddenInput = selectMenuSection.locator("input[type='hidden']");
        await expect(hiddenInput).toHaveValue("banana");
    });

    test("should navigate with arrow keys", async ({ page }) => {
        const selectMenuSection = page.locator("#select-menu");
        const trigger = selectMenuSection.locator("button[aria-haspopup='listbox']");

        // Open select
        await trigger.click();
        await page.waitForTimeout(200);

        // Initially first option (Apple) should be active
        const appleOption = selectMenuSection.locator("[role='option'][data-value='apple']");
        await expect(appleOption).toHaveClass(/active/);

        // Press ArrowDown to move to Banana
        await page.keyboard.press("ArrowDown");
        await page.waitForTimeout(100);

        const bananaOption = selectMenuSection.locator("[role='option'][data-value='banana']");
        await expect(bananaOption).toHaveClass(/active/);

        // Press ArrowUp to go back to Apple
        await page.keyboard.press("ArrowUp");
        await page.waitForTimeout(100);
        await expect(appleOption).toHaveClass(/active/);
    });

    test("should navigate with Home/End keys", async ({ page }) => {
        const selectMenuSection = page.locator("#select-menu");
        const trigger = selectMenuSection.locator("button[aria-haspopup='listbox']");

        // Open select
        await trigger.click();
        await page.waitForTimeout(200);

        // Press End to go to last option
        await page.keyboard.press("End");
        await page.waitForTimeout(100);

        const lastOption = selectMenuSection.locator("[role='option'][data-value='pineapple']");
        await expect(lastOption).toHaveClass(/active/);

        // Press Home to go to first option
        await page.keyboard.press("Home");
        await page.waitForTimeout(100);

        const firstOption = selectMenuSection.locator("[role='option'][data-value='apple']");
        await expect(firstOption).toHaveClass(/active/);
    });

    test("should select option with Enter key", async ({ page }) => {
        const selectMenuSection = page.locator("#select-menu");
        const trigger = selectMenuSection.locator("button[aria-haspopup='listbox']");

        // Open select
        await trigger.click();
        await page.waitForTimeout(200);

        // Navigate to Banana
        await page.keyboard.press("ArrowDown");
        await page.waitForTimeout(100);

        // Press Enter to select
        await page.keyboard.press("Enter");
        await page.waitForTimeout(200);

        // Should be closed and show Banana as selected
        await expect(trigger).toHaveAttribute("aria-expanded", "false");
        await expect(trigger.locator("span.select-label")).toContainText("Banana");
    });

    test("should close on Escape key", async ({ page }) => {
        const selectMenuSection = page.locator("#select-menu");
        const trigger = selectMenuSection.locator("button[aria-haspopup='listbox']");
        const popover = selectMenuSection.locator("[data-popover]");

        // Open select
        await trigger.click();
        await page.waitForTimeout(200);
        await expect(popover).toHaveAttribute("aria-hidden", "false");

        // Press Escape
        await page.keyboard.press("Escape");
        await page.waitForTimeout(100);

        // Should be closed
        await expect(trigger).toHaveAttribute("aria-expanded", "false");
        await expect(popover).toHaveAttribute("aria-hidden", "true");
    });

    test("should close on click outside", async ({ page }) => {
        const selectMenuSection = page.locator("#select-menu");
        const trigger = selectMenuSection.locator("button[aria-haspopup='listbox']");
        const popover = selectMenuSection.locator("[data-popover]");

        // Open select
        await trigger.click();
        await page.waitForTimeout(200);
        await expect(popover).toHaveAttribute("aria-hidden", "false");

        // Click outside
        await page.locator("body").click({ position: { x: 10, y: 10 } });
        await page.waitForTimeout(100);

        // Should be closed
        await expect(trigger).toHaveAttribute("aria-expanded", "false");
        await expect(popover).toHaveAttribute("aria-hidden", "true");
    });

    test("should emit change event on selection", async ({ page }) => {
        const selectMenuSection = page.locator("#select-menu");
        const trigger = selectMenuSection.locator("button[aria-haspopup='listbox']");

        // Listen for change event
        const changeEventPromise = page.evaluate(() => {
            return new Promise((resolve) => {
                const selectMenu = document.querySelector("#select-menu el-select-menu");
                if (selectMenu) {
                    selectMenu.addEventListener(
                        "change",
                        (e) => {
                            resolve(e.detail.value);
                        },
                        { once: true },
                    );
                }
            });
        });

        // Open select and select Banana
        await trigger.click();
        await page.waitForTimeout(200);

        const bananaOption = selectMenuSection.locator("[role='option'][data-value='banana']");
        await bananaOption.click();

        // Wait for change event
        const changeValue = await changeEventPromise;
        expect(changeValue).toBe("banana");
    });

    test("should filter options with keyboard input", async ({ page }) => {
        const selectMenuSection = page.locator("#select-menu");
        const trigger = selectMenuSection.locator("button[aria-haspopup='listbox']");

        // Open select
        await trigger.click();
        await page.waitForTimeout(200);

        // Focus on search input (should be focused automatically)
        const searchInput = selectMenuSection.locator("input[type='text']");

        // Type "blue" to filter
        await searchInput.fill("blue");
        await page.waitForTimeout(200);

        // Only Blueberry should be visible
        const blueberryOption = selectMenuSection.locator("[role='option'][data-value='blueberry']");
        await expect(blueberryOption).toHaveAttribute("aria-hidden", "false");

        // Others should be hidden
        const appleOption = selectMenuSection.locator("[role='option'][data-value='apple']");
        await expect(appleOption).toHaveAttribute("aria-hidden", "true");
    });

    test("should maintain correct ARIA attributes during interaction", async ({ page }) => {
        const selectMenuSection = page.locator("#select-menu");
        const trigger = selectMenuSection.locator("button[aria-haspopup='listbox']");
        const popover = selectMenuSection.locator("[data-popover]");
        const _options = selectMenuSection.locator("[role='option']");

        // Initially closed
        await expect(trigger).toHaveAttribute("aria-expanded", "false");
        await expect(trigger).toHaveAttribute("aria-haspopup", "listbox");
        await expect(popover).toHaveAttribute("aria-hidden", "true");

        // Apple should be selected
        const appleOption = selectMenuSection.locator("[role='option'][data-value='apple']");
        await expect(appleOption).toHaveAttribute("aria-selected", "true");

        // Open select
        await trigger.click();
        await page.waitForTimeout(200);

        // Should be expanded
        await expect(trigger).toHaveAttribute("aria-expanded", "true");
        await expect(popover).toHaveAttribute("aria-hidden", "false");

        // Select Banana
        const bananaOption = selectMenuSection.locator("[role='option'][data-value='banana']");
        await bananaOption.click();
        await page.waitForTimeout(200);

        // Should be closed, Banana selected
        await expect(trigger).toHaveAttribute("aria-expanded", "false");
        await expect(popover).toHaveAttribute("aria-hidden", "true");
        await expect(bananaOption).toHaveAttribute("aria-selected", "true");
        await expect(appleOption).toHaveAttribute("aria-selected", "false");
    });
});
