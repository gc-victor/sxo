# Routing

A route exists when a directory under the pages directory contains an `index.(tsx|jsx|ts|js)` file.

## Static Routes

```
src/pages/
├── index.jsx        →  /
├── about/
│   └── index.jsx    →  /about
└── contact/
    └── index.jsx    →  /contact
```

## Dynamic Routes

Directories named with bracket notation create dynamic segments. Multiple dynamic parameters per route are supported:

```
src/pages/blog/[slug]/index.jsx               →  /blog/:slug
src/pages/shop/[category]/[product]/index.jsx →  /shop/:category/:product
src/pages/users/[userId]/profile/index.jsx    →  /users/:userId/profile
```

The params object passed to the page render function is shaped from the bracket names:

- Single parameter: `{ slug: string }`
- Multiple parameters: `{ category: string, product: string }`

```jsx
// src/pages/blog/[slug]/index.jsx
export default ({ slug }) => (
  <html lang="en">
    <head>
      <title>{slug}</title>
    </head>
    <body>
      <h1>Post: {slug}</h1>
    </body>
  </html>
);
```

### Parameter Naming Rules

- Must start with a letter (`a-z`, `A-Z`)
- May contain letters, numbers, and underscores
- Must be unique within each route
- Valid examples: `[id]`, `[userId]`, `[post_id]`, `[category123]`

### Parameter Validation

Incoming route parameter **values** are validated against `^[A-Za-z0-9._-]{1,200}$`. Values that don't match fall through to the 404 handler. If you need richer parameter values (slashes, unicode), match the path yourself in [middleware](server.md).

## Client Entries per Route

Any route directory may contain a client subdirectory (default name `client`, configurable via `--client-dir` / `CLIENT_DIR`):

```
src/pages/about/
├── index.jsx          # server-rendered page
└── client/
    └── index.js       # client entry for this route only
```

The client entry is bundled and injected only on that route. Extension precedence: `.ts` > `.tsx` > `.js` > `.jsx`. See [Client](client.md).

## Special Files (Not Routable)

- `PAGES_DIR/global.css` — shared stylesheet injected on every route
- `PAGES_DIR/404.*` and `PAGES_DIR/500.*` — custom error pages (see [Pages](pages.md#error-pages))

## Manifest

Every route becomes an entry in `dist/server/routes.json` at build time, with its assets, source path, and generation status. See [Build & Assets](build-and-assets.md).
