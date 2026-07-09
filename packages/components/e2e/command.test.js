import { expect, test } from "@playwright/test";

test.describe("Command", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.waitForSelector("#command", { state: "visible" });
    });

    test("should open command palette on keyboard shortcut", async ({ page }) => {
        // Open with Meta+K
        await page.keyboard.press("Meta+k");
        await page.waitForTimeout(200);

        // Check the command dialog is visible
        const section = page.locator("#command");
        const dialog = section.locator('[role="dialog"]');
        await expect(dialog).toBeVisible();
        await expect(dialog).toHaveAttribute("aria-label", "Command");
    });

    test("should filter results as user types", async ({ page }) => {
        // Open command
        await page.keyboard.press("Meta+k");
        await page.waitForTimeout(200);

        // Type to filter
        const section = page.locator("#command");
        const input = section.locator('[role="combobox"]');
        await input.fill("Settings");
        await page.waitForTimeout(100);

        // Matching item should be visible
        await expect(page.locator('[role="option"]').filter({ hasText: "Settings" })).toBeVisible();
    });

    test("should select item on Enter", async ({ page }) => {
        // Open command
        await page.keyboard.press("Meta+k");
        await page.waitForTimeout(200);

        // Type to narrow results
        const section = page.locator("#command");
        const input = section.locator('[role="combobox"]');
        await input.fill("Profile");
        await page.waitForTimeout(100);

        // Press Enter to select
        await page.keyboard.press("Enter");
        await page.waitForTimeout(200);

        // Dialog should close after selection
        const sectionAfter = page.locator("#command");
        const dialogAfter = sectionAfter.locator('[role="dialog"]');
        await expect(dialogAfter).not.toBeVisible();
    });

    test("should close on Escape", async ({ page }) => {
        // Open command
        await page.keyboard.press("Meta+k");
        await page.waitForTimeout(200);

        // Verify dialog is open
        const section = page.locator("#command");
        const dialog = section.locator('[role="dialog"]');
        await expect(dialog).toBeVisible();

        // Press Escape to close
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);

        // Dialog should close
        await expect(dialog).not.toBeVisible();
    });

    test("should show no-results state", async ({ page }) => {
        // Open command
        await page.keyboard.press("Meta+k");
        await page.waitForTimeout(200);

        // Type something that won't match any items
        const section = page.locator("#command");
        const input = section.locator('[role="combobox"]');
        await input.fill("zzzznotfound");
        await page.waitForTimeout(100);

        // Should show no results message
        const commandSection = page.locator("#command");
        const emptyMsg = commandSection.locator(".command-empty");
        await expect(emptyMsg).toBeVisible();
        await expect(emptyMsg).toHaveText("No results found.");
    });
});
