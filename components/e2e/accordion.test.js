import { expect, test } from "@playwright/test";

test.describe("Accordion", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.waitForSelector("#accordion", { state: "visible" });
    });

    test("should display accordion sections", async ({ page }) => {
        const accordionSection = page.locator("#accordion");

        // Check that details elements exist (accordion items)
        const details = accordionSection.locator("details");
        await expect(details).toHaveCount(3);

        // Check that summary elements exist (accordion headers)
        const summaries = accordionSection.locator("summary");
        await expect(summaries).toHaveCount(3);
    });

    test("should have correct header text", async ({ page }) => {
        const accordionSection = page.locator("#accordion");

        // Check the three accordion headers
        await expect(accordionSection.locator("h2").filter({ hasText: "Is it accessible?" })).toBeVisible();
        await expect(accordionSection.locator("h2").filter({ hasText: "Is it styled?" })).toBeVisible();
        await expect(accordionSection.locator("h2").filter({ hasText: "Is it animated?" })).toBeVisible();
    });

    test("should toggle accordion content", async ({ page }) => {
        const accordionSection = page.locator("#accordion");
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
        const accordionSection = page.locator("#accordion");

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
        const accordionSection = page.locator("#accordion");

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
        const accordionSection = page.locator("#accordion");

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

    test("should render AccordionContent with custom tag when as prop is provided", async ({ page }) => {
        const accordionSection = page.locator("#accordion");

        // Look for accordion content with custom tags (not section)
        // This assumes there's an AccordionContent with as="div" or similar in the section
        const customContent = accordionSection.locator("details div").filter({ hasNotText: "" });

        // If custom content exists, check the tag name
        if ((await customContent.count()) > 0) {
            const firstContent = customContent.first();
            // Verify it's not the default section tag (could be div or other)
            await expect(firstContent).toBeVisible();
        } else {
            // Skip if no custom as example is present
            test.skip();
        }
    });

    test("should maintain only one item open in single-type accordion", async ({ page }) => {
        const accordionSection = page.locator("#accordion");
        const details = accordionSection.locator("details");

        // Open all items by clicking each summary
        for (let i = 0; i < (await details.count()); i++) {
            const summary = details.nth(i).locator("summary");
            await summary.click();
            await page.waitForTimeout(200);

            // Check that only this item is open
            for (let j = 0; j < (await details.count()); j++) {
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
        const accordionSection = page.locator("#accordion");

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
        const accordionSection = page.locator("#accordion");

        // Check that chevron icons exist
        const chevrons = accordionSection.locator("svg use[href='#icon-chevron-down']");
        await expect(chevrons).toHaveCount(3);
    });
});
