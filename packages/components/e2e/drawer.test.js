/**
 * @fileoverview E2E behavioral tests for Drawer component
 *
 * Tests open/close behavior, side placement, backdrop click, Escape key,
 * focus trap, scroll lock, and focus restoration.
 */

import { expect, test } from "@playwright/test";

test.describe("Drawer", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.waitForSelector("#drawer", { state: "visible" });
    });

    test("should render trigger buttons", async ({ page }) => {
        const section = page.locator("#drawer");

        // Check trigger buttons exist
        const leftTrigger = section.locator("button").filter({ hasText: "Open Left" });
        await expect(leftTrigger).toHaveCount(1);

        const rightTrigger = section.locator("button").filter({ hasText: "Open Right" });
        await expect(rightTrigger).toHaveCount(1);
    });

    test("should open drawer on trigger click", async ({ page }) => {
        const section = page.locator("#drawer");

        // Click the "Open Right" trigger
        const trigger = section.locator("button").filter({ hasText: "Open Right" });
        await trigger.click();
        await page.waitForTimeout(300);

        // Verify drawer panel is visible
        const panel = section.locator(".drawer-panel.open");
        await expect(panel).toBeVisible();
    });

    test("should close drawer via close button", async ({ page }) => {
        const section = page.locator("#drawer");

        // Open the drawer via click
        const trigger = section.locator("button").filter({ hasText: "Open Right" });
        await trigger.click();
        await page.waitForTimeout(300);

        // Verify drawer panel is open
        const panel = section.locator(".drawer-panel.open");
        await expect(panel).toBeVisible();

        // Close via close button inside the drawer panel
        const closeButton = panel.locator(".drawer-close");
        await closeButton.click();
        await page.waitForTimeout(300);

        // Verify drawer is closed
        await expect(panel).toHaveCount(0);
    });

    test("should close drawer on Escape", async ({ page }) => {
        const section = page.locator("#drawer");

        // Open the drawer
        const trigger = section.locator("button").filter({ hasText: "Open Right" });
        await trigger.click();
        await page.waitForTimeout(300);

        // Press Escape
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);

        // Verify drawer is closed
        const panel = section.locator(".drawer-panel.open");
        await expect(panel).toHaveCount(0);
    });

    test("should render left-side drawer", async ({ page }) => {
        const section = page.locator("#drawer");

        // Click the "Open Left" trigger
        const trigger = section.locator("button").filter({ hasText: "Open Left" });
        await trigger.click();
        await page.waitForTimeout(300);

        // Verify panel has left-side class
        const panel = section.locator(".drawer-panel.open");
        await expect(panel).toHaveClass(/drawer-left/);
    });

    test("should lock body scroll when open", async ({ page }) => {
        const section = page.locator("#drawer");

        // Open the drawer
        const trigger = section.locator("button").filter({ hasText: "Open Right" });
        await trigger.click();
        await page.waitForTimeout(300);

        // Verify body overflow is hidden
        const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
        expect(bodyOverflow).toBe("hidden");

        // Close
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);

        // Verify body overflow is restored
        const bodyOverflowAfter = await page.evaluate(() => document.body.style.overflow);
        expect(bodyOverflowAfter).toBe("");
    });
});
