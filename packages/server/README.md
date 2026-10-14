# @sxo/server

Server runtime for [SXO](https://github.com/gc-victor/sxo) — dev/prod servers, the Web Standard SSR handler, config resolution, static generation, and platform adapters for Node.js, Bun, Deno, and Cloudflare Workers.

## Installation

```shell
npm install @sxo/server
```

> Most users should install [`sxo`](https://www.npmjs.com/package/sxo) instead — it bundles the CLI and re-exports this runtime. Install `@sxo/server` directly only when building a custom server or adapter.

## Exports

| Subpath | Purpose |
| ------- | ------- |
| `@sxo/server` | Dev server core |
| `@sxo/server/runtime` | Web Standard `Request`/`Response` SSR handler |
| `@sxo/server/cloudflare` | Cloudflare Workers adapter factory (`createHandler`) |
| `@sxo/server/dev-node`, `/dev-bun`, `/dev-deno` | Platform dev adapters |
| `@sxo/server/config` | Config resolution (flags > file > env > defaults) |
| `@sxo/server/config/aliases` | Path alias resolution (tsconfig paths / package imports / auto-discovery) |
| `@sxo/server/generate` | Static generation (pre-render static routes to HTML) |

Example — Cloudflare Workers:

```javascript
import { createHandler } from "@sxo/server/cloudflare";
import middleware from "./src/middleware.js";

export default await createHandler({
    publicPath: "/",
    middleware,
});
```

## Documentation

Full docs, guides, and examples: [github.com/gc-victor/sxo](https://github.com/gc-victor/sxo#readme)

## License

MIT
