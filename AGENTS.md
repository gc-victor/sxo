# AGENTS.md

## Info

- **Project**: sxo
- **Last Update**: 2025-09-15

## Purpose

Authoritative onboarding & guard-rails for AI + human contributors. Read fully before non-trivial changes.

---

## 0. Project Overview

- Manifest path: `dist/server/routes.json` (NOT `dist/routes.json`).
- Dual build outputs: `dist/client` (public) / `dist/server` (private).
- Page module acceptance: **default export OR named `jsx`** (server picks `module.default || module.jsx`).
- Middleware system: `SRC_DIR/middleware.js` (hot-replace in dev).
- Head injection removed: pages return full `<html>` and manage their own `<head>` contents directly.
- Static asset server supports: hashed caching, ETag, precompressed variants, range requests (uncompressed only).
- Hot reload: SSE endpoint `/hot-replace?href=<path>` with partial body replacement.
- Public asset base path configurable via `--public-path`, `PUBLIC_PATH`, or config; empty string "" preserved; consumed by esbuild `publicPath`; normalized at runtime for injection (empty string preserved → no leading slash; non‑empty ensures trailing slash).
- Per‑route client entry subdirectory configurable via `clientDir` (config), `CLIENT_DIR` (env), or `--client-dir` (flag). Default: "client".
- Static generation support: `sxo generate` pre-renders non-dynamic routes, writes HTML into `dist/client`, and marks routes with `generated: true` in the manifest.
- Prod server respects `generated` flag: if `generated: true`, serves built HTML as-is (skips SSR) with `Cache-Control: public, max-age=300`; otherwise SSR per request with `Cache-Control: public, max-age=0, must-revalidate`.
- Prod timeouts: `REQUEST_TIMEOUT_MS` (default 120000) sets `server.requestTimeout`; `HEADER_TIMEOUT_MS` (if set to a non-negative integer) overrides `server.headersTimeout`.

---

## 1. Golden Rules

- Do not invent architecture—ask if ambiguous.
- Only modify code under `sxo/src/js/**` unless explicitly directed.
- Preserve existing `AIDEV-*` anchors.
- Avoid mega-refactors (>300 LOC or >3 files) without confirmation.
- Never touch generated artifacts (`dist/**`, WASM outputs).
- Keep edits task-focused; new task resets previous context.

---

## 2. Commands

Reference (unchanged in code):

```
node sxo/src/js/cli/sxo.js --help
node sxo/src/js/cli/sxo.js dev
node sxo/src/js/cli/sxo.js build
node sxo/src/js/cli/sxo.js start
node sxo/src/js/cli/sxo.js clean
node sxo/src/js/cli/sxo.js generate
node --test
```

Dev auto-open uses readiness probe (HEAD then GET, status < 500 = ready).

---

## 3. Coding Standards

- ESM only, Node 20+.
- Small modules; explicit side effects.
- Exported utility functions: JSDoc where non-trivial.
- Structured errors or clear messages near boundaries; do not deeply wrap generic exceptions unless adding value.
- Avoid broad repository reformatting; respect existing style.

---

## 4. Layout (Key Directories)

```
sxo/src/js/
  cli/              # CLI + helpers (+ readiness, spawn)
  config.js         # flag/env/config resolution
  constants.js      # derived paths from resolved config
  esbuild/          # entry discovery, plugin, orchestrator
  server/
    dev.js          # dev server + hot reload
    prod.js         # prod server
    middleware.js   # loader + runner
    utils/          # decomposed server helpers
      ...
dist/
  client/           # public
  server/           # private SSR bundles + routes.json
```

---

## 5. Manifest & Entry Discovery

- Reuse strategy: if every cached `jsx` still exists & no new page `index.*` discovered, reuse JSON (refresh global.css presence per route).
- Each route object fields: `filename, entryPoints[], jsx, hash, assets: { css[], js[] }, path?, generated?`.
- `hash`: boolean (dev true) used to assist reload/cache semantics; asset mapping is derived from esbuild’s metafile.
- Assets are computed from the client build’s metafile and persisted per route in the manifest (`route.assets = { css: string[], js: string[] }`). No separate asset-manifest file is produced. These assets are injected by the `sxo generate` step (for static routes) and at runtime by the dev/prod servers for non‑generated routes.
- `generated`: boolean set by `sxo generate` for static routes that were pre-rendered; prod server serves these as-is and skips SSR.
- `global.css` optional; entry discovery appends it to each route's `entryPoints` when present (not hard-coded globally).
- Per‑route client entry is discovered under `<clientDir>/index.(ts|tsx|js|jsx)` (precedence: .ts > .tsx > .js > .jsx). `<clientDir>` defaults to "client" and is configurable.

---

## 6. Page Module Semantics

Acceptable patterns (pages must return full HTML documents):

```/dev/null/example#L1-20
// Preferred: full HTML document
export default (params) => `
  <html>
    <head>
      <title>About</title>
    </head>
    <body>
      <div>...</div>
    </body>
  </html>
`;

// Alternative (no default export)
export function jsx(params) {
  return `
    <html>
      <head><title>About</title></head>
      <body>...</body>
    </html>
  `;
}
```

Server chooses `module.default || module.jsx`. If adding transform logic, do not break this order.

---

## 7. Middleware System

File: `SRC_DIR/middleware.js`

Loader picks first of:

- `default` export (function / array)
- `middlewares`
- `middleware`
- `mw`

Execution:

- Sequence preserved.
- Return truthy OR end response => request handled (short-circuit).
- Callback signature `(req,res,next)` supported; `next(err)` rejects (dev/prod logs, prod returns 500).
- Dev: reloaded on change detection.
- Prod: single load at startup.

Important: Avoid writing large bodies before delegating; run cheap checks early.

---

## 8. Hot Reload (Dev)

SSE endpoint: `/hot-replace?href=<currentRoutePath>`
Client script:

- Replaces `<body>` innerHTML.
- Re-injects stylesheet `<link>` (global) & relevant `<script>` tags.
- Attempts reactive state preservation (heuristic; do not rely on for correctness).
- Scroll capture & restoration (body + elements tagged with `data-hot-replace-scroll`).

When editing logic here:

- Maintain forward compatibility of SSE payload shape: `{ body, assets, publicPath }` on success, or `{ body }` on error.
- Keep minimal bundler coupling (no React-like DOM diff assumptions).

---

## 9. Head Injection (Removed)

Head injection via a separate utility has been removed. Pages must return full `<html>` documents and include their own `<head>` content.

---

## 10. Static Assets

`statics.js`:

- Security: path guard (must remain under `dist/client`).
- Only known MIME extensions served.
- Precompressed variant negotiation (`.br` > `.gz`).
- ETag (`W/size-mtimeHex`).
- Hashed filenames → long immutable caching.
- Range requests allowed only if not serving compressed variant.

If adding new MIME types: update mapping + tests if behavior differs.

---

## 11. Routing

`routeMatch()`:

- Normalizes path (removes query/hash).
- Supports dynamic `[slug]` segments (current doc states single param limitation even though code replaces every occurrence—treat multi-segment usage as accidental until greenlit).
- Slug validation: `SLUG_REGEX` (return `{invalid:true}` on fail).
- Root matches `""`, `/`, `/index.html`.

If expanding to multi-param or advanced patterns: update sections (README + here) & tests under `utils/tests/route-match.test.js`.

---

## 12. Build Pipeline

- Two parallel esbuild invocations (client + server).
- Client:
  - `entryPoints = [...clientRouteEntries]` (entry discovery appends `global.css` per route if present)
  - Dev names: `[dir]/[name]`
  - Prod names: `[dir]/[name].[hash]`
  - publicPath: sourced from `PUBLIC_PATH` environment variable (defaults to "/"); empty string "" preserved
  - per‑route client entry directory: sourced from resolved `clientDir` (default: "client")
  - After the client build finishes, the metafile plugin augments `dist/server/routes.json` with per‑route assets (`route.assets = { css: string[], js: string[] }`). It does not write any HTML files. The `sxo generate` step consumes `route.assets` to inject `<link rel="stylesheet">` and `<script type="module">` tags into generated HTML with PUBLIC_PATH normalization (empty string preserved; non‑empty values end with a trailing slash). At runtime, the dev and prod servers also inject `route.assets` for non‑generated routes using the same normalization rules.
- Server:
  - Only route `jsx` modules (no minify, no sourcemap).
- Loader mapping: if `LOADERS` is set (from config/env/flags), esbuild's `loader` option is applied to both client and server builds (dev/build only).
- JSX transformer & runtime helpers:
  - Backed by a streaming JSX parser with error recovery (old precompiler removed; the `jsx_precompile.rs` file was deleted).
  - Emits template literals and relies on runtime helpers:
    - `__jsxComponent(Component, propsArrayOrObject, children?)`
    - `__jsxSpread(object)` for attribute serialization
    - `__jsxList(value)` to join arrays
  - Array-producing/copying expressions are wrapped with `${__jsxList(...)}`
    (e.g., `map`, `flatMap`, `filter`, `reduce`, `slice`, `concat`, `flat`,
    `toReversed`, `toSorted`, `toSpliced`, `with`, `reverse`, `sort`, `splice`,
    `fill`, `copyWithin`, `forEach`).
  - Attribute name normalization mirrors HTML expectations (e.g., `className` → `class`, `htmlFor` → `for`); keep JS and Rust normalization in sync.
  - Diagnostics: aggregated, caret-aligned errors when parsing fails (preserve formatting).
  - WASM transformer + virtual helpers import.
  - Do NOT edit `jsx-transformer/jsx_transformer.js`.
  - If you change helper names/semantics, parser strategy, or array detection heuristics, update README + AGENTS and adjust tests accordingly.
- Manifest write precedes builds (ensures server can start even if later build step fails?).
- Post-build optional step: `sxo generate` pre-renders non-dynamic routes using the built SSR modules, writes HTML back to `dist/client`, and sets `generated: true` in the manifest. Idempotent (skips already generated routes).

---

## 13. Config Resolution

`resolveConfig()` precedence: flags > file > env > defaults, but flags must be _explicit_ (tracked via `prepareFlags()`).
Derived env injected:

- `OUTPUT_DIR_CLIENT`, `OUTPUT_DIR_SERVER`
- `SXO_RESOLVED_CONFIG` (JSON)
- `DEV`, `SXO_COMMAND`
- `LOADERS` (JSON mapping of extension -> loader; only set in dev/build; also embedded in `SXO_RESOLVED_CONFIG`)
- `PUBLIC_PATH` (string public base URL for assets; defaults to "/" when unset; empty string "" preserved)
- `CLIENT_DIR` (per‑route client entry subdirectory; defaults to "client")
  Flag explicitness tests in `config.test.js`; maintain those if adding new flags.

---

## 14. Readiness Probe

`openWhenReady()`:

- Backoff HEAD → GET
- Status < 500 (including 404) = success
- Timeout returns `{ opened:false, timedOut:true }`
  If altering thresholds or logic, update README & tests in `open.test.js`.

---

## 15. Testing Strategy

Granular suites:

- CLI helpers (`cli-helpers.test.js`)
- Spawn utilities
- Open/readiness logic
- Config precedence & explicit flags
- Entry points (fixtures)
- Middleware (dynamic export shapes)
- Utils (split: asset extraction, routing, statics security)
- JSX helpers (attribute canonicalization)

Add new test file when adding a discrete subsystem; keep responsibilities narrow.

---

## 16. Performance Considerations

- Manifest reuse avoids unnecessary directory traversal.
- Transform reduces per-file parse cost.
- No hydration means minimal client JS except optional route client entries.
- Hash toggling in dev fosters quick cache-bust semantics without full invalidation strategies.

---

## 17. Security Considerations

- No implicit CORS or security headers; require middleware.
- Escapes head inline code.
- Validates slug values; treat `{invalid:true}` distinct from 404.
- Static server denies traversal and unknown extensions.
- Avoid logging secrets; logger redacts selected headers.

---

## 18. When Updating This Doc

Trigger an update if you:

- Change manifest schema
- Modify middleware export contract
- Adjust slug pattern or multiple slug support
- Alter head injection markers or escaping rules
- Change hot reload payload shape

---

## 19. Non-Editable Artifacts

Do NOT modify:

- `jsx-transformer/jsx_transformer.js`
- Generated build outputs
- Future Rust/WASM build scripts
- `routes.json` directly (always produced by build)

---

## 20. Quick Reference (Cheat Sheet)

| Concern                    | File                                 |
| -------------------------- | ------------------------------------ |
| Route Discovery & Manifest | `esbuild/entry-points-config.js`     |
| Metafile & Asset Mapping   | `esbuild/esbuild-metafile.plugin.js` |
| Build Orchestrator         | `esbuild/esbuild.config.js`          |
| JSX Plugin                 | `esbuild/esbuild-jsx.plugin.js`      |
| Dev Server                 | `server/dev.js`                      |
| Prod Server                | `server/prod.js`                     |
| Middleware Loader          | `server/middleware.js`               |

| Static Assets | `server/utils/statics.js` |
| Route Match | `server/utils/route-match.js` |
| JSX Bundle Mapping | `server/utils/jsx-bundle-path.js` |
| Config Resolution | `config.js` |
| Readiness Probe | `cli/open.js` |
| Static Generation | `generate/generate.js` |

---

## 21. AI Contribution Workflow (Reaffirmed)

1. Clarify ambiguities.
2. Propose plan for multi-file or structural changes.
3. Keep edits scoped; request confirmation >300 LOC or >3 files.
4. Add `AIDEV-NOTE:` near nuanced logic.
5. Update docs when surface area changes.
6. Add / adjust tests before changing runtime semantics.
7. Never “optimize” readability at cost of behavior without approval.
