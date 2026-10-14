# Build & Assets

## Build Outputs

After `sxo build` (or the dev prebuild):

```
dist/
├── client/           # public assets: html, js, css
└── server/           # private SSR bundles (never served publicly)
    └── routes.json   # routes manifest and metadata
```

## Manifest (`routes.json`)

One entry per route, including per-route assets:

```json
[
  {
    "filename": "about/index.html",
    "entryPoints": ["src/pages/about/client/index.js", "src/pages/global.css"],
    "jsx": "src/pages/about/index.jsx",
    "scriptLoading": "module",
    "hash": false,
    "path": "about",
    "generated": false
  }
]
```

| Field | Meaning |
| ----- | ------- |
| `filename` | Output path relative to `dist/client` |
| `entryPoints` | Per-route client entries and `global.css` (if present) |
| `jsx` | Source page module relative path |
| `hash` | `true` in dev (cache-busting semantics) |
| `path` | Route path (omitted for the root route) |
| `generated` | If `true`, prod serves the built HTML as-is (skips SSR) with `Cache-Control: public, max-age=300` |

Non-generated/dynamic pages are SSR'd per request with `Cache-Control: public, max-age=0, must-revalidate`.

**Manifest reuse**: on rebuild, if every referenced `jsx` file still exists *and* no new route `index.*` appeared, the existing manifest is reused with `global.css` refreshed.

## Static Generation

`sxo generate` pre-renders static routes **after** a successful `sxo build`:

- Only routes **without** dynamic parameters (no `[slug]` segments) are generated. Dynamic routes are never generated.
- For each static route it imports the SSR module, executes it with empty params, injects built assets from `route.assets` (`PUBLIC_PATH` normalized), and writes `dist/client/<route>/index.html`.
- The page module (default or `jsx` export) must return a full `<html>` document.
- Sets `generated: true` in the manifest; the flag persists in `dist/server/routes.json`.
- **Idempotent**: reruns skip routes already marked generated.
- Requires `dist/server/routes.json` — run `sxo build` first.

Production server behavior:

- **Generated pages**: sent directly (no SSR), `Cache-Control: public, max-age=300`.
- **Non-generated/dynamic pages**: SSR per request, assets injected, `Cache-Control: public, max-age=0, must-revalidate`.

> Do not generate routes that render live data (database-backed pages) — the snapshot would go stale. Generate marketing/static routes only.

## Static Asset Serving

Dev and prod servers serve from `dist/client` only.

- **Strict path guard**: requests resolving outside `dist/client` are rejected.
- **Extension gating**: only known MIME types are served; no directory listing.
- **Traversal protection**: `../`-style attempts rejected (403/404).
- **Immutable caching**: hashed filenames → `public, max-age=31536000, immutable`.
- **Short caching**: non-hashed → `public, max-age=300`.
- **Conditional requests**: ETag + Last-Modified with `304` support.
- **Precompressed variants**: serves `.br` > `.gz` when the client supports it and the asset is compressible.
- **HEAD** requests supported.

Hashed filename detection heuristics: a segment containing 8+ hex chars, or an 8-char base36-ish uppercase segment before the next dot.

## Public Path

Asset URLs are emitted with the configured public base path (`--public-path`, `PUBLIC_PATH`, or config; default `/`). The empty string `""` is allowed and preserved, producing relative asset URLs — useful when the app is served from an unknown prefix.
