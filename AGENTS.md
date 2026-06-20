# AGENTS.md

## Purpose

- Project: `sxo`
- Stack: ESM-only Node 20+ SSR framework
- Build outputs: `dist/client` (public) and `dist/server` (private SSR bundles)
- Route manifest: `dist/server/routes.json`
- JSX: Rust/WASM transformer
- Middleware entry: `packages/server/src/server/middleware.js`

## Quick start

- Run tests: `pnpm test`
- Coverage: `pnpm run test:coverage`
- LCOV: `pnpm run test:lcov`
- Lint: `npm run check`
- Format: `npm run format`
- CLI: `sxo create|add|dev|build|start|clean|generate`

## Non-negotiable rules

- Modify only `packages/{cli,server,client,components}/**` unless the task explicitly requires another path.
- Never edit generated artifacts, including `dist/**`.
- Never edit `packages/cli/jsx-transformer/jsx_transformer.js`.
- Avoid mega-refactors without confirmation: more than 300 LOC or more than 3 files.
- Do not invent architecture. If behavior is unclear, inspect the source first.

## Project map

- `packages/cli/src/cli/` - CLI commands and helpers
- `packages/cli/src/esbuild/` - route discovery, build orchestration, asset mapping
- `packages/cli/jsx-transformer/` - Rust/WASM JSX transformer
- `packages/server/src/config/` - config resolution and env precedence
- `packages/server/src/server/` - dev/prod servers and shared server utilities
- `packages/server/src/runtime/` - core web-standard runtime handler
- `packages/server/src/generate/` - static generation
- `packages/client/src/` - client reactivity library (re-export shim)
- `packages/components/` - SXOUI component library

## Architecture essentials

- Pages return full HTML documents, including `<html>`, `<head>`, and `<body>`.
- Page modules may export `default` or named `jsx`; server resolution is `module.default || module.jsx`.
- Special error pages are supported at `PAGES_DIR/404.*` and `PAGES_DIR/500.*`; they are not routable.
- Middleware uses the Web `Request`/`Response` contract and may short-circuit by returning a `Response`.
- Client and server builds run separately. Client asset data is written back into `dist/server/routes.json`.
- `sxo generate` pre-renders non-dynamic routes into `dist/client` and marks them `generated: true` in the manifest.
- Hot reload uses SSE at `/hot-replace?href=<path>`.
- Public asset base path is configurable via flags, env, or config. Preserve empty string behavior.
- Per-route client entries live under `<clientDir>/index.(ts|tsx|js|jsx)`; default `clientDir` is `client`.
- Custom esbuild loaders may come from flags, env, or config with precedence: flags > file > env > defaults.

## Coding expectations

- Use ESM only.
- Keep modules small and focused.
- Add JSDoc for non-trivial exported utilities.
- Prefer clear errors near boundaries.
- Do not broadly reformat unrelated files.
- Do not introduce React-specific patterns.

## Source-of-truth docs

Read these only when relevant:

- `.rules/jsx-standards.md` - JSX examples and semantic HTML guidance
- `.rules/jsdoc.md` - JSDoc conventions
- `.rules/testing.instructions.md` - testing guidance
- `README.md` - user-facing behavior and setup

## High-value implementation notes

- Config resolution lives in `src/js/config/resolve.js` and follows: flags > file > env > defaults.
- Dev and prod adapters exist for Node, Bun, and Deno; Cloudflare uses a factory-style production adapter.
- Static assets support hashed caching, ETag, and precompressed variants.
- Routing supports multi-parameter dynamic routes and validates parameter names and values.
- If you change manifest shape, middleware export behavior, route semantics, hot reload payloads, or public commands, update `README.md` and this file.

## Change workflow

1. Inspect the relevant code before editing.
2. Prefer minimal, local changes.
3. Add or update tests when behavior changes.
4. Keep docs aligned with user-visible changes.
5. Summarize assumptions and file-level impact clearly.

## Testing workflow

Always run:

```bash
pnpm test
npm run check
```

Also run this when you change runtime-sensitive code in `src/js/server/**`, `src/js/esbuild/**`, `src/js/runtime/**`, or config/CLI behavior that affects build or server execution:

```bash
pnpm run test:runtimes
```

Notes:

- Runtime smoke tests expect `curl`, `pnpm`, `bun`, and `deno`.
- Default test port is `3000`; override with `PORT=3001` if needed.
- Runtime smoke script source of truth: `scripts/test-runtimes.sh`

## Guidance for future AGENTS updates

- Keep this file concise and repo-specific.
- Prefer pointers to files over long embedded explanations.
- Do not duplicate large sections from README or source comments.
- If a rule applies only to one area, move it closer to that area or document it elsewhere.
