import { expect, test } from "@playwright/test";

test.describe("Input", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.waitForSelector("#input", { state: "visible" });
    });

    test("should display all input types", async ({ page }) => {
        const inputSection = page.locator("#input");

        // Check text input
        await expect(inputSection.locator("input[type='text']")).toBeVisible();

        // Check email input
        await expect(inputSection.locator("input[type='email']")).toBeVisible();

        // Check password input
        await expect(inputSection.locator("input[type='password']")).toBeVisible();

        // Check search input
        await expect(inputSection.locator("input[type='search']")).toBeVisible();

        // Check number input
        await expect(inputSection.locator("input[type='number']")).toBeVisible();

        // Check date input
        await expect(inputSection.locator("input[type='date']")).toBeVisible();
    });

    test("should allow typing in text input", async ({ page }) => {
        const textInput = page.locator("#input input[type='text']");

        await textInput.fill("Hello World");
        await expect(textInput).toHaveValue("Hello World");
    });

    test("should allow typing in email input", async ({ page }) => {
        const emailInput = page.locator("#input input[type='email']");

        await emailInput.fill("test@example.com");
        await expect(emailInput).toHaveValue("test@example.com");
    });

    test("should handle password input", async ({ page }) => {
        const passwordInput = page.locator("#input input[type='password']");

        await passwordInput.fill("secret123");
        await expect(passwordInput).toHaveValue("secret123");

        // Verify it's masked (type should be password)
        await expect(passwordInput).toHaveAttribute("type", "password");
    });

    test("should handle number input", async ({ page }) => {
        const numberInput = page.locator("#input input[type='number']");

        await numberInput.fill("42");
        await expect(numberInput).toHaveValue("42");
    });
});
