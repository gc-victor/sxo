/**
 * @fileoverview JSX type definitions for SXO vanilla JSX.
 */

declare namespace JSX {
    interface IntrinsicElements {
        [elemName: string]: any;
    }
    type Element = any;
}

export {};
