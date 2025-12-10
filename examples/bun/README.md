# SXO Bun Example

A minimal SXO application using Bun runtime.

## Requirements

- [Bun](https://bun.sh) installed

## Setup

```bash
bun install
```

## Development

```bash
bun run dev
```

## Production

Build and start the production server using the CLI:

```bash
bun run build
bun run start  # Runs: sxo start (auto-detects Bun runtime)
```

The server will run at `http://localhost:3000` (configurable via `PORT` env var).

## How It Works

The `sxo start` command auto-detects your JavaScript runtime (Node.js, Bun, or Deno) and uses the appropriate production adapter. No custom server file needed!
