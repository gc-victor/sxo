# SXO Deno Example (TypeScript)

A minimal SXO application using Deno runtime with TypeScript.

## Requirements

- [Deno](https://deno.land/) installed

## Setup

No dependency installation needed. Deno automatically resolves dependencies from the import map in `deno.json`.

## Development

```bash
deno task dev
```

## Production

Build and start the production server using the CLI:

```bash
deno task build
deno task start  # Runs: sxo start (auto-detects Deno runtime)
```

The server will run at `http://localhost:3000` (configurable via `PORT` env var).

## Project Structure

- `src/pages/` - SSR page components (TypeScript/JSX)
  - `index.tsx` - Home page
  - `about/index.tsx` - About page
  - `about/[slug]/index.tsx` - Dynamic route with slug parameter
  - `counter/` - Counter example with client-side component
    - `index.tsx` - Counter page (SSR)
    - `counter.tsx` - Counter component (TypeScript)
    - `client/index.ts` - Client-side behavior for rc-counter custom element
  - `global.css` - Shared styles

- `src/middleware.ts` - Request middleware with health check endpoint
  - Web Standard signature: `(request: Request) => Response | undefined`

- `src/types/jsx.d.ts` - JSX type definitions for SXO's vanilla JSX transpiler

- `deno.json` - Deno configuration with import map and TypeScript compiler options
- `tsconfig.json` - TypeScript compiler configuration (jsx: preserve mode)
- `sxo.config.ts` - SXO framework configuration

## How It Works

The `sxo start` command auto-detects your JavaScript runtime (Node.js, Bun, or Deno) and uses the appropriate production adapter. No custom server file needed!

### Key Features

- **TypeScript Support**: All source files use TypeScript (.ts/.tsx extensions)
- **Vanilla JSX**: SXO uses its own JSX transformer (no React needed)
- **Server-Side Rendering**: Pages return full HTML documents with their own `<head>` management
- **Dynamic Routes**: Support for slug-based dynamic segments like `[slug]`
- **Client Interactivity**: Optional client-side code via route's `client/` subdirectory
- **Middleware**: Request processing before route handling
- **Web Standards**: Middleware uses Web Standard APIs (Request/Response)

### Type Annotations

JSX files don't require React imports—use typed interfaces for component props:

```typescript
interface CounterProps {
  count: number;
}

export function Counter({ count }: CounterProps) {
  return <rc-counter>...</rc-counter>;
}
```

### Middleware Example

The health check endpoint demonstrates Web Standard middleware:

```typescript
function healthCheck(request: Request): Response | undefined {
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === "/api/health") {
    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
}

export default [healthCheck];
```

Test it: `curl http://localhost:3000/api/health`

## Notes

- **JSX Transpilation**: SXO's custom Rust/WASM JSX transformer processes all `.tsx` files. Type checking via TypeScript is informational; transpilation happens separately.
- **No `jsxImportSource`**: Unlike React, SXO doesn't need JSX runtime imports.
- **Static Assets**: CSS and other assets in `src/pages/` are automatically bundled and linked.
