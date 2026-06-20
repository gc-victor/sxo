import { expect, test } from "@playwright/test";

test.describe("Tabs", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.waitForSelector("#tabs", { state: "visible" });
        // Wait for reactive components to initialize
        await page.waitForTimeout(1000);
    });

    test("should display tab navigation", async ({ page }) => {
        const tabsSection = page.locator("#tabs");
        const preview = tabsSection.locator('[data-name="preview"]');

        // Check that tablist exists
        const tablist = preview.locator("[role='tablist']");
        await expect(tablist).toBeVisible();

        // Check that tabs exist
        const tabs = preview.locator("[role='tab']");
        await expect(tabs).toHaveCount(2);

        // Check tab labels
        await expect(preview.locator("[role='tab']").filter({ hasText: "Account" })).toBeVisible();
        await expect(preview.locator("[role='tab']").filter({ hasText: "Password" })).toBeVisible();
    });

    test("should display tab panels", async ({ page }) => {
        const tabsSection = page.locator("#tabs");
        const preview = tabsSection.locator('[data-name="preview"]');

        // Check that tab panels exist
        const panels = preview.locator("[role='tabpanel']");
        await expect(panels).toHaveCount(2);
    });

    test("should switch between tabs", async ({ page }) => {
        const tabsSection = page.locator("#tabs");
        const preview = tabsSection.locator('[data-name="preview"]');

        // Get tab buttons by role and data-name
        const accountTab = preview.locator("[role='tab'][data-name='tab-account']");
        const passwordTab = preview.locator("[role='tab'][data-name='tab-password']");

        // Get panels by role and data-name
        const accountPanel = preview.locator("[role='tabpanel'][data-name='tab-account']");
        const passwordPanel = preview.locator("[role='tabpanel'][data-name='tab-password']");

        // Initially, account tab should be active (first tab)
        await expect(accountPanel).toBeVisible();
        await expect(passwordPanel).not.toBeVisible();

        // Click account tab
        await accountTab.click();
        await page.waitForTimeout(300);

        // Account panel should be visible, password panel hidden
        await expect(accountPanel).toBeVisible();
        await expect(passwordPanel).not.toBeVisible();

        // Click password tab
        await passwordTab.click();
        await page.waitForTimeout(300);

        // Password panel should be visible, account panel hidden
        await expect(passwordPanel).toBeVisible();
        await expect(accountPanel).not.toBeVisible();
    });

    test("should have correct ARIA attributes", async ({ page }) => {
        const tabsSection = page.locator("#tabs");
        const preview = tabsSection.locator('[data-name="preview"]');

        // Get tab buttons and panels by role and data-name
        const accountTab = preview.locator("[role='tab'][data-name='tab-account']");
        const passwordTab = preview.locator("[role='tab'][data-name='tab-password']");
        const accountPanel = preview.locator("[role='tabpanel'][data-name='tab-account']");
        const passwordPanel = preview.locator("[role='tabpanel'][data-name='tab-password']");

        // Initially account tab should be selected
        await expect(accountTab).toHaveAttribute("aria-selected", "true");
        await expect(accountTab).toHaveAttribute("tabindex", "0");
        await expect(passwordTab).toHaveAttribute("aria-selected", "false");
        await expect(passwordTab).toHaveAttribute("tabindex", "-1");

        // Panels should have correct aria-hidden
        await expect(accountPanel).toHaveAttribute("aria-hidden", "false");
        await expect(passwordPanel).toHaveAttribute("aria-hidden", "true");

        // Switch to password tab
        await passwordTab.click();
        await page.waitForTimeout(300);

        // Password tab should now be selected
        await expect(passwordTab).toHaveAttribute("aria-selected", "true");
        await expect(passwordTab).toHaveAttribute("tabindex", "0");
        await expect(accountTab).toHaveAttribute("aria-selected", "false");
        await expect(accountTab).toHaveAttribute("tabindex", "-1");

        // Panels should be updated
        await expect(passwordPanel).toHaveAttribute("aria-hidden", "false");
        await expect(accountPanel).toHaveAttribute("aria-hidden", "true");
    });

    test("should navigate tabs with keyboard", async ({ page }) => {
        const tabsSection = page.locator("#tabs");
        const preview = tabsSection.locator('[data-name="preview"]');

        // Get tab buttons by role and data-name
        const accountTab = preview.locator("[role='tab'][data-name='tab-account']");
        const passwordTab = preview.locator("[role='tab'][data-name='tab-password']");

        // Focus first tab
        await accountTab.focus();
        await page.waitForTimeout(100);

        // Press ArrowRight to move to password tab
        await page.keyboard.press("ArrowRight");
        await page.waitForTimeout(100);

        // Check if navigation worked
        await expect(passwordTab).toHaveAttribute("aria-selected", "true");
    });

    test("should navigate to first/last tabs with Home/End", async ({ page }) => {
        const tabsSection = page.locator("#tabs");
        const preview = tabsSection.locator('[data-name="preview"]');

        // Get tab buttons by role and data-name
        const accountTab = preview.locator("[role='tab'][data-name='tab-account']");
        const passwordTab = preview.locator("[role='tab'][data-name='tab-password']");

        // Focus password tab first
        await passwordTab.focus();
        await page.waitForTimeout(100);

        // Press Home to go to first tab
        await page.keyboard.press("Home");
        await page.waitForTimeout(100);

        // Check if Home navigation worked
        await expect(accountTab).toHaveAttribute("aria-selected", "true");
    });

    test("should maintain tab order and focus management", async ({ page }) => {
        const tabsSection = page.locator("#tabs");
        const preview = tabsSection.locator('[data-name="preview"]');

        // Get tab buttons by role and data-name
        const accountTab = preview.locator("[role='tab'][data-name='tab-account']");
        const passwordTab = preview.locator("[role='tab'][data-name='tab-password']");

        // Initially account tab should be focused (tabindex=0)
        await expect(accountTab).toHaveAttribute("tabindex", "0");
        await expect(passwordTab).toHaveAttribute("tabindex", "-1");

        // Switch to password tab
        await passwordTab.click();
        await page.waitForTimeout(300);

        // Password tab should now have tabindex=0, account should have -1
        await expect(passwordTab).toHaveAttribute("tabindex", "0");
        await expect(accountTab).toHaveAttribute("tabindex", "-1");

        // Switch back to account tab
        await accountTab.click();
        await page.waitForTimeout(300);

        // Account tab should have tabindex=0 again
        await expect(accountTab).toHaveAttribute("tabindex", "0");
        await expect(passwordTab).toHaveAttribute("tabindex", "-1");
    });

    test("should have account tab content", async ({ page }) => {
        const tabsSection = page.locator("#tabs");
        const preview = tabsSection.locator('[data-name="preview"]');

        // Check that account panel exists
        const accountPanel = preview.locator("[role='tabpanel']").first();
        await expect(accountPanel).toBeAttached();

        // Check that it has input elements
        const inputs = accountPanel.locator("input");
        await expect((await inputs.all()).length).toBeGreaterThan(0);
    });

    test("should have password tab content", async ({ page }) => {
        const tabsSection = page.locator("#tabs");
        const preview = tabsSection.locator('[data-name="preview"]');

        // Password panel should exist
        const passwordPanel = preview.locator("[role='tabpanel']").nth(1);
        await expect(passwordPanel).toBeAttached();

        // Check that it has input elements
        const inputs = passwordPanel.locator("input");
        await expect((await inputs.all()).length).toBeGreaterThan(0);
    });
});
