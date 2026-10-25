import { expect, test } from "@playwright/test";

test.describe("Documentation middleware", () => {
    test("redirects the root request to installation", async ({ request }) => {
        const response = await request.get("/", { maxRedirects: 0 });

        expect(response.status()).toBe(302);
        expect(response.headers().location).toBe("/installation");
    });

    test("serves Markdown for documentation pages", async ({ request }) => {
        const response = await request.get("/components/button.md");
        const markdown = await response.text();

        expect(response.status()).toBe(200);
        expect(response.headers()["content-type"]).toContain("text/markdown; charset=utf-8");
        expect(markdown).toContain("# Button");
        expect(markdown).not.toContain("Getting started");
    });
});
