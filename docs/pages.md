# Pages

## Page Module API

A page module can export:

| Export | Type | Required | Description |
| ------ | ---- | -------- | ----------- |
| `default` | `(params) => JSX` or string | Yes\* | Page render function |
| `jsx` | `(params) => JSX` or string | Yes\* | Named alternative |

\* Exactly one of `default` or `jsx` must be provided; resolution is `module.default || module.jsx`.

The render function receives the route params object (see [Routing](routing.md)) and may be **async** — its result is awaited:

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
- Folder-based error pages support client entries (`PAGES_DIR/404/client/index.js`), built and injected like regular routes. Flat-file error pages receive assets from the first available regular route.
- Fallback: with no custom page, the server responds with a minimal HTML error document carrying the correct status, `Content-Type: text/html; charset=utf-8`, and cache headers.
- Cache-Control: 404 → `public, max-age=0, must-revalidate`; 500 → `no-store`.
- HEAD requests return headers only.
- Error pages are included in the server build but never pre-rendered by `sxo generate`.

On Cloudflare Workers, error pages are passed explicitly to `createHandler` — see [Deployment](deployment.md).
