# SXO Todo Example

A complete todo app demonstrating the two halves of SXO:

- **Server API** — a JSON API (`/api/todos`) built with Web Standard middleware, backed by [`node:sqlite`](https://nodejs.org/api/sqlite.html).
- **Client reactivity** — an `rc-todos` island built with `sxo/client` (`define`, `$state`, `$on`, `$bind`, `$ref`, `$compute`) that hydrates from server-rendered state and talks to the API.

The page is fully server-rendered and works without JavaScript; the client entry progressively enhances it.

> Requires Node.js 22.13+ (or 23.4+) for `node:sqlite`. Node prints an `ExperimentalWarning` on startup; that is expected.

## Run

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

Production:

```bash
pnpm build
pnpm start
```

Do not run `sxo generate` here: the index route reads live data from SQLite, so pre-rendering it would serve a stale snapshot.

## API

| Method | Path | Body | Description |
| ------ | ---- | ---- | ----------- |
| GET | `/api/todos` | — | List all todos |
| POST | `/api/todos` | `{ "title": string }` | Create a todo |
| PATCH | `/api/todos/:id` | `{ "completed": boolean }` | Toggle completion |
| DELETE | `/api/todos/:id` | — | Delete a todo |

```bash
curl localhost:3000/api/todos
curl -X POST localhost:3000/api/todos -H 'Content-Type: application/json' -d '{"title":"Try the API"}'
curl -X PATCH localhost:3000/api/todos/1 -H 'Content-Type: application/json' -d '{"completed":true}'
curl -X DELETE localhost:3000/api/todos/1
```

## Structure

```
src/
├── middleware.js          # Composes the API middleware entry points
├── api/                    # JSON response helper + collection/item endpoints
├── store.js               # node:sqlite persistence (server)
├── components/Todos.jsx   # Island markup
└── pages/
    ├── index.jsx          # Route "/" — SSR from the store
    ├── global.css         # Shared stylesheet (injected on every route)
    └── client/index.js    # define("rc-todos") — hydration + API calls
```

Data lives in `todos.db` (created on first run; delete it to reset).

Full walkthrough: [`docs/tutorials/todo-app.md`](../../docs/tutorials/todo-app.md).
