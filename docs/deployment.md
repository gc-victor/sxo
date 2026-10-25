# Deployment

## Typical Flow

```shell
sxo build
sxo generate   # optional: pre-render static routes
sxo start --port 3000
```

Serve behind a reverse proxy if desired. Add your own [middleware](server.md) for compression (beyond precompressed artifacts), security headers, auth/sessions, and rate limiting.

## Platform Adapters

All adapters share the same Web Standard core (`Request`/`Response`), so behavior is identical across platforms.

### Node.js

```shell
npx sxo start
```

The CLI auto-detects the runtime (`globalThis.Bun` / `globalThis.Deno`, falling back to Node) and loads the matching adapter. Request/header timeouts; tune with `HEADER_TIMEOUT_MS` and `REQUEST_TIMEOUT_MS` (see [Configuration](configuration.md)). No graceful shutdown — SIGINT/SIGTERM terminate immediately.

### Bun

```shell
bunx sxo start
```

Uses `Bun.serve()` with native file I/O optimizations. Same signal behavior as Node.

### Deno

```shell
deno run -A npm:sxo start
```

Uses `Deno.serve()`. Same signal behavior as Node.

### Cloudflare Workers

Workers need a custom entry point using the `sxo/cloudflare` export and a factory pattern.

**wrangler.jsonc** — alias the build artifacts:

```jsonc
{
  "alias": {
    "sxo:routes": "./dist/server/routes.json",
    "sxo:modules": "./dist/server/modules.js",
  },
}
```

**worker.js**:

```javascript
import { createHandler } from "sxo/cloudflare";
import middleware from "./src/middleware.js";

export default await createHandler({
  publicPath: "/",
  middleware,
});
```

**Custom error pages** must be passed explicitly (unlike Node/Bun/Deno, which load them from `PAGES_DIR` automatically). Flat files (`404.jsx`) or folder-based (`404/index.jsx`) both work:

```javascript
import { createHandler } from "sxo/cloudflare";
import middleware from "./src/middleware.js";
import { default as render404 } from "./src/pages/404.jsx";
import { default as render500 } from "./src/pages/500.jsx";

export default await createHandler({
  publicPath: "/",
  middleware,
  render404,
  render500,
});
```

Local dev and deploy:

```shell
pnpm dev      # SXO dev server (SSE hot replace)
pnpm start    # wrangler dev (run in another terminal)
pnpm build    # triggers postbuild import generation
pnpm deploy   # wrangler deploy
```

See [`examples/workers`](../examples/workers) for the full setup, including the post-build import generation script.

### Custom platforms (`sxo/runtime`)

For platforms without a built-in adapter, `sxo/runtime` exposes the Web Standard core handler:

```javascript
import { readFile } from "node:fs/promises";
import { createCoreHandler } from "sxo/runtime";
import * as home from "./dist/server/index.js";

// This Node example uses readFile; use your platform's equivalent if needed.
const routes = JSON.parse(await readFile("./dist/server/routes.json", "utf8"));

const handle = createCoreHandler({
  routes,
  modules: { "src/pages/index.jsx": home }, // keyed by each route's `jsx` path
  publicPath: "/",
  middleware: [],
});

const response = await handle(request, env);
```

`createCoreHandler({ routes, modules, publicPath?, middleware? })` returns an async `(request, env?) => Response | null` function. It runs middleware, matches routes, and SSRs pages. It does not serve static assets. It returns `null` for unmatched routes and routes marked `generated: true`; your platform must serve generated HTML and other static assets, and handle unmatched routes (for example, with its own 404).

> **Caveat**: the core handler calls render functions with `params` only and does not honor a page-returned `Response`. The Node, Bun, Deno, and Cloudflare adapters support both.

## Examples

Runnable references for every platform:

| Example | Runtime | Notes |
| ------- | ------- | ----- |
| [`examples/node`](../examples/node) | Node.js | Static + dynamic routing, middleware API, client entries |
| [`examples/bun`](../examples/bun) | Bun | Same app on `Bun.serve()` |
| [`examples/deno`](../examples/deno) | Deno | Same app on `Deno.serve()` |
| [`examples/workers`](../examples/workers) | Cloudflare Workers | Wrangler config, import generation, deploy |
| [`examples/todo`](../examples/todo) | Node.js | Full app: `node:sqlite` store, JSON API, reactive island ([tutorial](tutorials/todo-app.md)) |

## Pre-Deploy Checklist

- [ ] `sxo build` succeeds; `dist/server` is **not** publicly served
- [ ] HTTPS terminated at proxy/edge; HSTS via middleware where applicable
- [ ] Security headers and CSP configured ([Security](security.md))
- [ ] Auth, rate limiting, input validation implemented in middleware
- [ ] Static routes generated where appropriate; live-data routes excluded
- [ ] Secrets in environment variables, never committed
