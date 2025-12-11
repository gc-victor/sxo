# AGENTS.md

**Last Updated:** 2025-10-27

## Purpose

This file is the onboarding manual for every AI assistant (Claude, Cursor, GPT, etc.) and every human who edits this repository. It encodes our coding standards, guard-rails, and workflow tricks so the _human 30 %_ (architecture, tests, domain judgment) stays in human hands.[^1]

[^1]: This principle emphasizes human oversight for critical aspects like architecture, testing, and domain-specific decisions, ensuring AI assists rather than fully dictates development.

---

## 0. Project Overview

This is a showcase project demonstrating the integration of SXO (a server-side JSX framework), reactive-component (for client-side islands), and basecoat-css (for component styling). It serves as a reference implementation and documentation for building applications with this modern stack.

### Components

| Component                                                                                               | Description                                                                   |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **[SXO Framework](https://github.com/gc-victor/sxo/raw/refs/heads/main/README.md)**                     | Server-side JSX transformer and dev/prod servers with hot-reload              |
| **[reactive-component](https://github.com/gc-victor/reactive-component/raw/refs/heads/main/README.md)** | Lightweight reactive islands using `define()` API with signals                |
| **[basecoat-css](https://basecoatui.com/kitchen-sink/)**                                                | Pre-built component styles and design tokens                                  |
| **Tailwind CSS**                                                                                        | Utility-first CSS framework for custom styling                                |
| **Component Libraries**                                                                                 | `src/components/` (JSX components) and `src/components/html/` (HTML examples) |

### Golden Rule

**When unsure about implementation details or requirements, ALWAYS consult the developer rather than making assumptions.**

---

## 1. Non-Negotiable Golden Rules

| #       | AI _may_ do                                                                                                                                            | AI _must NOT_ do                                                                                                                                           |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **G-0** | Whenever unsure about something related to the project, ask the developer for clarification before making changes.                                     | ❌ Write changes or use tools when you are not sure about something project-specific, or if you don't have context for a particular feature/decision.      |
| **G-1** | Generate code **only inside** `src/` directory (specifically `src/components/`, `src/pages/`, `src/utils/`, `src/types/`) or explicitly pointed files. | ❌ Touch root-level config files ([biome.json](biome.json)`, [jsconfig.json](jsconfig.json), `[sxo.config.js](sxo.config.js)) without explicit permission. |
| **G-2** | Add/update **`AIDEV-NOTE:` anchor comments** near non-trivial edited code.                                                                             | ❌ Delete or mangle existing `AIDEV-` comments.                                                                                                            |
| **G-3** | Follow Biome lint/style configs ([biome.json](biome.json)). Use `npm run check` to validate.                                                           | ❌ Re-format code to any other style. Manual formatting not allowed.                                                                                       |
| **G-4** | For changes >300 LOC or >3 files, **ask for confirmation**.                                                                                            | ❌ Refactor large modules without human guidance.                                                                                                          |
| **G-5** | Stay within the current task context. Inform the dev if it'd be better to start afresh.                                                                | ❌ Continue work from a prior prompt after "new task" – start a fresh session.                                                                             |
| **G-6** | This is vanilla JSX (NOT React). Use native HTML semantics and standard DOM APIs.                                                                      | ❌ Use React patterns (`useState`, `useEffect`, etc.), React-specific props, or JSX runtime imports.                                                       |
| **G-7** | Keep user-visible text in HTML templates. Use JSDoc for code documentation only.                                                                       | ❌ Hardcode user-facing strings in JavaScript/JSX component functions.                                                                                     |

---

## 2. Build, Test & Utility Commands

### Core Commands

```bash
# Linting and formatting
pnpm check              # Biome lint check
pnpm check:fix          # Biome lint + auto-fix with unsafe fixes

# Development
pnpm dev                # Start SXO dev server + Tailwind watch (parallel)
pnpm sxo:dev            # SXO dev server only (with hot-reload)
pnpm watch:tailwind     # Tailwind watch mode only

# Build & Production
pnpm sxo:build          # Build production bundles (client + server)
pnpm sxo:generate       # Pre-render static routes to HTML
pnpm sxo:start          # Start production server
pnpm sxo:clean          # Remove dist/ directory

# Manual Tailwind build
pnpm tailwind           # Build Tailwind CSS once
```

### Important Notes

- **E2E Testing**: Playwright-based end-to-end tests for component validation.
- **SXO commands**: Run through `node ../../bin/sxo.js` (relative to repo root).
- **Hot reload**: Dev server includes SSE-based hot replacement for fast iteration.
- **Tailwind**: Compiled from [styles.css](src/styles.css) → `src/pages/global.css`.

---

### Validation

After making changes, run the following commands:

```bash
pnpm check:fix # Runs formatter, linter and import sorting to the requested files
pnpm test:e2e # Full e2e testing
pnpm test:e2e <filepath> # IMPORTATN! Only to e2e test a specific components. It is possible to use multiple file paths separated by spaces
```

### Testing Strategy

This project uses Playwright-based E2E tests to validate component behavior, accessibility, and integration in real browser environments. Tests are located in `e2e/` directory, named `<component>.test.js`.

#### Test Coverage Expectations

- **Interactive Components**: All components with `.client.js` files must have corresponding E2E tests (100% coverage achieved).
- **Accessibility**: Tests must validate ARIA attributes, keyboard navigation, and focus management.
- **Reactive Behavior**: Verify state synchronization, CSS variable updates, and multi-instance scenarios.
- **Polymorphic Components**: Test conditional rendering logic (e.g., Button as `<button>` or `<a>`).
- **Edge Cases**: Include tests for disabled states, invalid props, boundary values, and error handling.

#### Test File Naming Conventions

- Component tests: `<component-name>.test.js` (e.g., `button.test.js`, `accordion.test.js`)
- Integration/page-level tests: `<feature>.test.js` (e.g., `theme-toggle.test.js` for header utility)
- Test structure: Use `test.describe("<Component>", () => { ... })` with nested `test("<scenario>", async ({ page }) => { ... })`

#### When to Use Component vs. Integration Tests

- **Component Tests**: For isolated component behavior, markup validation, and client-side interactivity (preferred for most cases).
- **Integration Tests**: For cross-component interactions, page-level utilities, or full page flows (e.g., theme-toggle in header).
- **Avoid Overlap**: Do not duplicate scenarios; ensure each test serves a unique purpose.

#### Testing Best Practices

- Use semantic selectors (`role`, `aria-*` attributes) over fragile text/content selectors.
- Replace `page.waitForTimeout()` with Playwright's auto-waiting assertions (`toBeVisible()`, `toBeFocused()`, etc.).
- Add `data-testid` attributes to critical elements for stability when semantic selectors are insufficient.
- Test accessibility features: keyboard navigation, ARIA states, screen reader support.
- Run tests in parallel for efficiency; focus on deterministic assertions to avoid flakiness.

## 3. Coding Standards

### Language & Runtime

| Standard          | Value                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------- |
| **Node Version**  | 20+ (ESM only)                                                                           |
| **Module System** | ESM; imports MUST use `.js` extensions (even for `.jsx` files)                           |
| **JSX Flavor**    | Vanilla JSX via SXO transformer (NOT React)                                              |
| **Type System**   | JSDoc with TypeScript-style types; [jsconfig.json](jsconfig.json) enforces strict checks |

### Formatting & Style

| Aspect          | Rule                                          |
| --------------- | --------------------------------------------- |
| **Formatter**   | Biome (enforced via [biome.json](biome.json)) |
| **Indentation** | 4 spaces                                      |
| **Line Width**  | 140 characters                                |
| **Quotes**      | Double quotes preferred                       |
| **Semicolons**  | Required (Biome default)                      |

### Naming Conventions

| Element         | Convention                                               | Example                                    |
| --------------- | -------------------------------------------------------- | ------------------------------------------ |
| **Components**  | PascalCase                                               | `Button`, `CardHeader`, `SectionAccordion` |
| **Functions**   | camelCase                                                | `resolveButtonClass`, `cn`                 |
| **Files**       | kebab-case (components), PascalCase (React-like exports) | `button.jsx`, `alert-dialog.jsx`           |
| **CSS Classes** | kebab-case (Tailwind/basecoat)                           | `bg-blue-500`, `px-4`                      |
| **Props**       | camelCase, with `class`/`className` aliasing             | `variant`, `size`, `className`             |

### Import Conventions

```javascript
// ✅ Correct: Use .js extension for all imports
import { cn } from "@utils/cn.js";
import Button from "@components/button.jsx";
import { IconCheck } from "@components/icon.jsx";

// ❌ Wrong: Missing .js extension
import { cn } from "@utils/cn";
import Button from "@components/button";
```

### Path Aliases

Configured in [jsconfig.json](jsconfig.json):

```javascript
// Available aliases
import { Button } from "@components/button.jsx";
import { cn } from "@utils/cn.js";
import { SectionAccordion } from "@pages/sections/section-accordion.jsx";
import something from "@/relative/path.js"; // @/* resolves to src/*
```

### JSDoc Documentation

**Required for all exported components:**

```javascript
/**
 * @fileoverview Brief description mentioning "vanilla JSX" if applicable.
 *
 * Exports:
 * - ComponentName: What it does
 *
 * Design notes:
 * - Key implementation details
 * - Accessibility considerations
 * - Usage patterns
 *
 * @module path/to/module
 * @author Author Name
 * @license MIT
 * @version 1.0.0
 */

/**
 * Component description.
 *
 * @typedef {Object} ComponentNameProps
 * @property {string} [className] - Additional CSS classes
 * @property {ReactNode} [children] - Child elements
 * @property {string} [variant="primary"] - Visual variant
 *
 * @param {ComponentNameProps} props
 * @returns {string} Rendered HTML string
 * @public
 */
export default function ComponentName({ className, children, variant = "primary", ...rest }) {
  // Implementation
}
```

### Error Handling

- Use early returns for validation
- Provide meaningful error messages
- No silent failures
- Use `console.warn` for development warnings

```javascript
// ✅ Good: Early return with clear error
export function validateProps({ variant }) {
  if (!["primary", "secondary"].includes(variant)) {
    console.warn(`Invalid variant: ${variant}. Falling back to "primary".`);
    return "primary";
  }
  return variant;
}
```

---

## 4. Project Layout & Core Components

### Directory Structure

```
components/
├── src/
│   ├── components/          # Reusable UI components (JSX + client scripts)
│   ├── pages/               # SXO routes (directory = route)
│   │   ├── index.jsx        # Homepage (/)
│   │   ├── sections/        # Reusable page sections
│   │   ├── client/          # Client-side entry for homepage
│   │   └── global.css       # Compiled Tailwind output
│   ├── types/               # TypeScript type definitions (JSDoc)
│   │   └── jsx.d.ts         # JSX element type definitions
│   ├── utils/               # Utility functions
│   │   ├── cn.js            # Class name utility (like clsx)
│   │   ├── escape-html.js   # HTML escaping utilities
│   │   └── highlight-jsx.*  # JSX syntax highlighting
│   └── styles.css           # Tailwind source file
├── e2e/                     # End-to-end tests
├── test-results/            # Test output and reports
├── dist/                    # Build output (generated)
│   ├── client/              # Public assets (HTML, CSS, JS)
│   └── server/              # SSR bundles + routes.json
├── biome.json               # Biome linter/formatter config
├── jsconfig.json            # JavaScript/TypeScript config
├── sxo.config.js            # SXO framework configuration
├── playwright.config.js     # E2E testing configuration
├── package.json             # Dependencies and scripts
└── pnpm-lock.yaml           # pnpm lock file
```

### Component Architecture

#### JSX Components (`src/components/`)

**Pattern**: Functional components returning HTML strings (NOT JSX elements)

```javascript
/**
 * @param {ButtonProps} props
 * @returns {string} HTML string
 */
export default function Button({ children, className, variant = "primary", ...rest }) {
  // Component logic
  const classes = cn(baseClasses, variantClasses[variant], className);

  return (
    <button class={classes} {...rest}>
      {children}
    </button>
  );
}
```

**Key Characteristics:**

- Accept `className` and `class` (aliased)
- Forward all unrecognized props via `...rest`
- Use `cn()` utility for class merging
- Return HTML strings (template literals)
- No React hooks or runtime

#### Client Islands (`*.client.js`)

**Pattern**: Use reactive-component `define()` API for interactivity

```javascript
// accordion.client.js
import { define } from "@qery/reactive-component";

define("bc-accordion", ({ $state, $on, $bind, $ref }) => {
  // Initialize state
  $state.openItems = [];

  // Bind methods
  $on.toggle = (itemId) => {
    const open = $state.openItems;
    $state.openItems = open.includes(itemId) ? open.filter((id) => id !== itemId) : [...open, itemId];
  };

  // Lifecycle (optional)
  return {
    connected: () => console.log("Accordion mounted"),
  };
});
```

**Key Characteristics:**

- File naming: `<component>.client.js`
- Use `define(tagName, definitionFn)`
- State via `$state` proxy (property API)
- Methods via `$on` for HTML event handlers
- Refs via `$ref` for DOM access
- NO React patterns allowed

---

## 5. Anchor Comments

### Guidelines

- Use `AIDEV-NOTE:`, `AIDEV-TODO:`, or `AIDEV-QUESTION:` for inline knowledge.
- Keep concise (≤ 120 chars).
- **Before scanning files, locate existing anchors** in relevant subdirectories.
- **Update relevant anchors** when modifying associated code.
- **Never remove `AIDEV-NOTE`s** without explicit human instruction.
- Add anchors for: long/complex code, important patterns, potential bugs, or confusing logic.

### Examples

```javascript
// AIDEV-NOTE: cn() merges Tailwind classes with basecoat tokens (see basecoat-css docs)
export function cn(...inputs) {
  return clsx(inputs);
}

// AIDEV-TODO: Add keyboard navigation support (Arrow keys, Home/End)
export default function Tabs({ children, ...rest }) {
  // Current implementation...
}

// AIDEV-QUESTION: Should disabled anchors use pointer-events:none or JS preventDefault?
const isDisabled = disabled && href;
```

---

## 6. Commit Discipline

### Guidelines

| Guideline                    | Description                                           |
| ---------------------------- | ----------------------------------------------------- |
| **Granular commits**         | One logical change per commit.                        |
| **Tag AI-generated commits** | e.g., `feat: add tooltip component [AI]`              |
| **Clear commit messages**    | Explain the _why_; reference issues if architectural. |
| **Review AI-generated code** | Never merge code you don't understand.                |
| **Test before committing**   | Run `npm run check` to ensure lint passes.            |

### Commit Message Format

```
<type>: <subject> [AI]

<optional body>

<optional footer>
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

---

## 7. SXO Framework & Routing

### Page Module API

Pages in `src/pages/` must export a default function returning a **full HTML document**:

```javascript
// src/pages/about/index.jsx
export default function AboutPage() {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>About - Basecoat Showcase</title>
      </head>
      <body>
        <h1>About</h1>
        <p>This is the about page.</p>
      </body>
    </html>
  );
}
```

**Key Rules:**

- No separate `head` export (deprecated pattern)
- Return complete `<html>` document
- Include `<head>` with `<meta>`, `<title>`, etc.
- `global.css` auto-injected by SXO

### Routing Rules

| Route Pattern | File Location                                                      | URL           |
| ------------- | ------------------------------------------------------------------ | ------------- |
| Root          | [src/pages/index.jsx](src/pages/index.jsx)                         | `/`           |
| Static        | [src/pages/about/index.jsx](src/pages/about/index.jsx)             | `/about`      |
| Nested        | [src/pages/docs/intro/index.jsx](src/pages/docs/intro/index.jsx)   | `/docs/intro` |
| Dynamic       | [src/pages/blog/[slug]/index.jsx](src/pages/blog/[slug]/index.jsx) | `/blog/:slug` |

**Dynamic Routes:**

- Use `[slug]` directory naming
- Params passed to page function: `({ slug }) => <html>...`
- Currently limited to single param per segment

### Client Entries

Per-route client JavaScript:

```
src/pages/counter/
├── index.jsx              # Page component (SSR)
└── client/
    └── index.js           # Client entry (runs in browser)
```

**Client entry example:**

```javascript
// src/pages/counter/client/index.js
import { define } from "@qery/reactive-component";
import "@components/accordion.client.js";

define("page-counter", ({ $state, $on }) => {
  $state.count = 0;
  $on.increment = () => $state.count++;
});
```

---

## 8. Reactive Component Integration

### Core Concepts

| Concept              | Description                       | Pattern                                                        |
| -------------------- | --------------------------------- | -------------------------------------------------------------- |
| **State Management** | Reactive state via `$state` proxy | `$state.key = value`                                           |
| **Computed Values**  | Derived state with auto-tracking  | `$compute("key", ["dep"], (dep) => ...)`                       |
| **Effects**          | Side effects with cleanup         | `$effect(() => { /* effect */ })`                              |
| **Refs**             | DOM element references            | `$ref.elementName`                                             |
| **Method Binding**   | Event handlers on element         | `$on.methodName = () => {}`                                    |
| **Data Binding**     | Data binding handlers             | `$bind.methodName = () => {}`                                  |
| **Custom Bindings**  | Extend binding system             | `$customBindingHandlers["name"] = ({element, rawValue}) => {}` |

### Binding Directives (HTML)

| Directive              | Purpose                      | Example                                           |
| ---------------------- | ---------------------------- | ------------------------------------------------- |
| `$state="key"`         | Initialize + one-way binding | `<span $state="count">0</span>`                   |
| `$bind-text="key"`     | One-way text content         | `<p $bind-text="message"></p>`                    |
| `$bind-value="key"`    | Two-way input value          | `<input $bind-value="username">`                  |
| `$bind-checked="key"`  | Two-way checkbox state       | `<input type="checkbox" $bind-checked="enabled">` |
| `$bind-class="key"`    | Dynamic classes              | `<div $bind-class="panelClasses">`                |
| `$bind-attr="key"`     | Dynamic attributes           | `<button $bind-attr="attrs">`                     |
| `$bind-disabled="key"` | Disabled state               | `<button $bind-disabled="isLoading">`             |
| `$ref="name"`          | Element reference            | `<input $ref="usernameInput">`                    |
| `onclick="methodName"` | Call bound method            | `<button onclick="increment">+</button>`          |

### Validation Rules

**Binding values MUST be alphanumeric** (pattern: `/^[a-zA-Z0-9]+$/`):

```html
<!-- ✅ Valid -->
<span $state="count">0</span>
<input $bind-value="userName" />
<div $bind-class="panelClasses">
  <!-- ❌ Invalid: Contains dots, brackets, expressions -->
  <span $state="user.name">Invalid</span>
  <span $state="items[0]">Invalid</span>
  <span $bind-text="${value}">Invalid</span>
</div>
```

**Solution**: Use computed properties for complex expressions:

```javascript
// In define() function
$compute("userName", ["user"], (user) => user.name);
```

```html
<!-- In HTML -->
<span $bind-text="userName"></span>
```

---

## 9. Vanilla JSX Patterns

### Key Differences from React

| Aspect             | React                         | Vanilla JSX (SXO)                         |
| ------------------ | ----------------------------- | ----------------------------------------- |
| **Runtime**        | React library required        | No runtime (compiles to strings)          |
| **Hooks**          | `useState`, `useEffect`, etc. | Not available (use reactive-component)    |
| **Prop Names**     | `className` only              | Both `class` and `className` work         |
| **Event Handlers** | `onClick={fn}`                | `onclick="methodName"` (string reference) |
| **Children**       | React elements                | Strings or nested JSX                     |
| **Fragments**      | `<></>` or `<React.Fragment>` | Not needed (use `<div>` or return array)  |
| **Rendering**      | `ReactDOM.render()`           | SSR outputs HTML string                   |

### Component Patterns

#### Polymorphic Components (Button Example)

```javascript
/**
 * Renders <button> by default, <a> when href is provided.
 */
export default function Button({ href, children, disabled, className, ...rest }) {
  const classes = cn("btn", className);

  if (href) {
    // Render as anchor with disabled emulation
    return (
      <a
        href={disabled ? undefined : href}
        class={classes}
        aria-disabled={disabled ? "true" : undefined}
        tabindex={disabled ? "-1" : undefined}
        {...rest}
      >
        {children}
      </a>
    );
  }

  // Render as button
  return (
    <button class={classes} disabled={disabled} {...rest}>
      {children}
    </button>
  );
}
```

#### Composition Pattern

```javascript
// Card.jsx - Parent component
export default function Card({ children, className, ...rest }) {
  return (
    <div class={cn("card", className)} {...rest}>
      {children}
    </div>
  );
}

// Card subcomponents
export function CardHeader({ children, className, ...rest }) {
  return (
    <div class={cn("card-header", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className, ...rest }) {
  return (
    <div class={cn("card-footer", className)} {...rest}>
      {children}
    </div>
  );
}
```

```javascript
// Usage in page
import Card, { CardHeader, CardFooter } from "@components/card.js";

export default function Page() {
  return (
    <Card>
      <CardHeader>Title</CardHeader>
      <p>Content</p>
      <CardFooter>Footer</CardFooter>
    </Card>
  );
}
```

---

## 10. Common Pitfalls

| Pitfall                      | Description                                          | Solution                                                      |
| ---------------------------- | ---------------------------------------------------- | ------------------------------------------------------------- |
| **Missing `.js` extensions** | Import fails: `import { cn } from "../utils/cn"`     | Always add `.js`: `import { cn } from "../utils/cn.js"`       |
| **Using React patterns**     | `useState`, `useEffect`, JSX props like `onClick`    | Use reactive-component `define()` and `$state`                |
| **Expressions in bindings**  | `$bind-text="user.name"` or `$state="items[0]"`      | Use computed: `$compute("userName", ["user"], u => u.name)`   |
| **Wrong prop names**         | Using `htmlFor` instead of `for` in vanilla JSX      | Use standard HTML: `for`, `class` (or `className` alias)      |
| **Forgetting full HTML doc** | Pages returning `<div>...</div>` instead of `<html>` | Always return `<html><head>...</head><body>...</body></html>` |
| **Hardcoded text in JS**     | `const title = "Welcome"` in component function      | Keep text in HTML templates; use JSDoc for docs only          |
| **Client code in pages**     | Interactive logic in `index.jsx` (SSR)               | Move to `client/index.js` with reactive-component             |
| **Using SVGs directly**      | Inline `<svg>` tags in components                    | Use icons from the `icon.jsx` file instead                    |
| **Not running lint**         | Committing without `npm run check`                   | Always run `npm run check` before committing                  |

---

## 11. Domain-Specific Terminology

| Term                         | Definition                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------------- |
| **SXO**                      | Server-side JSX framework with hot-reload, routing, and esbuild integration. NOT React. |
| **Vanilla JSX**              | JSX syntax compiled to template literals without React runtime. Pure HTML strings.      |
| **Reactive Component**       | Lightweight library for client-side interactivity using signals and custom elements.    |
| **Island**                   | Client-side interactive component in an otherwise static page (via `.client.js` files). |
| **Basecoat CSS**             | Component styling system providing design tokens and pre-built component styles.        |
| **Client Entry**             | JavaScript file in `pages/<route>/client/index.js` that runs in the browser.            |
| **SSR**                      | Server-Side Rendering; SXO renders JSX to HTML on the server.                           |
| **Hot Reload**               | SSE-based partial page replacement in dev mode (faster than full page refresh).         |
| **Route Manifest**           | `dist/server/routes.json` containing route metadata and asset mappings.                 |
| **`cn()` Utility**           | Class name utility (like `clsx`) for merging Tailwind/basecoat classes.                 |
| **`highlightJsx()`**         | Server-side JSX syntax highlighter for code display in documentation.                   |
| **`define()` API**           | Reactive-component function for creating custom elements with signals.                  |
| **`$state` Proxy**           | Property-based API for reactive state in `define()` components.                         |
| **`$bind` Object**           | Container for methods callable from HTML event handlers.                                |

---

## 12. Key File & Pattern References

### Important Files

| Topic                 | Location                            | Pattern                                                                                             |
| --------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Component Library** | `src/components/`                   | Functional components returning HTML strings                                                        |
| **Page Routes**       | `src/pages/`                        | Directory = route; `index.jsx` = page component                                                     |
| **Client Islands**    | `src/pages/<route>/client/index.js` | reactive-component `define()` calls                                                                 |
| **Utilities**         | `src/utils/`                        | Helper functions (e.g., [cn.js](src/utils/cn.js)`, `[highlight-jsx.js](src/utils/highlight-jsx.js)) |
| **Type Definitions**  | [jsx.d.ts](src/types/jsx.d.ts)      | JSX element types for JSDoc                                                                         |
| **Tailwind Config**   | [styles.css](src/styles.css)        | Tailwind directives and custom CSS                                                                  |
| **Build Config**      | [sxo.config.js](sxo.config.js)      | SXO framework settings (port, paths, etc.)                                                          |
| **Lint Config**       | [biome.json](biome.json)            | Biome formatter and linter rules                                                                    |

### Component Examples

**Best Practice Examples:**

1. **Polymorphic Button**: [button.jsx](src/components/button.jsx)
   - Demonstrates `<button>` vs `<a>` rendering based on props
   - Shows disabled state handling for anchors

2. **Accordion with Client Island**: [accordion.jsx](src/components/accordion.jsx) + [accordion.client.js](src/components/accordion.client.js)
   - SSR component + client interactivity via reactive-component
   - State management with `$state` and `$bind`

3. **Card Composition**: [card.jsx](src/components/card.jsx)
   - Parent/child component pattern
   - Named exports for subcomponents

4. **Form Handling**: [section-form.jsx](src/pages/sections/section-form.jsx)
   - Two-way binding with `$bind-value`
   - Validation and state management

---

## 13. Meta: Guidelines for Updating AGENTS.md

### Helpful Additions

- **Decision flowcharts**: When to use JSX component vs. client island
- **Reference links**: Link to SXO, reactive-component, basecoat-css docs
- **Performance tips**: Minimize client JS, prefer SSR when possible
- **Accessibility checklist**: ARIA attributes, keyboard navigation

### Format Preferences

- **Consistent syntax highlighting**: All code blocks use language tags (`javascript`, `bash`, `html`)
- **Hierarchical organization**: Numbered sections for easy reference
- **Tabular format**: Tables for quick lookup of rules and patterns
- **Keywords/tags**: Use `#performance`, `#accessibility`, `#security` markers

---

## 14. AI Assistant Workflow: Step-by-Step

When responding to user instructions, follow this process:

1. **Consult Guidance**: Review relevant sections of this `AGENTS.md` file.
2. **Clarify Ambiguities**: Ask targeted questions before proceeding.
3. **Break Down & Plan**: Create a rough plan referencing project conventions.
4. **Trivial Tasks**: If simple, proceed immediately.
5. **Non-Trivial Tasks**: Present plan to user for review and iterate.
6. **Track Progress**: Use to-do list for multi-step tasks.
7. **If Stuck, Re-plan**: Return to step 3 to re-evaluate.
8. **Update Documentation**: Update anchor comments and `AGENTS.md` after changes.
9. **User Review**: Ask user to review completed work.
10. **Session Boundaries**: Suggest fresh session if request is unrelated to current context.

---

## 15. Files to NOT Modify

### Critical Configuration Files

These files control project behavior and should **never be modified** without explicit permission:

| File                           | Purpose                                         | Why Protected                                       |
| ------------------------------ | ----------------------------------------------- | --------------------------------------------------- |
| [biome.json](biome.json)       | Linter and formatter configuration              | Ensures consistent code style across project        |
| [jsconfig.json](jsconfig.json) | JavaScript/TypeScript settings and path aliases | Required for IDE support and type checking          |
| [sxo.config.js](sxo.config.js) | SXO framework configuration                     | Controls build, dev server, and routing behavior    |
| [package.json](package.json)   | Dependencies and scripts                        | Breaking changes affect entire build pipeline       |
| [.gitignore](.gitignore)       | Git ignore patterns                             | Carefully tuned to avoid committing generated files |

### When to Request Permission

- Adding new dependencies to [package.json](package.json)
- Changing linter rules in [biome.json](biome.json)
- Modifying path aliases in [jsconfig.json](jsconfig.json)
- Adjusting SXO settings in [sxo.config.js](sxo.config.js)

---

**END OF AGENTS.MD**

_This file should be updated whenever coding standards, patterns, or project structure changes significantly._
