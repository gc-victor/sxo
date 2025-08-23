# AGENTS.md

## Info

- **Project**: sxo
- **Last Update**: 2025-08-21

## Purpose

Authoritative onboarding & guard-rails for AI + human contributors. Read fully before non-trivial changes.

---

## 0. Project Overview

- Manifest path: `dist/server/routes.json` (NOT `dist/routes.json`).
- Dual build outputs: `dist/client` (public) / `dist/server` (private).
- Page module acceptance: **default export OR named `jsx`** (server picks `module.default || module.jsx`).
- Middleware system: `SRC_DIR/middleware.js` (hot-replace in dev).
- Managed head block markers: `<!-- sxo-head-start -->` / `<!-- sxo-head-end -->`.
- Static asset server supports: hashed caching, ETag, precompressed variants, range requests (uncompressed only).
- Hot reload: SSE endpoint `/hot-replace?href=<path>` with partial page (`#page`) replacement.

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

- Reuse strategy: if every cached `jsx` still exists & no new page `index.*` discovered, reuse JSON (refresh template & global.css).
- Each route object fields: `filename, entryPoints[], jsx, htmlTemplate, scriptLoading, hash, path?`.
- `hash`: boolean (dev true) used by HTML plugin to conditionally hash or assist reload semantics.
- `global.css` required; build pipeline hard-codes it as a client entry.

---

## 6. Page Module Semantics

Acceptable patterns:

```/dev/null/example#L1-20
// Preferred
export const head = { title: "About" };
export default (params) => "<div>...</div>";

// Alternative (no default export)
export function jsx(params) {
  return "<div>...</div>";
}
```

Server chooses `module.default || module.jsx`. If adding transform logic, do not break this order.

Head export:

- Object or function returning object.
- Title convenience: primitive or function allowed.
- Boolean attr true = present; falsy removed.
- Inline `script/style/title` content escaped.

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

- Replaces only `#page` innerHTML.
- Re-injects stylesheet `<link>` (global) & relevant `<script>` tags.
- Attempts reactive state preservation (heuristic; do not rely on for correctness).
- Scroll capture & restoration (body + elements tagged with `data-hot-replace-scroll`).

When editing logic here:

- Maintain forward compatibility of SSE payload shape: `{ page, link, scripts }` or `{ html }` (error).
- Keep minimal bundler coupling (no React-like DOM diff assumptions).

---

## 9. Head Injection

`applyHead()`:

- Removes prior managed block each invocation (idempotent).
- Escapes dangerous characters.
- Distinguishes void vs non-void tags.
- If head function throws → old block removed, none inserted.

Changing semantics requires doc update + test adjustments (`apply-head.test.js`).

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
  - `entryPoints = [global.css, ...clientRouteEntries]`
  - Dev names: `[dir]/[name]`
  - Prod names: `[dir]/[name].[hash]`
- Server:
  - Only route `jsx` modules (no minify, no sourcemap).
- JSX plugin:
  - WASM precompile + virtual helpers import.
  - Do NOT edit `dist/pkg-node/jsx_precompile.js`.
- Manifest write precedes builds (ensures server can start even if later build step fails?).

---

## 13. Config Resolution

`resolveConfig()` precedence: flags > file > env > defaults, but flags must be _explicit_ (tracked via `prepareFlags()`).
Derived env injected:

- `OUTPUT_DIR_CLIENT`, `OUTPUT_DIR_SERVER`
- `SXO_RESOLVED_CONFIG` (JSON)
- `DEV`, `SXO_COMMAND`
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
- Utils (split: head, scripts, links, route matching, statics security)
- JSX helpers (attribute canonicalization)

Add new test file when adding a discrete subsystem; keep responsibilities narrow.

---

## 16. Performance Considerations

- Manifest reuse avoids unnecessary directory traversal.
- Precompile reduces per-file parse cost.
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

- `dist/pkg-node/jsx_precompile.js`
- Generated build outputs
- Future Rust/WASM build scripts
- `routes.json` directly (always produced by build)

---

## 20. Quick Reference (Cheat Sheet)

| Concern             | File                              |
| ------------------- | --------------------------------- |
| Manifest generation | `esbuild/entry-points-config.js`  |
| Build Orchestrator  | `esbuild/esbuild.config.js`       |
| JSX Plugin          | `esbuild/esbuild-jsx.plugin.js`   |
| Dev Server          | `server/dev.js`                   |
| Prod Server         | `server/prod.js`                  |
| Middleware Loader   | `server/middleware.js`            |
| Head Injection      | `server/utils/apply-head.js`      |
| Static Assets       | `server/utils/statics.js`         |
| Route Match         | `server/utils/route-match.js`     |
| JSX Bundle Mapping  | `server/utils/jsx-bundle-path.js` |
| Config Resolution   | `config.js`                       |
| Readiness Probe     | `cli/open.js`                     |

---

## 21. AI Contribution Workflow (Reaffirmed)

1. Clarify ambiguities.
2. Propose plan for multi-file or structural changes.
3. Keep edits scoped; request confirmation >300 LOC or >3 files.
4. Add `AIDEV-NOTE:` near nuanced logic.
5. Update docs when surface area changes.
6. Add / adjust tests before changing runtime semantics.
7. Never “optimize” readability at cost of behavior without approval.
