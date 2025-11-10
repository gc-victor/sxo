import { expect, test } from "@playwright/test";

test.describe("Toast", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.waitForSelector("#toast", { state: "visible" });
    });

    test("should display toast trigger buttons", async ({ page }) => {
        const toastSection = page.locator("#toast");

        // Check buttons exist
        await expect(toastSection.locator("button").filter({ hasText: "Top-Right" })).toBeVisible();
        await expect(toastSection.locator("button").filter({ hasText: "Bottom-Center" })).toBeVisible();
        await expect(toastSection.locator("button").filter({ hasText: "Bottom-Left" })).toBeVisible();
        await expect(toastSection.locator("button").filter({ hasText: "Bottom-Right" })).toBeVisible();
    });

    test("should display toaster containers", async ({ page }) => {
        const toastSection = page.locator("#toast");

        // Check toaster elements exist
        const toasters = toastSection.locator(".toaster");
        await expect(toasters).toHaveCount(4); // top-right, bottom-center, bottom-left, bottom-right

        // Check toast templates exist
        const toastTemplates = toastSection.locator("el-toast template");
        await expect(toastTemplates).toHaveCount(4); // top-right, bottom-center, bottom-left, bottom-right

        // Wait for reactive components to initialize
        await page.waitForTimeout(1000);
    });

    test("should show success toast with correct content and position", async ({ page }) => {
        await page.evaluate(() => {
            document.dispatchEvent(
                new CustomEvent("el-toast:top-right", { detail: { title: "Saved", description: "Your settings have been saved." } }),
            );
        });

        // Wait for toast to appear with auto-wait
        const toast = page.locator('.toast[data-category="top-right"]');
        await expect(toast).toBeVisible({ timeout: 1000 });

        // Check content
        await expect(toast.locator(".toast-title")).toHaveText("Saved");
        await expect(toast.locator(".toast-description")).toHaveText("Your settings have been saved.");

        // Position is set by the component (top-right)
    });

    test("should show info toast with correct content and position", async ({ page }) => {
        await page.evaluate(() => {
            document.dispatchEvent(
                new CustomEvent("el-toast:bottom-center", {
                    detail: { title: "New Feature", description: "Check out the latest updates in your dashboard." },
                }),
            );
        });
        await page.waitForTimeout(100);

        // Wait for toast to appear in the center-aligned toaster
        const toasterCenter = page.locator('.toaster[data-align="center"]');
        const toast = toasterCenter.locator('.toast[data-category="bottom-center"]');
        await expect(toast).toBeVisible();

        // Check content
        await expect(toast.locator(".toast-title")).toHaveText("New Feature");
        await expect(toast.locator(".toast-description")).toHaveText("Check out the latest updates in your dashboard.");
    });

    test("should show warning toast with correct content and position", async ({ page }) => {
        await page.evaluate(() => {
            document.dispatchEvent(
                new CustomEvent("el-toast:bottom-right", { detail: { title: "Heads up", description: "You have unsaved changes." } }),
            );
        });
        await page.waitForTimeout(1000);

        // Wait for toast to appear
        const toast = page.locator('.toast[data-category="bottom-right"]');
        await expect(toast).toBeVisible();

        // Check content
        await expect(toast.locator(".toast-title")).toHaveText("Heads up");
        await expect(toast.locator(".toast-description")).toHaveText("You have unsaved changes.");

        // Position is set by the component (bottom-right)
    });

    test("should show error toast with correct content and position", async ({ page }) => {
        await page.evaluate(() => {
            document.dispatchEvent(
                new CustomEvent("el-toast:bottom-left", {
                    detail: { title: "Error", description: "Failed to save your changes. Please try again." },
                }),
            );
        });
        await page.waitForTimeout(100);

        // Wait for toast to appear in the start-aligned toaster
        const toasterStart = page.locator('.toaster[data-align="start"]');
        const toast = toasterStart.locator('.toast[data-category="bottom-left"]');
        await expect(toast).toBeVisible();

        // Check content
        await expect(toast.locator(".toast-title")).toHaveText("Error");
        await expect(toast.locator(".toast-description")).toHaveText("Failed to save your changes. Please try again.");
    });

    test("should auto-dismiss toasts after duration", async ({ page }) => {
        await page.evaluate(() => {
            document.dispatchEvent(
                new CustomEvent("el-toast:top-right", { detail: { title: "Saved", description: "Your settings have been saved." } }),
            );
        });
        await page.waitForTimeout(1000);

        const toast = page.locator('.toast[data-category="top-right"]');
        await expect(toast).toBeVisible();

        // Wait for auto-dismiss (default 3000ms)
        await page.waitForTimeout(3500);
        await expect(toast).not.toBeVisible();
    });

    test("should dismiss toast on click", async ({ page }) => {
        await page.evaluate(() => {
            document.dispatchEvent(
                new CustomEvent("el-toast:top-right", { detail: { title: "Clickable", description: "Click to dismiss." } }),
            );
        });
        await page.waitForTimeout(100);

        const toast = page.locator('.toast[data-category="top-right"]');
        await expect(toast).toBeVisible();

        // Click on the toast to dismiss
        await toast.click();
        await expect(toast).not.toBeVisible();
    });

    test("should have correct ARIA attributes for different categories", async ({ page }) => {
        // Test top-right toast (status role, polite live region)
        await page.evaluate(() => {
            document.dispatchEvent(
                new CustomEvent("el-toast:top-right", { detail: { title: "Success", description: "Operation completed." } }),
            );
        });
        await page.waitForTimeout(100);

        const successToast = page.locator('.toast[data-category="top-right"]');
        await expect(successToast).toHaveAttribute("role", "status");
        await expect(successToast).toHaveAttribute("aria-live", "polite");
        await expect(successToast).toHaveAttribute("aria-atomic", "true");

        // Test bottom-left toast (alert role, assertive live region)
        await page.evaluate(() => {
            document.dispatchEvent(
                new CustomEvent("el-toast:bottom-left", { detail: { title: "Error", description: "Something went wrong." } }),
            );
        });
        await page.waitForTimeout(100);

        const errorToast = page.locator('.toast[data-category="bottom-left"]');
        await expect(errorToast).toHaveAttribute("role", "alert");
        await expect(errorToast).toHaveAttribute("aria-live", "assertive");
        await expect(errorToast).toHaveAttribute("aria-atomic", "true");
    });

    test("should handle multiple toasts simultaneously", async ({ page }) => {
        // Show multiple toasts
        await page.evaluate(() => {
            document.dispatchEvent(new CustomEvent("el-toast:top-right", { detail: { title: "First", description: "First toast." } }));
            document.dispatchEvent(
                new CustomEvent("el-toast:bottom-center", { detail: { title: "Second", description: "Second toast." } }),
            );
        });
        await page.waitForTimeout(100);

        // Check both toasts are visible
        const successToast = page.locator('.toast[data-category="top-right"]');
        const infoToast = page.locator('.toast[data-category="bottom-center"]');

        await expect(successToast).toBeVisible();
        await expect(infoToast).toBeVisible();

        // Check they have different content
        await expect(successToast.locator(".toast-title")).toHaveText("First");
        await expect(infoToast.locator(".toast-title")).toHaveText("Second");
    });

    test("should position toasts correctly", async ({ page }) => {
        // Test end position (default)
        await page.evaluate(() => {
            document.dispatchEvent(new CustomEvent("el-toast:top-right", { detail: { title: "End", description: "End positioned." } }));
        });
        await page.waitForTimeout(100);

        const endToaster = page.locator(".toaster:not([data-align])");
        const endToast = endToaster.locator('.toast[data-category="top-right"]');
        await expect(endToast).toBeVisible();

        // Test center position
        await page.evaluate(() => {
            document.dispatchEvent(
                new CustomEvent("el-toast:bottom-center", { detail: { title: "Center", description: "Center positioned." } }),
            );
        });
        await page.waitForTimeout(100);

        const centerToaster = page.locator('.toaster[data-align="center"]');
        const centerToast = centerToaster.locator('.toast[data-category="bottom-center"]');
        await expect(centerToast).toBeVisible();

        // Test start position
        await page.evaluate(() => {
            document.dispatchEvent(
                new CustomEvent("el-toast:bottom-left", { detail: { title: "Start", description: "Start positioned." } }),
            );
        });
        await page.waitForTimeout(100);

        const startToaster = page.locator('.toaster[data-align="start"]');
        const startToast = startToaster.locator('.toast[data-category="bottom-left"]');
        await expect(startToast).toBeVisible();
    });

    test("should populate dynamic content correctly", async ({ page }) => {
        await page.evaluate(() => {
            document.dispatchEvent(
                new CustomEvent("el-toast:top-right", {
                    detail: {
                        title: "Dynamic Title",
                        description: "This is a dynamic description that should be populated correctly.",
                    },
                }),
            );
        });
        await page.waitForTimeout(100);

        const toast = page.locator('.toast[data-category="top-right"]');
        await expect(toast.locator(".toast-title")).toHaveText("Dynamic Title");
        await expect(toast.locator(".toast-description")).toHaveText("This is a dynamic description that should be populated correctly.");
    });
});
