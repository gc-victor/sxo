# SXO Documentation

SXO is a server-side JSX framework: directory-based routing, full-HTML page components, framework-free client islands, esbuild-speed builds, and one CLI for dev, build, and production — on Node.js, Bun, Deno, or Cloudflare Workers.

New to SXO? Start with the [project README](../README.md) for the overview, quick start, and full table of contents, or jump straight into the [Getting Started guide](getting-started.md).

## Documentation Map

| Document | What it covers |
| -------- | -------------- |
| [Getting Started](getting-started.md) | Why SXO, key features, installation, your first project |
| [Architecture](architecture.md) | Project model, entry discovery, aliases, request pipeline |
| [CLI](cli.md) | `sxo create/add/dev/build/start/clean/generate`, all flags |
| [Routing](routing.md) | Directory routes, dynamic parameters, naming rules |
| [Pages](pages.md) | Page module API, HTML documents, global.css, 404/500 pages, escaping |
| [Client](client.md) | Reactivity islands: `define()`, `$state`/`$on`/`$bind`/`$ref`/`$compute`/`$effect`, contexts, hot replace |
| [Server](server.md) | Middleware contract, JSON APIs, rendering JSX from middleware, SSR pipeline |
| [Configuration](configuration.md) | `sxo.config.*`, CLI flags, environment variables, precedence |
| [Build & Assets](build-and-assets.md) | `dist/` outputs, routes manifest, static generation, asset serving |
| [Components (SXOUI)](components.md) | The component library and `sxo add` |
| [Deployment](deployment.md) | Platform adapters: Node.js, Bun, Deno, Cloudflare Workers |
| [Testing](testing.md) | Test suites for the framework and guidance for your app |
| [Security](security.md) | Built-in protections, your responsibilities, checklist |

## Tutorials

| Tutorial | What you build |
| -------- | -------------- |
| [Todo App](tutorials/todo-app.md) | A full todo app: SSR page, `node:sqlite` storage, JSON API via middleware, reactive client island. Runnable code in [`examples/todo`](../examples/todo). |

## More Examples

Runnable examples live in [`examples/`](../examples/): [`node`](../examples/node), [`bun`](../examples/bun), [`deno`](../examples/deno), [`workers`](../examples/workers) (Cloudflare), and [`todo`](../examples/todo).

For vulnerability disclosure and the in-depth security guide, see [SECURITY.md](../SECURITY.md).
