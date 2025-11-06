import { expect, test } from "@playwright/test";

test.describe("Skeleton", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.waitForSelector("#skeleton", { state: "visible" });
    });

    test("should display skeleton elements", async ({ page }) => {
        const skeletonSection = page.locator("#skeleton");

        // Check skeleton elements exist (bg-accent animate-pulse)
        const skeletons = skeletonSection.locator(".bg-accent.animate-pulse");
        await expect(skeletons).toHaveCount(6); // 3 lines + 1 circle + 2 more lines

        // Check different shapes
        const circleSkeleton = skeletonSection.locator(".rounded-full");
        await expect(circleSkeleton).toBeVisible();

        // Check different widths
        const fullWidth = skeletonSection.locator(".w-full");
        await expect(fullWidth).toBeVisible();

        const twoThirds = skeletonSection.locator(".w-2\\/3");
        await expect(twoThirds).toHaveCount(2);

        const halfWidth = skeletonSection.locator(".w-1\\/2");
        await expect(halfWidth).toBeVisible();
    });
});
