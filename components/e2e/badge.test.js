import { expect, test } from "@playwright/test";

test.describe("Badge", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.waitForSelector("#badge", { state: "visible" });
    });

    test("should display all badge variants", async ({ page }) => {
        const badgeSection = page.locator("#badge");
        const preview = badgeSection.locator('[data-name="preview"]');

        // Check that badges exist
        const badges = preview.locator("span.badge");
        await expect(badges).toHaveCount(3);

        // Check specific variants
        await expect(preview.locator("span").filter({ hasText: "Primary" })).toBeVisible();
        await expect(preview.locator("span").filter({ hasText: "Secondary" })).toBeVisible();
        await expect(preview.locator("span").filter({ hasText: "Outline" })).toBeVisible();
        await expect(preview.locator("span").filter({ hasText: "Destructive" })).toBeVisible();
    });

    test("should display badge with icon", async ({ page }) => {
        const badgeSection = page.locator("#badge");
        const preview = badgeSection.locator('[data-name="preview"]');

        // Check badge with outline variant and arrow icon (the one containing SVG)
        const iconBadge = preview.locator("span.badge-outline:has(svg)");
        await expect(iconBadge).toBeVisible();

        // Should contain SVG icon
        await expect(iconBadge.locator("svg")).toBeVisible();
    });

    test("should display numeric badges", async ({ page }) => {
        const badgeSection = page.locator("#badge");
        const preview = badgeSection.locator('[data-name="preview"]');

        // Check numeric badges
        await expect(preview.locator("span").filter({ hasText: "8" })).toBeVisible();
        await expect(preview.locator("span").filter({ hasText: "99+" })).toBeVisible();
    });

    test("should have rounded full class for numeric badges", async ({ page }) => {
        const badgeSection = page.locator("#badge");
        const preview = badgeSection.locator('[data-name="preview"]');

        // Numeric badges should have rounded-full class
        const numericBadge = preview.locator("span").filter({ hasText: "8" });
        await expect(numericBadge).toHaveClass(/rounded-full/);
    });
});
