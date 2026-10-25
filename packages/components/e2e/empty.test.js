import { expect, test } from "@playwright/test";

test.describe("Empty", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/components/empty");
        await page.waitForSelector("main", { state: "visible" });
    });

    test("should display empty state with title and description", async ({ page }) => {
        const section = page.locator("main");
        const preview = section.locator('[data-name="preview"]');

        // Check the empty container
        const container = preview.locator(".empty").first();
        await expect(container).toBeVisible();

        // Check title
        await expect(container.locator(".empty-title")).toBeVisible();
        await expect(container.locator(".empty-title")).toHaveText("No results found");

        // Check description
        await expect(container.locator(".empty-desc")).toBeVisible();
    });

    test("should display empty state with icon", async ({ page }) => {
        const section = page.locator("main");
        const preview = section.locator('[data-name="preview"]');

        // Check empty with icon
        const withIcon = preview.locator(".empty").nth(1);
        await expect(withIcon.locator(".empty-icon svg")).toBeVisible();
        await expect(withIcon.locator(".empty-title")).toHaveText("No messages");
    });

    test("should omit optional slots that are not provided", async ({ page }) => {
        const preview = page.locator("main [data-name='preview']");
        const withText = preview.locator(".empty").first();

        await expect(preview.locator(".empty")).toHaveCount(3);
        await expect(withText.locator(".empty-icon, .empty-action")).toHaveCount(0);
        await expect(preview.locator(".empty").nth(1).locator(".empty-action")).toHaveCount(0);
    });

    test("should display empty state with action button", async ({ page }) => {
        const section = page.locator("main");
        const preview = section.locator('[data-name="preview"]');

        // Check empty with action
        const withAction = preview.locator(".empty").nth(2);
        await expect(withAction.locator(".empty-action button")).toBeVisible();
        await expect(withAction.locator(".empty-title")).toHaveText("No data");
    });
});
