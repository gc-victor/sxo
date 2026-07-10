import { expect, test } from "@playwright/test";

test.describe("Command", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.waitForSelector("#command", { state: "visible" });

        // Wait for both <el-command> enhancements to initialize.
        // The eager import fires on window.load, so this waits for that.
        await page.waitForSelector("#command section.command[data-command-initialized]", { state: "attached", timeout: 10000 });
        await page.waitForSelector("#cmd-dialog-demo .command[data-command-initialized]", { state: "attached", timeout: 5000 });
    });

    test("should open dialog on trigger click", async ({ page }) => {
        await page.locator("#command button").filter({ hasText: "Open Command Palette" }).click();
        await page.waitForTimeout(200);

        await expect(page.locator("#cmd-dialog-demo")).toBeVisible();
    });

    test("should filter dialog items as user types", async ({ page }) => {
        // Open dialog
        await page.locator("#command button").filter({ hasText: "Open Command Palette" }).click();
        await page.waitForTimeout(200);
        await expect(page.locator("#cmd-dialog-demo")).toBeVisible();

        // Type a query that matches exactly one item
        await page.locator("#cmd-dialog-input").fill("Settings");
        await page.waitForTimeout(200);

        // Only the Settings item should be visible
        const visibleItems = page.locator('#cmd-dialog-menu [role="menuitem"][aria-hidden="false"]');
        await expect(visibleItems).toHaveCount(1);
        await expect(visibleItems).toContainText("Settings");

        // Now test a no-match query
        await page.locator("#cmd-dialog-input").fill("zzz");
        await page.waitForTimeout(200);

        // No items should be visible
        await expect(page.locator('#cmd-dialog-menu [role="menuitem"][aria-hidden="false"]')).toHaveCount(0);

        // Menu itself should still be visible with empty-state message
        await expect(page.locator("#cmd-dialog-menu")).toBeVisible();
    });

    test("should navigate dialog items with arrow keys", async ({ page }) => {
        // Open dialog
        await page.locator("#command button").filter({ hasText: "Open Command Palette" }).click();
        await page.waitForTimeout(200);
        await expect(page.locator("#cmd-dialog-demo")).toBeVisible();

        // Focus the input
        await page.locator("#cmd-dialog-input").focus();
        await page.waitForTimeout(100);

        // Enhancement auto-selects the first visible item (Calendar) on init
        let activeItems = page.locator('#cmd-dialog-menu [role="menuitem"].active');
        await expect(activeItems).toHaveCount(1);
        await expect(activeItems).toContainText("Calendar");

        // Press ArrowDown — moves to next item (Search Emoji)
        await page.locator("#cmd-dialog-input").press("ArrowDown");
        await page.waitForTimeout(200);

        activeItems = page.locator('#cmd-dialog-menu [role="menuitem"].active');
        await expect(activeItems).toHaveCount(1);
        await expect(activeItems).toContainText("Search Emoji");

        // Calendar should no longer have .active
        await expect(page.locator('#cmd-dialog-menu [role="menuitem"][data-filter="Calendar"]')).not.toHaveClass(/active/);

        // Press ArrowDown again — moves to Profile
        await page.locator("#cmd-dialog-input").press("ArrowDown");
        await page.waitForTimeout(200);

        activeItems = page.locator('#cmd-dialog-menu [role="menuitem"].active');
        await expect(activeItems).toHaveCount(1);
        await expect(activeItems).toContainText("Profile");
    });

    test("should select dialog item on Enter and close dialog", async ({ page }) => {
        // Open dialog
        await page.locator("#command button").filter({ hasText: "Open Command Palette" }).click();
        await page.waitForTimeout(200);
        await expect(page.locator("#cmd-dialog-demo")).toBeVisible();

        // Type to narrow to a single item (Settings — unique filter match)
        await page.locator("#cmd-dialog-input").fill("Settings");
        await page.waitForTimeout(200);

        // Press Enter to select the active item
        await page.locator("#cmd-dialog-input").press("Enter");
        await page.waitForTimeout(300);

        // Dialog should close after selection
        await expect(page.locator("#cmd-dialog-demo")).not.toBeVisible();
    });

    test("should close dialog on Escape", async ({ page }) => {
        // Open dialog
        await page.locator("#command button").filter({ hasText: "Open Command Palette" }).click();
        await page.waitForTimeout(200);
        await expect(page.locator("#cmd-dialog-demo")).toBeVisible();

        // Press Escape (native dialog closes on Escape by default)
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);

        await expect(page.locator("#cmd-dialog-demo")).not.toBeVisible();
    });

    test("should filter standalone items as user types", async ({ page }) => {
        // Type to filter standalone (always visible, no dialog interaction needed)
        await page.locator("#cmd-standalone-input").fill("Calendar");
        await page.waitForTimeout(200);

        // Only Calendar should be visible
        const visibleItems = page.locator('#cmd-standalone-menu [role="menuitem"][aria-hidden="false"]');
        await expect(visibleItems).toHaveCount(1);
        await expect(visibleItems).toContainText("Calendar");
    });

    test("should navigate standalone items with arrow keys", async ({ page }) => {
        // Focus the standalone input
        await page.locator("#cmd-standalone-input").focus();
        await page.waitForTimeout(100);

        // Enhancement auto-selects the first visible item (Calendar) on init
        let activeItems = page.locator('#cmd-standalone-menu [role="menuitem"].active');
        await expect(activeItems).toHaveCount(1);
        await expect(activeItems).toContainText("Calendar");

        // Press ArrowDown — moves to next item (Search Emoji)
        await page.locator("#cmd-standalone-input").press("ArrowDown");
        await page.waitForTimeout(200);

        activeItems = page.locator('#cmd-standalone-menu [role="menuitem"].active');
        await expect(activeItems).toHaveCount(1);
        await expect(activeItems).toContainText("Search Emoji");
    });

    test("should select standalone item on click (no dialog to close)", async ({ page }) => {
        // Click the Calendar item in the standalone menu
        await page.locator('#cmd-standalone-menu [role="menuitem"]').filter({ hasText: "Calendar" }).click();
        await page.waitForTimeout(200);

        // Standalone menu should still be visible (no dialog to close)
        await expect(page.locator("#cmd-standalone-menu")).toBeVisible();
    });
});
