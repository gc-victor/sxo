# Client

SXO ships a tiny, framework-free reactivity library, exposed as the `sxo/client` export (also published standalone as `@sxo/client`). It powers the **islands pattern**: pages are server-rendered HTML, and interactivity is added only where needed.

## Client Entries

Each route may have a client entry directory (default name `client`, configurable via `--client-dir` / `CLIENT_DIR`):

```
src/pages/counter/
├── index.jsx          # server-rendered page
├── counter.jsx        # island markup (shared component)
└── client/
    └── index.js       # client entry: bundled and injected on this route only
```

Resolution precedence inside the client dir: `index.ts` > `index.tsx` > `index.js` > `index.jsx`.

## `define(tag, definition)`

Registers a custom element with declarative state, refs, events, and computed values. Markup uses `$` directives; the definition wires them up:

```jsx
// src/pages/counter/counter.jsx
export function Counter({ count }) {
  return (
    <rc-counter>
      <button type="button" $onclick="decrement">−</button>
      <span $state="count">{count}</span>
      <button type="button" $onclick="increment">+</button>
    </rc-counter>
  );
}
```

```javascript
// src/pages/counter/client/index.js
import { define } from "sxo/client";

define("rc-counter", ({ $state, $on }) => {
  $state.count = 0;

  $on.increment = () => {
    $state.count++;
  };
  $on.decrement = () => {
    $state.count--;
  };
});
```

### Definition Context

The definition callback receives:

| Key | Purpose |
| --- | ------- |
| `$state` | Reactive state proxy; read/write properties. Elements with `$state="key"` update automatically |
| `$on` | Bind event handlers referenced by `$on<event>` attributes (e.g., `$onclick="increment"`). Handlers receive the DOM `Event` |
| `$bind` | Bind methods referenced by `$bind-<type>` attributes (custom binding handlers) |
| `$ref` | Access elements marked with `$ref="name"` |
| `$compute` | Derive state: `$compute("double", ["count"], (count) => count * 2)` |
| `$effect` | Run a callback after state changes; returns a cleanup function |
| `$element` | The component instance (host element) with public method wrappers |

Binding keys and handler names must be **alphanumeric** (`/^[a-zA-Z0-9]+$/`) — no dashes or underscores.

### Lifecycle

The definition may return lifecycle methods:

```javascript
define("rc-timer", ({ $state }) => {
  $state.seconds = 0;
  let interval;

  return {
    connected() {
      interval = setInterval(() => $state.seconds++, 1000);
    },
    disconnected() {
      clearInterval(interval);
    },
    // also available: adopted(), attributeChanged(name, oldValue, newValue)
  };
});
```

**Ordering**: the definition callback runs when the element is constructed — *before* the DOM is processed. `$ref` and `$state`-from-content initialization happen on connect. Use `connected()` for anything that needs refs or server-rendered content:

```javascript
define("rc-todos", ({ $state, $ref }) => {
  $state.todos = null;
  return {
    connected() {
      // $ref is populated here; hydrate from server-rendered state
      $state.todos = JSON.parse($ref.data.textContent);
    },
  };
});
```

## Directives

### `$state="key"` — reactive state, hydrated from content

Marks an element whose content initializes and reflects a state key:

```html
<span $state="count">0</span>              <!-- state.count = 0 (coerced) -->
<p $state="message">Hello</p>              <!-- state.message = "Hello" -->
<div $state="content" $bind-html="content"><strong>Initial</strong></div>
```

This is the hydration mechanism: server-rendered content becomes the initial client state, so islands start with exactly what the server sent. Values are coerced (numeric strings become numbers). With `$bind-html`, `innerHTML` is used as the initial value instead of `textContent`.

### `$on<event>="handler"` — events

```html
<button $onclick="save">Save</button>
<form $onsubmit="submit">…</form>
<input $oninput="search" />
```

The handler is looked up on `$on` and called with the `Event` object. Listeners are attached once at connect time to the marked element — for content you re-render later (e.g., via `$bind-html`), use **event delegation** on a static container.

### `$bind-<type>="key"` — DOM bindings

| Binding | Behavior |
| ------- | -------- |
| `$bind-value` | Two-way binding with `input`/`select`/`textarea`/`range` value |
| `$bind-text` | One-way `textContent` |
| `$bind-html` | One-way `innerHTML` — **escape untrusted data yourself** |
| `$bind-checked` | Checkbox/radio checked state |
| `$bind-disabled` | Disabled state |
| `$bind-class` | ClassList manipulation (e.g., `{ add: 'active', remove: 'inactive' }`) |
| `$bind-attr` | Attribute object |
| `$bind-<custom>` | Custom handler via `$bind` in the definition |

### `$ref="name"` — element references

```html
<input $ref="emailInput" />
```

Access via `$ref.emailInput` inside the definition (populated after connect).

### `$compute` and `$effect`

```javascript
$compute("fahrenheit", ["celsius"], (c) => c * 1.8 + 32);
$effect(() => {
  console.log("state changed:", $state.count);
  return () => console.log("cleanup");
});
```

## Fragment swaps

`swapFragment` applies server-rendered HTML to a live element using **outer semantics**: the response must contain the target element itself, not only its children. Pass a URL to fetch the fragment. A same-tag response patches the existing root; a different root tag replaces it.

```javascript
import { define, swapFragment } from "sxo/client";

define("rc-todos", ({ $ref }) => {
  const events = new EventSource("/api/todos/events");
  events.addEventListener("todos-update", () => {
    void swapFragment("/fragments/todos", $ref.list);
  });

  return { disconnected() { events.close(); } };
});
```

The target may be `<ul id="todo-list" $ref="list">…</ul>` inside `rc-todos`. `/fragments/todos` must return the matching `<ul>` root. An SSE notification can trigger `swapFragment` to fetch and reconcile the latest fragment.

The target may be a selector string or an `Element`. A selector string is used to find the twin in the response. For an element target, SXO locates the twin by its escaped `id`, or—if it has no `id`—uses the response's first element child only when its tag matches.

```typescript
interface SwapOptions {
  signal?: AbortSignal;
  /** Set false to force replacement instead of patching. Default: patch. */
  patch?: boolean;
}

swapFragment(url: string, target: string | Element, options?: SwapOptions): Promise<boolean>;
```

`false` means the DOM was left untouched. This happens when the target is missing or disconnected, a detectable binding remains on it, a newer request supersedes the request, fetch fails or is aborted, the response is not OK, its body is empty, or no matching root is found. Concurrent requests are ordered per target: only the most recently started request may apply.

**Write fragment endpoints as ordinary page modules** that return a subtree root, such as `<ul>…</ul>`, rather than a complete document. `sxo generate` skips these non-document responses. The endpoint and full page should render the same shared component to keep their markup in sync.

Same-tag swaps preserve the live root, matched descendants, event listeners, custom-element instance, form values and checked state. Background swaps also patch in place, so an island's subscriptions are not torn down just because nothing is focused. Use unique `data-key` values on sibling elements when items can reorder; other matching is positional, and unkeyed reorder behavior is best-effort.

Observe these constraints:

- Do not put `$bind-html`, `$bind-text`, or `$state` on the swap target. These bindings compete with swaps. The runtime can reject a target only if those attributes are still present; hydration strips them, so this rule is enforced primarily by documentation.
- A swapped-in plain-element root's own `$` directives are not processed. Prefer a custom-element root, which wires itself on connection, or put directives on an inner wrapper. Descendant directives can be wired by the containing island.
- Do not nest islands inside a swap target. The reconciler patches nested custom-element internals and the outer island's observer may bind their descendants to the wrong owner.
- Fragment HTML is trusted and inserted without sanitization. Escape untrusted values on the server; SXO does not escape JSX interpolation. There is no same-origin gate. See [Security: Fragment swaps](security.md#fragment-swaps).

**Not preserved:**

- On a **tag change**, the old root and its instance are discarded; the new element connects fresh and re-hydrates from its server-rendered attributes.
- `<video>`/`<audio>` position, `<canvas>` contents, `<iframe>` state in *replaced* subtrees. Matched nodes keep theirs.
- Nested custom-element internals: the reconciler descends and patches them to server state, and the enclosing island's observer can wire directives inside them with the wrong owner. Do not nest islands inside a swap target.
- Reorder stability beyond positional matching plus `data-key` hints.
- A swapped-in plain-element root's own `$` directives.

Use `patch: false` only when replacement is intentional. `await swapFragment(...)` resolves after applying the DOM change, so callers can query the updated DOM immediately afterward if needed.

## `ReactiveComponent` and `createContext`

For class-based authoring, extend `ReactiveComponent` directly. `createContext(stateKey)` with `exposeContext`/`consumeContext` shares state between components without prop drilling:

```javascript
import { createContext, define } from "sxo/client";

const ThemeContext = createContext("theme");

define("theme-provider", ({ $state, $element }) => {
  $state.theme = "light";
  $element.exposeContext(ThemeContext);
});

define("theme-consumer", ({ $element }) => {
  $element.consumeContext(ThemeContext); // state.theme syncs from the provider
});
```

Context is shared via DOM events, so providers must be connected before consumers read state.

## Hot Replace (Dev)

- File watchers trigger a debounced esbuild rebuild.
- SSE endpoint: `/hot-replace?href=<current_path>`.
- The client script (`/hot-replace.js`) receives `{ body, assets, publicPath }` and performs partial replacement:
  - Replaces the `<body>` innerHTML.
  - Re-injects all CSS/JS assets associated with the route from the manifest.
  - Preserves scroll position and, heuristically, reactive component state.
- Build errors are sent as an HTML fragment in the `body` field.

Because custom elements cannot be redefined in the same realm, hot replace re-registers islands under suffixed names (e.g., `rc-todos-1`) automatically.

## Patterns

- **Hydrate from server state**: render data into a hidden element (`<div hidden $ref="data">{escapeHtml(JSON.stringify(data))}</div>`) and parse it in `connected()`. The browser decodes entities in text nodes, so `textContent` yields exact JSON. Note `<script>` children are raw text in JSX and cannot be interpolated — see [Pages](pages.md).
- **Fetch from your API**: call your [middleware JSON API](server.md) with `fetch` inside handlers; update `$state` with the response.
- **Progressive enhancement**: server-render the same markup the client renders, so pages work without JavaScript and hydrate without visual change.

Full working example: the [Todo App tutorial](tutorials/todo-app.md).
