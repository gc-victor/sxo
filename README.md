<picture>
    <source media="(prefers-color-scheme: dark)" srcset="./docs/sxo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="./docs/sxo-light.svg">
    <img alt="SXO" src="./docs/sxo-light.svg">
</picture>

# Server-Side JSX. Build Simple. Build Fast

A **fast**, minimal architecture convention and CLI for building websites with server‑side JSX. **No React, no client framework**, just composable **JSX optimized for the server**, a clean **directory-based router**, **hot replacement**, and powered by esbuild plus a Rust JSX transformer.

**Multi-Platform Library**: SXO runs seamlessly across **Node.js**, **Bun**, **Deno**, and **Cloudflare Workers**. The CLI automatically detects your runtime and loads the optimized adapter, while providing a consistent development and production experience across all platforms.

## Table of Contents

- [Why SXO](#why-sxo)
- [Key Features](#key-features)
- [Multi-Runtime Support](#multi-runtime-support)
- [Architecture Overview](#architecture-overview)
- [Quick Start](#quick-start)
- [SXOUI Component Library](#sxoui-component-library)
- [Examples](#examples)
- [Platform Adapters](#platform-adapters)
- [Routing Guide](#routing-guide)
- [Page Module API](#page-module-api)
- [Middleware](#middleware)
- [Hot Replace (Dev)](#hot-replace-dev)
- [Build Outputs & Manifest](#build-outputs--manifest)
- [Static Generation & Production Behavior](#static-generation--production-behavior)
- [HTML Template and Styles](#html-template-and-styles)
- [Static Asset Serving](#static-asset-serving)
- [Configuration](#configuration)
- [Environment Variables](#environment-variables)
- [JSX Transformer & Runtime Helpers](#jsx-transformer--runtime-helpers)
- [Performance and DX](#performance-and-dx)
- [Security](#security)
- [Testing](#testing)
- [Deployment](#deployment)
- [Acknowledgements](#acknowledgements)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Why SXO

- **Server-side JSX**, zero client framework by default.
- **Directory-based routing** that stays explicit (route = folder with `index.(jsx|tsx)`).
- **Composable HTML ergonomics** using plain functions.
- **Blazing-fast builds** via esbuild and a Rust/WASM JSX transform step.
- **Single CLI** covering dev, build, start & clean.
- **Predictable output**: public client bundle + private server bundle + manifest.
- **Multi-Runtime Support**: Deploy to Node.js, Bun, Deno, or Cloudflare Workers.

## Key Features

- **Directory-based routing**: each directory is a route and can include dynamic parts (for example a post ID or slug) which are provided to the page at render time.
- **Full HTML page components**: each page's render function returns a complete <html> document (including <head> and <body>).
- **Full-document pages**: each page is self-contained and returns its own `<html>`, `<head>`, and `<body>`.
- **Optimized for Reactive Components**: pair with tiny primitives from [reactive-component](https://github.com/gc-victor/reactive-component) to add islands only where needed.
- **Dev server**: hot replace (SSE partial replacement) and auto-open with readiness probe.
- **Production server**: minimal core (bring your own policy via middleware).
- **Dual build outputs**: client assets use hashed filenames; separate server bundles (never exposed publicly).
- **Rust-powered JSX transformer**: fast + small runtime helpers.
- **Platform Adapters**: First-class support for **Node.js**, **Bun**, **Deno**, and **Cloudflare Workers**.
- **Configurable esbuild loaders** for server build: assign loaders per file extension via config, env, or CLI flags (e.g., `--loaders ".svg=file" --loaders ".ts=tsx"`).
- **Configurable public base path** for assets: set via flag (`--public-path`), env (`PUBLIC_PATH`), or config; empty string "" allowed for relative URLs.

## Multi-Runtime Support

SXO is designed as a **truly multi-runtime library** that runs seamlessly across different JavaScript runtimes:

- **Node.js**: Full-featured production server with HTTP/2 support, timeouts, and graceful shutdown
- **Bun**: High-performance runtime with native file I/O optimizations
- **Deno**: Secure-by-default runtime with native TypeScript support
- **Cloudflare Workers**: Edge computing with distributed deployment

### How It Works

The SXO CLI automatically detects your JavaScript runtime and loads the appropriate platform adapter:

```shell
# Same command works everywhere
npx sxo dev    # Development server
npx sxo start  # Production server
```

**Runtime Detection**: The CLI checks `globalThis.Bun` and `globalThis.Deno` to identify the current platform, falling back to Node.js. Each adapter uses platform-native APIs (e.g., `Bun.serve()`, `Deno.serve()`, `http.createServer()`) for optimal performance.

**Shared Core Logic**: All adapters share the same Web Standard-based core (`Request`/`Response`), ensuring consistent behavior across platforms. Routing, SSR, static file serving, and middleware execution work identically everywhere.

**Cloudflare Workers**: Due to its unique environment, Cloudflare Workers requires a custom entry point using the `sxo/cloudflare` export and a factory pattern (see [Platform Adapters](#platform-adapters)).

## Architecture Overview

**Model**

1. **Source Directory** (default `src`) containing:
   - Optional `components` directory with JSX components
   - Optional `utils` directory with utility functions
   - Optional `middleware.js` defining user middleware chain
2. **Pages Directory** (default `src/pages`) containing:
   - `global.css` (optional)
   - Route directories each with an `index.(tsx|jsx)`
3. **Entry Point Discovery**
   - Each directory containing an `index.*` page file becomes a route.
   - Optional `<clientDir>/index.(ts|tsx|js|jsx)` inside that route directory is added as a client entry (default `clientDir` is "client"; precedence: .ts > .tsx > .js > .jsx).
   - `global.css`, if present, is added as a shared stylesheet entry for every route.
4. **Build**
   - Client bundle → `dist/client`
   - Server bundle (SSR modules) → `dist/server`
   - Manifest → `dist/server/routes.json`
5. **Runtime**
   - Dev: SSE hot replace updates the <body> innerHTML and re-applies relevant asset tags.
   - Prod: Minimal HTTP server loads server bundles (ESM) and injects JSX output.

**Aliases**
Available in both client & server builds:

```shell
@components -> src/components
@pages      -> src/pages
@utils      -> src/utils
```

## Quick Start

Install & run (no install needed if using npx):

```shell
npx sxo dev
```

or

```shell
pnpm dlx sxo dev
```

Example structure:

```shell
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

Example component:

```jsx
// src/components/Page.jsx
export function Page({ children }) {
  return <div className="page">{children}</div>;
}
```

Example page:

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

Commands:

```shell
sxo create <project>  # Create a new SXO project from templates (prompts for runtime; defaults to node)
sxo add <component>     # Add a component from the basecoat library to src/components
sxo dev                 # Start the development server with hot replace
sxo build               # Build the project for production (client and server bundles)
sxo start               # Start the production server to serve built output
sxo clean               # Remove the output directory (clean build artifacts)
sxo generate            # Pre-render static routes to HTML after a successful build
```

Create a new project:

```shell
# Create a new project in a new directory
sxo create my-app

# Create a project in the current directory
sxo create .

# Or omit the name entirely (uses current directory name)
sxo create
```

**Runtime Selection:**

When you run the command, you'll see an interactive prompt to select your target runtime:

```
Select a runtime:
  1) node (default)
  2) bun
  3) deno
  4) workers

>
```

- **Press Enter** → selects `node` (default)
- **Type `1`** → selects `node`
- **Type `2`** → selects `bun`
- **Type `3`** → selects `deno`
- **Type `4`** → selects `workers` (Cloudflare Workers)

In non-interactive environments (CI, tests), the prompt is skipped and `node` is used automatically.

Templates are fetched from the `gc-victor/sxo` repository under `templates/<runtime>/...`.

**Existing Directory:**

If the target directory already exists, you'll be prompted to confirm overwriting:

```
Create SXO template in "my-app"? (This will overwrite existing files.) (y/N)
```

**Full Example Workflow:**

```shell
# 1. Create the project
sxo create my-app

# 2. Select runtime when prompted (or press Enter for node)
# > 2  (selects bun)

# 3. Follow the next steps printed by the CLI
cd my-app
pnpm install
pnpm run dev
```

Add components from SXOUI:

```shell
# Add a button component
sxo add button

# Add a dialog component
sxo add dialog

# Components are installed to src/components/
# Browse all available components at https://sxoui.com
```

**SXOUI Component Library**: SXO includes access to 25+ production-ready components via the `sxo add` command. Visit [**sxoui.com**](https://sxoui.com) to browse the complete component library with live demos, accessibility documentation, and copy-paste ready code examples.

Point to a different pages directory:

```shell
sxo build --pages-dir examples/node/src/pages
sxo start --pages-dir examples/node/src/pages --port 4011
```

Configure custom esbuild loaders for the server build:

```shell
# Via CLI flags (repeatable or comma-separated)
sxo dev --loaders ".svg=file" --loaders ".ts=tsx"
sxo build --loaders "svg=file,ts=tsx"

# Via environment variable (JSON format)
LOADERS='{"svg":"file",".ts":"tsx"}' sxo dev

# Via config file (sxo.config.json or sxo.config.js)
{
  "loaders": {
    ".svg": "file",
    ".ts": "tsx"
  }
}
```

## SXOUI Component Library

🎨 **[sxoui.com](https://sxoui.com)** — Production-ready components for SXO

SXOUI is a comprehensive component library built specifically for SXO, featuring 25+ accessible, semantic, and performant components that work with server-side rendering and optional client-side interactivity.

### Available Components

#### Layout & Structure
- **Card** - Flexible containers with header/body/footer
- **Badge** - Status indicators and labels
- **Breadcrumb** - Navigation trails
- **Pagination** - Multi-page controls
- **Table** - Data tables with sorting

#### Form Controls
- **Input** - Text, email, password, number inputs
- **Textarea** - Multi-line text with auto-resize
- **Select** - Native dropdowns with styling
- **Select Menu** - Custom accessible dropdowns with search
- **Checkbox** - Toggle selection with indeterminate state
- **Radio Group** - Mutually exclusive options
- **Switch** - Boolean toggle switches
- **Slider** - Numeric range inputs
- **Label** - Accessible form labels
- **Form** - Validation and layout utilities

#### Feedback & Overlays
- **Alert** - Info, success, warning, error banners
- **Alert Dialog** - Modal confirmations
- **Dialog** - General-purpose modals
- **Toast** - Temporary notifications
- **Skeleton** - Loading placeholders
- **Tooltip** - Contextual help

#### Navigation
- **Tabs** - Tabbed content organization
- **Dropdown Menu** - Action menus
- **Popover** - Floating content panels
- **Accordion** - Expandable sections

#### Content Display
- **Avatar** - Profile images with fallback
- **Button** - Interaction buttons with variants
- **Icon** - SVG icon system

### Key Features

- ✅ **Zero Framework Dependencies** - Built on vanilla JSX, no React required
- ♿ **WCAG 2.1 AA Compliant** - Full accessibility with ARIA attributes
- ⌨️ **Keyboard Navigation** - Complete keyboard support for all interactive elements
- 🎨 **Dark Mode Ready** - Built-in theme support with CSS custom properties
- 📱 **Responsive Design** - Mobile-first approach
- 🚀 **Performance Optimized** - Minimal bundle size with tree-shaking
- 📝 **Type Safe** - Comprehensive JSDoc type definitions
- 🎯 **Progressive Enhancement** - Works without JavaScript where possible

### Installation

```shell
# Install individual components
sxo add button
sxo add card
sxo add dialog

# Components are added to src/components/
```

### Documentation

Visit **[sxoui.com](https://sxoui.com)** for:
- 🎭 Live interactive demos for all components
- 📋 Copy-paste ready code snippets
- 📚 Complete API documentation (props, variants, usage)
- ♿ Accessibility notes and keyboard shortcuts
- 🔧 Integration guides and best practices

### Example Usage

```jsx
// src/pages/index.jsx
import Button from "@components/button.jsx";
import Card from "@components/card.jsx";

export default () => (
  <html lang="en">
    <head>
      <meta charSet="UTF-8" />
      <title>My App</title>
    </head>
    <body>
      <Card>
        <Card.Header>
          <Card.Title>Welcome</Card.Title>
        </Card.Header>
        <Card.Content>
          <p>Get started with SXOUI components</p>
        </Card.Content>
        <Card.Footer>
          <Button variant="primary">Get Started</Button>
        </Card.Footer>
      </Card>
    </body>
  </html>
);
```

## Examples

### Node.js Example

Demonstrates SXO with Node.js.

**Location**: `examples/node`

**Features**:

- Static and dynamic routing
- Web Standard middleware
- Per-route client entries
- Global CSS
- Server-side rendering with platform adapter

**Quickstart**:

```shell
cd examples/node
pnpm install
pnpm run dev
```

### Cloudflare Workers Example

A full example demonstrating SXO with Cloudflare Workers, including dynamic routes, per‑route client entries, global HTML/CSS, and deployment via Wrangler.

**Location**: `examples/workers`

**Features**:

- Dynamic routing with `[slug]` segments
- Optional per‑route client entry (`src/pages/<route>/client/index.js`)
- Shared components under `src/components`
- Global stylesheet (`src/pages/global.css`)
- Post‑build script for edge import generation
- Local dev and production deploy using Wrangler

**Quickstart**:

```shell
cd examples/workers
pnpm i

# SXO dev server (SSE hot replace)
pnpm dev

# Optional: run Worker locally in another terminal
pnpm start   # wrangler dev

# Build (triggers postbuild import generation)
pnpm build

# Deploy to Cloudflare Workers
pnpm deploy
```

**Structure**:

```shell
examples/workers/
├── scripts/
│   ├── generate-imports.js
│   └── index.js
├── src/
│   ├── components/
│   │   ├── Header.jsx
│   │   └── Page.jsx
│   └── pages/
│       ├── global.css
│       ├── index.jsx
│       ├── about/
│       │   ├── index.jsx
│       │   └── [slug]/index.jsx
│       └── counter/
│           ├── index.jsx
│           ├── counter.jsx
│           └── client/index.js
├── sxo.config.js
├── wrangler.jsonc
└── vitest.config.js
```

### Bun Example

Demonstrates SXO with Bun's high-performance runtime.

**Location**: `examples/bun`

**Quickstart**:

```shell
cd examples/bun
pnpm install
pnpm run dev
```

### Deno Example

Demonstrates SXO with Deno's secure runtime.

**Location**: `examples/deno`

**Quickstart**:

```shell
cd examples/deno
pnpm install
pnpm run dev
```

## Platform Adapters

SXO supports multiple deployment platforms beyond the standard CLI server. Adapters share the same core runtime and use Web Standard APIs (`Request`, `Response`).

### 1. Node.js Adapter

For running on Node.js.

```shell
npx sxo start
```

The CLI automatically detects the runtime and loads the optimized adapter.

### 2. Bun Adapter

For high-performance serving with Bun.

```shell
bunx sxo start
```

The CLI automatically detects the runtime and loads the optimized adapter.

### 3. Deno Adapter

For running on Deno.

```shell
deno run -A npm:sxo start
```

The CLI automatically detects the runtime and loads the optimized adapter.

### 4. Cloudflare Workers Adapter

Requires configuring `wrangler.jsonc` aliases to point to your build artifacts.

**wrangler.jsonc**:

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

## Routing Guide

A route exists when a directory contains an `index.(tsx|jsx|ts|js)` file.

Static example:

```shell
src/pages/
├── index.jsx        -> "/"
├── about/
│   └── index.jsx    -> "/about"
└── contact/
    └── index.jsx    -> "/contact"
```

Dynamic segments: directory named `[slug]` (currently limited to a single slug token per segment; nested dynamic directories are allowed).

```
src/pages/blog/[slug]/index.jsx  -> /blog/:slug
```

Parameters object passed to the page render function is shaped from bracket names: `{ slug: string }`.

## Page Module API

A page module can export:

| Export    | Type                        | Required | Description          |
| --------- | --------------------------- | -------- | -------------------- |
| `default` | `(params) => JSX` or string | Yes\*    | Page render function |

Note: Pages must return a full `<html>...</html>` document (including `<head>` and `<body>`). The separate `head` export is no longer supported.

## Middleware

SXO supports two middleware signatures depending on your runtime.

### 1. CLI Server (`sxo dev`, `sxo start`)

Uses **Node-style** middleware.

**Signature**: `(req, res, next) => void` or `(req, res) => boolean`

```javascript
// src/middleware.js
export default function (req, res, next) {
  if (req.url === "/ping") {
    res.end("pong");
    return; // Handled
  }
  next(); // Continue
}
```

### 2. Platform Adapters (`createHandler`)

Uses **Web Standard** middleware. This is required when using `sxo/cloudflare` or the internal runtime adapters.

**Signature**: `(request: Request, env: object) => Response | void`

```javascript
// src/middleware.js
export default function (request, env) {
  const url = new URL(request.url);
  if (url.pathname === "/ping") {
    return new Response("pong");
  }
  // Return nothing to continue
}
```

Use cases:

- CORS
- Security headers / CSP
- Compression (beyond static precompressed assets)
- Auth / gating
- Rate limiting
- Custom logging / tracing

## Hot Replace (Dev)

Mechanism:

- File watchers trigger a debounced rebuild (esbuild run).
- Server-Sent Events endpoint: `/hot-replace?href=<current_path>`
- The client script (`/hot-replace.js`) receives a JSON payload (`{ body, assets, publicPath }`) and performs partial replacement:
  - Replaces the `<body>` innerHTML.
  - Re-injects all CSS and JS assets associated with the route from the manifest.
  - Preserves scroll positions and (optionally) "reactive" component state heuristically.
- Build errors are sent as an HTML fragment in the `body` field of the payload.

Readiness Probe:

- Auto-open waits for HTTP readiness:
  - Attempts `HEAD` first, falls back to `GET`
  - Any status `< 500` (including `404`) counts as "ready"
  - Exponential backoff until timeout (default 10–12s)

## Custom Error Pages (404/500)

- Location: `PAGES_DIR/404.(tsx|jsx|ts|js)` and `PAGES_DIR/500.(tsx|jsx|ts|js)`
- Export shape: default export or named `jsx`; pages must return a full `<html>` document and include their own `<head>`
- Not routable: compiled as server-only modules (not listed as public routes)
- Build and generation: server build includes 404/500 SSR modules; not generated by `sxo generate`; no route asset mappings and no runtime asset injection (include any required CSS/JS inside the returned document).
- Response semantics:
  - HEAD requests: responses include headers only (no body) for 404/500 (custom or fallback).
  - Cache-Control: 404 → `public, max-age=0, must-revalidate`; 500 → `no-store`.
  - Doctype: when serving HTML documents, the server prepends `<!doctype html>`.

## Build Outputs & Manifest

After `sxo build` (or dev prebuild):

```shell
dist/
├── client/           # public assets: html, js, css
└── server/           # private SSR bundles
    └── routes.json   # routes manifest and metadata
```

`routes.json` entries (one per route; includes per‑route assets):

```json
[
  {
    "filename": "about/index.html",
    "entryPoints": ["src/pages/about/client/index.js", "src/pages/global.css"],
    "jsx": "src/pages/about/index.jsx",
    "scriptLoading": "module",
    "hash": false,
    "path": "about",
    "generated": false
  }
]
```

Fields:

- `filename` relative to `dist/client`
- `entryPoints` (per‑route client entries and `global.css` if present)
- `jsx` source page module relative path
- `hash` boolean (true in dev for cache-busting semantics)
- `path` (omitted for root route)
- `generated` boolean; if true, the production server serves the built HTML as-is (skips SSR) with Cache-Control: public, max-age=300. Non-generated/dynamic pages are served with Cache-Control: public, max-age=0, must-revalidate.

Manifest Reuse:

- On rebuild, if every referenced `jsx` file still exists _and_ no new route `index.*` appeared, the existing manifest is reused with global.css refreshed.

## Static Generation & Production Behavior

The generate workflow lets you pre-render static routes to HTML after a successful build and have the production server serve those pages as-is (skipping SSR).

- Command: run `sxo generate` after `sxo build`.
- Scope: only routes without dynamic parameters (no `[slug]` segments) are generated.
- How it works:
  - Reads `dist/server/routes.json`.
  - For each static route, imports its SSR module and executes it with empty params.
  - Requires the SSR module (default or named `jsx`) to return a full `<html>` document, injects built assets from `route.assets` (PUBLIC_PATH normalized), and prepares the final HTML.
  - Writes the finalized HTML to `dist/client/<route>/index.html`.
  - Sets `generated: true` for that route in the manifest.
- Idempotent: rerunning the command skips routes already marked `generated: true`.
- Missing outputs: if `routes.json` is not present, run `sxo build` first.

Production server behavior:

- Generated pages: if a route entry has `generated: true`, the server sends the built HTML directly (no SSR) with `Cache-Control: public, max-age=300`.
- Non-generated/dynamic pages: server performs SSR on each request, injects assets from `route.assets` (PUBLIC_PATH normalized), and responds with `Cache-Control: public, max-age=0, must-revalidate`.

Notes:

- Dynamic routes (paths containing `[param]`) are never generated.
- The manifest's `generated` flag is persisted to `dist/server/routes.json`.
- Page module selection remains `module.default || module.jsx`.

## HTML Template and Styles

Pages must return a full `<html>...</html>` document (including `<head>` and `<body>`).

`global.css` (optional) is included as a client entry for all routes when present. Recommended for shared styles.

Example:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <!-- Head contents are authored directly by pages -->
  </head>
  <body>
    <main>...</main>
  </body>
</html>
```

## Static Asset Serving

Production & dev servers serve from `dist/client` only.

Features:

- **Strict path guard**: rejection if resolved path escapes `dist/client`.
- **Extension gating**: only known MIME types served.
- **Immutable caching**: hashed filenames (`public, max-age=31536000, immutable`).
- **Short caching**: non-hashed (`public, max-age=300`).
- **ETag + Last-Modified** with conditional request support.
- **Precompressed**: selects `.br` > `.gz` variant if client supports & asset is compressible.
- **Range requests**: only for uncompressed assets.
- **Traversal protection**: `../` style attempts rejected (403/404).
- **HEAD requests** supported.

Hashed filename detection heuristics: segment containing 8+ hex chars or an 8-char base36-ish uppercase segment before next dot.

## Configuration

Precedence:

```
CLI Flags > sxo.config.* > .env / .env.local > defaults
```

Command defaults:

- dev: `open=true`
- build: `open=false`
- start: `open=false`
- clean: (removal only)

Example `sxo.config.json`:

```json
{
  "port": 4000,
  "pagesDir": "src/pages",
  "outDir": "dist",
  "open": false,
  "build": {
    "minify": false,
    "sourcemap": "inline"
  },
  "loaders": { ".svg": "file" }
}
```

The `build` property accepts any esbuild client configuration options for the client build only. Defaults applied by SXO for the client build are: `minify: true`, `sourcemap: isDev ? "inline" : false`.

> Note: The server build uses its own hardcoded defaults: `minify: true`, `sourcemap: false`. These are not affected by the `build` property.

Explicit Flag Detection:
Flags only override file/env/default if _explicitly_ passed (e.g. `--open`, `--no-open`, `--open=false`). Inferred / defaulted flags are filtered out (see `prepareFlags()`).

Key flags:

```shell
--port                            # Port to run the server (dev/start). Default: 3000. Example: --port 4000
--pages-dir                       # Path to the pages directory (default: src/pages)
--out-dir                         # Output directory for build artifacts (default: dist)
--open / --no-open                # Auto-open the browser when the dev server is ready (toggle)
--public-path <path>              # Public base URL for emitted asset URLs (default: "/"); empty string "" allowed for relative paths
--client-dir <name>               # Subdirectory name for per-route client entry (default: client)
--loaders <ext=loader>            # esbuild server loaders (dev/build only; repeatable or comma-separated). Example: --loaders ".svg=file" --loaders ".ts=tsx"
--verbose                         # Enable verbose logging for debugging and diagnostics
--no-color                        # Disable ANSI/colorized log output (useful for CI)
--config <file>                   # Load an alternate config file (e.g., sxo.config.json or .js)
```

## Environment Variables

Loaded (non-destructively) from `.env` then `.env.local` unless already set.

Recognized:
| Variable | Meaning | Default |
| -------- | ------- | ------- |
| PORT | Port | 3000 |
| PAGES_DIR | Pages directory | src/pages |
| OUTPUT_DIR | Base output directory | dist |
| OPEN | Auto-open dev browser | true (dev) |
| PUBLIC_PATH | Public base URL for asset URLs (esbuild publicPath). Empty string "" allowed and preserved. | "/" |
| CLIENT_DIR | Per-route client entry subdirectory name | client |
| LOADERS | esbuild server loaders as JSON map (e.g., `{"svg":"file"}` or `{".ts":"tsx"}`) | (unset) |
| VERBOSE | Verbose logging | false |
| NO_COLOR | Disable colorized output | (unset) |
| HEADER_TIMEOUT_MS | Node headers timeout in ms (server.headersTimeout). Set a non-negative integer to override; unset to use Node default. | (unset) |
| REQUEST_TIMEOUT_MS | Request timeout in ms (server.requestTimeout). | 120000 |

Derived / injected:
| Variable | Meaning |
| -------- | ------- |
| OUTPUT_DIR_CLIENT | `<outDir>/client` |
| OUTPUT_DIR_SERVER | `<outDir>/server` |
| SXO_RESOLVED_CONFIG | JSON blob of resolved config |
| DEV | `"true"` in dev command, else `"false"` |
| SXO_COMMAND | Current command (`dev|build|start|clean`) |
| BUILD | Custom esbuild client config object propagated to child build process (only in dev/build) |
| LOADERS | esbuild server loaders map propagated to child build process (only in dev/build) |
| PUBLIC_PATH | Public base URL for assets propagated to the build (defaults to "/" when unset; empty string preserved) |
| CLIENT_DIR | Configured per-route client entry subdirectory name |

## JSX Transformer & Runtime Helpers

SXO includes a Rust/WASM JSX transformer that transforms JSX into template literals with small runtime helpers.

What it does:

- Streaming parser with error recovery: finds and transforms multiple JSX sections per file, reporting aggregated, caret-aligned diagnostics.
- Attribute normalization: converts JSX attribute names to HTML-consistent forms (e.g., `className` → `class`, `htmlFor` → `for`, SVG/camelCase to kebab where applicable) and supports spread props.
- Array-aware output: wraps array-producing expressions (e.g., `map`, `flatMap`, `filter`, `reduce`, `slice`, `concat`, `flat`, modern array copies, and `forEach`) with `${__jsxList(...)}`
  so list output is safely joined into a single string.

Runtime helpers:

- `__jsxComponent(Component, propsArrayOrObject, children?)` → renders components to string (props objects in arrays are merged).
- `__jsxSpread(obj)` → serializes element attributes from an object (boolean `true` becomes a valueless attribute).
- `__jsxList(value)` → joins arrays into a string; returns `""` for `null`/`undefined`; passes through non-array values.

## Performance and DX

- Rust/WASM JSX transform drastically reduces parse overhead.
- Entry manifest reuse avoids unnecessary directory traversal.
- Dual build isolates server SSR bundles from public output.
- Hot replace patches fragment and assets.
- Readiness probe prevents race on browser auto-open.

## Security

SXO provides **foundational security controls** while giving you full control over application-specific security policies through middleware.

### 🔒 Built-in Protections

✅ **What SXO Provides:**
- Path traversal protection (automatic)
- Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`
- HTML escaping utilities (`escapeHtml()`)
- Route slug validation (`^[A-Za-z0-9._-]{1,200}$`)
- Static asset security (MIME type restrictions, no directory listing)
- Secure file serving with ETag/caching controls

### 🛡️ Your Responsibility (via Middleware)

❌ **What You Must Implement:**
- Authentication & Authorization
- Session Management
- CSRF Protection
- Content Security Policy (CSP)
- Rate Limiting
- Input Validation (beyond route slugs)
- HTTPS/TLS Configuration
- Application-specific security logging

### 📖 Comprehensive Security Guide

**See [SECURITY.md](./SECURITY.md) for detailed guidance on:**

- [Authentication patterns](./SECURITY.md#authentication) (JWT, sessions, OAuth/OIDC)
- [Session management](./SECURITY.md#session-management) with secure cookies
- [CSRF protection](./SECURITY.md#csrf-protection) strategies
- [Content Security Policy (CSP)](./SECURITY.md#content-security-policy-csp) examples
- [XSS prevention](./SECURITY.md#xss-prevention) best practices
- [Input validation](./SECURITY.md#input-validation) patterns
- [Secret management](./SECURITY.md#secret-management) (environment variables, rotation)
- [HTTPS/TLS setup](./SECURITY.md#httpstls-configuration) for all platforms
- [Rate limiting](./SECURITY.md#rate-limiting) implementation
- [Security headers](./SECURITY.md#security-headers) reference
- [Security testing](./SECURITY.md#security-testing) checklist

### ⚡ Quick Security Checklist

Before deploying to production:

- [ ] All secrets in `.env` / `.env.local`, never committed to git
- [ ] Application serves over HTTPS with valid certificates
- [ ] Authentication & session management implemented
- [ ] CSRF protection enabled for state-changing operations
- [ ] Content-Security-Policy header configured
- [ ] Rate limiting on sensitive endpoints (login, APIs)
- [ ] All user inputs validated and sanitized
- [ ] Error messages don't expose sensitive data
- [ ] Dependencies audited (`npm audit` / `pnpm audit`)

### 🐛 Reporting Security Issues

**Do not open public issues for security vulnerabilities.**

Please report security issues responsibly via GitHub Security Advisories or by contacting the maintainers privately. See [SECURITY.md](./SECURITY.md#reporting-security-issues) for details.

## Testing

Run all tests:

```shell
pnpm test
```

Focused suites:

- CLI: flag handling, spawns, readiness probe
- Config: precedence, normalization, explicit flags
- Middleware: loader + runner semantics
- Utils: asset extraction, routing, statics security
- JSX helpers: attribute normalization, spreads
- Entry points: manifest generation semantics

## Deployment

Typical flow:

```shell
sxo build
sxo start --port 3000
```

Serve behind a reverse proxy (optional). Add your own middleware for:

- Compression (if not relying on precompressed artifacts)
- Security headers
- Auth / session logic
- Rate limiting

## Acknowledgements

- Built on top of esbuild — thanks to Evan Wallace and the esbuild project for the extremely fast bundler & plugin ecosystem: https://github.com/evanw/esbuild
- Custom metafile-based asset injection — thanks to the internal plugin that maps entry points to outputs via esbuild's metafile
- Utility inspiration / helper code from gc-victor/query — thanks for the lightweight query primitives used for route and JSX transform: https://github.com/gc-victor/query
- Reactive components primitives: reactive-component — thanks for the tiny, framework-agnostic signals/effects runtime that powers "islands": https://github.com/gc-victor/reactive-component
- Extra thanks to the open-source community for libraries and examples that influenced SXO's ergonomics and performance.

## Contributing

1. Fork & clone.
2. Install deps: `pnpm i`
3. Run tests: `pnpm test`
4. Keep PRs focused & small (< ~100 LOC unless discussed).
5. Use Conventional Commit messages (`feat:`, `fix:`, etc.).
6. Update docs (`README.md` / `AGENTS.md`) when altering behavior (manifest shape, routing semantics, middleware contract).

## License

MIT — see [LICENSE](./LICENSE).

## Contact

- Issues: GitHub Issues
- Security: Private advisory (do not open public issues for sensitive reports)

Looking for chat? Open an issue to propose a community space if demand emerges.
