# Getting Started

## Why SXO

- **Server-side JSX**, zero client framework by default.
- **Directory-based routing** that stays explicit (route = folder with `index.(tsx|jsx|ts|js)`).
- **Composable HTML ergonomics** using plain functions.
- **Blazing-fast builds** via esbuild and a Rust/WASM JSX transform step.
- **Single CLI** covering dev, build, start & clean.
- **Predictable output**: public client bundle + private server bundle + manifest.
- **Multi-runtime**: deploy to Node.js, Bun, Deno, or Cloudflare Workers.

## Key Features

- **Directory-based routing** — each directory is a route; dynamic segments (`[slug]`) are passed to the page at render time. See [Routing](routing.md).
- **Full HTML page components** — every page returns its own `<html>`, `<head>`, and `<body>`. See [Pages](pages.md).
- **Built-in reactive components** — the bundled [`sxo/client`](client.md) library (`define()`, `ReactiveComponent`, `createContext`) adds framework-free islands only where needed.
- **Dev server** — hot replace (SSE partial replacement) and auto-open with readiness probe.
- **Production server** — minimal core; bring your own policy via [middleware](server.md).
- **Dual build outputs** — hashed client assets; private server bundles. See [Build & Assets](build-and-assets.md).
- **Rust-powered JSX transformer** — fast, with small runtime helpers.
- **Platform adapters** — first-class Node.js, Bun, Deno, and Cloudflare Workers support. See [Deployment](deployment.md).
- **Configurable esbuild loaders** and **public base path** — via flag, env, or config. See [Configuration](configuration.md).

## Requirements

- Node.js 20+ (the CLI runs on Node; your app can deploy to Bun, Deno, or Workers)
- pnpm, npm, or npx

## Quick Start

No install needed:

```shell
npx sxo dev
```

or

```shell
pnpm dlx sxo dev
```

## Create a Project

```shell
# New directory
sxo create my-app

# Current directory
sxo create .

# Use the current directory's name
sxo create
```

You'll be prompted for a runtime:

```
Select a runtime:
  1) node (default)
  2) bun
  3) deno
  4) workers
```

Press Enter for `node`. In non-interactive environments (CI), the prompt is skipped and `node` is used.

Then:

```shell
cd my-app
pnpm install
pnpm run dev
```

Templates ship with Tailwind CSS v4 and basecoat-css preconfigured (`src/styles.css` compiled to `src/pages/global.css`), path aliases in `jsconfig.json`/`tsconfig.json`, and a reactive counter demo. Templates are fetched from the `gc-victor/sxo` repository under `templates/<runtime>/`.

If the target directory exists, you'll be asked to confirm overwriting.

## Project Layout

```
your-app
├── src
│   ├── middleware.js
│   ├── components
│   │   ├── Page.jsx
│   │   └── Header.jsx
│   └── pages
│       ├── global.css
│       ├── index.jsx
│       └── about
│           ├── index.jsx
│           └── client
│               └── index.js
└── package.json
```

A component is a plain function:

```jsx
// src/components/Page.jsx
export function Page({ children }) {
  return <div className="page">{children}</div>;
}
```

A page returns a full HTML document:

```jsx
// src/pages/index.jsx
import { Header } from "@components/Header.js";

export default () => (
  <html lang="en">
    <head>
      <meta charSet="UTF-8" />
      <title>Home</title>
    </head>
    <body>
      <Header title="Home" />
      <p>Welcome to SXO.</p>
    </body>
  </html>
);
```

## Commands at a Glance

```shell
sxo create [project]  # Scaffold a project from templates
sxo add <component>   # Add an SXOUI component to src/components
sxo dev               # Dev server with hot replace
sxo build             # Production build (client + server bundles)
sxo start             # Serve the built output
sxo clean             # Remove build artifacts
sxo generate          # Pre-render static routes after a build
```

Full reference: [CLI](cli.md).

## Add UI Components

```shell
sxo add button
sxo add dialog
```

Components are installed to `src/components/`. Browse the library at [sxoui.com](https://sxoui.com). Details: [Components](components.md).

## Next Steps

1. Read [Routing](routing.md) and [Pages](pages.md) to structure your app.
2. Add interactivity with [Client](client.md) islands.
3. Add a JSON API with [Server](server.md) middleware.
4. Build the whole thing end to end in the [Todo App tutorial](tutorials/todo-app.md).
