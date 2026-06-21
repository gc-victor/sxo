/**
 * Global test setup file for Vitest
 */

import { afterEach, beforeEach, vi } from "vitest";

// Set up the global environment for testing Web Components
// This file is automatically loaded by Vitest as specified in vitest.config.ts

// Make sure customElements is available
if (!window.customElements) {
    window.customElements = {
        define: vi.fn(),
        get: vi.fn(),
        upgrade: vi.fn(),
        whenDefined: vi.fn(),
    } as unknown as CustomElementRegistry;
}

// Mock requestAnimationFrame for testing
global.requestAnimationFrame = (callback: FrameRequestCallback): number => {
    setTimeout(() => callback(Date.now()), 0);
    return 0;
};

// Mock MutationObserver if not available in test environment
if (!window.MutationObserver) {
    window.MutationObserver = class MutationObserver {
        // biome-ignore lint/complexity/noUselessConstructor: Required for mocking MutationObserver in test environment
        constructor(_callback: MutationCallback) {}
        disconnect() {}
        observe(_target: Node, _options?: MutationObserverInit) {}
        takeRecords(): MutationRecord[] {
            return [];
        }
    };
}

// Mock CustomEvent for testing context updates
if (!window.CustomEvent) {
    window.CustomEvent = class CustomEvent<T> extends Event {
        detail: T;
        constructor(type: string, eventInitDict?: CustomEventInit<T>) {
            super(type, eventInitDict);
            this.detail = eventInitDict?.detail as T;
        }
        // biome-ignore lint/suspicious/noExplicitAny: Suppress because we need to cast to any for mocking CustomEvent in the test environment
    } as any;
}

// Global beforeEach hook to clean up DOM between tests
beforeEach(() => {
    document.body.innerHTML = "";
});

// Global afterEach hook to clean up DOM after tests
afterEach(() => {
    document.body.innerHTML = "";
});
