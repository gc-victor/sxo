# CLI

One binary covers the whole lifecycle:

```shell
sxo create [project]  # Create a new SXO project from templates
sxo add <component>   # Add an SXOUI component to the components directory
sxo dev               # Development server with hot replace
sxo build             # Production build (client and server bundles)
sxo start             # Production server serving the built output
sxo clean             # Remove the output directory
sxo generate          # Pre-render static routes to HTML (after build)
```

Run without installing via `npx sxo <command>` or `pnpm dlx sxo <command>`.

## `sxo create [project]`

Scaffolds a project from `templates/<runtime>` in the `gc-victor/sxo` repository.

- `sxo create my-app` — new directory
- `sxo create .` — current directory
- `sxo create` — uses the current directory's name

Prompts for a runtime (`node` default, `bun`, `deno`, `workers`); in non-interactive environments `node` is selected automatically. If the target directory exists, you must confirm overwriting.

Templates include Tailwind CSS v4 + basecoat-css preconfigured, path aliases, and a reactive counter demo.

## `sxo add <component>`

Installs an SXOUI component into the components directory (default `src/components`, override with `--components-dir` or `COMPONENTS_DIR`):

```shell
sxo add button
sxo add dialog
```

Browse available components at [sxoui.com](https://sxoui.com). See [Components](components.md).

## `sxo dev`

Starts the development server:

- Watches sources; rebuilds via esbuild on change.
- SSE hot replace at `/hot-replace?href=<path>` — partial `<body>` replacement with asset re-injection (see [Client](client.md)).
- Auto-opens the browser (default `open=true` for dev), waiting for a readiness probe (HEAD, falling back to GET; any status < 500 counts as ready; exponential backoff, ~10–12s timeout).

## `sxo build`

Builds client and server bundles into the output directory and writes the routes manifest. See [Build & Assets](build-and-assets.md).

## `sxo start`

Starts the production server serving `dist/client` assets and SSR from `dist/server`. Auto-detects the runtime (Node/Bun/Deno) and loads the matching adapter.

## `sxo clean`

Removes the output directory. `-y` skips confirmation.

## `sxo generate`

Pre-renders static routes after a successful build and marks them `generated: true` in the manifest. Only routes without dynamic parameters are generated; dynamic routes are always SSR'd per request. See [Build & Assets](build-and-assets.md#static-generation).

## Flags

```shell
--port <number>             # Server port (dev/start). Default: 3000
--pages-dir <path>          # Pages directory. Default: src/pages
--out-dir <path>            # Output directory. Default: dist
--open / --no-open          # Auto-open browser on dev ready (toggle)
--public-path <path>        # Public base URL for assets. Default: "/"; "" allowed (relative URLs)
--client-dir <name>         # Per-route client entry subdirectory name. Default: client
--components-dir <path>     # Components directory for 'sxo add'. Default: src/components
--loaders <ext=loader>      # esbuild server loaders (dev/build); repeatable or comma-separated
--verbose                   # Verbose logging
--no-color                  # Disable ANSI colors (useful in CI)
```

Loader examples:

```shell
sxo dev --loaders ".svg=file" --loaders ".ts=tsx"
sxo build --loaders "svg=file,ts=tsx"
```

Flags only override config/env/defaults when **explicitly** passed (`--open`, `--no-open`, `--open=false`); inferred defaults are filtered out.

Precedence and environment variables: [Configuration](configuration.md).
