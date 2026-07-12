import { expect, test } from "@playwright/test";

test.describe("Accordion", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/components/accordion");
        await page.waitForSelector("main", { state: "visible" });
    });

    test("should display accordion sections", async ({ page }) => {
        const accordionSection = page.locator("main");

        // Check that details elements exist (accordion items)
        const details = accordionSection.locator("details");
        await expect(details).toHaveCount(5);

        // Check that summary elements exist (accordion headers)
        const summaries = accordionSection.locator("summary");
        await expect(summaries).toHaveCount(5);

        // Check that multiple-type accordion exists
        const multipleAccordion = accordionSection.locator("el-accordion[type='multiple']");
        await expect(multipleAccordion).toHaveCount(1);
    });

    test("should have correct header text", async ({ page }) => {
        const accordionSection = page.locator("main");

        // Check the three accordion headers
        await expect(accordionSection.locator("h2").filter({ hasText: "Is it accessible?" })).toBeVisible();
        await expect(accordionSection.locator("h2").filter({ hasText: "Is it styled?" })).toBeVisible();
        await expect(accordionSection.locator("h2").filter({ hasText: "Is it animated?" })).toBeVisible();
    });

    test("should toggle accordion content", async ({ page }) => {
        const accordionSection = page.locator("main");
        const firstDetails = accordionSection.locator("details").first();
        const firstSummary = firstDetails.locator("summary");

        // Initially, content should be hidden (details closed by default)
        const firstContent = firstDetails.locator("section");
        await expect(firstContent).not.toBeVisible();

        // Click to open
        await firstSummary.click();
        await page.waitForTimeout(200);
        await expect(firstContent).toBeVisible();

        // Click to close
        await firstSummary.click();
        await page.waitForTimeout(200);
        await expect(firstContent).not.toBeVisible();
    });

    test("should close other items when opening single-type accordion", async ({ page }) => {
        const accordionSection = page.locator("main");

        // Get all details elements
        const details = accordionSection.locator("details");
        const firstDetails = details.first();
        const secondDetails = details.nth(1);
        const thirdDetails = details.nth(2);

        const firstSummary = firstDetails.locator("summary");
        const secondSummary = secondDetails.locator("summary");

        // Initially all should be closed
        await expect(firstDetails.locator("section")).not.toBeVisible();
        await expect(secondDetails.locator("section")).not.toBeVisible();
        await expect(thirdDetails.locator("section")).not.toBeVisible();

        // Open first item
        await firstSummary.click();
        await page.waitForTimeout(200);
        await expect(firstDetails.locator("section")).toBeVisible();
        await expect(secondDetails.locator("section")).not.toBeVisible();
        await expect(thirdDetails.locator("section")).not.toBeVisible();

        // Open second item - should close first item
        await secondSummary.click();
        await page.waitForTimeout(200);
        await expect(firstDetails.locator("section")).not.toBeVisible();
        await expect(secondDetails.locator("section")).toBeVisible();
        await expect(thirdDetails.locator("section")).not.toBeVisible();
    });

    test("should allow multiple items open in multiple-type accordion", async ({ page }) => {
        const accordionSection = page.locator("main");

        // Check if there's a multiple-type accordion in the section
        const multipleAccordion = accordionSection.locator("[type='multiple']");

        if ((await multipleAccordion.count()) === 0) {
            test.skip("No multiple-type accordion found in section");
        }

        // Get all details elements
        const details = multipleAccordion.locator("details");
        const firstDetails = details.first();
        const secondDetails = details.nth(1);

        const firstSummary = firstDetails.locator("summary");
        const secondSummary = secondDetails.locator("summary");

        // Initially all should be closed
        await expect(firstDetails.locator("section")).not.toBeVisible();
        await expect(secondDetails.locator("section")).not.toBeVisible();

        // Open first item
        await firstSummary.click();
        await page.waitForTimeout(200);
        await expect(firstDetails.locator("section")).toBeVisible();

        // Open second item - should remain open in multiple mode
        await secondSummary.click();
        await page.waitForTimeout(200);
        await expect(firstDetails.locator("section")).toBeVisible();
        await expect(secondDetails.locator("section")).toBeVisible();
    });

    test("should hide chevron icon when hideIcon is true", async ({ page }) => {
        const accordionSection = page.locator("main");

        // Look for accordion headers without chevron icons
        // This assumes there's an accordion item with hideIcon={true} in the section
        const headersWithoutIcon = accordionSection.locator("summary:not(:has(svg))");

        // If such headers exist, they should not have chevron icons
        if ((await headersWithoutIcon.count()) > 0) {
            await expect(headersWithoutIcon.first()).toBeVisible();
        } else {
            // Skip if no hideIcon example is present
            test.skip();
        }
    });

    test("should maintain only one item open in single-type accordion", async ({ page }) => {
        const accordionSection = page.locator("main");
        // Only target the single-type accordion (first 3 items)
        const details = accordionSection.locator("details");
        const singleCount = await details.count();

        // Open all items by clicking each summary
        for (let i = 0; i < Math.min(singleCount, 3); i++) {
            const summary = details.nth(i).locator("summary");
            await summary.click();
            await page.waitForTimeout(200);

            // Check that only this item is open (scoped to single accordion items)
            for (let j = 0; j < Math.min(singleCount, 3); j++) {
                const content = details.nth(j).locator("section");
                if (i === j) {
                    await expect(content).toBeVisible();
                } else {
                    await expect(content).not.toBeVisible();
                }
            }
        }
    });

    test("should display correct content for each section", async ({ page }) => {
        const accordionSection = page.locator("main");

        // Check first section content
        const firstSection = accordionSection.locator("details").first().locator("section");
        await expect(firstSection).toHaveText("Yes. It adheres to the WAI-ARIA design pattern.");

        // Check second section content
        const secondSection = accordionSection.locator("details").nth(1).locator("section");
        await expect(secondSection).toHaveText("Yes. It comes styled to match the rest of the components.");

        // Check third section content
        const thirdSection = accordionSection.locator("details").nth(2).locator("section");
        await expect(thirdSection).toHaveText("Yes. It's animated by default.");
    });

    test("should show chevron icons", async ({ page }) => {
        const accordionSection = page.locator("main");

        // Check that chevron icons exist (3 from single accordion + 1 from multiple accordion's first item)
        const chevrons = accordionSection.locator("svg use[href='#icon-chevron-down']");
        await expect(chevrons).toHaveCount(4);
    });
});
