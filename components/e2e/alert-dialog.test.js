import { expect, test } from "@playwright/test";

test.describe("Alert Dialog", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.waitForSelector("#alert-dialog", { state: "visible" });
    });

    test("should display alert dialog structure", async ({ page }) => {
        const alertDialogSection = page.locator("#alert-dialog");

        // Check trigger button
        const trigger = alertDialogSection.locator("button").filter({ hasText: "Open dialog" });
        await expect(trigger).toBeVisible();

        // Check dialog exists
        const dialog = alertDialogSection.locator("dialog");
        await expect(dialog).toBeAttached();

        // Check dialog content
        await expect(dialog.locator("h2").filter({ hasText: "Are you sure?" })).toBeAttached();
        await expect(dialog.locator("p")).toContainText("This action cannot be undone");

        // Check footer buttons
        await expect(dialog.locator("button").filter({ hasText: "Cancel" })).toBeAttached();
        await expect(dialog.locator("button").filter({ hasText: "Continue" })).toBeAttached();
    });

    test("should open alert dialog via trigger button click", async ({ page }) => {
        const alertDialogSection = page.locator("#alert-dialog");

        // Click the trigger button
        const trigger = alertDialogSection.locator("button").filter({ hasText: "Open dialog" });
        await trigger.click();

        // Wait for reactive update
        await page.waitForTimeout(200);

        // Verify dialog is open
        const dialog = alertDialogSection.locator("dialog");
        await expect(dialog).toHaveAttribute("open", "");

        // Verify ARIA attributes
        await expect(dialog).toHaveAttribute("role", "alertdialog");
        // Verify aria-modal attribute (rendered as aria-modal due to JSX transformer bug)
        await expect(dialog).toHaveAttribute("aria-modal", "true");
    });

    test("should close alert dialog via cancel button", async ({ page }) => {
        const alertDialogSection = page.locator("#alert-dialog");

        // Open the dialog
        const trigger = alertDialogSection.locator("button").filter({ hasText: "Open dialog" });
        await trigger.click();
        await page.waitForTimeout(200);

        // Verify dialog is open
        const dialog = alertDialogSection.locator("dialog");
        await expect(dialog).toHaveAttribute("open", "");

        // Click the cancel button
        const cancelButton = dialog.locator("button").filter({ hasText: "Cancel" });
        await cancelButton.click();
        await page.waitForTimeout(200);

        // Verify dialog is closed
        await expect(dialog).not.toHaveAttribute("open");
    });

    test("should keep alert dialog open when continue button is clicked", async ({ page }) => {
        const alertDialogSection = page.locator("#alert-dialog");

        // Open the dialog
        const trigger = alertDialogSection.locator("button").filter({ hasText: "Open dialog" });
        await trigger.click();
        await page.waitForTimeout(200);

        // Verify dialog is open
        const dialog = alertDialogSection.locator("dialog");
        await expect(dialog).toHaveAttribute("open", "");

        // Click the continue button (no onclick handler, so should stay open)
        const continueButton = dialog.locator("button").filter({ hasText: "Continue" });
        await continueButton.click();
        await page.waitForTimeout(200);

        // Verify dialog is still open (since continue button doesn't close it)
        await expect(dialog).toHaveAttribute("open", "");
    });

    test("should have correct ARIA roles and accessibility attributes", async ({ page }) => {
        const alertDialogSection = page.locator("#alert-dialog");

        // Open the dialog
        const trigger = alertDialogSection.locator("button").filter({ hasText: "Open dialog" });
        await trigger.click();
        await page.waitForTimeout(200);

        const dialog = alertDialogSection.locator("dialog");

        // Check ARIA attributes
        await expect(dialog).toHaveAttribute("role", "alertdialog");
        // Verify aria-modal attribute (rendered as aria-modal due to JSX transformer bug)
        await expect(dialog).toHaveAttribute("aria-modal", "true");

        // Check semantic structure
        await expect(dialog.locator("h2")).toHaveText("Are you sure?");
        await expect(dialog.locator("p")).toContainText("This action cannot be undone");
    });
});
