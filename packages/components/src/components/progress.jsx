/**
 * @fileoverview Native progress bar wrapper (vanilla JSX)
 *
 * @module ui/progress
 * @description
 * Thin wrapper around the native `<progress>` element with basecoat styling.
 * Supports determinate (with value/max) and indeterminate (no value) variants.
 *
 * Exports:
 * - `Progress` (default): Native progress bar with basecoat styling.
 *
 * Design notes:
 * - Uses native `<progress>` element for correct accessibility and semantics.
 * - `indeterminate` prop omits the `value` attribute per HTML spec.
 * - Default `max` is 100.
 *
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 */

import { cn } from "@utils/cn.js";

/**
 * Props accepted by `<Progress />`.
 *
 * Progress bar using native `<progress>` element.
 * Supports determinate and indeterminate states.
 *
 * @typedef {HTMLProgressAttributes & ComponentProps & {
 *   indeterminate?: boolean,
 * }} ProgressProps
 * @function Progress
 * @param {ProgressProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <Progress value={60} max={100} />
 * @example
 * <Progress indeterminate />
 * @example
 * <Progress value={5} max={10} />
 * @public
 */
export default function Progress({ class: klass, className, value, max = "100", indeterminate, ...rest }) {
    const progressProps = {
        class: cn("progress", klass, className),
        ...(indeterminate ? {} : { value: String(value), max: String(max) }),
        ...rest,
    };

    return <progress {...progressProps} />;
}
