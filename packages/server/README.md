# SXO server (internal)

Server runtime for [SXO](https://github.com/gc-victor/sxo) — dev/prod servers, the Web Standard SSR handler, config resolution, static generation, and platform adapters for Node.js, Bun, Deno, and Cloudflare Workers.

> **Internal workspace package.** This package is not published to npm and never needs to be installed. All of its surfaces ship inside the [`sxo`](https://www.npmjs.com/package/sxo) package as subpath exports.

## Public surfaces

The stable, documented surfaces of this package are available as `sxo/*` subpath exports of the root package:

| Export | Purpose |
| ------ | ------- |
| `sxo/dev-node`, `sxo/dev-bun`, `sxo/dev-deno` | Platform dev adapters invoked by the CLI |
| `sxo/runtime` | Web Standard `Request`/`Response` SSR handler |
| `sxo/cloudflare` | Cloudflare Workers adapter factory (`createHandler`) |

Additional internal `sxo/server/*` subpaths resolve the modules the CLI consumes (config resolution, aliases, constants, static generation, shared runtime utilities). They are implementation details, not documented API, and may change.

Example — Cloudflare Workers:

```javascript
import { createHandler } from "sxo/cloudflare";
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
