/**
 * Middleware for documentation pages.
 *
 * Provides:
 * - Redirect `/` → `/installation` (302)
 * - Serve Markdown versions of documentation pages at `{route}.md`
 *
 * @param {Request} request - The incoming request
 * @param {object} _env - Environment object (unused)
 * @param {object} context - Middleware context with render function
 * @param {Function} context.render - Render a page module by JSX path
 * @returns {Response|undefined} Response or undefined to pass through
 */
export default async function middleware(request, _env, context) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Redirect root to installation page
    if (pathname === "/" || pathname === "") {
        return new Response(null, {
            status: 302,
            headers: { location: "/installation" },
        });
    }

    // Only handle .md requests beyond this point
    if (!pathname.endsWith(".md")) {
        return undefined;
    }

    // Derive the JSX source path from the URL
    // e.g., /components/button.md -> src/pages/components/button/index.jsx
    const basePath = pathname.replace(/\.md$/, "");
    if (!basePath || basePath === "/index") {
        return undefined;
    }

    const jsxPath = `src/pages${basePath}/index.jsx`;

    // Lazy-import turndown (CJS-only, use createRequire)
    const { createRequire } = await import("node:module");
    const require = createRequire(import.meta.url);
    const TurndownService = require("turndown");

    const turndownService = new TurndownService({
        headingStyle: "atx",
        codeBlockStyle: "fenced",
        emDelimiter: "*",
    });

    let fullHtml;
    try {
        fullHtml = await context.render(jsxPath);
    } catch {
        // Module not found — pass through, let SXO handle 404
        return undefined;
    }

    // Module loader may return error stub instead of throwing
    if (typeof fullHtml !== "string" || /^Error loading/i.test(fullHtml)) {
        return undefined;
    }

    // Verify the render produced actual HTML content (not an error message)
    if (/<html[\s>]/i.test(fullHtml)) {
        // Extract article content (strip header/sidebar/footer boilerplate)
        const contentMatch = fullHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
        const contentHtml = contentMatch ? contentMatch[1] : fullHtml;

        const markdown = turndownService.turndown(contentHtml);

        return new Response(markdown, {
            headers: { "content-type": "text/markdown; charset=utf-8" },
        });
    }

    // Not valid HTML — pass through
    return undefined;
}
