import { expect, test } from "@playwright/test";

test.describe("Popover", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.waitForSelector("#popover", { state: "visible" });
    });

    test("should display popover structure", async ({ page }) => {
        const popoverSection = page.locator("#popover");

        // Check trigger button
        const trigger = popoverSection.locator("button").filter({ hasText: "Open popover" });
        await expect(trigger).toBeVisible();

        // Check popover content exists
        const content = page.locator("#popover-dimensions-panel");
        await expect(content).toBeAttached();

        // Check content has form elements
        await expect(content.locator("input")).toHaveCount(4);
    });

    test("should display popover with form inputs", async ({ page }) => {
        const _popoverSection = page.locator("#popover");

        const content = page.locator("#popover-dimensions-panel");

        // Check header
        await expect(content.locator("h3").filter({ hasText: "Dimensions" })).toBeAttached();

        // Check inputs
        await expect(content.locator("input[id='popover-width']")).toBeAttached();
        await expect(content.locator("input[id='popover-max-width']")).toBeAttached();
        await expect(content.locator("input[id='popover-height']")).toBeAttached();
        await expect(content.locator("input[id='popover-max-height']")).toBeAttached();
    });

    test("should open popover via trigger button click", async ({ page }) => {
        const popoverSection = page.locator("#popover");
        const trigger = popoverSection.locator("button").filter({ hasText: "Open popover" });
        const content = page.locator("#popover-dimensions-panel");

        // Initially hidden
        await expect(content).toHaveClass(/hidden/);

        // Click trigger to open
        await trigger.click();
        await page.waitForTimeout(200);

        // Should be visible (class binding removes 'hidden')
        await expect(content).not.toHaveClass(/hidden/);
    });

    test("should close popover on click outside", async ({ page }) => {
        const popoverSection = page.locator("#popover");
        const trigger = popoverSection.locator("button").filter({ hasText: "Open popover" });
        const content = page.locator("#popover-dimensions-panel");

        // Open popover
        await trigger.click();
        await page.waitForTimeout(200);
        await expect(content).not.toHaveClass(/hidden/);

        // Click outside (on the page body)
        await page.locator("body").click({ position: { x: 10, y: 10 } });
        await page.waitForTimeout(200);

        // Should be hidden again
        await expect(content).toHaveClass(/hidden/);
    });

    test("should close popover on Escape key", async ({ page }) => {
        const popoverSection = page.locator("#popover");
        const trigger = popoverSection.locator("button").filter({ hasText: "Open popover" });
        const content = page.locator("#popover-dimensions-panel");

        // Open popover
        await trigger.click();
        await page.waitForTimeout(200);
        await expect(content).not.toHaveClass(/hidden/);

        // Press Escape
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);

        // Should be hidden
        await expect(content).toHaveClass(/hidden/);
    });

    test("should focus first input when opened", async ({ page }) => {
        const popoverSection = page.locator("#popover");
        const trigger = popoverSection.locator("button").filter({ hasText: "Open popover" });

        // Open popover
        await trigger.click();
        await page.waitForTimeout(300);

        // First input should be focused
        const firstInput = page.locator("#popover-width");
        await expect(firstInput).toBeFocused();
    });

    test("should restore focus to trigger when closed", async ({ page }) => {
        const popoverSection = page.locator("#popover");
        const trigger = popoverSection.locator("button").filter({ hasText: "Open popover" });
        const _content = page.locator("#popover-dimensions-panel");

        // Open popover
        await trigger.click();
        await page.waitForTimeout(200);

        // Click outside to close (at bottom right of viewport)
        await page.mouse.click(1000, 800);
        await page.waitForTimeout(300);

        // Focus should return to trigger
        await expect(trigger).toBeFocused();
    });

    test("should navigate with Tab key", async ({ page }) => {
        const popoverSection = page.locator("#popover");
        const trigger = popoverSection.locator("button").filter({ hasText: "Open popover" });

        // Open popover
        await trigger.click();
        await page.waitForTimeout(300);

        // Focus first input
        const firstInput = page.locator("#popover-width");
        await firstInput.focus();
        await page.waitForTimeout(100);

        // Press Tab to move to next input
        await page.keyboard.press("Tab");
        await page.waitForTimeout(100);

        const secondInput = page.locator("#popover-max-width");
        await expect(secondInput).toBeFocused();
    });

    test("should have correct ARIA attributes", async ({ page }) => {
        const popoverSection = page.locator("#popover");
        const trigger = popoverSection.locator("button").filter({ hasText: "Open popover" });
        const content = page.locator("#popover-dimensions-panel");

        // Initially, trigger should have aria-expanded=false
        await expect(trigger).toHaveAttribute("aria-expanded", "false");

        // Open popover
        await trigger.click();
        await page.waitForTimeout(200);

        // Trigger should have aria-expanded=true
        await expect(trigger).toHaveAttribute("aria-expanded", "true");

        // Content should have aria-hidden=false
        await expect(content).toHaveAttribute("aria-hidden", "false");

        // Close popover
        await page.locator("body").click({ position: { x: 10, y: 10 } });
        await page.waitForTimeout(200);

        // ARIA attributes should be restored
        await expect(trigger).toHaveAttribute("aria-expanded", "false");
        await expect(content).toHaveAttribute("aria-hidden", "true");
    });
});
