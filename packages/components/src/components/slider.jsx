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
    // Extract selected native attributes for clamping / boolean handling; forward remainder
    const { min: minAttr = 0, max: maxAttr = 100, value: valueAttr, ...inputRest } = rest;

    const numericMin = Number(minAttr) || 0;
    const numericMax = Number(maxAttr);
    const hasFiniteMax = Number.isFinite(numericMax);
    const rawValueNum = valueAttr != null ? Number(valueAttr) : null;
    const clampedValue = rawValueNum == null ? null : Math.max(numericMin, hasFiniteMax ? Math.min(numericMax, rawValueNum) : rawValueNum);

    // Compute percentage for consistent SSR/client rendering
    const percent =
        clampedValue != null && hasFiniteMax ? ((clampedValue - numericMin) / (numericMax - numericMin)) * 100 : clampedValue || 0;

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
