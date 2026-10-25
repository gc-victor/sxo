import assert from "node:assert/strict";
import test from "node:test";
import { lazyComponents } from "./lazy-components.js";

test("lazyComponents loads matching ancestors only once across intent events", async () => {
    const previousDocument = globalThis.document;
    const previousElement = globalThis.Element;
    const listeners = new Map();
    const loads = [];

    class MockElement {
        constructor(tagName, parentElement = null) {
            this.tagName = tagName;
            this.parentElement = parentElement;
        }
    }

    globalThis.Element = MockElement;
    globalThis.document = {
        body: new MockElement("body"),
        addEventListener(type, handler, options) {
            listeners.set(type, { handler, options });
        },
    };

    try {
        const parent = new MockElement("x-lazy-parent", document.body);
        const target = new MockElement("span", parent);
        const componentMap = {
            "x-lazy-parent": async () => loads.push("parent"),
        };

        lazyComponents(componentMap);
        const pointerover = listeners.get("pointerover");
        const focusin = listeners.get("focusin");
        const touchstart = listeners.get("touchstart");

        assert.deepStrictEqual([...listeners.keys()], ["pointerover", "focusin", "touchstart"]);
        assert.deepStrictEqual(pointerover.options, { capture: true, passive: true });
        assert.deepStrictEqual(focusin.options, { capture: true });
        assert.deepStrictEqual(touchstart.options, { capture: true, passive: true });

        pointerover.handler({ target });
        focusin.handler({ target });
        await new Promise((resolve) => setImmediate(resolve));

        assert.deepStrictEqual(loads, ["parent"]);

        const originalWarn = console.warn;
        let attempts = 0;
        console.warn = () => {};
        try {
            lazyComponents({
                "x-lazy-retry": () => {
                    attempts += 1;
                    return attempts === 1 ? Promise.reject(new Error("temporary failure")) : Promise.resolve();
                },
            });

            const retryTarget = new MockElement("x-lazy-retry", document.body);
            listeners.get("pointerover").handler({ target: retryTarget });
            await new Promise((resolve) => setImmediate(resolve));
            listeners.get("pointerover").handler({ target: retryTarget });
            await new Promise((resolve) => setImmediate(resolve));

            assert.strictEqual(attempts, 2);
        } finally {
            console.warn = originalWarn;
        }
    } finally {
        if (previousDocument === undefined) delete globalThis.document;
        else globalThis.document = previousDocument;
        if (previousElement === undefined) delete globalThis.Element;
        else globalThis.Element = previousElement;
    }
});
