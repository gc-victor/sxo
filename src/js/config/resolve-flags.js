import { mergeSrc } from "./resolve-utils.js";

/**
 * Filter flags by explicitness.
 *
 * Removes flags that were not explicitly passed on the command line.
 * Handles both camelCase and kebab-case variations.
 *
 * @param {Record<string, unknown>} flags - Flag object
 * @param {Record<string, boolean>} flagsExplicit - Explicit flag mapping
 * @returns {Record<string, unknown>} Filtered flags object
 */
export function filterExplicitFlags(flags, flagsExplicit) {
    if (!flagsExplicit || Object.keys(flagsExplicit).length === 0) {
        return flags;
    }

    const filtered = { ...flags };
    for (const k of Object.keys(filtered)) {
        const isExplicit = flagsExplicit[k] || flagsExplicit[k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)];

        if (!isExplicit) delete filtered[k];
    }

    return filtered;
}

/**
 * Process CLI flags for config merging.
 *
 * Normalizes flags using mergeSrc for consistency with other sources.
 *
 * @param {Record<string, unknown>} flags - Raw CLI flags
 * @param {string} cwd - Current working directory for path resolution
 * @returns {Partial<ConfigObject>} Normalized flags object
 */
export function processFlags(flags, cwd) {
    return mergeSrc(flags, cwd);
}
