/**
 * Pure test helpers extracted from hot-replace.client.js.
 *
 * Shared between the source and test file to avoid silent drift.
 *
 * @module hot-replace-test-utils
 */

/**
 * Check if element has dataset property.
 * @param {Element | EventTarget | null} el
 * @returns {el is Element & {dataset: DOMStringMap}}
 */
export function hasDataset(el) {
    return el !== null && "dataset" in el;
}

/**
 * Get dataset from element if available.
 * @param {Element | null} el
 * @returns {import("./hot-replace.client.js").DatasetLike | null}
 */
export function getDataset(el) {
    return hasDataset(el) ? el.dataset : null;
}

/**
 * Decode a base64 string with Unicode support.
 *
 * Standard atob() only handles Latin1 (ISO-8859-1) encoded base64 and produces
 * incorrect results for Unicode strings. This function properly decodes by:
 * 1. Decoding the base64 to a binary string with atob()
 * 2. Converting the binary string to UTF-8 bytes
 * 3. Decoding bytes to a UTF-8 string using TextDecoder
 *
 * @param {string} base64 - Base64-encoded string
 * @returns {string} Decoded Unicode string
 */
export function base64DecodeUnicode(base64) {
    const binString = atob(base64);
    const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0) ?? 0);
    return new TextDecoder().decode(bytes);
}

/**
 * Type guard for hot reload payload.
 * @param {unknown} data
 * @returns {data is { body: string; assets: { js: string[]; css: string[] }; publicPath: string }}
 */
export function isValidPayload(data) {
    return typeof data === "object" && data !== null && "body" in data;
}
