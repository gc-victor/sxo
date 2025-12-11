# AGENTS.md

## Quick Start (TL;DR)

**Commands:**

- `pnpm test` - run all tests
- `pnpm test src/js/path/to/file.test.js` - run single test file
- `npm run check` - lint with Biome
- `npm run format` - format code
- `./bin/sxo.js create|add|dev|build|start|clean|generate`

**Architecture:** ESM-only Node 20+ SSR framework. Dual esbuild outputs ([`dist/client`](dist/client) public, [`dist/server`](dist/server) SSR bundles). Route discovery from `pages/` dir, manifest at [`dist/server/routes.json`](dist/server/routes.json). JSX via Rust/WASM transformer. Middleware in [`src/middleware.js`](src/middleware.js).

**Style:** Small modules, ESM imports, JSDoc on exported utilities. No React patterns. Pages return full HTML docs (`<html>` + `<head>`). See [`.rules/jsx-standards.md`](.rules/jsx-standards.md) for examples, [`.rules/jsdoc.md`](.rules/jsdoc.md) for docs, [`.rules/testing.instructions.md`](.rules/testing.instructions.md) for tests.

**Constraints:** Only modify [`src/js/**`](src/js) unless directed. Never edit [`jsx-transformer/jsx_transformer.js`](jsx-transformer/jsx_transformer.js), [`dist/**`](dist), or generated artifacts. No mega-refactors (>300 LOC / >3 files) without confirmation. Preserve `AIDEV-*` anchors.

**Key Files:** [`src/js/esbuild/`](src/js/esbuild) (build pipeline), [`src/js/server/`](src/js/server) (dev/prod servers), [`src/js/config.js`](src/js/config.js) (resolution), [`src/js/cli/`](src/js/cli) (commands). Read full sections below for details.

**Loaders:** Custom esbuild server loaders can be configured via CLI flags (`--loaders ".svg=file"`), env (`LOADERS='{"svg":"file"}'`), or config file (`{"loaders":{".svg":"file"}}`). Format supports both `.svg` and `svg` notation (dot auto-added). Repeatable flags merge together; comma-separated values supported. Only propagated to dev/build commands. Follow standard config precedence: flags > file > env > defaults.

---

## Special Error Pages (404/500)

This project supports root-level 404 and 500 pages that render as full HTML documents to replace simple text fallbacks.

- Location and filenames:
  - PAGES_DIR/404.(tsx|jsx|ts|js)
  - PAGES_DIR/500.(tsx|jsx|ts|js)
- Exports and semantics:
  - Accepts default export or named export `jsx` (server uses `module.default || module.jsx`).
  - Pages must return a full HTML document and include their own `<head>` (head injection is removed).
  - These special pages are not routable and are not added to the manifest as public routes.

- Build and manifest:
  - The server build includes 404/500 SSR modules so they can be imported at runtime.
  - No manifest schema changes; these pages do not receive route paths or asset mappings at this time.
  - Static generation does not generate 404/500 pages.
- Response semantics:
  - HEAD requests: responses include headers only (no body) for 404/500 (custom or fallback).
  - Cache-Control: 404 → `public, max-age=0, must-revalidate`; 500 → `no-store`.

## Info

- **Project**: sxo
- **Last Update**: 2025-11-11
- **Rules**: [`.rules/`](.rules)

## Purpose

Authoritative onboarding & guard-rails for AI + human contributors. Read fully before non-trivial changes.

---

## 0. Project Overview

- Manifest path: [`dist/server/routes.json`](dist/server/routes.json) (NOT `dist/routes.json`).
- Dual build outputs: [`dist/client`](dist/client) (public) / [`dist/server`](dist/server) (private).
- Page module acceptance: **default export OR named `jsx`** (server picks `module.default || module.jsx`).
- Middleware system: `SRC_DIR/middleware.js` (hot-replace in dev).
- Head injection removed: pages return full `<html>` and manage their own `<head>` contents directly.
- Static asset server supports: hashed caching, ETag, precompressed variants, range requests (uncompressed only).
- Hot reload: SSE endpoint `/hot-replace?href=<path>` with partial body replacement.
- Public asset base path configurable via `--public-path`, `PUBLIC_PATH`, or config; empty string "" preserved; consumed by esbuild `publicPath`; normalized at runtime for injection (empty string preserved → no leading slash; non‑empty ensures trailing slash).
- Per‑route client entry subdirectory configurable via `clientDir` (config), `CLIENT_DIR` (env), or `--client-dir` (flag). Default: "client".
- Custom esbuild server loaders configurable via `--loaders` (flag), `LOADERS` (env), or config; follows precedence: flags > file > env > defaults; only propagated to dev/build commands.
- Static generation support: `sxo generate` pre-renders non-dynamic routes, writes HTML into [`dist/client`](dist/client), and marks routes with `generated: true` in the manifest.
- Prod server respects `generated` flag: if `generated: true`, serves built HTML as-is (skips SSR) with `Cache-Control: public, max-age=300`; otherwise SSR per request with `Cache-Control: public, max-age=0, must-revalidate`.
- Prod timeouts: `REQUEST_TIMEOUT_MS` (default 120000) sets `server.requestTimeout`; `HEADER_TIMEOUT_MS` (if set to a non-negative integer) overrides `server.headersTimeout`.

---

## 1. Golden Rules

- Do not invent architecture—ask if ambiguous.
- Only modify code under [`src/js/**`](src/js) unless explicitly directed.
- Preserve existing `AIDEV-*` anchors.
- Avoid mega-refactors (>300 LOC or >3 files) without confirmation.
- Never touch generated artifacts ([`dist/**`](dist), WASM outputs).
- Keep edits task-focused; new task resets previous context.
- Review the repository rules under [`.rules/`](.rules) before non-trivial changes.
- **MANDATORY**: Always read and apply [`.rules/prompt-enhancement.md`](.rules/prompt-enhancement.md) as part of your system prompt before executing any task.
- Apply the Prompt Refinement Template (Section 22) to every incoming user prompt before executing work (unless the prompt explicitly instructs to skip refinement).

### Repository Rules Reference

The [`.rules/`](.rules) directory contains authoritative guidelines that must be consulted when making changes. Read these files when needed for the specific domain:

- **[`.rules/prompt-enhancement.md`](.rules/prompt-enhancement.md)** _(MANDATORY - Always Read)_: Comprehensive AI prompt engineering safety review and improvement framework. Must be applied as part of system prompt for all tasks. Provides safety assessment, bias detection, security analysis, and prompt optimization guidelines.

- **[`.rules/jsx-standards.md`](.rules/jsx-standards.md)**: Primary combined rules and style guide for JSX examples documentation. Essential for any work involving [`examples/**/*.jsx`](examples) files. Covers JSDoc standards, accessibility practices (WCAG 2.0 compliance), semantic HTML requirements, and declarative composition patterns.

- **[`.rules/jsdoc.md`](.rules/jsdoc.md)**: Comprehensive JSDoc reference documentation. Authoritative guide for JSDoc tag usage, formatting conventions, and documentation standards across the repository.

- **[`.rules/testing.instructions.md`](.rules/testing.instructions.md)**: Testing guidelines for Node.js applications. Covers modern Node.js testing principles, built-in test runner usage, ES modules, and descriptive test naming conventions.

**Usage Guidelines:**

- Consult relevant rule files before making changes in their respective domains
- When in doubt about standards or best practices, reference the appropriate rule file
- These rules supersede general coding conventions when conflicts arise
- Always prioritize safety and compliance as outlined in the prompt review guidelines

---

## 2. Commands

Reference (unchanged in code):

```
node src/js/cli/sxo.js --help
node src/js/cli/sxo.js create <project>
node src/js/cli/sxo.js add <component>
node src/js/cli/sxo.js dev
node src/js/cli/sxo.js build
node src/js/cli/sxo.js start
node src/js/cli/sxo.js clean
node src/js/cli/sxo.js generate
pnpm test
```

**Create command** (`sxo create <project>`):
- Scaffolds a new SXO project by fetching templates from GitHub.
- `project`: optional project name (defaults to current directory name if omitted or ".").
- If directory exists, prompts user to confirm overwrite.
- Downloads all template files concurrently (batch size: 5) with placeholder substitution (`project_name` replaced with actual name).
- Next steps printed after successful creation: install dependencies and run dev server.

**Add command** (`sxo add <component>`):
- Installs a component from the SXO basecoat library to the project's `src/components/` directory.
- Fetches component files (.jsx, .client.js, .css) from GitHub (https://raw.githubusercontent.com/gc-victor/sxo/main/components/src/components/).
- Falls back to local `components/src/components/` directory if GitHub is unavailable (e.g., offline, network error).
- Supports components with multiple file types: JSX (markup), client-side JS, and CSS styles.
- Logs which files were installed and their source (GitHub or local basecoat).
- Returns success only if at least one file was installed; reports "not found" if component doesn't exist in either source.

Dev auto-open uses readiness probe (HEAD then GET, status < 500 = ready).

---

## 3. Coding Standards

- ESM only, Node 20+.
- Small modules; explicit side effects.
- Exported utility functions: JSDoc where non-trivial.
- Structured errors or clear messages near boundaries; do not deeply wrap generic exceptions unless adding value.
- Avoid broad repository reformatting; respect existing style.

### JSX Examples Documentation & Style

JSX examples in this project documentation and style standards to ensure consistency, maintainability, and proper vanilla JSX patterns.

Authoritative sources (read these before editing any [`examples/**/*.jsx`](examples) files):

- [`.rules/jsx-standards.md`](.rules/jsx-standards.md) (primary combined rules + style guide)
- [`.rules/jsdoc.md`](.rules/jsdoc.md) (comprehensive JSDoc reference)

Quick non-normative summary:

- Every example file includes a structured `@fileoverview` header (with “vanilla JSX” mention).
- Each exported component with object props has a `<Name>Props` typedef documenting `class` / `className`
  aliasing, `children`, and `rest`.
- Use native HTML semantics (`<details>/<summary>`, `<dialog>`, etc.) plus `// LIMITATION:` notes instead of
  re‑creating behavior imperatively.
- Avoid React runtime patterns, `data-*` attributes, and uncontrolled `id` usage.
- Tag each new public export with `@public` (do NOT use `@since` — version tracking belongs in git history).
- Follow migration & validation checklists in the referenced rule file.

#### Native HTML Attribute Inheritance

All component `*Props` typedefs now explicitly extend shared `HTML*Attributes` typedefs defined in [`components/src/types/jsx.d.ts`](components/src/types/jsx.d.ts).

Pattern:

- Each component typedef uses intersection syntax: `HTML[Element]Attributes & { customProps }`
- Components with conditional rendering (Button, Badge) use attribute union: `(HTMLButtonAttributes & HTMLAnchorAttributes) & { customProps }`
- Components with dynamic tag selection use `HTMLElementAttributes & { as?: string, customProps }`
- No `HTMLElementAttributes` base type (each element type is self-contained)
- Custom props documented explicitly; native attributes inherited implicitly
- Import required types at top of each component file

Example:

```javascript
/**
 * Props accepted by `<ComponentName />`.
 *
 * [Brief description of what the component does]
 * [Note about conditional rendering if applicable]
 * [Note about forwarded attributes]
 *
 * @typedef {HTML[Element]Attributes & ComponentProps & {
 *   customProp1?: type,
 *   customProp2?: type,
 * }} ComponentNameProps
 */


Exception: Sentinel pattern components (e.g., `ComboboxOption`, `ComboboxGroup`) return plain objects, not DOM nodes, and do not inherit element attributes.

## 4. Layout (Key Directories)

```
src/js/
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
````

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

If expanding to multi-param or advanced patterns: update sections (README + here) & tests under [`src/js/server/utils/tests/route-match.test.js`](src/js/server/utils/tests/route-match.test.js).

---

## 12. Build Pipeline

- Two parallel esbuild invocations (client + server).
- Client:
  - `entryPoints = [...clientRouteEntries]` (entry discovery appends `global.css` per route if present)
  - Dev names: `[dir]/[name]`
  - Prod names: `[dir]/[name].[hash]`
  - publicPath: sourced from `PUBLIC_PATH` environment variable (defaults to "/"); empty string "" preserved
  - per‑route client entry directory: sourced from resolved `clientDir` (default: "client")
  - After the client build finishes, the metafile plugin augments [`dist/server/routes.json`](dist/server/routes.json) with per‑route assets (`route.assets = { css: string[], js: string[] }`). It does not write any HTML files. The `sxo generate` step consumes `route.assets` to inject `<link rel="stylesheet">` and `<script type="module">` tags into generated HTML with PUBLIC_PATH normalization (empty string preserved; non‑empty values end with a trailing slash). At runtime, the dev and prod servers also inject `route.assets` for non‑generated routes using the same normalization rules.
- Server:
  - SSR bundles for route `jsx` modules plus special 404/500 modules (minify: true, no sourcemap).
- Build config: if `BUILD` is set (from config/env/flags), all properties in the build object are merged into the client esbuild config via spread operator (dev/build only). Defaults applied: `minify: true`, `sourcemap: isDev ? "inline" : false`.
- JSX transformer & runtime helpers:
  - Backed by a streaming JSX parser with error recovery (old precompiler removed; the [`jsx_precompile.rs`](jsx-transformer/jsx_precompile.rs) file was deleted).
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
  - Do NOT edit [`jsx-transformer/jsx_transformer.js`](jsx-transformer/jsx_transformer.js).
  - If you change helper names/semantics, parser strategy, or array detection heuristics, update README + AGENTS and adjust tests accordingly.
- Manifest write precedes builds (ensures server can start even if later build step fails?).
- Post-build optional step: `sxo generate` pre-renders non-dynamic routes using the built SSR modules, writes HTML back to [`dist/client`](dist/client), and sets `generated: true` in the manifest. Idempotent (skips already generated routes).

---

## 13. Config Resolution

`resolveConfig()` precedence: flags > file > env > defaults, but flags must be _explicit_ (tracked via `prepareFlags()`).
Derived env injected:

- `OUTPUT_DIR_CLIENT`, `OUTPUT_DIR_SERVER`
- `SXO_RESOLVED_CONFIG` (JSON)
- `DEV`, `SXO_COMMAND`
- `BUILD` (JSON custom esbuild client config object; only set in dev/build; also embedded in `SXO_RESOLVED_CONFIG`)
- `PUBLIC_PATH` (string public base URL for assets; defaults to "/" when unset; empty string "" preserved)
- `CLIENT_DIR` (per‑route client entry subdirectory; defaults to "client")
  Flag explicitness tests in [`src/js/config.test.js`](src/js/config.test.js); maintain those if adding new flags.

---

## 14. Readiness Probe

`openWhenReady()`:

- Backoff HEAD → GET
- Status < 500 (including 404) = success
- Timeout returns `{ opened:false, timedOut:true }`
  If altering thresholds or logic, update README & tests in [`src/js/cli/open.test.js`](src/js/cli/open.test.js).

---

## 15. Testing Strategy

Granular suites:

- CLI helpers ([`cli-helpers.test.js`](src/js/cli/cli-helpers.test.js))
- Spawn utilities
- Open/readiness logic
- Config precedence & explicit flags
- Entry points (fixtures)
- Middleware (dynamic export shapes)
- Utils (split: asset extraction, routing, statics security)
- JSX helpers (attribute canonicalization)

Add new test file when adding a discrete subsystem; keep responsibilities narrow. Read [`.rules/testing.instructions.md`](.rules/testing.instructions.md) for detailed testing guidelines.

---

## 16. Performance Considerations

- Manifest reuse avoids unnecessary directory traversal.
- Transform reduces per-file parse cost.
- No hydration means minimal client JS except optional route client entries.
- Hash toggling in dev fosters quick cache-bust semantics without full invalidation strategies.

---

## 17. When Updating This Doc

Trigger an update if you:

- Change manifest schema
- Modify middleware export contract
- Adjust slug pattern or multiple slug support
- Alter head injection markers or escaping rules
- Change hot reload payload shape

---

## 18. Non-Editable Artifacts

Do NOT modify:

- [`jsx-transformer/jsx_transformer.js`](jsx-transformer/jsx_transformer.js)
- Generated build outputs
- Future Rust/WASM build scripts
- [`routes.json`](dist/server/routes.json) directly (always produced by build)

---

## 19. Quick Reference (Cheat Sheet)

| Concern                    | File                                 |
| -------------------------- | ------------------------------------ |
| Route Discovery & Manifest | [`esbuild/entry-points-config.js`](src/js/esbuild/entry-points-config.js)     |
| Metafile & Asset Mapping   | [`esbuild/esbuild-metafile.plugin.js`](src/js/esbuild/esbuild-metafile.plugin.js) |
| Build Orchestrator         | [`esbuild/esbuild.config.js`](src/js/esbuild/esbuild.config.js)          |
| JSX Plugin                 | [`esbuild/esbuild-jsx.plugin.js`](src/js/esbuild/esbuild-jsx.plugin.js)      |
| Dev Server (entry point)   | [`server/dev.js`](src/js/server/dev.js)                      |
| Dev Server (Node.js)       | [`server/dev/node.js`](src/js/server/dev/node.js)            |
| Dev Server (Bun)           | [`server/dev/bun.js`](src/js/server/dev/bun.js)              |
| Dev Server (Deno)          | [`server/dev/deno.js`](src/js/server/dev/deno.js)            |
| Dev Server (Core Utils)    | [`server/dev/core.js`](src/js/server/dev/core.js)            |
| Prod Server                | [`server/prod.js`](src/js/server/prod.js)                     |
| Middleware Loader          | [`server/middleware.js`](src/js/server/middleware.js)               |

| Static Assets | [`server/utils/statics.js`](src/js/server/utils/statics.js) |
| Route Match | [`server/utils/route-match.js`](src/js/server/utils/route-match.js) |
| JSX Bundle Mapping | [`server/utils/jsx-bundle-path.js`](src/js/server/utils/jsx-bundle-path.js) |
| Special Error Pages Resolver | [`server/utils/error-pages.js`](src/js/server/utils/error-pages.js) |
| SSR Module Loader | [`server/utils/load-jsx-module.js`](src/js/server/utils/load-jsx-module.js) |
| Config Resolution | [`config.js`](src/js/config.js) |
| Readiness Probe | [`cli/open.js`](src/js/cli/open.js) |
| Static Generation | [`generate/generate.js`](src/js/generate/generate.js) |
| Core Runtime (Web Standard) | [`runtime/handler.js`](src/js/runtime/handler.js) |
| Node.js Adapter | [`server/prod/node.js`](src/js/server/prod/node.js) |
| Cloudflare Workers Adapter | [`server/prod/cloudflare.js`](src/js/server/prod/cloudflare.js) |
| Bun Adapter | [`server/prod/bun.js`](src/js/server/prod/bun.js) |
| Deno Adapter | [`server/prod/deno.js`](src/js/server/prod/deno.js) |
| Adapter Shared Utilities | [`server/prod/utils/`](src/js/server/prod/utils) |

---

## 19.1. Platform Adapters

SXO supports multiple deployment platforms via platform-specific adapters. Production adapters follow the **immediate-execution pattern** (same as dev adapters) for runtime-specific platforms, and a **factory pattern** for Cloudflare Workers.

### Architecture

```
src/js/server/
├── prod.js              # Universal entry point (auto-detects runtime)
└── prod/
    ├── node.js          # Node.js adapter (http.createServer)
    ├── bun.js           # Bun adapter (Bun.serve)
    ├── deno.js          # Deno adapter (Deno.serve)
    ├── cloudflare.js    # Cloudflare Workers adapter (factory pattern)
    └── utils/           # Shared utilities
        ├── mime-types.js
        ├── path.js
        ├── routes.js
        └── cache.js
```

All adapters share utilities from `src/js/server/prod/utils/`:
- `mime-types.js` - MIME type detection, compressibility checks, default paths
- `path.js` - Safe path resolution, extension detection, hashed asset detection
- `routes.js` - Generated route lookup
- `cache.js` - Cache-Control headers, ETag generation

### Package Exports

```json
{
  "exports": {
    ".": "./bin/sxo.js",
    "./runtime": "./src/js/runtime/handler.js",
    "./cloudflare": "./src/js/server/prod/cloudflare.js",
    "./dev-core": "./src/js/server/dev/core.js",
    "./dev-node": "./src/js/server/dev/node.js",
    "./dev-bun": "./src/js/server/dev/bun.js",
    "./dev-deno": "./src/js/server/dev/deno.js"
  }
}
```

Note: `./node`, `./bun`, and `./deno` exports removed (CLI-only usage via `sxo start`).

### How It Works

**Runtime-Specific Adapters (Node.js, Bun, Deno):**

1. User runs `sxo start` (same command for all runtimes)
2. CLI spawns `server/prod.js` using the current runtime
3. `prod.js` detects runtime via `globalThis.Bun` / `globalThis.Deno` checks
4. Dynamic import loads `./prod/${runtime}.js`
5. Platform-specific adapter starts the prod server immediately (no exports)

**Pattern:**
```javascript
// src/js/server/prod.js (universal entry point)
function detectRuntime() {
  if (typeof globalThis.Bun !== "undefined") return "bun";
  if (typeof globalThis.Deno !== "undefined") return "deno";
  return "node";
}

const runtime = detectRuntime();
await import(`./prod/${runtime}.js`);
```

Each adapter (`node.js`, `bun.js`, `deno.js`):
- Loads routes, modules, and middleware at startup
- Starts server immediately (immediate execution, no exports)
- Provides custom 404/500 error pages
- Serves static files with precompression (.br, .gz)
- Handles SSR for dynamic routes
- Serves pre-generated HTML for static routes

### Usage

**Node.js / Bun / Deno (CLI Only):**
```bash
# Simply use the CLI (auto-detects runtime)
sxo start
```

No custom server file needed. The CLI automatically:
- Detects your JavaScript runtime
- Loads the appropriate adapter
- Starts the production server

**Cloudflare Workers (Factory Pattern):**

Cloudflare Workers requires a custom entry point due to its environment constraints.

Configure `wrangler.jsonc` with aliases for virtual imports:
```jsonc
{
  "alias": {
    "sxo:routes": "./dist/server/routes.json",
    "sxo:modules": "./dist/server/modules.js"
  }
}
```

Then create `src/index.js`:
```javascript
import { createHandler } from "sxo/cloudflare";

// Routes and modules auto-resolved via wrangler.jsonc aliases
export default await createHandler({
  publicPath: "/",
});
```

### Platform-Specific APIs

| Feature | Node.js | Bun | Deno | Cloudflare |
|---------|---------|-----|------|------------|
| HTTP Server | `http.createServer()` | `Bun.serve()` | `Deno.serve()` | `export default` |
| File Reading | `fs.readFile()` | `Bun.file()` | `Deno.readTextFile()` | `env.ASSETS` |
| File Stats | `fs.stat()` | `Bun.file().size` | `Deno.stat()` | N/A |
| Startup | Immediate execution | Immediate execution | Immediate execution | Factory pattern |

### Middleware

**All Runtimes (Web Standard):**

All production adapters (Node.js, Bun, Deno, Cloudflare Workers) use the Web Standard Request/Response pattern:

```javascript
// src/middleware.js
export default function middleware(request, env) {
  if (new URL(request.url).pathname === '/health') {
    return new Response('OK', { status: 200 });
  }
  // Return nothing to continue to next middleware/handler
}
```

Middleware signature: `(request: Request, env?: object) => Response | void`
- Return a `Response` to short-circuit and handle the request
- Return `void`/`undefined` to continue to the next middleware or route handler
- The `env` parameter is optional and provides environment context (e.g., Cloudflare Workers bindings)

Note: The Node.js adapter converts between Node.js HTTP primitives and Web Standard Request/Response internally using `toWebRequest()` and `fromWebResponse()` adapters.

### Examples

- [`examples/node/`](examples/node) - Node.js CLI-only example
- [`examples/bun/`](examples/bun) - Bun CLI-only example
- [`examples/deno/`](examples/deno) - Deno CLI-only example
- [`examples/workers/`](examples/workers) - Cloudflare Workers factory pattern example

---

## 19.2. Dev Server Adapters

The development server supports multiple JavaScript runtimes through platform-specific adapters. The `sxo dev` command automatically detects the runtime and loads the appropriate adapter.

### Architecture

```
src/js/server/
├── dev.js              # Universal entry point (auto-detects runtime)
└── dev/
    ├── core.js         # Shared utilities (debounce, error rendering)
    ├── node.js         # Node.js adapter (http, fs.watch, child_process)
    ├── bun.js          # Bun adapter (Bun.serve, Bun.spawn)
    └── deno.js         # Deno adapter (Deno.serve, Deno.Command, Deno.watchFs)
```

### How It Works

1. User runs `sxo dev` (same command for all runtimes)
2. CLI spawns `server/dev.js` using the current runtime
3. `dev.js` detects runtime via `globalThis.Bun` / `globalThis.Deno` checks
4. Dynamic import loads `./dev/${runtime}.js`
5. Platform-specific adapter starts the dev server

### Features (All Adapters)

- **Hot Reload via SSE**: Pushes body updates to connected clients
- **File Watching**: Monitors `src/` directory for changes
- **esbuild Integration**: Rebuilds on file changes
- **Middleware Reloading**: Reloads `middleware.js` dynamically
- **Static File Serving**: Serves from `dist/client/`
- **Error Overlay**: Displays build errors in browser

### Platform-Specific APIs

| Feature | Node.js | Bun | Deno |
|---------|---------|-----|------|
| HTTP Server | `http.createServer()` | `Bun.serve()` | `Deno.serve()` |
| File Watching | `fs.watch()` | `fs.watch()` | `Deno.watchFs()` |
| Process Spawn | `child_process.spawn()` | `Bun.spawn()` | `Deno.Command()` |
| File Reading | `fs.readFile()` | `Bun.file()` | `Deno.readTextFile()` |
| SSE Streaming | Response write | `ReadableStream` | `ReadableStream` |

### Usage

For most projects, simply use the CLI:

```bash
# Works on Node.js, Bun, or Deno
sxo dev
```

For advanced use cases, adapters can be imported directly:

```javascript
// Node.js
import "sxo/dev-node";

// Bun
import "sxo/dev-bun";

// Deno
import "sxo/dev-deno";
```

### Immediate-Execution Pattern

Dev adapters use the **immediate-execution pattern**: importing the module starts the server immediately. This matches the original `dev.js` behavior and simplifies CLI integration.

```javascript
// This starts the dev server immediately (no factory function needed)
await import("./dev/node.js");
```

---

## 20. AI Contribution Workflow (Reaffirmed)

1. Clarify ambiguities.
2. Propose plan for multi-file or structural changes.
3. Keep edits scoped; request confirmation >300 LOC or >3 files.
4. Add `AIDEV-NOTE:` near nuanced logic.
5. Update docs when surface area changes.
6. Add / adjust tests before changing runtime semantics.
7. Never “optimize” readability at cost of behavior without approval.

---

## 21. Prompt Refinement Template

Mandatory: Every incoming user prompt (coding / architectural task) must be refined using this template before execution (unless the prompt explicitly instructs to skip refinement). This guarantees consistent structure, explicit constraints, and actionable acceptance criteria.

Refinement Goal:
Produce a higher-clarity, higher-specificity prompt preserving original intent while adding any missing explicit constraints relevant to this repository (see earlier sections for authoritative constraints).

Distilled Key Additions (Reference-Inspired):
Priority Order (apply when resolving conflicts):

1. Safety & Compliance
2. Factual Accuracy & Integrity
3. User Goal Fulfillment (task completeness)
4. Instruction / Format Adherence (schemas, tools, required output contract)
5. Efficiency (token, latency, minimal unnecessary tool calls)
6. Maintainability & Auditability
7. Style / Tone (last; never override higher priorities)

Core Success Criteria:

- All explicit user requirements satisfied or explicitly scoped out with rationale.
- No safety / compliance violations; no fabricated claims.
- No unresolved contradictory instructions (log assumption if ambiguity remains).
- Output matches requested structure (sections, patch format, code fences, etc.).
- Tool usage (when available) is purposeful; no redundant lookups.
- Assumptions are minimal, explicitly listed if materially affecting output.
- Tests / diagnostics remain green (or newly added if surface area expands).

Tool Usage Principles (when tools are available in the environment):

- Use tools to inspect before modifying; evidence over inference.
- Avoid repeated identical searches.
- Only exceed implicit tool budget if correctness or safety would suffer; note justification.
- If required info is unavailable, proceed with clearly marked assumptions instead of stalling.

Assumption Logging:

- Only create assumptions for blocking unknowns.
- Each assumption should be necessary, testable, and low-risk; otherwise seek clarification (unless user forbids).
- If user forbids refinement/clarification, proceed under clearly stated assumptions.

Failure / Uncertainty Handling:

- If a required resource is missing: state the gap + proposed fallback.
- If ambiguity persists after refinement: choose the safest minimally invasive interpretation and continue; note it.
- Do not loop requesting clarification unless safety-critical.

Optional Refinement Parameters (lightweight mapping to extended template ideas—do not over-engineer):

- reasoning_effort: minimal | standard | deep (controls plan verbosity; default: standard).
- verbosity: low | normal | high (affects explanatory prose; never reduces required structural output).
  (If user supplies analogous parameters, honor them; otherwise defaults apply silently.)

Operating Principles:

- Preserve original intent; do not introduce speculative requirements.
- Eliminate ambiguity and implicit assumptions.
- Prefer direct positive instructions over negations.
- Encourage: (a) brief high‑level plan, then (b) the deliverable.
- Include repository-relevant constraints when applicable.
- For code changes: specify language (ESM, Node 20), file paths, testing expectations, performance/security constraints if relevant.
- When tools (file read/edit, search, diagnostics) are available: instruct model to use them judiciously.
- Keep meta-commentary minimal—focus on actionable structure.

Output Requirement (when performing refinement task):
Return only the improved prompt (plain text) — no preamble, no justification. If the source prompt is already excellent, make minimal surgical edits.

Recommended Formatting Pattern (adapt as needed):

```
Role: <authoritative role; e.g., "You are an expert Node 20 ESM engineer contributing to the SXO project.">
Context:
- Project: SXO build + SSR system (see AGENTS.md sections for manifest, build, routing, constraints).
- Non-editable: jsx-transformer, generated artifacts, dist outputs.
- Relevant sections: <list sections that matter for this task>
Task:
<Clear, imperative statement of what to do.>
Constraints:
- ESM only; Node 20+.
- Modify only under [`src/js/**`](src/js) unless stated otherwise.
- Preserve architecture; no mega-refactors (>300 LOC or >3 files) without prior approval.
- Do not touch non-editable artifacts (Section 19).
- Follow Coding Standards & JSDoc rules (Section 3) if editing examples.
Steps (concise):
1. Analyze current state (use search / diagnostics if needed).
2. Propose minimal plan.
3. Implement changes.
4. Add/adjust tests (if behavior changes or new surface area).
5. Provide diff-focused summary.
Tools:
- Use available file read/search/edit and diagnostics tools as needed; prefer evidence over assumptions.
I/O:
- Output: <describe exact expected output format (e.g., "Return only the patch in the mandated <edits> format")>.
Quality bar:
- All tests pass.
- No lint or diagnostics regressions.
- Adheres to Golden Rules & security considerations.
- Success criteria (Section 22) satisfied; assumptions explicitly listed if any.
```

Example Invocation Input (raw user asks for vague change):
"Make the build faster."

Refined Prompt Output (illustrative):
(You would emit only the structured refined prompt per the pattern above, populated with concrete, testable acceptance criteria.)

Use this template verbatim structure only when refinement is explicitly requested or clearly beneficial; otherwise proceed with direct execution per Section 21 workflow.

Mandatory: Every incoming user prompt (coding / architectural task) must be refined using this template before execution (unless the prompt explicitly instructs to skip refinement). This guarantees consistent structure, explicit constraints, and actionable acceptance criteria.

Refinement Goal:
Produce a higher-clarity, higher-specificity prompt preserving original intent while adding any missing explicit constraints relevant to this repository (see earlier sections for authoritative constraints).

Operating Principles:

- Preserve original intent; do not introduce speculative requirements.
- Eliminate ambiguity and implicit assumptions.
- Prefer direct positive instructions over negations.
- Encourage: (a) brief high‑level plan, then (b) the deliverable.
- Include repository-relevant constraints when applicable.
- For code changes: specify language (ESM, Node 20), file paths, testing expectations, performance/security constraints if relevant.
- When tools (file read/edit, search, diagnostics) are available: instruct model to use them judiciously.
- Keep meta-commentary minimal—focus on actionable structure.

Output Requirement (when performing refinement task):
Return only the improved prompt (plain text) — no preamble, no justification. If the source prompt is already excellent, make minimal surgical edits.

Recommended Formatting Pattern (adapt as needed):

```
Role: <authoritative role; e.g., "You are an expert Node 20 ESM engineer contributing to the SXO project.">
Context:
- Project: SXO build + SSR system (see AGENTS.md sections for manifest, build, routing, constraints).
- Non-editable: jsx-transformer, generated artifacts, dist outputs.
- Relevant sections: <list sections that matter for this task>
Task:
<Clear, imperative statement of what to do.>
Constraints:
- ESM only; Node 20+.
- Modify only under [`src/js/**`](src/js) unless stated otherwise.
- Preserve architecture; no mega-refactors (>300 LOC or >3 files) without prior approval.
- Do not touch non-editable artifacts (Section 19).
- Follow Coding Standards & JSDoc rules (Section 3) if editing examples.
Steps (concise):
1. Analyze current state (use search / diagnostics if needed).
2. Propose minimal plan.
3. Implement changes.
4. Add/adjust tests (if behavior changes or new surface area).
5. Provide diff-focused summary.
Tools:
- Use available file read/search/edit and diagnostics tools as needed; prefer evidence over assumptions.
I/O:
- Output: <describe exact expected output format (e.g., "Return only the patch in the mandated <edits> format")>.
Quality bar:
- All tests pass.
- No lint or diagnostics regressions.
- Adheres to Golden Rules & security considerations.
```

Example Invocation Input (raw user asks for vague change):
"Make the build faster."

Refined Prompt Output (illustrative):
(You would emit only the structured refined prompt per the pattern above, populated with concrete, testable acceptance criteria.)

Use this template verbatim structure only when refinement is explicitly requested or clearly beneficial; otherwise proceed with direct execution per Section 21 workflow.
