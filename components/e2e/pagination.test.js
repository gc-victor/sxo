import { expect, test } from "@playwright/test";

test.describe("Pagination", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.waitForSelector("#pagination", { state: "visible" });
    });

    test("should display pagination controls", async ({ page }) => {
        const paginationSection = page.locator("#pagination");
        const preview = paginationSection.locator('[data-name="preview"]');

        // Check pagination wrapper
        const pagination = preview.locator(".pagination");
        await expect(pagination).toBeVisible();

        // Check navigation buttons exist
        const buttons = preview.locator("button");
        await expect(buttons).toHaveCount(14); // prev, pages, ellipsis, next, last

        // Check current page indicator
        const currentPage = preview.locator("button[aria-current='page']");
        await expect(currentPage).toHaveText("6");

        // Check last button
        await expect(preview.locator("button").filter({ hasText: "Last" })).toBeVisible();

        // Check prev/next
        await expect(preview.locator("button").filter({ hasText: "Prev" })).toBeVisible();
        await expect(preview.locator("button").filter({ hasText: "Next" })).toBeVisible();
    });

    test("should display page numbers", async ({ page }) => {
        const paginationSection = page.locator("#pagination");
        const preview = paginationSection.locator('[data-name="preview"]');

        // Check page number buttons exist
        const pageButtons = preview.locator("button[aria-label^='Page']");
        await expect(pageButtons).toHaveCount(10); // page numbers

        // Check for specific pages around current
        await expect(preview.locator("button").filter({ hasText: "4" })).toBeVisible();
        await expect(preview.locator("button").filter({ hasText: "5" })).toBeVisible();
        await expect(preview.locator("button").filter({ hasText: "6" })).toHaveAttribute("aria-current", "page");
        await expect(preview.locator("button").filter({ hasText: "7" })).toBeVisible();
        await expect(preview.locator("button").filter({ hasText: "8" })).toBeVisible();
    });
});
