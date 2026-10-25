import { expect, test } from "@playwright/test";

test.describe("Field", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/components/field");
        await page.waitForSelector("main", { state: "visible" });
    });

    test("should display field with label", async ({ page }) => {
        const section = page.locator("main");
        const preview = section.locator('[data-name="preview"]');

        // Check basic field
        const field = preview.locator(".field").first();
        await expect(field).toBeVisible();

        // Check label
        await expect(field.locator("label")).toHaveText("Name");
    });

    test("should display field with hint", async ({ page }) => {
        const section = page.locator("main");
        const preview = section.locator('[data-name="preview"]');

        // Check hint text on the email field
        const withHint = preview.locator(".field").nth(1);
        await expect(withHint.locator(".field-hint")).toBeVisible();
        await expect(withHint.locator(".field-hint")).toHaveText("We'll never share your email.");
    });

    test("should display field with error state", async ({ page }) => {
        const section = page.locator("main");
        const preview = section.locator('[data-name="preview"]');

        // Check error state
        const withError = preview.locator(".field").nth(2);
        await expect(withError.locator(".field-error")).toBeVisible();
        await expect(withError.locator(".field-error")).toHaveText("This field is required.");
    });

    test("should link labels to controls and prioritize error feedback", async ({ page }) => {
        const preview = page.locator("main [data-name='preview']");
        const withError = preview.locator(".field").nth(2);

        await expect(withError.locator("label")).toHaveAttribute("for", "password");
        await expect(withError.locator("input")).toHaveAttribute("id", "password");
        await expect(withError).toHaveAttribute("aria-invalid", "true");
        await expect(withError.locator('[role="alert"]')).toHaveText("This field is required.");
        await expect(withError.locator(".field-hint")).toHaveCount(0);
    });

    test("should display required field indicator", async ({ page }) => {
        const section = page.locator("main");
        const preview = section.locator('[data-name="preview"]');

        // Check required state
        const required = preview.locator(".field").nth(3);
        await expect(required.locator("label")).toContainText("*");
    });
});
