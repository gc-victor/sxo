import { expect, test } from "@playwright/test";

test.describe("Button", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.waitForSelector("#button", { state: "visible" });
    });

    test("should display button variants", async ({ page }) => {
        const buttonSection = page.locator("#button");

        // Check that various button types exist
        const buttons = buttonSection.locator("button");
        await expect((await buttons.all()).length).toBeGreaterThan(10);

        // Check that some common button variants exist
        await expect(buttonSection.locator("button").filter({ hasText: "Primary" }).first()).toBeVisible();
        await expect(buttonSection.locator("button").filter({ hasText: "Outline" }).first()).toBeVisible();
    });

    test("should display button sizes", async ({ page }) => {
        const buttonSection = page.locator("#button");

        // Check that buttons exist in different sections
        const allButtons = buttonSection.locator("button");
        await expect((await allButtons.all()).length).toBeGreaterThan(20);
    });

    test("should display buttons with icons", async ({ page }) => {
        const buttonSection = page.locator("#button");

        // Check buttons with icons (should have SVG elements)
        const buttonsWithIcons = buttonSection.locator("button:has(svg)");
        await expect((await buttonsWithIcons.all()).length).toBeGreaterThan(5);

        // Verify one of the icon buttons has the correct structure
        const sendButton = buttonSection.locator("button:has-text('Send')").first();
        await expect(sendButton.locator("svg")).toBeVisible();
    });

    test("should display buttons with various configurations", async ({ page }) => {
        const buttonSection = page.locator("#button");

        // Check that there are buttons with different configurations
        const allButtons = buttonSection.locator("button");
        await expect((await allButtons.all()).length).toBeGreaterThan(20);

        // Check for visible buttons that have aria-label (icon-only style)
        const ariaLabelButtons = buttonSection.locator("button[aria-label]:visible");
        if ((await ariaLabelButtons.count()) > 0) {
            // Verify they have exactly one visible SVG icon
            for (const button of await ariaLabelButtons.all()) {
                await expect(button.locator("svg:visible")).toHaveCount(1);
            }
        }
    });
});
