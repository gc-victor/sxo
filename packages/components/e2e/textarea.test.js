import { expect, test } from "@playwright/test";

test.describe("Textarea", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.waitForSelector("#textarea", { state: "visible" });
    });

    test("should display textarea elements", async ({ page }) => {
        const textareaSection = page.locator("#textarea");

        // Check that textareas exist
        const textareas = textareaSection.locator("textarea");
        await expect(textareas).toHaveCount(2);

        // Check labels exist
        const labels = textareaSection.locator("label");
        await expect(labels).toHaveCount(2);
    });

    test("should allow typing in enabled textarea", async ({ page }) => {
        const enabledTextarea = page.locator("#textarea textarea").first();

        const testText = "This is a test message for the textarea component.";
        await enabledTextarea.fill(testText);
        await expect(enabledTextarea).toHaveValue(testText);
    });

    test("should handle disabled textarea", async ({ page }) => {
        const disabledTextarea = page.locator("#textarea textarea").nth(1);

        // Should be disabled
        await expect(disabledTextarea).toBeDisabled();

        // Should not allow input
        await expect(disabledTextarea).toHaveAttribute("placeholder", "This field is disabled.");
    });

    test("should display placeholder text", async ({ page }) => {
        const enabledTextarea = page.locator("#textarea textarea").first();

        // Check placeholder
        await expect(enabledTextarea).toHaveAttribute("placeholder", "Type your message here");
    });

    test("should display description text", async ({ page }) => {
        const textareaSection = page.locator("#textarea");

        // Check description text exists
        await expect(textareaSection.locator("p").filter({ hasText: "Type your message and press enter to send." })).toBeVisible();
    });
});
