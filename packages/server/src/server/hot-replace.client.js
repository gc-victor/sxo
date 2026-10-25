/**
 * @typedef {Map<string, Record<string, unknown>>} HrcStateMap
 * @typedef {{[key: string]: number}} CustomElementVersions
 * @typedef {{___hrcStates?: HrcStateMap; __customElementVersions?: CustomElementVersions}} HotReplaceGlobal
 * @typedef {{__version?: number}} VersionedCustomElementConstructor
 * @typedef {{[key: string]: () => unknown}} StateMap
 * @typedef {{state: StateMap; setState: (key: string, value: unknown) => void}} ReactiveComponent
 * @typedef {{hrc?: string; hmrId?: string}} DatasetLike
 * @typedef {{forEach: (callback: (signal: () => unknown, key: string) => void) => void}} MapLikeState
 */

// Reactive component contract (lightweight / opt-in):
// - Elements with a Map-like `state` (key -> signalFn()) can have their state captured.
// - Provide `setState(key, value)` on the element for state restoration.
// - Element should expose stable identity via a data-hrc attribute (auto-assigned based on
//   innerHTML hash if absent when redefining).
//
// Scroll restoration:
// - Body scroll plus any element with data-hot-replace-scroll attribute is captured.
// - After body innerHTML replacement, scroll is restored.

/** @type {EventSource | null} */
let evSource;
/** @type {MutationObserver | null} */
let versionObserver = null;
/** True while a hot-reload body replacement is in progress to prevent
 *  the observer from upgrading elements with stale constructors. */
let hotReloading = false;
/** Captured customElements.define before hot-replace override.
 *  upgradeRuntimeElement uses this to register fresh versioned names so the
 *  platform upgrades populated elements in place (ctor sees children). */
let originalCustomElementsDefine = null;
/** Map of unversioned tag → author constructor.
 *  upgradeRuntimeElement extends this directly to keep the subclass chain flat
 *  across repeated runtime inserts without an intervening HMR. */
const _versionedAuthorCtors = {};
const HRC_STATE_GLOBAL_KEY = "___hrcStates";
const HRC_SELECTOR = "[data-hrc]";
const SCROLL_ATTR = "data-hot-replace-scroll";

/** @type {HotReplaceGlobal} */
const gt = /** @type {HotReplaceGlobal} */ (globalThis);
delete gt.___hrcStates;
delete gt.__customElementVersions;

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
 * @returns {DatasetLike | null}
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
 * Initialize hot reload connection for current page.
 *
 * Establishes a Server-Sent Events (SSE) connection to receive hot reload updates.
 * The connection is automatically re-established on disconnect. Scroll positions
 * and reactive component states are preserved across hot reloads.
 *
 * @param {string} href - The current route path to subscribe to hot reload updates
 */
export function hotReplace(href) {
    if (evSource && evSource.readyState !== EventSource.CLOSED) {
        return;
    }

    console.info(`${logTimer()}::[hot-replace] - initialized`);

    installCustomElementRedefinition();

    evSource = new EventSource(`/hot-replace?href=${href}`);
    evSource.onmessage = debounce(onHotMessage, 500);
    evSource.onerror = () => {
        console.warn(`${logTimer()}::[hot-replace] - connection lost, retrying...`);
        try {
            evSource?.close();
        } catch {
            /* noop */
        }
        versionObserver?.disconnect();
        setTimeout(() => location.reload(), 1000);
    };

    window.addEventListener("beforeunload", () => {
        evSource?.close();
        versionObserver?.disconnect();
    });
}

/**
 * Handle hot reload message from server.
 *
 * @param {MessageEvent} e - The message event from SSE connection
 */
function onHotMessage(e) {
    /** @type {unknown} */
    let data;
    try {
        data = JSON.parse(base64DecodeUnicode(e.data));
    } catch (err) {
        console.error(`${logTimer()}::[hot-replace] - invalid payload`, err);
        return;
    }

    const payload = isValidPayload(data) ? data : { body: "", assets: { js: [], css: [] }, publicPath: "" };

    const scrollInfo = captureScrollPositions();
    const preservedStates = preserveReactiveComponentsState();

    if (preservedStates.size) {
        gt[HRC_STATE_GLOBAL_KEY] = preservedStates;
    }

    // During body replacement, prevent the observer from upgrading elements
    // with stale constructors (which would process and mutate children before
    // the define override runs). The define override handles all elements in
    // the new body when scripts reload.
    hotReloading = true;
    document.body.innerHTML = payload.body || "";
    scripts(payload, () => {
        hotReloading = false;
        // Upgrade unversioned custom elements added during body replacement
        // (observer was skipped while hotReloading was true). Only iterate
        // known tags — not all elements.
        const versions = /** @type {HotReplaceGlobal} */ (globalThis).__customElementVersions;
        if (versions) {
            for (const tag of Object.keys(versions)) {
                for (const el of document.querySelectorAll(tag)) {
                    upgradeRuntimeElement(el);
                }
            }
        }
    });
    styles(payload);
    restoreScrollPositions(scrollInfo);
    scheduleStateRestoration();
}

/**
 * Type guard for hot reload payload.
 * @param {unknown} data
 * @returns {data is { body: string; assets: { js: string[]; css: string[] }; publicPath: string }}
 */
export function isValidPayload(data) {
    return typeof data === "object" && data !== null && "body" in data;
}

function scripts(data, onFirstLoaded) {
    const paths = data.assets?.js;
    if (!paths?.length) {
        onFirstLoaded?.();
        return;
    }

    const publicPath = data.publicPath || "";
    let remaining = paths.length;
    let onLoadedCalled = false;

    function onLoaded() {
        if (onLoadedCalled) return;
        onLoadedCalled = true;
        clearTimeout(fallbackTimer);
        onFirstLoaded?.();
        scheduleStateRestoration(50);
    }

    // Safety net: if every script fails to load (404, server error), the
    // normal path never fires. Clear hotReloading after a generous delay
    // so the MutationObserver doesn't stay suppressed forever.
    const fallbackTimer = setTimeout(() => {
        console.warn(`${logTimer()}::[hot-replace] - script load fallback: forcing hotReloading=false`);
        hotReloading = false;
        onLoaded();
    }, 30000);

    paths.forEach((path) => {
        const src = publicPath + path;
        const script = document.createElement("script");
        script.type = "module";
        script.src = `${src}?hmr=${Date.now()}`;

        function loaded() {
            if (--remaining > 0) return;
            onLoaded();
        }

        script.addEventListener("load", loaded, { once: true });
        script.addEventListener(
            "error",
            (err) => {
                console.error(`${logTimer()}::[hot-replace] - script failed:`, src, err);
                loaded();
            },
            { once: true },
        );

        document.body.appendChild(script);
    });
}

/**
 * Replace stylesheet links with new versions from hot reload payload.
 *
 * @param {{ body: string; assets: { js: string[]; css: string[] }; publicPath: string }} data - Hot reload payload
 */
function styles(data) {
    const paths = data.assets?.css;
    if (!paths?.length) return;

    const publicPath = data.publicPath || "";

    paths.forEach((path) => {
        const cleanHref = publicPath + path;

        const newLink = document.createElement("link");
        newLink.rel = "stylesheet";
        newLink.href = `${cleanHref}?hmr=${Date.now()}`;
        newLink.dataset.hmr = "true";
        newLink.dataset.hmrId = cleanHref;

        const handleLoad = () => {
            console.log(`${logTimer()}::[hot-replace] - style loaded:`, cleanHref);

            document.head.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
                if (link === newLink) return;

                const linkHref = link.getAttribute("href") || "";
                const linkHmrId = getDataset(link)?.hmrId;
                const isOldVersion = linkHmrId === cleanHref || linkHref === cleanHref || linkHref.startsWith(`${cleanHref}?`);

                if (isOldVersion) {
                    link.remove();
                }
            });
        };

        newLink.addEventListener("load", handleLoad, { once: true });
        newLink.addEventListener("error", () => newLink.remove(), { once: true });

        document.head.appendChild(newLink);
    });
}

/** @type {boolean} */
installCustomElementRedefinition._installed = false;

/**
 * Override customElements.define to create a versioned tag and replace instances.
 * This sidesteps DOMException on redefining existing custom element names.
 */
function installCustomElementRedefinition() {
    if (installCustomElementRedefinition._installed) return;
    installCustomElementRedefinition._installed = true;

    const originalDefine = customElements.define;
    originalCustomElementsDefine = originalDefine;
    const win = /** @type {HotReplaceGlobal & Window} */ (window);
    win.__customElementVersions ||= {};

    customElements.define = (tagName, ctr, options) => {
        try {
            const versions = win.__customElementVersions;
            if (!versions) throw new Error("versions not initialized");

            versions[tagName] = (versions[tagName] || 0) + 1;
            const version = versions[tagName];
            const versionedTagName = `${tagName}-${version}`;

            /** @type {VersionedCustomElementConstructor} */ (ctr).__version = version;
            _versionedAuthorCtors[tagName] = ctr;

            // HMR: fragment.ts's upgradePageElements may have already upgraded
            // these with a stale version number before define() ran. Include
            // previously-versioned elements so the new definition takes effect.
            const existing = Array.from(document.querySelectorAll(tagName));
            for (let v = 1; v < version; v++) {
                for (const el of document.querySelectorAll(`${tagName}-${v}`)) {
                    existing.push(el);
                }
            }
            const replacements = replaceCustomElements(existing, versionedTagName, ctr);

            if (!customElements.get(versionedTagName)) {
                console.log(`${logTimer()}::[hot-replace] - re-defining custom element as: ${versionedTagName}`);
                originalDefine.call(customElements, versionedTagName, ctr, options);
            }

            restoreElementStates(replacements);
        } catch (err) {
            console.error(`${logTimer()}::[hot-replace] - custom element redefine failed`, err);
            try {
                originalDefine.call(customElements, tagName, ctr, options);
            } catch (e2) {
                console.error(`${logTimer()}::[hot-replace] - original define also failed`, e2);
            }
        }
    };

    // Watch for elements added later (fragment swaps, JS replaceWith, etc.).
    // These arrive with unversioned tags but need to match the versioned
    // constructors registered by the define override above.
    versionObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (!(node instanceof Element)) continue;
                upgradeRuntimeElement(node);
                for (const el of node.querySelectorAll("*")) {
                    upgradeRuntimeElement(el);
                }
            }
        }
    });
    versionObserver.observe(document.documentElement, { childList: true, subtree: true });
}

/**
 * Upgrade a single element to its versioned tag if one exists in
 * __customElementVersions. Used by the MutationObserver to handle
 * runtime-inserted elements that use unversioned tags.
 * @param {Element} el
 */
export function upgradeRuntimeElement(el) {
    const tag = el.tagName.toLowerCase();
    if (!tag.includes("-")) return;

    // During hot-reload body replacement, skip upgrading — the define override
    // handles all existing elements with the latest constructor. Upgrading here
    // with a stale constructor would mutate children (removing $on* / $bind-*
    // attributes) before the new define override can process them.
    if (hotReloading) return;

    const versions = /** @type {HotReplaceGlobal} */ (globalThis).__customElementVersions;
    const ver = versions?.[tag];
    if (!ver) return;

    const versionedTagName = `${tag}-${ver}`;
    if (!customElements.get(versionedTagName)) return;

    // Check if the element is already a versioned instance of itself.
    const VersionedCtr = customElements.get(versionedTagName);
    if (el instanceof VersionedCtr) return;
    if (!el.parentNode) return;

    // Use an unregistered name so document.createElement returns an
    // unupgraded element (ctor doesn't run yet). Move children in first,
    // then register so the platform upgrades the populated element in place —
    // ctor sees its children. Using the registered versionedTagName would
    // run ctor before children are moved, so components that capture child
    // refs in their definition body (e.g. $element.querySelector("dialog"))
    // would capture nulls.
    const newVer = ver + 1;
    versions[tag] = newVer; // bumps counter independently of define() — the override's v < version sweep picks these up
    const newVersionedTagName = `${tag}-${newVer}`;
    const newEl = document.createElement(newVersionedTagName);
    Array.from(el.attributes).forEach((attr) => {
        newEl.setAttribute(attr.name, attr.value);
    });
    while (el.firstChild) {
        newEl.appendChild(el.firstChild);
    }
    el.replaceWith(newEl);

    // originalCustomElementsDefine is always present because
    // customElements.get(versionedTagName) was truthy earlier,
    // which requires installCustomElementRedefinition to have run.
    if (!customElements.get(newVersionedTagName) && originalCustomElementsDefine) {
        // Platform forbids registering the same constructor under two names.
        // Subclass the author constructor (not the latest versioned one) to
        // keep the chain flat across repeated runtime inserts. The inherited
        // static __definition makes the define body run on upgrade.
        const BaseCtr = _versionedAuthorCtors[tag] || VersionedCtr;
        class UpgradedVersion extends BaseCtr {}
        originalCustomElementsDefine.call(customElements, newVersionedTagName, UpgradedVersion);
    }
}

/**
 * Replace existing custom elements with versioned versions.
 * @param {Element[]} existing - Existing elements to replace
 * @param {string} versionedTagName - New versioned tag name
 * @param {CustomElementConstructor} ctr - Element constructor
 * @returns {Element[]} Replacement elements
 */
function replaceCustomElements(existing, versionedTagName, ctr) {
    const ReactiveComponent =
        "ReactiveComponent" in window ? /** @type {typeof HTMLElement | undefined} */ (window.ReactiveComponent) : undefined;
    const isReactiveComponent = ReactiveComponent && ctr.prototype instanceof ReactiveComponent;
    /** @type {Element[]} */
    const replacements = [];

    existing.forEach((el, index) => {
        const newEl = document.createElement(versionedTagName);

        Array.from(el.attributes).forEach((attr) => {
            newEl.setAttribute(attr.name, attr.value);
        });

        if (isReactiveComponent) {
            getOrAssignHrc(el, newEl, index);
        }

        while (el.firstChild) {
            newEl.appendChild(el.firstChild);
        }

        el.replaceWith(newEl);
        replacements.push(newEl);
    });

    return replacements;
}

/**
 * Restore states for replacement elements.
 * @param {Element[]} replacements - Elements to restore state for
 */
function restoreElementStates(replacements) {
    const stateMap = gt[HRC_STATE_GLOBAL_KEY];
    if (stateMap instanceof Map && replacements.length) {
        replacements.forEach((el) => {
            restoreReactiveComponentStateForElement(el);
        });
    }
}

/**
 * Get or assign a hot-replace component ID to an element.
 *
 * @param {Element} oldEl - The old element being replaced
 * @param {Element} newEl - The new replacement element
 * @param {number} index - The index in the list of replacements
 */
function getOrAssignHrc(oldEl, newEl, index) {
    const oldDataset = getDataset(oldEl);
    const newDataset = getDataset(newEl);

    if (oldDataset?.hrc && newDataset) {
        newDataset.hrc = oldDataset.hrc;
        return;
    }

    const inner = oldEl?.innerHTML || "";
    let hash = 11 >>> 0;
    for (let i = 0; i < inner.length; i++) {
        hash = (101 * hash + inner.charCodeAt(i)) >>> 0;
    }

    if (newDataset) {
        newDataset.hrc = `${hash}-${index}`;
    }
}

/**
 * Preserve reactive component states before hot reload.
 *
 * Captures current state of all reactive components in the DOM.
 *
 * @returns {Map<string, Record<string, unknown>>} Map of HRC IDs to state snapshots
 */
function preserveReactiveComponentsState() {
    const states = new Map();
    try {
        document.querySelectorAll(HRC_SELECTOR).forEach((el) => {
            const elState = getMapLikeState(el);
            if (!elState) return;

            const snapshot = captureStateSnapshot(elState);
            if (!snapshot) return;

            const hrcId = getDataset(el)?.hrc;
            if (hrcId) {
                states.set(hrcId, snapshot);
            }
        });
    } catch (err) {
        console.error(`${logTimer()}::[hot-replace] - preserve state error`, err);
    }
    return states;
}

/**
 * Get Map-like state from element if present.
 * @param {Element} el
 * @returns {MapLikeState | null}
 */
function getMapLikeState(el) {
    if (!("state" in el)) return null;
    const state = /** @type {MapLikeState | unknown} */ (el.state);
    return state && typeof (/** @type {{forEach?: unknown}} */ (state).forEach) === "function" ? /** @type {MapLikeState} */ (state) : null;
}

/**
 * Capture state snapshot from Map-like state object.
 * @param {MapLikeState} elState
 * @returns {Record<string, unknown> | null}
 */
function captureStateSnapshot(elState) {
    const snapshot = /** @type {Record<string, unknown>} */ ({});
    let hasAny = false;

    elState.forEach((signal, key) => {
        try {
            if (typeof signal === "function") {
                snapshot[key] = signal();
                hasAny = true;
            }
        } catch (e) {
            console.warn(`${logTimer()}::[hot-replace] - state read failed for`, key, e);
        }
    });

    return hasAny ? snapshot : null;
}

/**
 * Restore reactive component state for a single element.
 *
 * @param {Element} el - The element to restore state for
 */
function restoreReactiveComponentStateForElement(el) {
    const dataset = getDataset(el);
    if (!dataset?.hrc) return;

    const map = gt[HRC_STATE_GLOBAL_KEY];
    if (!(map instanceof Map) || !map.size) return;

    if (!("setState" in el) || typeof el.setState !== "function") return;

    const snapshot = map.get(dataset.hrc);
    if (!snapshot) return;

    try {
        Object.entries(snapshot).forEach(([k, v]) => {
            try {
                /** @type {{setState: (key: string, value: unknown) => void}} */ (el).setState(k, v);
            } catch (e) {
                console.warn(`${logTimer()}::[hot-replace] - setState failed for`, k, e);
            }
        });
        map.delete(dataset.hrc);
        console.log(`${logTimer()}::[hot-replace] - restored reactive state for`, dataset.hrc);
    } catch (err) {
        console.error(`${logTimer()}::[hot-replace] - restore state error for`, dataset.hrc, err);
    }
}

/**
 * Attempt to restore reactive state for all components.
 */
function attemptBatchStateRestoration() {
    const map = gt[HRC_STATE_GLOBAL_KEY];
    if (!(map instanceof Map) || !map.size) return;

    document.querySelectorAll(HRC_SELECTOR).forEach((el) => {
        restoreReactiveComponentStateForElement(el);
    });

    if (!map.size) {
        console.log(`${logTimer()}::[hot-replace] - all reactive states restored`);
    }
}

/**
 * Schedule multiple staggered attempts to restore state:
 * - immediate microtask, short delay, and a longer fallback
 *
 * @param {number} [extraDelay=0] - Additional delay in milliseconds
 */
function scheduleStateRestoration(extraDelay = 0) {
    setTimeout(() => attemptBatchStateRestoration(), extraDelay);
    setTimeout(() => attemptBatchStateRestoration(), 50 + extraDelay);
    setTimeout(() => attemptBatchStateRestoration(), 250 + extraDelay);
}

/**
 * Capture current scroll positions for body and marked elements.
 *
 * @returns {{ selector: string; scrollLeft: number; scrollTop: number }[]} Array of scroll position info
 */
function captureScrollPositions() {
    const info = [{ selector: "body", scrollLeft: document.body.scrollLeft, scrollTop: document.body.scrollTop }];

    try {
        document.querySelectorAll(`[${SCROLL_ATTR}]`).forEach((el) => {
            if (el.scrollLeft || el.scrollTop) {
                const attr = el.getAttribute(SCROLL_ATTR);
                info.push({
                    selector: `[${SCROLL_ATTR}="${attr}"]`,
                    scrollLeft: el.scrollLeft,
                    scrollTop: el.scrollTop,
                });
            }
        });
    } catch (err) {
        console.warn(`${logTimer()}::[hot-replace] - capture scroll failed`, err);
    }
    return info;
}

/**
 * Restore scroll positions for body and marked elements.
 *
 * @param {{ selector: string; scrollLeft: number; scrollTop: number }[]} info - Array of scroll position info
 */
function restoreScrollPositions(info) {
    if (!Array.isArray(info) || !info.length) return;
    try {
        info.forEach((item) => {
            const el = item.selector === "body" ? document.body : document.querySelector(item.selector);
            if (el) {
                el.scrollTo(item.scrollLeft, item.scrollTop);
                if (item.selector !== "body") {
                    console.log(`${logTimer()}::[hot-replace] - restored scroll for`, item.selector);
                }
            }
        });
    } catch (err) {
        console.warn(`${logTimer()}::[hot-replace] - restore scroll failed`, err);
    }
}

/**
 * Get a formatted timestamp for logging.
 *
 * @returns {string} Formatted timestamp string
 */
function logTimer() {
    const now = new Date();
    const pad = (/** @type {number} */ n, /** @type {number} */ z = 2) => String(n).padStart(z, "0");
    return `[${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}]`;
}

/**
 * debounce returns a debounced wrapper with cancel() and flush() helpers.
 * - Preserves caller context (this) & last arguments
 * - cancel(): clears pending invocation
 * - flush(): immediately invokes pending call if scheduled
 * NOTE: Minimal utility kept dependency-free for hot reload client.
 *
 * @param {(...args: unknown[]) => unknown} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {{ (...args: unknown[]): void; cancel(): void; flush(): void }} Debounced function with cancel/flush helpers
 */
export function debounce(fn, delay) {
    /** @type {ReturnType<typeof setTimeout> | null} */
    let timer = null;
    /** @type {unknown[] | undefined} */
    let lastArgs;
    /** @type {unknown} */
    let lastThis;

    function invoke() {
        timer = null;
        try {
            fn.apply(lastThis, lastArgs);
        } finally {
            lastArgs = undefined;
            lastThis = undefined;
        }
    }

    /**
     * @this {unknown}
     * @param {unknown[]} args
     */
    function debounced(...args) {
        lastArgs = args;
        lastThis = this;
        if (timer) clearTimeout(timer);
        timer = setTimeout(invoke, delay);
    }

    debounced.cancel = () => {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        lastArgs = undefined;
        lastThis = undefined;
    };

    debounced.flush = () => {
        if (timer) {
            clearTimeout(timer);
            invoke();
        }
    };

    return debounced;
}
