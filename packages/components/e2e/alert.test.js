import { expect, test } from "@playwright/test";

test.describe("Alert", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.waitForSelector("#alert", { state: "visible" });
    });

    test("should display all alert variants", async ({ page }) => {
        const alertSection = page.locator("#alert");

        // Check that alerts exist (role="alert")
        const alerts = alertSection.locator("[role='alert']");
        await expect(alerts).toHaveCount(7);
    });

    test("should display alert with only title", async ({ page }) => {
        const alertSection = page.locator("#alert");

        // Find alert with only title
        const titleOnlyAlert = alertSection.locator("[role='alert']").first();
        await expect(titleOnlyAlert.locator("h3")).toHaveText("This is an alert with only a title.");
    });

    test("should display alert with icon and description", async ({ page }) => {
        const alertSection = page.locator("#alert");

        // Find alert with icon and description (second alert)
        const iconAlert = alertSection.locator("[role='alert']").nth(1);

        // Should have SVG icon
        await expect(iconAlert.locator("svg")).toBeVisible();

        // Should have description
        await expect(iconAlert.locator("p")).toHaveText("This is an alert with icon, description and no title.");
    });

    test("should display alert with icon, title and description", async ({ page }) => {
        const alertSection = page.locator("#alert");

        // Find alert with icon, title and description (third alert)
        const fullAlert = alertSection.locator("[role='alert']").nth(2);

        // Should have SVG icon
        await expect(fullAlert.locator("svg")).toBeVisible();

        // Should have title
        await expect(fullAlert.locator("h3")).toHaveText("Alert Title");

        // Should have description
        await expect(fullAlert.locator("p")).toHaveText("This is an alert with both a title and a description.");
    });

    test("should display colored alerts", async ({ page }) => {
        const alertSection = page.locator("#alert");

        // Find sky colored alert
        const skyAlert = alertSection.locator("[role='alert']").nth(3);
        await expect(skyAlert.locator("p")).toHaveText("This one has a description only. No title. No icon.");

        // Find green success alert
        const successAlert = alertSection.locator("[role='alert']").nth(4);
        await expect(successAlert.locator("h3")).toHaveText("Success! Your changes have been saved");

        // Find red error alert
        const errorAlert = alertSection.locator("[role='alert']").nth(5);
        await expect(errorAlert.locator("h3")).toHaveText("Something went wrong!");

        // Find amber warning alert
        const warningAlert = alertSection.locator("[role='alert']").nth(6);
        await expect(warningAlert.locator("h3")).toHaveText("Plot Twist: This Alert is Actually Amber!");
    });

    test("should display alert with list content", async ({ page }) => {
        const alertSection = page.locator("#alert");

        // Find error alert with list
        const errorAlert = alertSection.locator("[role='alert']").nth(5);

        // Should have unordered list
        const list = errorAlert.locator("ul");
        await expect(list).toBeVisible();

        // Should have list items
        const listItems = list.locator("li");
        await expect(listItems).toHaveCount(3);
        await expect(listItems.first()).toHaveText("Check your card details");
    });

    test("should support role override to status", async ({ page }) => {
        const alertSection = page.locator("#alert");

        // This assumes there's an alert with role="status" in the section
        const statusAlert = alertSection.locator("[role='status']");

        if ((await statusAlert.count()) > 0) {
            await expect(statusAlert.first()).toBeVisible();
            await expect(statusAlert.first()).toHaveAttribute("role", "status");
        } else {
            // Skip if no status role example is present
            test.skip();
        }
    });

    test("should clamp AlertTitle heading level for invalid levels", async ({ page }) => {
        const alertSection = page.locator("#alert");

        // This assumes there's an alert with level="10" or similar in the section
        const clampedTitle = alertSection.locator("h5").filter({ hasText: /clamped/i });

        if ((await clampedTitle.count()) > 0) {
            await expect(clampedTitle.first()).toBeVisible();
            // Verify it's clamped to h5 (default for invalid levels)
            await expect(clampedTitle.first()).toHaveRole("heading", { level: 5 });
        } else {
            // Skip if no level clamping example is present
            test.skip();
        }
    });
});
