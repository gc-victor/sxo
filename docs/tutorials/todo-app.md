# Tutorial: Todo App

Build a complete todo app that demonstrates both halves of SXO:

- **Server**: a JSON API (`/api/todos`) built with Web Standard [middleware](../server.md), backed by [`node:sqlite`](https://nodejs.org/api/sqlite.html).
- **Client**: a reactive island built with [`sxo/client`](../client.md) that hydrates from server-rendered state and talks to the API.

The page is fully server-rendered and works without JavaScript; the client entry progressively enhances it.

The finished, runnable app lives in [`examples/todo`](../../examples/todo).

**Requirements**: Node.js 22.13+ (or 23.4+) for `node:sqlite`. Node prints an `ExperimentalWarning` at startup — that's expected.

---

## 0. Scaffold

```shell
mkdir sxo-todo && cd sxo-todo
pnpm init
pnpm add sxo
```

`package.json` scripts:

```json
{
  "type": "module",
  "scripts": {
    "dev": "sxo dev",
    "build": "sxo build",
    "start": "sxo start"
  }
}
```

The layout you'll build:

```
src/
├── middleware.js          # Composes the API middleware entry points
├── api/
│   ├── json.js             # JSON response helper
│   ├── todos.js            # /api/todos collection endpoint
│   └── todo.js             # /api/todos/:id item endpoint
├── store.js               # node:sqlite persistence (server)
├── components/Todos.jsx   # Island markup
└── pages/
    ├── index.jsx          # Route "/" — SSR from the store
    ├── global.css         # Shared stylesheet
    └── client/index.js    # define("rc-todos") — hydration + API calls
```

`src/components` and `src/pages` are auto-aliased to `@components` and `@pages` (see [Architecture](../architecture.md#path-aliases)).

## 1. Storage (`src/store.js`)

`node:sqlite` is built into Node — no dependencies. A single module owns the database; both the API middleware and the page import it. It is bundled into the **private** server build, never shipped to the browser.

```javascript
import { DatabaseSync } from "node:sqlite";

// Resolved relative to the process working directory: run SXO commands
// from the project root so the file lands at ./todos.db.
const db = new DatabaseSync("todos.db");

db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0
    )
`);

const toTodo = (row) => ({ id: Number(row.id), title: row.title, completed: row.completed === 1 });

function seedIfEmpty() {
    const { count } = db.prepare("SELECT COUNT(*) AS count FROM todos").get();
    if (count > 0) return;
    const insert = db.prepare("INSERT INTO todos (title, completed) VALUES (?, ?)");
    insert.run("Read the SXO docs", 1);
    insert.run("Build a todo app", 0);
    insert.run("Ship to production", 0);
}

seedIfEmpty();

export function listTodos() {
    return db.prepare("SELECT id, title, completed FROM todos ORDER BY id").all().map(toTodo);
}

export function getTodo(id) {
    const row = db.prepare("SELECT id, title, completed FROM todos WHERE id = ?").get(id);
    return row ? toTodo(row) : undefined;
}

export function addTodo(title) {
    const { lastInsertRowid } = db.prepare("INSERT INTO todos (title) VALUES (?)").run(title);
    return getTodo(Number(lastInsertRowid));
}

export function setCompleted(id, completed) {
    db.prepare("UPDATE todos SET completed = ? WHERE id = ?").run(completed ? 1 : 0, id);
    return getTodo(id);
}

export function removeTodo(id) {
    return db.prepare("DELETE FROM todos WHERE id = ?").run(id).changes > 0;
}
```

Add `todos.db` to `.gitignore`.

## 2. The JSON API (`src/api/`)

SXO has no file-based API routes — APIs are middleware that short-circuits with a `Response`. Keep each endpoint in its own middleware function, then compose them in the required `src/middleware.js` entry point. An endpoint returns `undefined` when its path does not match, allowing the next middleware or page routing to run.

```javascript
// src/middleware.js
import { todoApi } from "./api/todo.js";
import { todosApi } from "./api/todos.js";

export default [todosApi, todoApi];
```

`src/api/todos.js` handles `GET` and `POST /api/todos`; `src/api/todo.js` handles `PATCH` and `DELETE /api/todos/:id`. Both import the shared `json` response helper and store operations. Keep the defensive JSON parsing, field validation with `400`s, `201` on create, `404` on missing, and `405` on wrong method shown in the runnable [example](../../examples/todo/src/api).

Try it:

```shell
pnpm dev &
curl localhost:3000/api/todos
curl -X POST localhost:3000/api/todos -H 'Content-Type: application/json' -d '{"title":"Try the API"}'
curl -X PATCH localhost:3000/api/todos/1 -H 'Content-Type: application/json' -d '{"completed":true}'
curl -X DELETE localhost:3000/api/todos/1
```

## 3. The Island Markup (`src/components/Todos.jsx`)

JSX interpolation is **raw** — SXO does not auto-escape (see [Pages](../pages.md#jsx-rendering-rules)). This example renders todo titles directly and is suitable only for trusted input; do not expose it to untrusted titles without adding appropriate output handling.

A plain function component rendering the `<rc-todos>` custom element with `$` directives. Three details matter:

1. **The hidden data island** — `<div hidden $ref="data">` carries the server state as URI-encoded JSON. This keeps JSON characters from being parsed as HTML; the client decodes it during hydration.
2. **`$bind-html="listHtml"` on the `<ul>`** — the client re-renders the list into this element whenever state changes.
3. **`$state="remaining"`** — the span's server-rendered number *becomes* the initial client state (hydration from content), then tracks the computed value.

```jsx
export function TodoItem({ todo }) {
    return (
        <li data-id={todo.id}>
            <input type="checkbox" data-action="toggle" {...(todo.completed ? { checked: true } : {})} />
            <span className={todo.completed ? "done" : ""}>{todo.title}</span>
            <button type="button" data-action="delete" aria-label="Delete todo">
                ×
            </button>
        </li>
    );
}

export function Todos({ todos }) {
    return (
        <rc-todos>
            <div hidden $ref="data">
                {encodeURIComponent(JSON.stringify(todos))}
            </div>
            <form $onsubmit="add">
                <input
                    type="text"
                    name="title"
                    $bind-value="draft"
                    placeholder="What needs to be done?"
                    aria-label="New todo title"
                    autoComplete="off"
                    required
                />
                <button type="submit">Add</button>
            </form>
            <ul $bind-html="listHtml" $onclick="onListClick">
                {todos.length ? todos.map((todo) => <TodoItem todo={todo} />) : <li className="empty">Nothing to do yet.</li>}
            </ul>
            <p>
                <span $state="remaining">{todos.filter((todo) => !todo.completed).length}</span> remaining
            </p>
        </rc-todos>
    );
}
```

`{...(todo.completed ? { checked: true } : {})}` uses the boolean-attribute rule: `true` renders a valueless `checked`, `false`/`null`/`undefined` omit it. `className` normalizes to `class`.

## 4. The Page (`src/pages/index.jsx`)

The route reads the store at request time — always fresh:

```jsx
import { Todos } from "@components/Todos.jsx";
import { listTodos } from "../store.js";

export default () => (
    <html lang="en">
        <head>
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>SXO Todo</title>
        </head>
        <body>
            <main>
                <h1>SXO Todo</h1>
                <p className="tagline">Server-rendered, progressively enhanced, backed by node:sqlite.</p>
                <Todos todos={listTodos()} />
            </main>
        </body>
    </html>
);
```

Because the page hits a live database, **don't run `sxo generate`** here — it would freeze a stale snapshot (see [Build & Assets](../build-and-assets.md#static-generation)).

## 5. Styles (`src/pages/global.css`)

`global.css` in the pages directory is injected on every route automatically. The example ships a small plain-CSS stylesheet — nothing to configure.

## 6. The Client Island (`src/pages/client/index.js`)

The root route's client entry lives at `src/pages/client/index.js`. It defines `rc-todos`:

```javascript
import { define } from "sxo/client";

// Mirrors the server-rendered TodoItem markup so hydration is seamless.
const renderTodo = (todo) => `
    <li data-id="${todo.id}">
        <input type="checkbox" data-action="toggle" ${todo.completed ? "checked" : ""} />
        <span class="${todo.completed ? "done" : ""}">${todo.title}</span>
        <button type="button" data-action="delete" aria-label="Delete todo">×</button>
    </li>`;

function renderList(todos) {
    return todos.length ? todos.map(renderTodo).join("") : '<li class="empty">Nothing to do yet.</li>';
}

define("rc-todos", ({ $state, $on, $ref, $compute }) => {
    // null until hydrated from the server-rendered JSON island (in connected).
    $state.todos = null;

    $compute("listHtml", ["todos"], (todos) => (todos ? renderList(todos) : ""));
    $compute("remaining", ["todos"], (todos) => (todos ? todos.filter((todo) => !todo.completed).length : 0));

    async function api(method, path, body) {
        const response = await fetch(path, {
            method,
            headers: { "Content-Type": "application/json" },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        return response.json();
    }

    $on.add = async (event) => {
        event.preventDefault();
        const title = String($state.draft ?? "").trim();
        if (!title) return;
        await api("POST", "/api/todos", { title });
        $state.draft = "";
        $state.todos = await api("GET", "/api/todos");
    };

    // One delegated listener: the list's innerHTML is replaced on every
    // render, so per-item listeners would not survive.
    $on.onListClick = async (event) => {
        const action = event.target.closest("[data-action]")?.dataset.action;
        const item = event.target.closest("li[data-id]");
        if (!action || !item) return;
        const id = item.dataset.id;

        if (action === "toggle") {
            // The checkbox has already flipped; persist the new value.
            await api("PATCH", `/api/todos/${id}`, { completed: item.querySelector("input").checked });
        } else if (action === "delete") {
            await api("DELETE", `/api/todos/${id}`);
        }
        $state.todos = await api("GET", "/api/todos");
    };

    return {
        // Runs after refs/bindings are processed: hydrate from SSR state.
        connected() {
            $state.todos = JSON.parse(decodeURIComponent($ref.data.textContent));
        },
    };
});
```

## 7. Run

```shell
pnpm dev        # http://localhost:3000
```

Add, toggle, and delete todos — every interaction round-trips through the API into SQLite. Kill the server, `pnpm dev` again: your todos persist. Delete `todos.db` to reset.

Production:

```shell
pnpm build
pnpm start
```

## How It Fits Together

```
GET /            → middleware (no match, falls through)
                 → SSR: index.jsx → listTodos() → Todos markup + JSON island
                 → browser: client/index.js defines rc-todos
                 → connected(): $state.todos = JSON.parse($ref.data.textContent)
                 → $compute: listHtml, remaining → bindings update DOM

click (checkbox) → delegated $onclick → PATCH /api/todos/:id → GET /api/todos
                 → $state.todos = fresh list → compute → innerHTML re-render
```

Key lessons:

- **Middleware is the server API** — match path, switch method, return `Response`; fall through for pages.
- **Server-only modules** (`store.js`) are safely shared by middleware and pages; they live in the private server bundle.
- **Hydration from content** — `$state="key"` and the hidden JSON island let the client start from exactly what the server rendered, with no flash and no extra request.
- **Event delegation** survives `$bind-html` re-renders; per-item listeners don't.
- **Know the rendering boundary** — JSX interpolation and `$bind-html` are raw; this example assumes trusted todo titles.

## Exercises

1. **Filters** — add "All / Active / Done" buttons; derive `listHtml` from `$state.todos` + `$state.filter` (pure client state, no API change).
2. **Inline edit** — double-click a title to edit; `PATCH` with a `title` field (extend the middleware validation).
3. **Optimistic UI** — update `$state.todos` before the fetch resolves; roll back on failure.
4. **Tests** — assert the API contract with Hurl files; drive the page with Playwright (start the dev server on a fixed `PORT` first).
