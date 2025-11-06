/**
 * @fileoverview <el-slider> minimal reactive wrapper for input[type="range"].
 *
 * Simplified responsibilities:
 * - Initialize value/min/max/step from host or inner input
 * - Compute "percent" (0–100) and expose it for bindings
 * - Keep input attributes/value in sync with state
 * - Update a single CSS variable "--slider-value" to reflect percent
 * - Use attribute-based handlers via $bind: oninput/onchange
 *
 * @license MIT
 */

import { define } from "@qery/reactive-component";

define("el-slider", function ElSlider({ $state, $compute, $effect, $element, $on }) {
    /**
     * Find the first range input child.
     * @returns {HTMLInputElement | null}
     */
    const queryInput = () => /** @type {HTMLInputElement|null} */ ($element.querySelector('input[type="range"]'));

    const input = queryInput();

    // Seed from host attributes first, then input attributes, then defaults
    const seedMin = parseFloat(input?.getAttribute("min") ?? input?.getAttribute("min") ?? "0");
    const seedMax = parseFloat(input?.getAttribute("max") ?? input?.getAttribute("max") ?? "100");
    const seedStep = parseFloat(input?.getAttribute("step") ?? input?.getAttribute("step") ?? "1");
    const seedValue = parseFloat(input?.getAttribute("value") ?? input?.getAttribute("value") ?? input?.value ?? String(seedMin));

    // Initialize state (let the native input enforce clamping/stepping)
    $state.min = Number.isFinite(seedMin) ? seedMin : 0;
    $state.max = Number.isFinite(seedMax) ? seedMax : 100;
    $state.step = Number.isFinite(seedStep) && seedStep > 0 ? seedStep : 1;
    $state.value = Number.isFinite(seedValue) ? seedValue : $state.min;

    // Derived percentage (0..100)
    $compute("percent", ["value", "min", "max"], (value, min, max) => {
        const a = Number(min);
        const b = Number(max);
        const v = Number(value);
        if (!Number.isFinite(a) || !Number.isFinite(b) || b === a) return 0;
        const pct = ((v - a) / (b - a)) * 100;
        return Math.max(0, Math.min(100, pct));
    });

    // Keep DOM in sync with state and update CSS variable
    $effect(() => {
        const el = queryInput();

        if (!el) return;
        el.min = String($state.min);
        el.max = String($state.max);
        el.step = String($state.step);
        el.value = String($state.value);
        el.style.setProperty("--slider-value", `${$state.percent}%`);
    });

    // Attribute-based event handlers to update state from the input
    const onUpdate = (/** @type {Event} */ e) => {
        const target = /** @type {HTMLInputElement|null} */ (e.target instanceof HTMLInputElement ? e.target : null);
        if (!target || target.type !== "range") return;
        const next = parseFloat(target.value);
        if (Number.isFinite(next)) {
            $state.value = next;
        }
    };

    $on.oninput = onUpdate;
    $on.onchange = onUpdate;
});
