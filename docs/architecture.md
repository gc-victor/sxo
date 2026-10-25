# Architecture

## Model

1. **Source directory** (default `src`) containing:
   - Optional `components` directory with JSX components
   - Optional `utils` directory with utility functions
   - Optional `middleware.js` defining the user middleware chain
2. **Pages directory** (default `src/pages`) containing:
   - `global.css` (optional)
   - Route directories, each with an `index.(tsx|jsx|ts|js)`
3. **Entry point discovery**
   - Each directory containing an `index.*` page file becomes a route.
   - Every `<clientDir>/index.*` and `<clientDir>/*.index.*` file inside that route directory is collected as a client entry (default `clientDir` is `client`). All matching variants are added; there is no extension precedence.
   - Root-level `<clientDir>/index.*` / `*.index.*` files (e.g. `src/pages/client/index.js`) are added to every route, so shared interactive components work on every page.
   - `global.css`, if present, is added as a shared stylesheet entry for every route.
4. **Build**
   - Client bundle → `dist/client` (public)
   - Server bundle (SSR modules) → `dist/server` (private)
   - Manifest → `dist/server/routes.json`
5. **Runtime**
   - Dev: SSE hot replace updates the `<body>` innerHTML and re-applies relevant asset tags.
   - Prod: a minimal HTTP server loads server bundles (ESM) and injects JSX output.

Details on outputs and the manifest: [Build & Assets](build-and-assets.md).

## Request Pipeline

Every request is handled by one shared, Web Standard core (`Request` in, `Response` out):

```
Request
  → middleware chain (src/middleware.js)   # may short-circuit with a Response
  → static asset serving (dist/client)     # prod/dev
  → route matching (routes.json)
  → SSR: page module render (dist/server)  # or pre-generated HTML
  → asset injection → Response
```

Middleware runs first and can handle any request itself (JSON APIs, auth, redirects). See [Server](server.md).

## Multi-Runtime

SXO is a multi-runtime library:

- **Node.js** — full-featured production server with request/header timeouts. No graceful-shutdown handling; SIGINT/SIGTERM terminate immediately.
- **Bun** — native file I/O optimizations; same signal behavior.
- **Deno** — secure-by-default with native TypeScript support; same signal behavior.
- **Cloudflare Workers** — edge deployment via a factory entry point (`sxo/cloudflare`).

**Runtime detection**: the CLI checks `globalThis.Bun` and `globalThis.Deno`, falling back to Node.js. Each adapter uses platform-native APIs (`Bun.serve()`, `Deno.serve()`, `http.createServer()`).

**Shared core**: all adapters share the same Web Standard core, so routing, SSR, static file serving, and middleware behave identically everywhere. Cloudflare Workers is the exception in *entry style* only (see [Deployment](deployment.md)).

## Path Aliases

Aliases are resolved with this precedence:

1. `tsconfig.json` → `compilerOptions.paths` (explicit configuration takes full control)
2. `package.json` → `imports` (`#foo` subpath imports become `@foo` aliases)
3. **Auto-discovery**: each subdirectory of the source directory becomes `@<name>` (e.g., `src/components` → `@components`); directories starting with `.` or `_` are skipped

`@pages` always points to the configured pages directory. Aliases apply to both client and server builds; on Node.js they are also resolved at runtime (dev/start) through a module loader hook.

A typical `src` layout yields:

```
@components -> src/components
@pages      -> src/pages
@utils      -> src/utils
```

## Build Technology

- **esbuild** bundles client and server builds separately.
- A **Rust/WASM JSX transformer** converts JSX into template literals with small runtime helpers (`__jsxComponent`, `__jsxSpread`, `__jsxRender`), including attribute normalization (`className` → `class`, `htmlFor` → `for`, SVG camelCase → kebab) and array-aware rendering.
- The server build is externalized from the public output: `dist/server` is never served.

## Performance & DX

- Rust/WASM JSX transform reduces parse overhead.
- Dual builds isolate server SSR bundles from public output.
- Hot replace patches fragments and assets without a full reload.
- A readiness probe prevents races on browser auto-open.
