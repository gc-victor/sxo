# Testing

## Framework Test Suites (Contributors)

Run all tests in the SXO monorepo:

```shell
pnpm test
```

Additional suites:

```shell
pnpm run test:client     # client unit tests (vitest)
pnpm run test:e2e        # SXOUI component end-to-end tests (Playwright)
pnpm run test:runtimes   # Smoke tests across Node, Bun, and Deno (requires curl, bun, deno)
```

`test:runtimes` expectations: `curl`, `pnpm`, `bun`, and `deno` on PATH; default port `3000` (override with `PORT=3001`). Source of truth: `scripts/test-runtimes.sh`.

Focused suites cover:

- **CLI**: flag handling, spawns, readiness probe
- **Config**: precedence, normalization, explicit flags
- **Middleware**: loader + runner semantics
- **Utils**: asset extraction, routing, statics security
- **JSX helpers**: attribute normalization, spreads
- **Entry points**: manifest generation semantics

## Testing Your SXO App

SXO imposes no test framework. A practical stack:

- **Unit** — the Node built-in test runner (`node --test`) or vitest for pure logic (stores, utils, validators).
- **API** — exercise your middleware JSON API with plain HTTP: `curl` in scripts, or a runner like [Hurl](https://hurl.dev) for assertable request/response files. Start the app with `sxo dev` (or `sxo build && sxo start`) on a test port first.
- **E2E** — [Playwright](https://playwright.dev) against the dev/prod server for full page flows, including island hydration.

Tips:

- Set `PORT` and `--no-open` (or `OPEN=false`) so test runs don't spawn browsers or clash with dev servers.
- Use a separate database/state file for tests and reset it between runs (the [todo example](../examples/todo) keeps state in a deletable `todos.db`).
- Remember `sxo generate` snapshots pages — never test live-data assertions against generated routes.
