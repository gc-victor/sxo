# @sxo/client

Client-side reactivity for [SXO](https://github.com/gc-victor/sxo) — a tiny, framework-free library for web-component islands. Server-render your pages with JSX, then add interactivity only where needed.

Powered by [alien-signals](https://github.com/stackblitz/alien-signals). No React, no virtual DOM.

## Installation

```shell
npm install @sxo/client
```

> Already using the `sxo` package? The same library is re-exported as `sxo/client` — no extra install needed.

## Usage

Register a custom element with declarative state, refs, events, and computed values:

```javascript
import { define } from "@sxo/client";

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

```html
<rc-counter>
    <button type="button" $onclick="decrement">−</button>
    <span $state="count">0</span>
    <button type="button" $onclick="increment">+</button>
</rc-counter>
```

## API

- **`define(tag, definition)`** — register a custom element. The definition receives a context with `$state`, `$on`, `$bind`, `$ref`, `$compute`, `$effect`, and `$element`, and may return lifecycle methods (`connected`, `disconnected`, `adopted`, `attributeChanged`).
- **`ReactiveComponent`** — base class for class-based authoring.
- **`createContext(stateKey)`** — share state between components via `exposeContext`/`consumeContext`.

Template attributes: `$state="key"` binds text content, `$on<event>="handler"` binds events, `$bind-<type>="key"` binds properties (`value`, `text`, `html`, `checked`, `class`, `style`, …), `$ref="name"` captures element references.

## Documentation

Full docs, guides, and examples: [github.com/gc-victor/sxo](https://github.com/gc-victor/sxo#readme)

## License

MIT
