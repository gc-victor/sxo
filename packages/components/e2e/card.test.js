import { expect, test } from "@playwright/test";

test.describe("Card", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.waitForSelector("#card", { state: "visible" });
    });

    test("should display card components", async ({ page }) => {
        const cardSection = page.locator("#card");
        const preview = cardSection.locator('[data-name="preview"]');

        // Check that cards exist
        const cards = preview.locator(".card");
        await expect(cards).toHaveCount(2);

        // Check headers in cards
        const cardHeaders = cards.locator("h2");
        await expect(cardHeaders).toHaveCount(2);

        // Check card sections
        const sections = cards.locator("section");
        await expect(sections).toHaveCount(2);

        // Check footers
        const footers = cards.locator("footer");
        await expect(footers).toHaveCount(2);
    });

    test("should display login card with form", async ({ page }) => {
        const cardSection = page.locator("#card");
        const preview = cardSection.locator('[data-name="preview"]');

        // Check login form elements
        await expect(preview.locator("input[type='email']")).toBeVisible();
        await expect(preview.locator("input[type='password']")).toBeVisible();
        await expect(preview.locator("input[type='checkbox']")).toBeVisible();
        await expect(preview.locator("button[type='submit']").filter({ hasText: "Login" })).toBeVisible();
    });

    test("should display card with image", async ({ page }) => {
        const cardSection = page.locator("#card");
        const preview = cardSection.locator('[data-name="preview"]');

        // Check image card
        const image = preview.locator("img");
        await expect(image).toBeAttached();
        await expect(image).toHaveAttribute("alt", "A modern house with large windows and contemporary architecture");
        await expect(image).toHaveAttribute(
            "src",
            "https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=800&dpr=2&q=80&w=1080&q=75",
        );
    });
});
