# Server

The server side of SXO has three jobs: run your **middleware**, serve **static assets**, and **SSR page modules**. The first two are covered here; SSR behavior lives in [Pages](pages.md) and [Build & Assets](build-and-assets.md).

## Middleware Contract

One contract across dev, prod, and all platform adapters:

```typescript
(request: Request, env?: object, context?: MiddlewareContext) =>
  Response | void | Promise<Response | void>
```

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `request` | `Request` | The incoming Web Standard Request |
| `env` | `object` | Platform-specific environment bindings |
| `context` | `{ render }` | Optional context object |

- Return a `Response` to **short-circuit** the request.
- Return nothing to continue to the next middleware or the route handler.

Middleware is discovered at `src/middleware.{js,ts,mjs}` (checked in that order, first match wins). It may export a single function or an **array** of functions (a chain):

```javascript
// src/middleware.js
function logging(request) {
  console.log(request.method, new URL(request.url).pathname);
  // no return — continue
}

function healthCheck(request) {
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === "/api/health") {
    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
}

export default [logging, healthCheck];
```

Named exports are also supported:

```javascript
export const middlewares = [logging, healthCheck]; // array
export const middleware = [logging, healthCheck];  // alias
export const mw = logging;                         // single function
```

Resolution is `default ?? middlewares ?? middleware ?? mw`. A non-array export is wrapped as a single middleware; non-function entries are filtered out. Load failures are logged and treated as an empty chain. Functions run in array order, before route handling.

Middleware runs **before** static assets and routing, so it can implement APIs, auth, redirects, CORS, rate limiting, security headers, compression, and logging.

## Building a JSON API

SXO has no file-based API routes — you build APIs with middleware. Match the path, switch on the method, return JSON:

```javascript
import { addTodo, listTodos } from "./store.js";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });

async function todosApi(request) {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/api\/todos(?:\/(\d+))?$/);
  if (!match) return; // not ours — continue to pages

  const id = match[1] ? Number(match[1]) : undefined;

  if (id === undefined) {
    if (request.method === "GET") return json(listTodos());
    if (request.method === "POST") {
      const body = await request.json().catch(() => null);
      const title = typeof body?.title === "string" ? body.title.trim() : "";
      if (!title) return json({ error: "title is required" }, 400);
      return json(addTodo(title), 201);
    }
    return json({ error: "method not allowed" }, 405);
  }
  // …PATCH/DELETE by id
}

export default [todosApi];
```

Guidelines:

- **Validate at the boundary** — parse bodies defensively (`request.json().catch(() => null)`), type-check fields, return `400` with an error body.
- **Return proper statuses** — `201` on create, `404` on missing, `405` on wrong method.
- **Share a server-only store module** — pages and middleware can both import `src/store.js` (database access, caches). It is bundled into the private server build and never exposed to the client.
- Keep handlers small; extract per-resource functions or a mini router as the API grows.

The complete pattern — store, API, SSR page, and a client island consuming the API — is built step by step in the [Todo App tutorial](tutorials/todo-app.md).

## Rendering JSX from Middleware: `context.render`

Middleware can render any page module (`.jsx`/`.tsx`) via the third argument:

```typescript
render(jsxPath: string, params?: Record<string, string>): Promise<string>
```

| Argument | Type | Description |
| -------- | ---- | ----------- |
| `jsxPath` | `string` | Source path to the page module (e.g., `"src/pages/custom.jsx"`) |
| `params` | `Record<string, string>` | Optional route parameters passed to the page's render function |

Returns the rendered HTML string (`<!doctype html>` is prepended when the output starts with `<html>`). Non-string returns are coerced. Throws when the module path is unknown, the module has no `default`/`jsx` export, or the render function throws.

```javascript
// src/middleware.js
export default async function (request, env, { render }) {
  const url = new URL(request.url);

  if (url.pathname === "/custom-page") {
    const html = await render("src/pages/custom.jsx", { title: "Custom" });
    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Render by request data (A/B tests, multi-tenant, themes)
  const match = url.pathname.match(/^\/pages\/([a-z0-9-]+)$/);
  if (match) {
    try {
      const html = await render("src/pages/dynamic.jsx", { slug: match[1] });
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    } catch {
      return new Response("Not available", { status: 404 });
    }
  }
}
```

How resolution works per environment:

- **Production**: looks up the pre-loaded module from the `modules` map (no extra I/O).
- **Development**: lazily loads the compiled bundle from `dist/server/` with cache-busting.
- **Cloudflare Workers**: uses the `modules` map provided to `createCoreHandler`.

The `context` parameter is optional — middleware using only `(request, env)` keeps working.

Use cases: custom page rendering, A/B testing, multi-tenant pages by hostname, draft/preview modes, theme variants.

## SSR Pipeline

For requests not handled by middleware or static assets:

1. The route is matched against `dist/server/routes.json`. Dynamic values are validated (`^[A-Za-z0-9._-]{1,200}$`).
2. The page module is resolved (`module.default || module.jsx`) and **awaited** with `(params, request)` — render functions may be async.
3. Built assets for the route (client entry, `global.css`) are injected into the HTML.
4. Cache headers: generated pages `public, max-age=300`; SSR pages `public, max-age=0, must-revalidate`.
5. No match → custom `404` page (or minimal fallback); render throw → `500`.

In production, responses carry `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy` automatically; the dev server does not add security headers. Customize them with the `securityHeaders` config key or `SECURITY_HEADERS` env, and see [Security](security.md#configuring-security-headers) for the protected-header override policy. Everything else (CSP, HSTS, auth, rate limiting) is yours via middleware or the `securityHeaders` config.
