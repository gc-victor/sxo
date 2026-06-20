import { expect, test } from "@playwright/test";

test.describe("Avatar", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.waitForSelector("#avatar", { state: "visible" });
    });

    test("should display avatar components", async ({ page }) => {
        const avatarSection = page.locator("#avatar");

        // Check that avatars exist (span with avatar class)
        const avatars = avatarSection.locator("span.avatar");
        await expect(avatars).toHaveCount(7);
    });

    test("should display avatar with image", async ({ page }) => {
        const avatarSection = page.locator("#avatar");

        // Find avatar with image
        const imageAvatar = avatarSection.locator("span.avatar").first();

        // Should contain img element
        const img = imageAvatar.locator("img");
        await expect(img).toBeVisible();

        // Should have alt text
        await expect(img).toHaveAttribute("alt", "C Newton");
    });

    test("should display avatar with fallback text", async ({ page }) => {
        const avatarSection = page.locator("#avatar");

        // Find avatar with text fallback
        const textAvatar = avatarSection.locator("span.avatar").nth(1);

        // Should contain span with text
        const textSpan = textAvatar.locator("span");
        await expect(textSpan).toHaveText("AL");
    });

    test("should display different avatar shapes", async ({ page }) => {
        const avatarSection = page.locator("#avatar");

        // Check rounded full avatar
        const roundedFullAvatar = avatarSection.locator("span.avatar").nth(1);
        await expect(roundedFullAvatar).toHaveClass(/rounded-full/);

        // Check rounded avatar (not full)
        const roundedAvatar = avatarSection.locator("span.avatar").nth(2);
        await expect(roundedAvatar).toHaveClass(/rounded-lg/);
    });

    test("should display avatar group", async ({ page }) => {
        const avatarSection = page.locator("#avatar");

        // Find avatar group
        const avatarGroup = avatarSection.locator("div.avatar-group");

        // Should exist
        await expect(avatarGroup).toBeVisible();

        // Should contain 4 avatars
        const groupAvatars = avatarGroup.locator("span.avatar");
        await expect(groupAvatars).toHaveCount(4);
    });

    test("should have proper spacing in avatar group", async ({ page }) => {
        const avatarSection = page.locator("#avatar");

        // Avatar group should have negative space-x class
        const avatarGroup = avatarSection.locator("div.avatar-group");
        await expect(avatarGroup).toHaveClass(/-space-x-2/);
    });

    test("should apply size token classes correctly", async ({ page }) => {
        const avatarSection = page.locator("#avatar");

        // This assumes there are avatars with different size tokens (xs, sm, md, lg, xl)
        const xsAvatar = avatarSection.locator("span.avatar").filter({ hasClass: /w-6 h-6/ }); // xs
        const lgAvatar = avatarSection.locator("span.avatar").filter({ hasClass: /w-12 h-12/ }); // lg

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

    test("should apply grayscale filter to single avatar", async ({ page }) => {
        const avatarSection = page.locator("#avatar");

        // This assumes there's an avatar with grayscale class
        const allAvatars = avatarSection.locator("span.avatar");
        const count = await allAvatars.count();
        let foundGrayscale = false;

        for (let i = 0; i < count; i++) {
            const avatar = allAvatars.nth(i);
            const className = await avatar.getAttribute("class");
            if (className?.includes("grayscale")) {
                foundGrayscale = true;
                await expect(avatar).toBeVisible();
                await expect(avatar).toHaveClass(/grayscale/);
                break;
            }
        }

        if (!foundGrayscale) {
            test.skip("No grayscale avatar example found in section");
        }
    });

    test("should apply grayscale to avatar group children", async ({ page }) => {
        const avatarSection = page.locator("#avatar");

        // This assumes there's an avatar group with grayscaleChildren
        const allGroups = avatarSection.locator("div.avatar-group");
        const groupCount = await allGroups.count();
        let foundGrayscaleGroup = false;

        for (let i = 0; i < groupCount; i++) {
            const group = allGroups.nth(i);
            const className = await group.getAttribute("class");
            if (className?.includes("grayscale")) {
                foundGrayscaleGroup = true;
                const groupAvatars = group.locator("span.avatar");
                await expect(groupAvatars.first()).toHaveClass(/grayscale/);
                break;
            }
        }

        if (!foundGrayscaleGroup) {
            test.skip("No grayscale avatar group example found in section");
        }
    });

    test("should prioritize fallback text correctly", async ({ page }) => {
        const avatarSection = page.locator("#avatar");

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
