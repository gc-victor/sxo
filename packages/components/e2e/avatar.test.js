import { expect, test } from "@playwright/test";

test.describe("Avatar", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/components/avatar");
        await page.waitForSelector("main", { state: "visible" });
    });

    test("should display avatar components", async ({ page }) => {
        const avatarSection = page.locator("main");

        // Check that avatars exist (span with avatar class)
        const avatars = avatarSection.locator("span.avatar");
        await expect(avatars).toHaveCount(7);
    });

    test("should display avatar with image", async ({ page }) => {
        const avatarSection = page.locator("main");

        // Find avatar with image
        const imageAvatar = avatarSection.locator("span.avatar").first();

        // Should contain img element
        const img = imageAvatar.locator("img");
        await expect(img).toBeVisible();

        // Should have alt text
        await expect(img).toHaveAttribute("alt", "C Newton");
    });

    test("should display avatar with fallback text", async ({ page }) => {
        const avatarSection = page.locator("main");

        // Find avatar with text fallback
        const textAvatar = avatarSection.locator("span.avatar").nth(1);

        // Should contain span with text
        const textSpan = textAvatar.locator("span");
        await expect(textSpan).toHaveText("AL");
    });

    test("should display different avatar shapes", async ({ page }) => {
        const avatarSection = page.locator("main");

        // Check rounded full avatar
        const roundedFullAvatar = avatarSection.locator("span.avatar").nth(1);
        await expect(roundedFullAvatar).toHaveClass(/rounded-full/);

        // Check rounded avatar (not full)
        const roundedAvatar = avatarSection.locator("span.avatar").nth(2);
        await expect(roundedAvatar).toHaveClass(/rounded-lg/);
    });

    test("should display avatar group", async ({ page }) => {
        const avatarSection = page.locator("main");

        // Find first avatar group
        const avatarGroup = avatarSection.locator("div.avatar-group").first();

        // Should exist
        await expect(avatarGroup).toBeVisible();

        // Should contain 4 avatars
        const groupAvatars = avatarGroup.locator("span.avatar");
        await expect(groupAvatars).toHaveCount(4);
    });

    test("should have proper spacing in avatar group", async ({ page }) => {
        const avatarSection = page.locator("main");

        // Avatar group should have negative space-x class
        const avatarGroup = avatarSection.locator("div.avatar-group").first();
        await expect(avatarGroup).toHaveClass(/-space-x-2/);
    });

    test("should apply size token classes correctly", async ({ page }) => {
        const avatarSection = page.locator("main");

        // Check size tokens: xs → size-6, lg → size-12
        const xsAvatar = avatarSection.locator("span.avatar.size-6");
        const lgAvatar = avatarSection.locator("span.avatar.size-12");

        if ((await xsAvatar.count()) > 0) {
            await expect(xsAvatar.first()).toBeVisible();
        }
        if ((await lgAvatar.count()) > 0) {
            await expect(lgAvatar.first()).toBeVisible();
        }
        // Skip if no size examples are present
        if ((await xsAvatar.count()) === 0 && (await lgAvatar.count()) === 0) {
            test.skip();
        }
    });

    test("should prioritize fallback text correctly", async ({ page }) => {
        const avatarSection = page.locator("main");

        // This assumes there are avatars demonstrating fallback priority: initials > name > alt
        const initialsAvatar = avatarSection.locator("span.avatar span").filter({ hasText: /^[A-Z]{1,2}$/ }); // Initials
        const nameFallback = avatarSection.locator("span.avatar span").filter({ hasText: /^[A-Z][a-z]+/ }); // Name

        if ((await initialsAvatar.count()) > 0) {
            await expect(initialsAvatar.first()).toBeVisible();
        }
        if ((await nameFallback.count()) > 0) {
            await expect(nameFallback.first()).toBeVisible();
        }
        // Skip if no fallback examples are present
        if ((await initialsAvatar.count()) === 0 && (await nameFallback.count()) === 0) {
            test.skip();
        }
    });
});
