import { expect, test } from "@playwright/test";

test.describe("Table", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.waitForSelector("#table", { state: "visible" });
    });

    test("should display table structure", async ({ page }) => {
        const tableSection = page.locator("#table");

        // Check that table exists
        const table = tableSection.locator("table");
        await expect(table).toBeVisible();

        // Check table caption
        const caption = table.locator("caption");
        await expect(caption).toHaveText("A list of your recent invoices.");
    });

    test("should display table headers", async ({ page }) => {
        const table = page.locator("#table table");

        // Check header cells
        const headers = table.locator("thead th");
        await expect(headers).toHaveCount(4);

        // Check header texts
        await expect(headers.nth(0)).toHaveText("Invoice");
        await expect(headers.nth(1)).toHaveText("Status");
        await expect(headers.nth(2)).toHaveText("Method");
        await expect(headers.nth(3)).toHaveText("Amount");
    });

    test("should display table rows", async ({ page }) => {
        const table = page.locator("#table table");

        // Check data rows (tbody tr)
        const rows = table.locator("tbody tr");
        await expect(rows).toHaveCount(4);

        // Check first row data
        const firstRow = rows.first();
        const cells = firstRow.locator("td");
        await expect(cells.nth(0)).toHaveText("INV001");
        await expect(cells.nth(1)).toHaveText("Paid");
        await expect(cells.nth(2)).toHaveText("Credit Card");
        await expect(cells.nth(3)).toHaveText("$250.00");
    });

    test("should display table footer", async ({ page }) => {
        const table = page.locator("#table table");

        // Check footer exists
        const footer = table.locator("tfoot");
        await expect(footer).toBeVisible();

        // Check footer has some content
        const footerText = await footer.textContent();
        expect(footerText).toContain("Total");
    });

    test("should have proper semantic structure", async ({ page }) => {
        const table = page.locator("#table table");

        // Check thead, tbody, tfoot exist
        await expect(table.locator("thead")).toBeVisible();
        await expect(table.locator("tbody")).toBeVisible();
        await expect(table.locator("tfoot")).toBeVisible();

        // Check scope attributes on headers
        const headers = table.locator("thead th");
        for (const header of await headers.all()) {
            await expect(header).toHaveAttribute("scope", "col");
        }
    });
});
