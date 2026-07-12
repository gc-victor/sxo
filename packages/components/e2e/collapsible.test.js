/**
 * @fileoverview E2E behavioral tests for Collapsible component
 *
 * Tests toggle behavior, content show/hide, aria attributes,
 * animation, and defaultOpen prop.
 */

import { expect, test } from "@playwright/test";

test.describe("Collapsible", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/components/collapsible");
        await page.waitForSelector("main", { state: "visible" });
    });

    test("should render trigger buttons", async ({ page }) => {
        const section = page.locator("main");

        // Check trigger buttons exist
        const trigger = section.locator("button").filter({ hasText: "Toggle Content" });
        await expect(trigger).toHaveCount(1);

        const defaultOpenTrigger = section.locator("button").filter({ hasText: "Start Open" });
        await expect(defaultOpenTrigger).toHaveCount(1);
    });

    test("should have content hidden by default", async ({ page }) => {
        const section = page.locator("main");

        // The default collapsible should have hidden content
        const content = section.locator(".collapsible-content").first();
        await expect(content).not.toBeVisible();
    });

    test("should show content when toggled", async ({ page }) => {
        const section = page.locator("main");

        // Click the "Toggle Content" trigger
        const trigger = section.locator("button").filter({ hasText: "Toggle Content" });
        await trigger.click();
        await page.waitForTimeout(300);

        // Verify content is visible
        const content = section.locator(".collapsible-content").first();
        await expect(content).toBeVisible();
    });

    test("should hide content when toggled again", async ({ page }) => {
        const section = page.locator("main");

        // Click the "Toggle Content" trigger twice
        const trigger = section.locator("button").filter({ hasText: "Toggle Content" });
        await trigger.click();
        await page.waitForTimeout(200);
        await trigger.click();
        await page.waitForTimeout(300);

        // Verify content is hidden again
        const content = section.locator(".collapsible-content").first();
        await expect(content).not.toBeVisible();
    });

    test("should toggle aria-expanded attribute", async ({ page }) => {
        const section = page.locator("main");

        // Check initial state
        const trigger = section.locator("button").filter({ hasText: "Toggle Content" });
        await expect(trigger).toHaveAttribute("aria-expanded", "false");

        // Toggle open
        await trigger.click();
        await page.waitForTimeout(200);
        await expect(trigger).toHaveAttribute("aria-expanded", "true");

        // Toggle closed
        await trigger.click();
        await page.waitForTimeout(200);
        await expect(trigger).toHaveAttribute("aria-expanded", "false");
    });

    test("should start open when defaultOpen is true", async ({ page }) => {
        const section = page.locator("main");

        // The "Start Open" collapsible should have visible content
        const content = section.locator(".collapsible-content").last();
        await expect(content).toBeVisible();

        // The trigger should have aria-expanded true
        const trigger = section.locator("button").filter({ hasText: "Start Open" });
        await expect(trigger).toHaveAttribute("aria-expanded", "true");
    });
});
