# JSX Examples Documentation & Style Standards

## 0. Purpose & Scope

Provide a concise, enforceable, copy‑pasteable specification for:

- File headers
- Component JSDoc blocks (single canonical format)
- Prop typing + native attribute inheritance
- Declarative composition (markup-based only)
- Accessibility + attribute emission
- Version + tag semantics
- Sentinel component prohibition

Non-goals: historical variants, stylistic forks, redundant verbosity, metadata-return abstractions.

**Related Files & Globs:**

- [.rules/jsx-standards.md](./.rules/jsx-standards.md)
- [examples/basecoat/src/types/jsx.d.ts](./examples/basecoat/src/types/jsx.d.ts)

---

## 1. File-Level JSDoc (Canonical Header)

Every `examples/**/*.jsx` file MUST begin with exactly one `@fileoverview` header block using this order:

```js
/**
 * @fileoverview <One-sentence summary mentioning "vanilla JSX"> (vanilla JSX)
 *
 * @module ui/<component-or-domain>
 * @description
 * <1–5 short lines of context/purpose.>
 *
 * Exports:
 * - `<ExportName>`: <concise purpose>.
 * - `<OtherExport>`: <concise purpose>.
 *
 * Design notes:
 * - <Semantic / architectural constraint>.
 * - <Accessibility / composition / limitation note>.
 *
 * @author Víctor
 * @license MIT
 * @version 1.0.0
 */
```

Rules:

- MUST use `@fileoverview` (never `@file`).
- Summary line MUST include the phrase “vanilla JSX”.
- Choose **Design notes** OR **Design constraints** (do not include both headings).
- `Exports:` list uses backticked component names and concise single-line explanations.
- Keep lines ≤ ~100 chars; wrap deliberately (no mid-word wrapping).
- `@version` reflects the file’s initial introduction version; never rewritten retroactively.

---

## 2. Canonical Component JSDoc (Single Allowed Format)

All public exported components using object props MUST have a **single contiguous** JSDoc block directly
above the function declaration using this EXACT pattern (including blank line layout):

```js
/**
 * Props accepted by `<ComponentName />`.
 *
 * [Brief description of what the component does]
 * [Note about conditional rendering if applicable]
 * [Note about forwarded native attributes / inheritance]
 *
 * @typedef {HTML[Element]Attributes & ComponentProps & {
 *   customProp1?: type,
 *   customProp2?: type,
 * }} ComponentNameProps
 * @function ComponentName
 * @param {ComponentNameProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <ComponentName>...</ComponentName>
 * @public
 * @since 1.0.0
 */
export function ComponentName({ class: klass, className, children, ...rest }) {
  // ...
}
```

Enforcement Details:

- Opening line MUST be: `Props accepted by \`<ComponentName />\`.`
- Description section = 1–3 lines (no filler blank lines beyond template).
- `@typedef` MUST use an **intersection** with the correct native attribute interface:
  - Replace `HTML[Element]Attributes` with the precise interface (e.g. `HTMLButtonAttributes`,
    `HTMLInputAttributes`, `HTMLDivAttributes`).
  - Inline object defines ONLY custom props (no re-listing native attributes).
- Typedef name MUST be `<ComponentName>Props`.
- `@function` tag MUST match export symbol exactly.
- `@param` MUST be `@param {<ComponentName>Props} props` (NO defaults, NO brackets).
- `@returns {JSX.Element} Rendered markup.` EXACT trailing sentence (keep period).
- `@example` minimal & plausible.
- ALWAYS include `@public` and `@since 1.0.0` (or introduction version).
- No additional tags (no `@property`, no `@see`, no `@deprecated` absent explicit approval).
- No `[props={}]`, no parameter object defaults.
- No `rest` pseudo-prop documentation.
- Children prop not redundantly documented—implicitly part of props object if accepted.

Edge Case (parameterless export):

- If a component has no props object, omit typedef and use a concise JSDoc with `@function`, `@returns`,
  `@example`, `@public`, `@since`.

### Sentinel Components (Prohibited)

Previously allowed “sentinel” exports returning plain metadata objects are now **NOT permitted**.
All public exports MUST return markup (a string of HTML in vanilla JSX form) or be removed/refactored.

If structural metadata was formerly modeled by sentinel components:

- Replace with explicit markup-producing child elements.
- If transformation logic once consumed sentinel objects, inline necessary attributes/semantics directly
  in the resulting HTML markup or create lightweight helper (non-exported) functions.
- Remove any legacy sentinel JSDoc patterns; they must not appear in new or refactored code.
- PRs introducing sentinel/object-return abstractions MUST be rejected.

---

## 3. Native Attribute Inheritance (Strict)

Use the concrete element interfaces defined in `examples/basecoat/src/types/jsx.d.ts`:

Examples: `HTMLButtonAttributes`, `HTMLInputAttributes`, `HTMLAnchorAttributes`, `HTMLDivAttributes`,
`HTMLTextAreaAttributes`, `HTMLSelectAttributes`, `HTMLFormAttributes`.

Rules:

- Never invent interfaces (e.g. `HTMLSpanAttributes`) unless added to `jsx.d.ts`.
- Use the most specific available interface; fallback to `HTMLDivAttributes` if none exists.
- Polymorphism discouraged—prefer distinct components; if unavoidable, document the dominant semantics.
- Do NOT enumerate native attributes manually—inherit and forward via `...rest`.
- Any narrowing or filtering:
  - Code-level conditional spread + `// LIMITATION: <reason>`
  - File-level Design note summarizing restriction.

---

## 4. Destructuring & Prop Order

Inside the function signature:

1. `class: klass`
2. `className`
3. Structural / semantic props (`children`, `as`, `href`, `type`, `value`, etc.)
4. Custom component props (alphabetical where feasible)
5. `...rest` last

Rules:

- Support both `class` and `className`; merge via shared `cn` utility.
- No whole-object default (`= {}`) at parameter level.
- Scalar defaults via destructuring (e.g. `{ size = "md" }`).

---

## 5. Attribute Emission & Boolean Rules

- Boolean attributes: present as empty string `""` when truthy; omitted when falsy.
- Conditional spreads MUST use ternary form:
  - ✅ `{...(disabled ? { disabled: "" } : {})}`
  - ❌ `{...(disabled && { disabled: "" })}`
- Avoid redundant ARIA when native semantics suffice.
- Avoid redundant props when native attributes suffice.
- Never inject unsanitized raw HTML.

---

## 6. Declarative Composition Mandate (Markup Only)

Structural collections (options, tabs, breadcrumb items, menu items, steps, timeline events, grouped lists)
MUST be composed through actual child markup components—not prop arrays, not sentinel metadata objects.

Legacy array-based props:

- Add `// TODO(declarative-composition): migrate array prop to child components`
- Add a Design note referencing transitional state.
- Do not extend array-based APIs further once TODO is present.

Refactoring sentinel patterns:

- Convert each sentinel to an HTML-producing child component (e.g. `<ComboboxOption>` returns rendered `<li>` / `<option>` markup).
- If purely semantic grouping is needed, the child component returns minimal markup (e.g. a wrapper element) rather than an object.

---

## 7. Accessibility Practices (Concise Layer)

- Prefer native tags: `<dialog>`, `<details>/<summary>`, `<button>`, `<input>`, `<fieldset>`.
- Use `// ACCESSIBILITY:` comments only for subtle semantics or limitations.
- Avoid `id` unless ARIA relationships demand it; justify when used.
- Advanced behaviors (focus trap, keyboard roving) omitted by default → mark with `// LIMITATION:`.

---

## 8. Version & Tag Semantics

- `@since` pinned at first introduction of a public export; never updated retroactively.
- New components start at `@since 1.0.0` unless baseline changes.
- Breaking changes require a Design note + explicit rationale.

---

## 9. Acceptance Checklist (Unified)

A PR modifying `examples/**/*.jsx` MUST satisfy ALL:

1. Single file header present, ordered, includes “vanilla JSX”.
2. Every public export with object props uses canonical JSDoc template.
3. No deprecated patterns: object-form typedefs, `@property` lists, `[props={}]`, rest pseudo-prop docs.
4. Typedef name = `<ExportName>Props`; used in `@param`.
5. Native interface correct & specific; no fabricated names.
6. `class` / `className` alias handled with `class: klass` pattern.
7. Example present, minimal, plausible.
8. Boolean attribute emission via ternary spreads only.
9. No prop-based structural arrays unless transitional TODO present.
10. `@public` + `@since` on each export.
11. No re-listing native attributes inside typedef.
12. Only allowed tags present (no extraneous JSDoc tags).
13. `cn` utility used (or documented migration TODO).
14. **No sentinel / metadata-only components.**
15. Lines ≤ ~100 chars; consistent wrapping.

---

## 10. Migration Guidance (Legacy Cleanup)

When converting old files:

- Remove `@property` enumerations; replace with intersection typedef.
- Remove narrative paragraphs beyond 1–3 lines in component block (move to file-level Design notes if essential).
- Replace `[props={}]` pattern → plain `props` or destructuring.
- Delete secondary/duplicate typedef forms.
- Delete sentinel components; replace with markup-returning children.
- Remove `rest` pseudo-prop docs; rely on native inheritance.
- Convert sentinel usage sites to direct markup structure.

Do NOT:

- Mix old and new patterns in a single file.
- Leave placeholder “TODO document props” lines.

---

## 11. Canonical Examples (Reference)

Button:

```js
/**
 * Props accepted by `<Button />`.
 *
 * Interactive action trigger element.
 * Strict semantic button (navigation handled by a dedicated Link component).
 * Inherits all native button attributes.
 *
 * @typedef {HTMLButtonAttributes & ComponentProps & {
 *   variant?: "solid"|"ghost",
 *   size?: "sm"|"md"|"lg",
 * }} ButtonProps
 * @function Button
 * @param {ButtonProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <Button variant="solid">Save</Button>
 * @public
 * @since 1.0.0
 */
export function Button({ class: klass, className, variant = "solid", size = "md", children, ...rest }) {
  const cls = cn("btn", `btn--${variant}`, `btn--${size}`, klass, className);
  return `<button class="${cls}"${variant ? ` data-variant="${variant}"` : ""}${size ? ` data-size="${size}"` : ""}${rest.disabled ? ` disabled` : ""}>${children}</button>`;
}
```

Input:

```js
/**
 * Props accepted by `<Input />`.
 *
 * Styled single-line text input control.
 * Forwards all native input attributes.
 *
 * @typedef {HTMLInputAttributes ComponentProps & {
 *   size?: "sm"|"md"|"lg",
 * }} InputProps
 * @function Input
 * @param {InputProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <Input placeholder="Email" />
 * @public
 * @since 1.0.0
 */
export function Input({ class: klass, className, size = "md", ...rest }) {
  const cls = cn("input", `input--${size}`, klass, className);
  return `<input class="${cls}"${size ? ` data-size="${size}"` : ""} />`;
}
```

(Notice: No sentinel example—removed per prohibition.)

---

## 12. Standard Comment Annotations

Machine-parsable prefixes:

- `// LIMITATION: <reason>`
- `// ACCESSIBILITY: <explanation>`
- `// TODO(declarative-composition): <migration>`
- `// TODO(cn-migrate): <replace local helper>`
- `// PE SUGGESTION: <progressive enhancement idea>`
- `// AIDEV-NOTE: <clarification for maintainers>` (sparingly)

---

## 13. Security & Safety

- Never inline untrusted user HTML.
- No dynamic `<script>` tags.
- Avoid `id` collisions; if generating IDs, add `// LIMITATION: collision risk`.
- Only filter attributes for explicit semantic or security reasons (documented).
- Sentinel patterns disallowed to prevent hidden logic channels and ambiguous rendering flows.

---

## 14. Review Heuristics (Fast Pass)

1. Header present; “vanilla JSX” present.
2. Each export: canonical block pattern.
3. Intersection typedef with concrete interface; no invented names.
4. No `@property`, no duplicate typedef forms.
5. Minimal example per export.
6. `@public` + `@since`.
7. No `[props={}]`.
8. Only ternary conditional spreads for optional attributes.
9. No sentinel or object-return exports.
10. No structural arrays (unless TODO).
11. `cn` or migration TODO.
12. Lines ≤ ~100 chars.
13. No re-listing native attributes.
14. No extraneous tags.

---

## 15. Rationale for Strict Unification & Sentinel Prohibition

- Single pattern reduces contributor + AI drift.
- Intersection typedefs are concise, parseable, and align with native wrapper semantics.
- Sentinel components obscured rendered output and encouraged implicit processing phases.
- Removing sentinel abstraction simplifies audits, improves transparency, and prevents silent divergence
  between “declared” and “actual” DOM.

---

## 16. Migration Status

All legacy files MUST eliminate sentinel patterns during first subsequent touch.
Reject PRs introducing sentinel abstractions or metadata-only exports.

Deprecated (DO NOT USE):

- Object-form typedef + `@property` docs
- Dual typedef forms
- `@param {Type} [props={}]`
- Narrative multi-paragraph function docs
- Manual enumeration of native attributes
- `rest` pseudo-prop docs
- Sentinel / metadata-only “components”

---

## 17. Change Log (Conceptual - Not for Editing)

- 2025-10-02: Unified canonical component JSDoc template (initial).
- 2025-10-02: Sentinel components explicitly prohibited; removed sentinel example.

(Do not extend this section; treat as informational snapshot.)

---

## 18. Final Canonical Snippet (Copy-Paste Ready)

```js
/**
 * Props accepted by `<ComponentName />`.
 *
 * <Short purpose sentence.>
 * <Conditional rendering or polymorphism note (if any).>
 * <Native attribute inheritance / forwarding note.>
 *
 * @typedef {HTML[Element]Attributes & ComponentProps & {
 *   /* custom props */
 *   customProp1?: type,
 *   customProp2?: type,
 * }} ComponentNameProps
 * @function ComponentName
 * @param {ComponentNameProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <ComponentName customProp1="value">Content</ComponentName>
 * @public
 * @since 1.0.0
 */
export function ComponentName({ class: klass, className, customProp1, customProp2, children, ...rest }) {
  // ...
}
```

Replace `HTML[Element]Attributes` with the specific interface (e.g. `HTMLButtonAttributes`).

---

Adhere strictly. Deviations require explicit rule amendment in this file (never silent exceptions).
