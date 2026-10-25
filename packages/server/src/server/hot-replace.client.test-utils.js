/**
 * Test-facing re-exports of pure helpers from hot-replace.client.js.
 *
 * @module hot-replace-test-utils
 */
import {
    hasDataset as clientHasDataset,
    base64DecodeUnicode as decodeBase64,
    getDataset as getClientDataset,
    isValidPayload as validatePayload,
} from "./hot-replace.client.js";

export const base64DecodeUnicode = decodeBase64;
export const getDataset = getClientDataset;
export const hasDataset = clientHasDataset;
export const isValidPayload = validatePayload;
