# Pages

## Page Module API

A page module can export:

| Export | Type | Required | Description |
| ------ | ---- | -------- | ----------- |
| `default` | `(params, request) => JSX \| string \| Response` | Yes\* | Page render function |
| `jsx` | `(params, request) => JSX \| string \| Response` | Yes\* | Named alternative |

\* Exactly one of `default` or `jsx` must be provided; resolution is `module.default || module.jsx`.

Render function arguments:

- `params` — route parameters (`{}` for static routes, `{ slug: "..." }` for `/blog/[slug]`; see [Routing](routing.md)).
- `request` — the incoming Web Standard `Request` (URL, method, headers, cookies). Error pages (404/500) are rendered with `{}` and no request.

The render function may be **async** — its result is awaited:

```jsx
// src/pages/index.jsx
import { getStats } from "../store.js";

export default async () => {
  const stats = await getStats();
  return (
    <html lang="en">
      <head>
        <title>Stats</title>
      </head>
      <body>
        <p>{stats.visits} visits</p>
      </body>
    </html>
  );
};
```

### Return values

- A full `<html>...</html>` document (JSX or string) — route assets are injected and `<!doctype html>` is prepended.
- Any other string — sent as-is with `Content-Type: text/html; charset=utf-8`.
- A `Response` — full control over status, headers, and body (useful for redirects, cookies, or non-HTML output). HTML document responses (`Content-Type: text/html` and a body starting with `<html`) still get route assets injected and a doctype prepended; non-HTML responses are returned untouched.

> **`sxo/runtime` caveat**: the Web Standard core handler (`createCoreHandler` from `sxo/runtime`) calls render functions with `params` only and does not honor a page-returned `Response`. The Node, Bun, Deno, and Cloudflare adapters support both. See [Deployment](deployment.md#custom-platforms-sxoruntime).

## Full HTML Documents

Pages must return a full `<html>...</html>` document including `<head>` and `<body>`. There is no shared layout file and no separate `head` export — compose shared markup with plain component functions:

```jsx
// src/components/Layout.jsx
export function Layout({ title, children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <title>{title}</title>
      </head>
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
```

The server prepends `<!doctype html>` when the output starts with `<html`.

## Styles

`PAGES_DIR/global.css` (optional) is included as a client entry for **all** routes — use it for shared styles. Route-specific styling can be imported from the route's client entry (it is bundled by esbuild), or written inline in `<head>`.

## JSX Rendering Rules

The Rust/WASM transformer compiles JSX to template literals. Behavior worth knowing:

- **Attribute normalization**: `className` → `class`, `htmlFor` → `for`, `acceptCharset` → `accept-charset`, `httpEquiv` → `http-equiv`, SVG/camelCase attributes → kebab-case, `ariaFoo` → `aria-foo`.
- **Boolean attributes are present or absent**: `true` renders a valueless attribute (`checked`); `false`, `null`, and `undefined` omit it.
- **Spread props** are serialized at runtime (`__jsxSpread`): `<input {...props} />`.
- **Arrays render joined**: `items.map(...)` output is joined into a single string (`__jsxRender`); `null`/`undefined` render as `""`.
- **`<script>` children are raw text**: expressions inside `<script>` tags are *not* interpolated — the source text is emitted as-is. To pass server data to the client, use a hidden element island instead (see the [todo tutorial](tutorials/todo-app.md)).
- **No automatic escaping**: text and attribute interpolations are inserted raw. Escape untrusted values yourself:

```jsx
export function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// <span>{escapeHtml(userInput)}</span>
```

See [Security](security.md).

## Error Pages

Custom 404/500 pages live in the pages directory and are **not routable** (compiled as server-only modules):

Location precedence:

1. Flat file: `PAGES_DIR/404.tsx` / `500.tsx`
2. Flat file: `PAGES_DIR/404.jsx` / `500.jsx`
3. Folder: `PAGES_DIR/404/index.tsx` / `500/index.tsx`
4. Folder: `PAGES_DIR/404/index.jsx` / `500/index.jsx`

Rules:

- Same export shape as pages (`default` or `jsx`); must return a full `<html>` document.
- Extension mismatch (known issue): the build also bundles flat `404.ts`/`404.js`, but runtime resolution only accepts `.tsx`/`.jsx`, so those files are built and never served. Use `.tsx` or `.jsx`.
- Folder-based error pages support client entries (`PAGES_DIR/404/client/index.js`), built and injected like regular routes. Flat-file error pages receive assets from the first available regular route.
- Fallback: with no custom page, the server responds with a minimal HTML error document carrying the correct status, `Content-Type: text/html; charset=utf-8`, and cache headers.
- Cache-Control: 404 → `public, max-age=0, must-revalidate`; 500 → `no-store`.
- HEAD requests return headers only.
- Build and generation: the server build includes 404/500 SSR modules. Flat-file error pages are never pre-rendered by `sxo generate`; folder-based error pages (`404/index.*`, `500/index.*`) are currently treated as static routes and pre-rendered to `dist/client/404/index.html`, marked `generated: true`. That is a known issue: the generate filter only checks for dynamic segments and lacks an error-page exclusion.

On Cloudflare Workers, error pages are passed explicitly to `createHandler` — see [Deployment](deployment.md).
