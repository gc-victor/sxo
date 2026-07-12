import { expect, test } from "@playwright/test";

test.describe("Skeleton", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/components/skeleton");
        await page.waitForSelector("main", { state: "visible" });
    });

    test("should display skeleton elements", async ({ page }) => {
        const skeletonSection = page.locator("main");

        // Check skeleton elements exist (bg-accent animate-pulse)
        const skeletons = skeletonSection.locator(".bg-accent.animate-pulse");
        await expect(skeletons).toHaveCount(6); // 3 lines + 1 circle + 2 more lines

        // Check different shapes (skeletons are aria-hidden, not visible to Playwright)
        const circleSkeleton = skeletonSection.locator(".rounded-full");
        await expect(circleSkeleton).toBeAttached();

        // Check different widths (use bg-accent to exclude article wrapper which also has w-full)
        const fullWidth = skeletonSection.locator(".bg-accent.w-full");
        await expect(fullWidth).toBeAttached();

        const twoThirds = skeletonSection.locator(".bg-accent.w-2\\/3");
        await expect(twoThirds).toHaveCount(2);

        const halfWidth = skeletonSection.locator(".bg-accent.w-1\\/2");
        await expect(halfWidth).toBeAttached();
    });
});
