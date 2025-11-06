import { expect, test } from "@playwright/test";

test.describe("Slider", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.waitForSelector("#slider", { state: "visible" });
    });

    test("should display slider component", async ({ page }) => {
        const sliderSection = page.locator("#slider");

        // Check that slider input exists
        const slider = sliderSection.locator("input[type='range']");
        await expect(slider).toBeVisible();

        // Check attributes
        await expect(slider).toHaveAttribute("min", "0");
        await expect(slider).toHaveAttribute("max", "100");
        await expect(slider).toHaveAttribute("step", "1");
    });

    test("should have initial value", async ({ page }) => {
        const slider = page.locator("#slider input[type='range']");

        // Should have initial value of 35
        await expect(slider).toHaveValue("35");
    });

    test("should allow changing slider value", async ({ page }) => {
        const slider = page.locator("#slider input[type='range']");

        // Change to 50
        await slider.fill("50");
        await page.waitForTimeout(100);
        await expect(slider).toHaveValue("50");

        // Change to 75
        await slider.fill("75");
        await page.waitForTimeout(100);
        await expect(slider).toHaveValue("75");

        // Change to 0
        await slider.fill("0");
        await page.waitForTimeout(100);
        await expect(slider).toHaveValue("0");
    });

    test("should update CSS variable on value change", async ({ page }) => {
        const slider = page.locator("#slider input[type='range']");

        // Initial value is 35, so --slider-value should be 35%
        let style = await slider.getAttribute("style");
        expect(style).toContain("--slider-value: 35%");

        // Change to 50 (50% of 0-100 range)
        await slider.fill("50");
        await page.waitForTimeout(100);
        style = await slider.getAttribute("style");
        expect(style).toContain("--slider-value: 50%");

        // Change to 100 (100% of 0-100 range)
        await slider.fill("100");
        await page.waitForTimeout(100);
        style = await slider.getAttribute("style");
        expect(style).toContain("--slider-value: 100%");

        // Change to 0 (0% of 0-100 range)
        await slider.fill("0");
        await page.waitForTimeout(100);
        style = await slider.getAttribute("style");
        expect(style).toContain("--slider-value: 0%");
    });

    test("should handle keyboard navigation", async ({ page }) => {
        const slider = page.locator("#slider input[type='range']");

        // Focus the slider
        await slider.focus();

        // Initial value is 35
        await expect(slider).toHaveValue("35");

        // Press right arrow (should increase by step=1)
        await page.keyboard.press("ArrowRight");
        await page.waitForTimeout(100);
        await expect(slider).toHaveValue("36");

        // Press left arrow (should decrease by step=1)
        await page.keyboard.press("ArrowLeft");
        await page.waitForTimeout(100);
        await expect(slider).toHaveValue("35");

        // Press page up (should increase by larger amount)
        await page.keyboard.press("PageUp");
        await page.waitForTimeout(100);
        // Page up typically increases by 10 or so, but exact behavior may vary
        const valueAfterPageUp = await slider.inputValue();
        expect(parseInt(valueAfterPageUp, 10)).toBeGreaterThan(35);
    });

    test("should respect min and max bounds", async ({ page }) => {
        const slider = page.locator("#slider input[type='range']");

        // Try to set value below min (0) programmatically
        await page.evaluate(() => {
            const sliderEl = document.querySelector("#slider input[type='range']");
            if (sliderEl) {
                sliderEl.value = "-10";
                sliderEl.dispatchEvent(new Event("input", { bubbles: true }));
            }
        });
        await page.waitForTimeout(100);
        await expect(slider).toHaveValue("0");

        // Try to set value above max (100) programmatically
        await page.evaluate(() => {
            const sliderEl = document.querySelector("#slider input[type='range']");
            if (sliderEl) {
                sliderEl.value = "150";
                sliderEl.dispatchEvent(new Event("input", { bubbles: true }));
            }
        });
        await page.waitForTimeout(100);
        await expect(slider).toHaveValue("100");

        // Set valid value
        await slider.fill("50");
        await page.waitForTimeout(100);
        await expect(slider).toHaveValue("50");
    });

    test("should maintain reactive state synchronization", async ({ page }) => {
        const slider = page.locator("#slider input[type='range']");

        // Change value programmatically via JavaScript
        await page.evaluate(() => {
            const sliderEl = document.querySelector("#slider el-slider");
            if (sliderEl) {
                // This would trigger the reactive system if we could access it directly
                const input = sliderEl.querySelector('input[type="range"]');
                if (input) {
                    input.value = "75";
                    input.dispatchEvent(new Event("input", { bubbles: true }));
                }
            }
        });

        await page.waitForTimeout(100);
        await expect(slider).toHaveValue("75");

        // Check CSS variable is updated
        const style = await slider.getAttribute("style");
        expect(style).toContain("--slider-value: 75%");
    });
});
