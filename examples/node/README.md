# SXO Node.js Example

A minimal SXO application using Node.js runtime.

## Setup

```bash
pnpm install
```

## Development

```bash
pnpm dev
```

## Production

Build and start the production server using the CLI:

```bash
pnpm build
pnpm start  # Runs: sxo start (auto-detects Node.js runtime)
```

The server will run at `http://localhost:3000` (configurable via `PORT` env var).

## How It Works

The `sxo start` command auto-detects your JavaScript runtime (Node.js, Bun, or Deno) and uses the appropriate production adapter. No custom server file needed!
