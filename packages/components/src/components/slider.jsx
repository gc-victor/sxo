/**
 * @fileoverview Accessible range slider wrapper (vanilla JSX)
 *
 * @module ui/slider
 * @description
 * Thin, framework-agnostic wrapper around a native `input[type="range"]` with minimal ARIA attributes.
 * Generates static markup only (NOT React). Provides class merging and value clamping at render time.
 *
 * Exports:
 * - `Slider` (default): Single native range input with SSR value clamping.
 * - `Range` (named): Standalone range input (lightweight `<input type="range">`).
 *
 * Design notes:
 * - No client scripting or dynamic CSS variable sync (progressive enhancement left to userland).
 * - Emits no random IDs unless caller supplies one (stable markup for static HTML).
 * - Boolean/ARIA attributes follow empty-string presence pattern per standards.
 *
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 */

import { cn } from "@utils/cn.js";

/**
 * Normalize and clamp range input attributes for consistent SSR/client rendering.
 *
 * @param {{ min?: string|number, max?: string|number, value?: string|number }} attrs - Raw range attributes
 * @returns {{ numericMin: number, numericMax: number, hasFiniteMax: boolean, clampedValue: number|null, percent: number }}
 * @private
 */
function normalizeRangeProps({ min = 0, max = 100, value } = {}) {
    const numericMin = Number(min) || 0;
    const numericMax = Number(max);
    const hasFiniteMax = Number.isFinite(numericMax);
    const rawValueNum = value != null ? Number(value) : null;
    const clampedValue = rawValueNum == null ? null : Math.max(numericMin, hasFiniteMax ? Math.min(numericMax, rawValueNum) : rawValueNum);
    const percent =
        clampedValue != null && hasFiniteMax ? ((clampedValue - numericMin) / (numericMax - numericMin)) * 100 : clampedValue || 0;
    return { numericMin, numericMax, hasFiniteMax, clampedValue, percent };
}

/**
 * Props accepted by `<Slider />`.
 *
 * Range slider control using a single native `<input type="range">`.
 * Forwards all native range input attributes (no wrapper element).
 * Inherits every native input attribute via `HTMLInputAttributes`; only `inputClass` is custom.
 *
 * @typedef {HTMLInputAttributes & ComponentProps & {
 *   inputClass?: string,
 * }} SliderProps
 * @function Slider
 * @param {SliderProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <Slider min={0} max={50} step={5} value={25} aria-label="Progress" />
 * @public
 */
export default function Slider({ class: klass, className, inputClass = "input w-full", ...rest }) {
    const { min, max, value, ...inputRest } = rest;
    const { numericMin, numericMax, hasFiniteMax, clampedValue, percent } = normalizeRangeProps({ min, max, value });

    return (
        <el-slider>
            <input
                type="range"
                class={cn("slider", inputClass, klass, className)}
                min={String(numericMin)}
                max={hasFiniteMax ? String(numericMax) : null}
                $oninput="oninput"
                $onchange="onchange"
                style={`--slider-value: ${percent}%;`}
                {...(clampedValue != null ? { value: String(clampedValue) } : {})}
                {...inputRest}
            />
        </el-slider>
    );
}

/**
 * Props accepted by `<Range />`.
 *
 * Standalone range input component.
 * Forwards all native range input attributes.
 * Unlike Slider, this renders a bare `<input>` with no wrapper element
 * and no CSS variable bindings.
 *
 * @typedef {HTMLInputAttributes & ComponentProps & {}} RangeProps
 * @function Range
 * @param {RangeProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <Range min={0} max={100} step={5} value={50} aria-label="Volume" />
 * @public
 */
export function Range({ class: klass, className, ...rest }) {
    const { min, max, value, ...inputRest } = rest;
    const { numericMin, numericMax, hasFiniteMax, clampedValue } = normalizeRangeProps({ min, max, value });

    return (
        <input
            type="range"
            class={cn("range", klass, className)}
            min={String(numericMin)}
            max={hasFiniteMax ? String(numericMax) : null}
            {...(clampedValue != null ? { value: String(clampedValue) } : {})}
            {...inputRest}
        />
    );
}
