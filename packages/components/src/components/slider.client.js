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

import { define } from "@sxo/client";

function readInputNumber(input, name, fallback) {
    return parseFloat(input?.getAttribute(name) ?? fallback);
}

function readInputValue(input, fallback) {
    if (!input) return parseFloat(String(fallback));
    return parseFloat(input.getAttribute("value") ?? input.value ?? String(fallback));
}

function finiteOr(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
}

function positiveFiniteOr(value, fallback) {
    return Number.isFinite(value) && value > 0 ? value : fallback;
}

define("el-slider", function ElSlider({ $state, $compute, $effect, $element, $on }) {
    /**
     * Find the first range input child.
     * @returns {HTMLInputElement | null}
     */
    const queryInput = () => /** @type {HTMLInputElement|null} */ ($element.querySelector('input[type="range"]'));

    const input = queryInput();

    // Seed from host attributes first, then input attributes, then defaults
    const seedMin = readInputNumber(input, "min", "0");
    const seedMax = readInputNumber(input, "max", "100");
    const seedStep = readInputNumber(input, "step", "1");
    const seedValue = readInputValue(input, seedMin);

    // Initialize state (let the native input enforce clamping/stepping)
    $state.min = finiteOr(seedMin, 0);
    $state.max = finiteOr(seedMax, 100);
    $state.step = positiveFiniteOr(seedStep, 1);
    $state.value = finiteOr(seedValue, $state.min);

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
        const target = e.target;
        if (!(target instanceof HTMLInputElement)) return;
        if (target.type !== "range") return;
        const next = parseFloat(target.value);
        if (Number.isFinite(next)) {
            $state.value = next;
        }
    };

    $on.oninput = onUpdate;
    $on.onchange = onUpdate;
});
