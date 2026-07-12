import { expect, test } from "@playwright/test";

test.describe("Switch", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/components/switch");
        await page.waitForSelector("main", { state: "visible" });
        await page.evaluate(() => document.dispatchEvent(new CustomEvent("sxo:sidebar")));
        await page.waitForTimeout(200);
    });

    test("should display switch components", async ({ page }) => {
        const switchSection = page.locator("main");

        // Check that switches exist (input type checkbox with role switch)
        const switches = switchSection.locator("input[type='checkbox'][role='switch']");
        await expect(switches).toHaveCount(2);

        // Check labels exist
        const labels = switchSection.locator("label");
        await expect(labels).toHaveCount(2);
    });

    test("should toggle switch state", async ({ page }) => {
        const airplaneSwitch = page.locator("#switch input[type='checkbox'][role='switch']").first();

        // Initially unchecked
        await expect(airplaneSwitch).not.toBeChecked();

        // Click to check
        await airplaneSwitch.check({ force: true });
        await expect(airplaneSwitch).toBeChecked();

        // Click to uncheck
        await airplaneSwitch.uncheck({ force: true });
        await expect(airplaneSwitch).not.toBeChecked();
    });

    test("should display switch with initial checked state", async ({ page }) => {
        const bluetoothSwitch = page.locator("#switch input[type='checkbox'][role='switch']").nth(1);

        // Should be initially checked
        await expect(bluetoothSwitch).toBeChecked();
    });

    test("should display correct labels", async ({ page }) => {
        const switchSection = page.locator("main");

        // Check label texts
        await expect(switchSection.locator("label").filter({ hasText: "Airplane Mode" })).toBeVisible();
        await expect(switchSection.locator("label").filter({ hasText: "Bluetooth" })).toBeVisible();
    });
});
