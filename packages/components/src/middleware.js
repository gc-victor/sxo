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
function getRootRedirect(pathname) {
    if (pathname !== "/" && pathname !== "") return undefined;
    return new Response(null, {
        status: 302,
        headers: { location: "/installation" },
    });
}

function getMarkdownSourcePath(pathname) {
    if (!pathname.endsWith(".md")) return null;

    // e.g., /components/button.md -> src/pages/components/button/index.jsx
    const basePath = pathname.replace(/\.md$/, "");
    if (!basePath || basePath === "/index") return null;
    return `src/pages${basePath}/index.jsx`;
}

async function createTurndownService() {
    // Lazy-import turndown (CJS-only, use createRequire)
    const { createRequire } = await import("node:module");
    const require = createRequire(import.meta.url);
    const TurndownService = require("turndown");
    return new TurndownService({
        headingStyle: "atx",
        codeBlockStyle: "fenced",
        emDelimiter: "*",
    });
}

function isRenderableHtml(html) {
    if (typeof html !== "string") return false;
    if (/^Error loading/i.test(html)) return false;
    return /<html[\s>]/i.test(html);
}

function getArticleContent(html) {
    const contentMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    return contentMatch ? contentMatch[1] : html;
}

async function renderMarkdownPage(jsxPath, context) {
    const turndownService = await createTurndownService();
    let fullHtml;
    try {
        fullHtml = await context.render(jsxPath);
    } catch {
        // Module not found — pass through, let SXO handle 404
        return undefined;
    }

    if (!isRenderableHtml(fullHtml)) return undefined;

    const markdown = turndownService.turndown(getArticleContent(fullHtml));
    return new Response(markdown, {
        headers: { "content-type": "text/markdown; charset=utf-8" },
    });
}

export default async function middleware(request, _env, context) {
    const pathname = new URL(request.url).pathname;
    const redirect = getRootRedirect(pathname);
    if (redirect) return redirect;

    const jsxPath = getMarkdownSourcePath(pathname);
    if (!jsxPath) return undefined;
    return renderMarkdownPage(jsxPath, context);
}
