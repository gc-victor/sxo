/**
 * Tests for hot-replace.client.js — browser-side HMR client.
 */

import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { afterEach, before, beforeEach, describe, mock, test } from "node:test";
import { base64DecodeUnicode, getDataset, hasDataset, isValidPayload } from "./hot-replace.client.test-utils.js";

class MockEvent {
    constructor(type) {
        this.type = type;
    }
}

class MockNode {
    constructor() {
        this.parentNode = null;
        this.firstChild = null;
        this.lastChild = null;
        this.nextSibling = null;
        this.previousSibling = null;
        this.childNodes = [];
    }

    appendChild(child) {
        if (child.parentNode) {
            const idx = child.parentNode.childNodes.indexOf(child);
            if (idx !== -1) child.parentNode.childNodes.splice(idx, 1);
            child.parentNode._updateEdgeChildren();
        }
        child.parentNode = this;
        if (this.lastChild) {
            this.lastChild.nextSibling = child;
            child.previousSibling = this.lastChild;
        }
        this.lastChild = child;
        if (!this.firstChild) this.firstChild = child;
        this.childNodes.push(child);
        this._updateEdgeChildren();
    }

    _updateEdgeChildren() {
        this.firstChild = this.childNodes[0] || null;
        this.lastChild = this.childNodes[this.childNodes.length - 1] || null;
    }

    replaceWith(...nodes) {
        if (!this.parentNode) return;
        const parent = /** @type {MockNode} */ (this.parentNode);
        const idx = parent.childNodes.indexOf(this);
        if (idx === -1) return;
        parent.childNodes.splice(idx, 1, ...nodes);
        for (const n of nodes) n.parentNode = parent;
        parent._updateEdgeChildren();
    }
}

class MockElement extends MockNode {
    constructor(tagName, options) {
        super();
        this.tagName = tagName.toUpperCase();
        this._attrs = {};
        this.innerHTML = "";
        this.dataset = {};
        this.scrollLeft = 0;
        this.scrollTop = 0;
        this._constructorFn = options?.constructorFn ?? MockElement;
        this._eventListeners = {};
        this._type = "";
        this._src = "";
    }

    set src(val) {
        this._src = val;
        this._attrs.src = val;
    }
    get src() {
        return this._src;
    }

    set type(val) {
        this._type = val;
        this._attrs.type = val;
    }
    get type() {
        return this._type;
    }

    setAttribute(name, value) {
        this._attrs[name] = value;
    }

    getAttribute(name) {
        return this._attrs[name] ?? null;
    }

    removeAttribute(name) {
        delete this._attrs[name];
    }

    get attributes() {
        return Object.entries(this._attrs).map(([n, v]) => ({ name: n, value: v }));
    }

    addEventListener(type, handler, _options) {
        if (!this._eventListeners[type]) this._eventListeners[type] = [];
        this._eventListeners[type].push(handler);
    }

    dispatchEvent(event) {
        const handlers = this._eventListeners[event.type];
        if (handlers) {
            for (const h of handlers) h.call(this, event);
        }
        return true;
    }

    querySelectorAll(_selector) {
        const results = [];
        function walk(node) {
            for (const child of node.childNodes) {
                if (child instanceof MockElement) {
                    results.push(child);
                    walk(child);
                }
            }
        }
        walk(this);
        return results;
    }

    scrollTo(x, y) {
        this.scrollLeft = x;
        this.scrollTop = y;
    }
}

const registry = {};

const stubs = {
    customElements: {
        define(name, ctr, _options) {
            registry[name] = ctr;
        },
        get(name) {
            return registry[name];
        },
    },

    MutationObserver: class {
        constructor(callback) {
            stubs.MutationObserver._callback = callback;
            stubs.MutationObserver._lastInstance = this;
            this._callback = callback;
        }
        observe(target, options) {
            stubs.MutationObserver._lastTarget = target;
            stubs.MutationObserver._lastOptions = options;
        }
        disconnect() {
            stubs.MutationObserver._disconnected = true;
        }
    },

    EventSource: class {
        static CONNECTING = 0;
        static OPEN = 1;
        static CLOSED = 2;

        constructor(url) {
            this.url = url;
            this.readyState = EventSource.CONNECTING;
            this.onmessage = null;
            this.onerror = null;
            this.close = () => {
                this.readyState = EventSource.CLOSED;
            };
            stubs.EventSource._lastInstance = this;
        }
    },
};

stubs.MutationObserver._lastTarget = null;
stubs.MutationObserver._lastOptions = null;
stubs.MutationObserver._disconnected = false;
stubs.MutationObserver._lastInstance = null;
stubs.EventSource._lastInstance = null;

function createDocumentTree() {
    const html = new MockElement("html");
    const head = new MockElement("head");
    const body = new MockElement("body");
    html.appendChild(head);
    html.appendChild(body);
    const document = {
        documentElement: html,
        head,
        body,
        createElement(tagName, options) {
            return new MockElement(tagName, options);
        },
        querySelectorAll(selector) {
            return html.querySelectorAll(selector);
        },
    };
    return { html, head, body, document };
}

function setupDomStubs() {
    const { html, head, body, document } = createDocumentTree();
    stubs._docTree = { html, head, body };
    globalThis.addEventListener = mock.fn();
    globalThis.removeEventListener = mock.fn();
    Object.assign(globalThis, {
        document,
        customElements: stubs.customElements,
        MutationObserver: stubs.MutationObserver,
        EventSource: stubs.EventSource,
        window: globalThis,
    });
}

function scripts(data, onFirstLoaded) {
    const paths = data.assets?.js;
    if (!paths?.length) {
        onFirstLoaded?.();
        return;
    }
    const publicPath = data.publicPath || "";
    let remaining = paths.length;
    let resolved = false;
    function resolve() {
        if (resolved) return;
        resolved = true;
        clearTimeout(fallbackTimer);
        onFirstLoaded?.();
    }
    const fallbackTimer = setTimeout(() => {
        resolve();
    }, 30000);
    paths.forEach((path) => {
        const src = publicPath + path;
        const script = document.createElement("script");
        script.type = "module";
        script.src = `${src}?hmr=${Date.now()}`;
        function loaded() {
            if (--remaining > 0) return;
            resolve();
        }
        script.addEventListener("load", loaded, { once: true });
        script.addEventListener(
            "error",
            (_err) => {
                loaded();
            },
            { once: true },
        );
        document.body.appendChild(script);
    });
}

let mod;

before(() => {
    setupDomStubs();
    return import("./hot-replace.client.js").then((m) => {
        mod = m;
    });
});

afterEach(() => {
    delete globalThis.___hrcStates;
    delete globalThis.__customElementVersions;
    globalThis.__customElementVersions = {};
    for (const key of Object.keys(registry)) delete registry[key];
    if (stubs.EventSource._lastInstance) {
        stubs.EventSource._lastInstance.close();
    }
    stubs.EventSource._lastInstance = null;
    stubs.MutationObserver._disconnected = false;
    stubs.MutationObserver._lastInstance = null;
    stubs.MutationObserver._lastTarget = null;
    stubs.MutationObserver._lastOptions = null;
});

describe("upgradeRuntimeElement", () => {
    test("skips non-custom elements (tag without hyphen)", () => {
        const el = new MockElement("DIV");
        mod.upgradeRuntimeElement(el);
        ok(true, "no error for non-custom element");
    });

    test("skips when no version is registered for the tag", () => {
        const el = new MockElement("my-component");
        mod.upgradeRuntimeElement(el);
        ok(true, "no error when no version registered");
    });

    test("skips when versioned constructor is not defined", () => {
        globalThis.__customElementVersions = { "my-component": 1 };
        const el = new MockElement("my-component");
        mod.upgradeRuntimeElement(el);
        ok(true, "no error when versioned constructor missing");
    });

    test("skips when element is already an instance of the versioned constructor", () => {
        const VerCtr = class extends MockElement {};
        registry["x-el-1"] = VerCtr;
        globalThis.__customElementVersions = { "x-el": 1 };
        const el = new MockElement("x-el-1", { constructorFn: VerCtr });
        mod.upgradeRuntimeElement(el);
        ok(true, "no error for already-upgraded element");
    });

    test("upgrades a custom element to its versioned tag", () => {
        const VerCtr = class extends MockElement {};
        registry["my-component-1"] = VerCtr;
        globalThis.__customElementVersions = { "my-component": 1 };

        const el = new MockElement("my-component");
        el.setAttribute("foo", "bar");

        const childNode = new MockNode();
        el.appendChild(childNode);

        const parent = new MockElement("div");
        parent.appendChild(el);

        mod.upgradeRuntimeElement(el);

        ok(parent.firstChild !== el, "original element was replaced");
        strictEqual(parent.firstChild?.tagName, "MY-COMPONENT-2", "replaced with versioned tag");
        strictEqual(parent.firstChild?.getAttribute("foo"), "bar", "attributes preserved");
    });
});

describe("installCustomElementRedefinition (override simulated)", () => {
    /** @type {Function} */
    let originalDefine;

    beforeEach(() => {
        globalThis.__customElementVersions = {};
        originalDefine = stubs.customElements.define.bind(stubs.customElements);
        stubs.customElements.define = (tagName, ctr, _options) => {
            const versions = /** @type {Record<string, number>} */ (globalThis.__customElementVersions);
            versions[tagName] = (versions[tagName] || 0) + 1;
            const version = versions[tagName];
            /** @type {any} */ (ctr).__version = version;
            const versionedTagName = `${tagName}-${version}`;
            if (!stubs.customElements.get(versionedTagName)) {
                originalDefine(versionedTagName, ctr, _options);
            }
        };
    });

    afterEach(() => {
        stubs.customElements.define = originalDefine;
    });

    test("override registers versioned custom elements", () => {
        const Ctr = class extends MockElement {};
        stubs.customElements.define("test-el", Ctr);

        const VersionedCtr = stubs.customElements.get("test-el-1");
        ok(VersionedCtr !== undefined, "versioned constructor was registered");
        strictEqual(VersionedCtr, Ctr, "same constructor passed through");
    });

    test("increments version on successive defines", () => {
        const Ctr1 = class extends MockElement {};
        const Ctr2 = class extends MockElement {};

        stubs.customElements.define("multi-el", Ctr1);
        ok(stubs.customElements.get("multi-el-1") !== undefined, "v1 registered");

        stubs.customElements.define("multi-el", Ctr2);
        ok(stubs.customElements.get("multi-el-2") !== undefined, "v2 registered");
        strictEqual(stubs.customElements.get("multi-el-1"), Ctr1, "v1 still available");
    });

    test("versioned constructor has __version set", () => {
        const Ctr1 = class extends MockElement {};
        const Ctr2 = class extends MockElement {};

        stubs.customElements.define("ver-el", Ctr1);
        strictEqual(/** @type {any} */ (Ctr1).__version, 1);

        stubs.customElements.define("ver-el", Ctr2);
        strictEqual(/** @type {any} */ (Ctr2).__version, 2);
    });
});

describe("module observer attachment (via hotReplace)", () => {
    test("installCustomElementRedefinition attaches MutationObserver", () => {
        mod.hotReplace("/test");
        ok(stubs.MutationObserver._lastTarget !== null, "observer was created");
        strictEqual(stubs.MutationObserver._lastTarget, globalThis.document.documentElement, "observer watches documentElement");
        deepStrictEqual(stubs.MutationObserver._lastOptions, { childList: true, subtree: true });
    });
});

describe("scripts()", () => {
    beforeEach(() => {
        mock.timers.enable({ apis: ["setTimeout"] });
        if (globalThis.document?.body) {
            globalThis.document.body.childNodes = [];
            globalThis.document.body.firstChild = null;
            globalThis.document.body.lastChild = null;
        }
    });

    afterEach(() => {
        mock.timers.reset();
    });

    test("calls onFirstLoaded immediately when no scripts to load", () => {
        let callCount = 0;
        scripts({ assets: { js: [], css: [] }, publicPath: "/" }, () => {
            callCount++;
        });
        strictEqual(callCount, 1, "callback called");
    });

    test("creates script elements with correct src", () => {
        scripts({ assets: { js: ["entry.js"], css: [] }, publicPath: "/" }, () => {});
        const scriptEls = globalThis.document.body.querySelectorAll("script");
        ok(scriptEls.length > 0, "script element was created");
        const src = /** @type {any} */ (scriptEls[0]).src || "";
        ok(src.includes("entry.js"), `src contains entry.js: ${src}`);
        ok(src.includes("?hmr="), "src has hmr cache-busting");
        mock.timers.tick(30000);
    });

    test("calls onFirstLoaded after single script loads", () => {
        let callCount = 0;
        scripts({ assets: { js: ["entry.js"], css: [] }, publicPath: "/" }, () => callCount++);
        strictEqual(callCount, 0, "not called before script load");

        const scriptEls = globalThis.document.body.querySelectorAll("script");
        ok(scriptEls.length > 0, "script element was created");
        scriptEls[0].dispatchEvent(new MockEvent("load"));
        strictEqual(callCount, 1, "callback called after script load");
        mock.timers.tick(100);
    });

    test("calls onFirstLoaded even when scripts fail", () => {
        let callCount = 0;
        scripts({ assets: { js: ["broken.js"], css: [] }, publicPath: "/" }, () => callCount++);
        const scriptEls = globalThis.document.body.querySelectorAll("script");
        scriptEls[0].dispatchEvent(new MockEvent("error"));
        strictEqual(callCount, 1, "callback called after script error");
        mock.timers.tick(100);
    });

    test("onFirstLoaded is called exactly once with multiple scripts", () => {
        let callCount = 0;
        scripts({ assets: { js: ["a.js", "b.js"], css: [] }, publicPath: "/" }, () => callCount++);

        const scriptEls = globalThis.document.body.querySelectorAll("script");
        strictEqual(scriptEls.length, 2, "two script elements created");

        scriptEls[0].dispatchEvent(new MockEvent("load"));
        strictEqual(callCount, 0, "not called after first script (one remaining)");

        scriptEls[1].dispatchEvent(new MockEvent("load"));
        strictEqual(callCount, 1, "called after both scripts loaded");
        mock.timers.tick(100);
    });
});

describe("isValidPayload", () => {
    test("accepts valid payload", () => {
        const data = { body: "", assets: { js: [], css: [] }, publicPath: "/" };
        strictEqual(isValidPayload(data), true);
    });

    test("rejects null", () => {
        strictEqual(isValidPayload(null), false);
    });

    test("rejects non-object", () => {
        strictEqual(isValidPayload("string"), false);
    });

    test("rejects object without body property", () => {
        strictEqual(isValidPayload({}), false);
    });

    test("accepts object with null body", () => {
        strictEqual(isValidPayload({ body: null }), true);
    });
});

describe("debounce", () => {
    beforeEach(() => {
        mock.timers.enable({ apis: ["setTimeout"] });
    });

    afterEach(() => {
        mock.timers.reset();
    });

    test("delays invocation", () => {
        let callCount = 0;
        const fn = () => callCount++;
        const debounced = mod.debounce(fn, 100);

        debounced();
        strictEqual(callCount, 0, "not called immediately");

        mock.timers.tick(50);
        strictEqual(callCount, 0, "not called at 50ms");

        mock.timers.tick(50);
        strictEqual(callCount, 1, "called after 100ms");
    });

    test("resets on subsequent calls", () => {
        let callCount = 0;
        const fn = () => callCount++;
        const debounced = mod.debounce(fn, 100);

        debounced();
        mock.timers.tick(50);
        debounced();
        mock.timers.tick(50);
        strictEqual(callCount, 0, "not called after reset");
        mock.timers.tick(50);
        strictEqual(callCount, 1, "called after second delay");
    });

    test("cancel() prevents invocation", () => {
        let callCount = 0;
        const fn = () => callCount++;
        const debounced = mod.debounce(fn, 100);

        debounced();
        debounced.cancel();
        mock.timers.tick(200);
        strictEqual(callCount, 0, "not called after cancel");
    });

    test("flush() invokes immediately", () => {
        let callCount = 0;
        const fn = () => callCount++;
        const debounced = mod.debounce(fn, 100);

        debounced();
        debounced.flush();
        strictEqual(callCount, 1, "called after flush");
    });
});

describe("base64DecodeUnicode", () => {
    test("decodes standard base64", () => {
        const encoded = btoa("hello world");
        strictEqual(base64DecodeUnicode(encoded), "hello world");
    });

    test("decodes unicode characters", () => {
        const bytes = new TextEncoder().encode("héllo wörld");
        const encoded = btoa(String.fromCodePoint(...bytes));
        strictEqual(base64DecodeUnicode(encoded), "héllo wörld");
    });

    test("decodes JSON payload", () => {
        const payload = JSON.stringify({ body: "<h1>Test</h1>" });
        const bytes = new TextEncoder().encode(payload);
        const encoded = btoa(String.fromCodePoint(...bytes));
        const decoded = base64DecodeUnicode(encoded);
        const parsed = JSON.parse(decoded);
        strictEqual(parsed.body, "<h1>Test</h1>");
    });
});

describe("hasDataset", () => {
    test("returns true for Element with dataset", () => {
        const el = new MockElement("div");
        strictEqual(hasDataset(el), true);
    });

    test("returns false for null", () => {
        strictEqual(hasDataset(null), false);
    });

    test("returns false for non-Element objects", () => {
        strictEqual(hasDataset({}), false);
    });
});

describe("getDataset", () => {
    test("returns dataset for Element", () => {
        const el = new MockElement("div");
        el.dataset = { hrc: "abc-1" };
        strictEqual(getDataset(el)?.hrc, "abc-1");
    });

    test("returns null for null", () => {
        strictEqual(getDataset(null), null);
    });
});

describe("upgradeRuntimeElement (real module)", () => {
    let savedDefine;

    beforeEach(() => {
        // Install hot-replace override so originalCustomElementsDefine is active.
        savedDefine = stubs.customElements.define;
        mod.hotReplace("/upgrade-test");
        // Clear any leftover body nodes from prior tests.
        if (globalThis.document?.body) {
            globalThis.document.body.childNodes = [];
            globalThis.document.body._updateEdgeChildren();
        }
    });

    afterEach(() => {
        stubs.customElements.define = savedDefine;
    });

    test("bumps versioned name and registers subclass (avoids empty-ctor upgrade)", () => {
        const OriginalCtr = class extends MockElement {};
        customElements.define("my-comp", OriginalCtr);
        strictEqual(customElements.get("my-comp-1"), OriginalCtr, "v1 registered via override");

        const el = new MockElement("my-comp");
        el.setAttribute("foo", "bar");
        const child = new MockElement("span");
        el.appendChild(child);
        globalThis.document.body.appendChild(el);

        mod.upgradeRuntimeElement(el);

        const upgraded = globalThis.document.body.childNodes.find((n) => n instanceof MockElement && n.tagName === "MY-COMP-2");
        ok(upgraded, "element replaced with my-comp-2");
        strictEqual(upgraded.getAttribute("foo"), "bar", "attributes preserved");
        ok(upgraded.firstChild === child, "children moved into the upgraded element");

        const Registered = customElements.get("my-comp-2");
        ok(typeof Registered === "function", "my-comp-2 registered");
        ok(Registered !== OriginalCtr, "registered ctor is distinct from original");
        ok(Object.getPrototypeOf(Registered) === OriginalCtr, "registered ctor subclasses original");
        strictEqual(globalThis.__customElementVersions?.["my-comp"], 2, "version bumped to 2");

        // Second runtime upgrade — must extend OriginalCtr, not a subclass chain.
        const el2 = new MockElement("my-comp");
        globalThis.document.body.appendChild(el2);
        mod.upgradeRuntimeElement(el2);

        const upgraded2 = globalThis.document.body.childNodes.find((n) => n instanceof MockElement && n.tagName === "MY-COMP-3");
        ok(upgraded2, "element replaced with my-comp-3");

        const Registered2 = customElements.get("my-comp-3");
        ok(typeof Registered2 === "function", "my-comp-3 registered");
        ok(Registered2 !== OriginalCtr, "registered ctor is distinct from the original");
        strictEqual(Object.getPrototypeOf(Registered2), OriginalCtr, "second upgrade extends OriginalCtr directly");
        strictEqual(globalThis.__customElementVersions?.["my-comp"], 3, "version bumped to 3");
    });
});
