/**
 * @fileoverview Input component (vanilla JSX) providing a lightweight wrapper
 * around the native <input> element with deterministic class merging (`class` + `className`)
 * and full attribute forwarding. Framework-agnostic (NOT React); emits static markup only.
 *
 * Exports:
 * - Input: Standard text-like form control wrapper (default export).
 *
 * Design notes:
 * - Purely declarative: no internal state, effects, or event wiring.
 * - Forwards all unrecognized props (aria-*, data-*, form attributes, etc.).
 * - `className` is accepted as an alias of `class`; both merged predictably.
 * - No automatic id generation; caller manages `id` / `aria-*` relationships.
 * - No validation or type coercion—browser native semantics are preserved.
 *
 * Accessibility:
 * - Pair with a corresponding <Label for="..."> or wrap inside a label for association.
 * - Use `aria-describedby` to associate helper / error text blocks.
 * - Provide `type` appropriate to the data (e.g., "email", "url", "number") for better
 *   native validation and virtual keyboard optimization.
 *
 * @module ui/input
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 * @since 1.0.0
 */

import { cn } from "@utils/cn.js";

/**
 * Props accepted by `<Input />`.
 *
 * Thin wrapper around a native `<input>` element that merges `class` and `className`,
 * forwards all additional attributes, and defaults `type="text"`. Does not perform
 * validation, generate ids, or introduce client runtime behavior.
 *
 * @typedef {HTMLInputAttributes & ComponentProps & {
 *   role?: string,
 *   type?: string,
 * }} InputProps
 * @function Input
 * @param {InputProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <Input id="email" name="email" type="email" class="w-full" />
 * @example
 * <Input id="username" aria-describedby="username-hint" placeholder="Handle" />
 * @example
 * <Input type="password" autoComplete="new-password" />
 * @public
 * @since 1.0.0
 */
export default function Input({ class: klass, className, type = "text", ...rest }) {
    return <input type={type} class={cn("input", klass, className)} {...rest} />;
}
