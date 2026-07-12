import { expect, test } from "@playwright/test";

test.describe("Scroll Area", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/components/scroll-area");
        await page.waitForSelector("main", { state: "visible" });
    });

    test("should display scroll area section", async ({ page }) => {
        const section = page.locator("main");

        // Check heading
        await expect(section.locator("h2").filter({ hasText: "Scroll Area" })).toBeVisible();

        // Check description
        await expect(section.locator("p.text-balance")).toBeVisible();
        await expect(section.locator("p.text-balance")).toContainText("Custom scroll-area styling");

        // Check scrollable container exists
        const scrollBox = section.locator(".overflow-y-auto");
        await expect(scrollBox).toBeVisible();

        // Check multiple items inside scrollable area
        const items = scrollBox.locator("p.text-muted-foreground");
        await expect(items).toHaveCount(10);
    });

    test("should display CSS code example", async ({ page }) => {
        const section = page.locator("main");

        // Check CSS code block is present
        const codeBlock = section.locator(".css-highlight");
        await expect(codeBlock).toBeAttached();

        // Check code contains scroll-area CSS properties
        const code = section.locator("#scroll-area-code");
        await expect(code).toContainText("--scroll-area-thumb");
        await expect(code).toContainText("--scroll-area-track");
    });

    test("should display usage section", async ({ page }) => {
        const section = page.locator("main");

        // Check usage heading
        await expect(section.locator("h3").filter({ hasText: "Usage" })).toBeVisible();

        // Check CSS property documentation
        const list = section.locator("ul").last();
        await expect(list.locator("code").filter({ hasText: "--scroll-area-thumb" })).toBeAttached();
        await expect(list.locator("code").filter({ hasText: "--scroll-area-track" })).toBeAttached();
        await expect(list.locator("code").filter({ hasText: "--scroll-area-radius" })).toBeAttached();
    });
});
