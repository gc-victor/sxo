# SXO Cloudflare Workers Example

A minimal SXO application using the Cloudflare adapter for edge deployment.

## Requirements

- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed
- Cloudflare account (for deployment)

## Setup

```bash
pnpm install
```

## Development

Development uses the standard SXO dev server:

```bash
pnpm dev
```

## Production

Build and run with Wrangler:

```bash
pnpm build
pnpm start
```

The build process automatically generates `dist/server/modules.js` with static imports for all SSR modules.

## Deploy

Deploy to Cloudflare Workers:

```bash
pnpm deploy
```

## How It Works

Cloudflare Workers require static imports (no dynamic `import()` calls). The SXO build process automatically generates `dist/server/modules.js` with static imports for all page modules.

The worker entry point (`src/index.js`) imports:
- Routes manifest from `dist/server/routes.json`
- Pre-built modules from `dist/server/modules.js`

### Worker Code

```javascript
import { createHandler } from "sxo/cloudflare";
import routes from "../dist/server/routes.json" with { type: "json" };
import modules from "../dist/server/modules.js";

export default createHandler({
    routes,
    modules,
    publicPath: "/",
});
```

## Configuration

### wrangler.jsonc

- `main` - Points to the worker entry (`src/index.js`)
- `assets.directory` - Serves static files from `dist/client/`
- `assets.binding` - Creates `env.ASSETS` for static file serving
