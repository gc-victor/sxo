---
role: |
  You are a senior JavaScript developer and documentation expert. Your sole responsibility is to meticulously analyze provided JavaScript code and write exceptionally detailed, accurate, and comprehensive JSDoc documentation for every symbol. You must adhere strictly to the JSDoc standard as outlined in the provided reference materials.
task: |
  Analyze the provided JavaScript code snippet. Your task is to add or complete JSDoc comments for all symbols, including modules, namespaces, classes, methods, functions, properties, constants, events, and type definitions. The final output must be the complete, modified code block with the new, exhaustive documentation integrated. No code logic should be altered.
---

# JSDoc Reference

Authoritative quick-reference for supported JSDoc block and inline tags used across this repository.
Use this as a concise human‑readable canonical documentation reference.
Focus: correctness, consistency, and disciplined documentation—avoid speculative or redundant tags.

---

## 1. Purpose & Scope

This document provides an annotated Markdown reference for engineers.
You should consult this file when authoring or reviewing JSDoc comments to ensure you:

- Select the semantically correct tag.
- Avoid deprecated or redundant patterns.
- Maintain consistent phrasing (especially for `@description`, `@since`, `@example`, `@module`, and typedef sections).
- Preserve architectural intent without over‑documenting trivial code.

---

## 2. Tag Usage Principles

1. Prefer minimal, high‑signal documentation—especially in performance‑sensitive or frequently modified code.
2. Avoid duplicating information obvious from the signature (e.g., repeating the parameter name in prose without added value).
3. **DO NOT use `@since`** — version tracking belongs in git history, CHANGELOG, and release notes, not inline documentation.
4. Use `@deprecated` only with explicit migration guidance.
5. Inline tags (`{@link ...}`) should clarify—not distract; prefer canonical targets.
6. Only one primary descriptive block: summary line (first), optional blank line, then extended description or structured tags.
7. Maintain consistency with repository conventions (e.g., `@fileoverview` used in `examples/**` per project rules—this doc includes the generic `@file` tag reference but internal policy overrides).

---

## 3. Block Tags Reference

| Tag                | Synonyms                   | Description                                               | Typical Use Guidance                                                                |
| ------------------ | -------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `@abstract`        | `virtual`                  | Member must be implemented by inheritors.                 | Use only in inheritance patterns (rare here).                                       |
| `@access`          | —                          | Explicit access level (`public`, `private`, etc.).        | Prefer implicit unless clarity needed.                                              |
| `@alias`           | —                          | Treat symbol as if it had another name.                   | Use when re-exporting with different intent.                                        |
| `@async`           | —                          | Marks function as asynchronous.                           | Avoid if `async` keyword already self-evident (optional redundancy).                |
| `@augments`        | `extends`                  | Declares inheritance from a parent.                       | Use in classical inheritance, not mixins.                                           |
| `@author`          | —                          | Credits author.                                           | Required in example component headers (see project rules).                          |
| `@borrows`         | —                          | Indicates borrowing members from another object.          | Rare; use only when adapting external API into local namespace.                     |
| `@callback`        | —                          | Documents a callback function signature.                  | Use with typedef style: `@callback Name`.                                           |
| `@class`           | `constructor`              | Marks a function as a constructor/class.                  | Usually implicit; omit for `class` declarations.                                    |
| `@classdesc`       | —                          | Extended class description.                               | Use when large conceptual explanation needed.                                       |
| `@constant`        | `const`                    | Identifies a constant object/value.                       | Use for exported immutable objects (not primitives unless semantically meaningful). |
| `@constructs`      | —                          | Associates preceding function with a class constructor.   | Obscure—prefer native class syntax.                                                 |
| `@copyright`       | —                          | Copyright notice.                                         | Only if legally required beyond LICENSE.                                            |
| `@default`         | `defaultvalue`             | Documents default value.                                  | Use when not inferable from assignment or destructuring.                            |
| `@deprecated`      | —                          | Marks symbol as deprecated.                               | Always include replacement guidance and version.                                    |
| `@description`     | `desc`                     | Human-readable description.                               | First non-tag text often suffices; use explicit tag for clarity in dense blocks.    |
| `@enum`            | —                          | Documents a set of related literal values.                | Prefer for object maps of constants.                                                |
| `@event`           | —                          | Documents an event name/payload.                          | Use with emitter patterns.                                                          |
| `@example`         | —                          | Usage example.                                            | Keep minimal, runnable-in-principle, no irrelevant scaffolding.                     |
| `@exports`         | —                          | Marks the module's exported value.                        | Use sparingly; `@module` often enough.                                              |
| `@external`        | `host`                     | Identifies external symbol.                               | Rare; for documenting dependencies.                                                 |
| `@file`            | `fileoverview`, `overview` | Describes a file.                                         | Project policy: use `@fileoverview` in examples; elsewhere optional.                |
| `@fires`           | `emits`                    | Events a method may emit.                                 | Only if events are integral to API contract.                                        |
| `@function`        | `func`, `method`           | Documents a function/method.                              | Standard for exported functions/components.                                         |
| `@generator`       | —                          | Marks a generator function.                               | Use when `function*` semantics matter to consumers.                                 |
| `@global`          | —                          | Documents a global symbol.                                | Avoid—global scope discouraged.                                                     |
| `@hideconstructor` | —                          | Hides constructor from docs.                              | Use to focus on factory/static usage.                                               |
| `@ignore`          | —                          | Omits symbol from docs.                                   | Use only with clear justification (internal technical constraints).                 |
| `@implements`      | —                          | Declares implementation of interface.                     | Use in class with documented interface typedef.                                     |
| `@inheritdoc`      | —                          | Inherit parent docs.                                      | Use to reduce redundancy in overridden methods.                                     |
| `@inner`           | —                          | Marks an inner (nested) member.                           | Avoid deep nesting; prefer module-level definitions.                                |
| `@instance`        | —                          | Documents an instance member.                             | Usually implicit in prototype methods.                                              |
| `@interface`       | —                          | Declares an interface.                                    | Use for shared contract across multiple implementations.                            |
| `@kind`            | —                          | Explicit symbol kind.                                     | Rare—use only when ambiguous to tooling.                                            |
| `@lends`           | —                          | Treat object literal properties as belonging to a target. | Legacy pattern—avoid unless required for tooling.                                   |
| `@license`         | —                          | License identifier.                                       | Use SPDX (e.g. `MIT`). Required in certain headers per rules.                       |
| `@listens`         | —                          | Events a symbol listens to.                               | Use for event-driven modules/components.                                            |
| `@member`          | `var`                      | Documents a member variable.                              | Use for exported constants/objects when clarification needed.                       |
| `@memberof`        | —                          | Assigns parent container.                                 | Useful in namespaced static exports.                                                |
| `@mixes`           | —                          | Denotes mixed-in members from another object.             | Avoid unless formal mixin pattern present.                                          |
| `@mixin`           | —                          | Declares a mixin object.                                  | Use only if exported for consumption.                                               |
| `@module`          | —                          | Declares a module.                                        | Required in example component headers per project spec.                             |
| `@name`            | —                          | Explicit symbol name.                                     | Avoid unless inference fails.                                                       |
| `@namespace`       | —                          | Declares a namespace object.                              | Use for grouped related stateless utilities.                                        |
| `@override`        | —                          | Marks overriding member.                                  | Use with inheritance when behavior meaningfully differs.                            |
| `@package`         | —                          | Package-private access.                                   | Only in monorepo or internal layering situations.                                   |
| `@param`           | `arg`, `argument`          | Documents function parameters.                            | Always include type + concise purpose.                                              |
| `@private`         | —                          | Marks private symbol.                                     | Prefer local scoping or `#` fields where possible.                                  |
| `@property`        | `prop`                     | Documents object/typedef property.                        | Required in props typedefs in examples.                                             |
| `@protected`       | —                          | Protected symbol (inheritance).                           | Only if subclassing pattern present.                                                |
| `@public`          | —                          | Explicitly public.                                        | Required for exported UI components per rules.                                      |
| `@readonly`        | —                          | Immutable after initialization.                           | Use when semantic guarantee matters.                                                |
| `@requires`        | —                          | Module dependency.                                        | Rare; better handled via imports.                                                   |
| `@returns`         | `return`                   | Return value description.                                 | Always specify type; mention semantics not obvious from name.                       |
| `@see`             | —                          | Cross-reference related docs/resources.                   | Keep curated; avoid noise.                                                          |
| `@since`           | —                          | Introduction version.                                     | **DEPRECATED: Do not use.** Version tracking belongs in git history, CHANGELOG, and release notes. |
| `@static`          | —                          | Static member of class.                                   | Use when overshadowing instance semantics.                                          |
| `@summary`         | —                          | Shortened description.                                    | Use when extended description is lengthy.                                           |
| `@this`            | —                          | Explicit `this` binding.                                  | Use in functional patterns relying on manual binding.                               |
| `@throws`          | `exception`                | Possible thrown errors.                                   | Only list meaningful, user-relevant errors.                                         |
| `@todo`            | —                          | Pending work.                                             | Keep actionable, time-bounded, and minimal.                                         |
| `@tutorial`        | —                          | Links symbol to a tutorial.                               | Use sparingly with curated long-form docs.                                          |
| `@typedef`         | —                          | Declares a custom type.                                   | Required for complex props objects.                                                 |
| `@version`         | —                          | Version number.                                           | Use in file/module headers when versioned independently.                            |
| `@virtual`         | `abstract`                 | May be overridden by inheritors.                          | Distinguish from enforced `@abstract`.                                              |
| `@yields`          | `yield`                    | Value yielded by generator.                               | Include when yield type differs from return type.                                   |

---

## 4. Inline Tags

Inline tags are embedded within descriptions or other tag values for added semantic linking.

| Inline Tag        | Synonyms                      | Description                     | Example                                           |
| ----------------- | ----------------------------- | ------------------------------- | ------------------------------------------------- |
| `{@link ...}`     | `{@linkplain}`, `{@linkcode}` | Creates link to symbol or URL.  | `{@link doWork}` or `{@link https://example.com}` |
| `{@tutorial ...}` | —                             | Links to a tutorial identifier. | `{@tutorial getting-started}`                     |

Guidance:

- Use `{@linkcode}` for inline code styling of identifiers.
- Prefer relative symbol links over external URLs unless external doc is canonical.
- Keep links minimal to avoid distracting from core narrative.

---

## 5. Required Patterns in Example Components

(Per project rules—reinforced here for practical usage.)

File header (`@fileoverview` pattern):

```
/**
 * @fileoverview <One-sentence summary mentioning "vanilla JSX"> (vanilla JSX)
 *
 * @module ui/<component>
 * @description
 * <1–5 lines of extended context.>
 *
 * Exports:
 * - `<Name>`: <short purpose>.
 *
 * Design notes:
 * - <note>.
 *
 * @author ...
 * @license MIT
 * @version 1.0.0
 */
```

Exported component props typedef pattern:

```
/**
 * Props accepted by `<ComponentName>`.
 *
 * @typedef {Object} ComponentNameProps
 * @property {string} [class] - CSS classes for root element.
 * @property {string} [className] - Alias for `class`.
 * @property {JSX.Element|JSX.Element[]|string} [children] - Content.
 * @property {Object} [rest] - Additional attributes.
 */
```

Function JSDoc pattern:

```
/**
 * @function ComponentName
 * @param {ComponentNameProps} [props={}] - Properties object.
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <ComponentName>Example</ComponentName>
 * @public
 */
```

---

## 6. Tag Selection Decision Guide

| Scenario                     | Use                            | Avoid                                                     |
| ---------------------------- | ------------------------------ | --------------------------------------------------------- |
| Introducing new public API   | `@public`                      | `@since` (use git/CHANGELOG instead)                      |
| Deprecating feature          | `@deprecated` + migration note | Bare `@deprecated` with no guidance                       |
| Components with object props | `@typedef`, `@property`        | Embedding props via multiple `@param` object.member forms |
| Linking related utilities    | `@see` (1–3 curated)           | Excessive cross-links                                     |
| Recording default values     | `@default` (if not obvious)    | Repeating initializer value verbatim when trivial         |
| Documenting thrown errors    | `@throws` per error type       | Generic `@throws {Error}` with no condition               |
| Re-export renaming           | `@alias`                       | Repeating duplicate definition                            |

---

## 7. Common Anti-Patterns (Avoid)

| Anti-Pattern                                      | Why Problematic     | Preferred Alternative                           |
| ------------------------------------------------- | ------------------- | ----------------------------------------------- |
| Using `@since` tag                                | Clutters docs, duplicates git history | Use git log, CHANGELOG, release notes |
| Documenting every local variable with `@member`   | Noise, low value    | Omit                                            |
| Using `@returns {void}` for obvious void          | Redundant           | Omit if self-evident                            |
| Large prose in `@description` duplicating summary | Redundancy          | Concise summary; elaborate only when necessary  |
| Using `@param {...} options` instead of typedef   | Loss of structure   | Create `@typedef`                               |
| Overusing `@todo` for speculative ideas           | Increases entropy   | Track externally or convert to actionable issue |

---

## 8. Minimal Example (Conforming)

```js
/**
 * @fileoverview Accessible notice component (vanilla JSX)
 *
 * @module ui/notice
 * @description
 * Provides a lightweight semantic wrapper for inline status or advisory messages.
 *
 * Exports:
 * - `<Notice>`: Renders a styled container with optional status tone.
 *
 * Design notes:
 * - Minimal semantics; color/role escalation left to integrator.
 *
 * @author …
 * @license MIT
 * @version 1.0.0
 */

/**
 * Props for `<Notice>`.
 *
 * @typedef {Object} NoticeProps
 * @property {string} [class] - Root element classes.
 * @property {string} [className] - Alias for `class`.
 * @property {"info"|"warn"|"error"|"success"} [tone="info"] - Visual tone.
 * @property {JSX.Element|JSX.Element[]|string} [children] - Content body.
 * @property {Object} [rest] - Additional attributes.
 */

/**
 * @function Notice
 * @param {NoticeProps} [props={}] - Component properties.
 * @returns {JSX.Element} Rendered notice wrapper.
 * @example
 * <Notice tone="warn">Check configuration.</Notice>
 * @public
 */
export function Notice({ class: klass, className, tone = "info", children, ...rest } = {}) {
  const c = ["notice", `notice--${tone}`, klass || className].filter(Boolean).join(" ");
  return (
    <div class={c} {...rest}>
      {children}
    </div>
  );
}
```

---

## 9. Inline Linking Examples

| Intent                  | Example                                                            |
| ----------------------- | ------------------------------------------------------------------ |
| Link to local function  | `See {@link parseRoute} for route parsing semantics.`              |
| Link with code style    | `Uses {@linkcode createServer} internally.`                        |
| External spec reference | `Aligns with {@link https://html.spec.whatwg.org/ HTML Standard}.` |
| Tutorial reference      | `For onboarding, see {@tutorial getting-started}.`                 |

---

## 10. Versioning & Stability Guidelines

Version tracking belongs in git history, CHANGELOG files, and release notes—not inline JSDoc comments. Focus documentation on behavior and usage, not historical metadata.

Use `@deprecated` only with:
  - Replacement symbol or migration path.
  - Target removal version (if known).
  - Rationale.

Example:

```
/**
 * @deprecated Use `createManifestV2` instead. Will be removed in 2.0.0.
 */
```

---

## 11. When To Skip Tags

| Situation                                         | Justification for Skipping                     |
| ------------------------------------------------- | ---------------------------------------------- |
| Trivial pure function obvious from name/signature | Description adds no new semantics.             |
| Internal helper not exported and self-explanatory | Local scope keeps intent clear.                |
| Simple passthrough re-export                      | Document at origin; include pointer if needed. |

---

## 12. Checklist Before Submitting Documentation

- [ ] Header conforms to project template (if under `examples/**`).
- [ ] All exported functions/components have full JSDoc blocks.
- [ ] Props typedef created & referenced.
- [ ] `class` + `className` both documented (UI components).
- [ ] At least one `@example` per public export.
- [ ] No redundant/empty tags.
- [ ] No `@since` tags present (use git/CHANGELOG for versions).
- [ ] `@deprecated` (if present) includes actionable migration path.
- [ ] Inline `{@link}` targets resolve or are canonical URLs.

---

## 13. Quick Tag Category Index

- Structure & Identity: `@module`, `@fileoverview`, `@typedef`, `@interface`, `@class`
- API Surface: `@function`, `@param`, `@property`, `@returns`, `@throws`
- Lifecycle & Stability: `@since`, `@version`, `@deprecated`
- Access & Scope: `@public`, `@private`, `@protected`, `@package`, `@static`, `@instance`
- Composition & Relations: `@augments`, `@implements`, `@mixes`, `@memberof`, `@alias`
- Events: `@event`, `@fires`, `@listens`
- Behavior Modifiers: `@async`, `@generator`, `@abstract`, `@virtual`, `@override`
- Documentation Enhancers: `@example`, `@see`, `@summary`, `@description`, `@default`
- Type & Value Metadata: `@enum`, `@constant`, `@readonly`
- Maintenance & Guidance: `@todo`, `@deprecated`, `@tutorial`

---

## 14. Inline Tag Best Practices

| Pattern             | Do                                           | Don’t                                             |
| ------------------- | -------------------------------------------- | ------------------------------------------------- |
| Symbol link         | `{@link parseConfig}`                        | Plain name with ambiguity                         |
| External docs       | `{@link https://developer.mozilla.org/ MDN}` | Raw URL without label                             |
| Code highlight link | `{@linkcode createServer}`                   | Using `{@link}` when code formatting aids clarity |
| Tutorial            | `{@tutorial build-pipeline}`                 | Overusing for small clarifications                |

---

## 15. Escalation Guidance

If uncertain about:

- Tag semantics
- Whether a symbol merits documentation
- Versioning implications
- Deprecation communication

Then:

1. Add minimal provisional docs.
2. Mark ambiguity with a precise `// TODO:` (code) or internal comment.
3. Raise in code review for resolution.

---

## 16. Source Integrity Note

This reference is maintained manually alongside internal documentation sources.
Update this file whenever underlying documentation standards change.

---

## 17. Summary

Use this document to maintain high signal JSDoc: explicit, lean, and policy-aligned.
Avoid ceremony; maximize comprehension and forward maintainability.

> Principle: Document intent & contractual semantics—never restate the obvious.

---
