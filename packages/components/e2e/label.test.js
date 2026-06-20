import { expect, test } from "@playwright/test";

test.describe("Label", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.waitForSelector("#label", { state: "visible" });
    });

    test("should display label components", async ({ page }) => {
        const labelSection = page.locator("#label");
        const preview = labelSection.locator('[data-name="preview"]');

        // Check label elements
        const labels = preview.locator("label");
        await expect(labels).toHaveCount(4); // 2 stacked + 2 inline

        // Check stacked labels (grid layout)
        const stackedLabels = preview.locator("label.grid");
        await expect(stackedLabels).toHaveCount(2);

        // Check inline label (flex items-center)
        const inlineLabel = preview.locator("label.items-center");
        await expect(inlineLabel).toBeVisible();

        // Check align-top label (flex items-start)
        const alignTopLabel = preview.locator("label.items-start");
        await expect(alignTopLabel).toBeVisible();

        // Check inputs in stacked labels
        await expect(preview.locator("input[type='text']")).toBeVisible();
        await expect(preview.locator("textarea")).toHaveCount(2);

        // Check checkbox in inline label
        await expect(preview.locator("input[type='checkbox']")).toBeVisible();
    });

    test("should display label text content", async ({ page }) => {
        const labelSection = page.locator("#label");
        const preview = labelSection.locator('[data-name="preview"]');

        // Check label texts
        await expect(preview.locator("span").filter({ hasText: "Username" })).toBeVisible();
        await expect(preview.getByText("Type your message and press enter to send.")).toBeVisible();
        await expect(preview.locator("span").filter({ hasText: "Accept terms and conditions" })).toBeVisible();
        await expect(preview.locator("span").filter({ hasText: "Comment" })).toBeVisible();
    });
});
