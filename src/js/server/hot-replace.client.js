// Reactive component contract (lightweight / opt-in):
// - Elements with a Map-like `state` (key -> signalFn()) can have their state captured.
// - Provide `setState(key, value)` on the element for state restoration.
// - Element should expose stable identity via a data-hrc attribute (auto-assigned based on
//   innerHTML hash if absent when redefining).
//
// Scroll restoration:
// - Body scroll plus any element with data-hot-replace-scroll attribute is captured.
// - After body innerHTML replacement, scroll is restored.

let evSource;
const HRC_STATE_GLOBAL_KEY = "___hrcStates"; // window.___hrcStates = Map<hrcId, stateObj>

/**
 * Initialize hot reload connection
 * @param {string} href
 */
export function hotReplace(href) {
    if (evSource && evSource.readyState !== EventSource.CLOSED) {
        // Already connected
        return;
    }

    console.info(`${logTimer()}::[hot-replace] - initialized`);

    installCustomElementRedefinition();

    evSource = new EventSource(`/hot-replace?href=${href}`);
    evSource.onmessage = debounce(onHotMessage, 500);
    evSource.onerror = () => {
        console.warn(`${logTimer()}::[hot-replace] - connection lost, retrying...`);
        try {
            evSource.close();
        } catch (_e) {
            /* noop */
        }
        setTimeout(() => location.reload(), 1000);
    };

    // Cancel evSource when leaving the page
    window.addEventListener("beforeunload", () => {
        if (evSource && typeof evSource.close === "function") {
            evSource.close();
        }
    });
}

function onHotMessage(e) {
    let data;
    try {
        data = JSON.parse(e.data);
    } catch (err) {
        console.error(`${logTimer()}::[hot-replace] - invalid payload`, err);
        return;
    }

    // Capture scroll + reactive state BEFORE mutation.
    const scrollInfo = captureScrollPositions();
    const preservedStates = preserveReactiveComponentsState();

    // Stash globally for custom element rehydration after scripts execute.
    if (preservedStates.size) {
        globalThis[HRC_STATE_GLOBAL_KEY] = preservedStates;
        console.log(`${logTimer()}::[hot-replace] - preserved reactive states:`, preservedStates.size);
    }

    // Remove old hot-replace-injected route scripts (heuristic)
    document.body.querySelectorAll("script[data-hr]").forEach((script) => script.remove());

    // Replace body content
    document.body.innerHTML = data.body || "";

    // Replace scripts (will also re-execute page logic)
    scripts(data);
    // Replace styles
    styles(data);

    // Restore scroll
    restoreScrollPositions(scrollInfo);

    // Attempt reactive state restoration shortly after DOM + scripts settle.
    scheduleStateRestoration();
}

/* ----------------------------- Scripts Handling ---------------------------- */

function scripts(data) {
    if (!data?.assets?.js?.length) return;

    const paths = data.assets.js;
    const publicPath = data.publicPath || "";

    paths.forEach((path) => {
        const src = publicPath + path;
        const script = document.createElement("script");
        script.type = "module";
        script.src = `${src}?${Date.now()}`;
        script.dataset.hr = "true";

        script.addEventListener("load", () => {
            console.log(`${logTimer()}::[hot-replace] - script loaded:`, src);
            // Additional attempt to restore state after a script loads (in case components defined late)
            scheduleStateRestoration(50);
        });
        script.addEventListener("error", (err) => {
            console.error(`${logTimer()}::[hot-replace] - script failed:`, src, err);
        });

        document.body.appendChild(script);
    });
}

/* ------------------------------ Styles Handling ---------------------------- */

function styles(data) {
    if (!data?.assets?.css?.length) return;

    const paths = data.assets.css;
    const publicPath = data.publicPath || "";

    paths.forEach((path) => {
        const href = publicPath + path;
        const newLink = document.createElement("link");
        newLink.rel = "stylesheet";
        newLink.href = href;

        newLink.addEventListener("load", () => {
            console.log(`${logTimer()}::[hot-replace] - style loaded:`, href);
        });
        newLink.addEventListener("error", (err) => {
            console.error(`${logTimer()}::[hot-replace] - style failed:`, href, err);
        });

        const oldLink = document.querySelector(`link[href="${href}"]`);
        document.head.appendChild(newLink);

        if (oldLink) {
            setTimeout(() => {
                oldLink.remove();
            }, 250);
        }
    });
}

/* -------------------- Custom Element Redefinition & State ------------------ */

function installCustomElementRedefinition() {
    if (installCustomElementRedefinition._installed) return;
    installCustomElementRedefinition._installed = true;

    const originalDefine = customElements.define;

    // Maintain a version map for each tagName
    if (!window.__customElementVersions) {
        window.__customElementVersions = {};
    }

    /**
     * Override customElements.define to create a versioned tag and replace instances.
     * This sidesteps DOMException on redefining existing custom element names.
     */
    customElements.define = (tagName, ctr, options) => {
        try {
            // Increment or init version counter
            window.__customElementVersions[tagName] = (window.__customElementVersions[tagName] || 0) + 1;
            const version = window.__customElementVersions[tagName];
            const versionedTagName = `${tagName}-${version}`;

            // Attach version for diagnostics
            ctr.__version = version;

            // Replace existing instances
            const existing = Array.from(document.querySelectorAll(tagName));
            const replacements = [];
            const isReactiveComponent = typeof ReactiveComponent !== "undefined" && ctr.prototype instanceof ReactiveComponent;

            existing.forEach((el, index) => {
                const newEl = document.createElement(versionedTagName);

                // Copy attributes
                for (const attr of el.attributes) {
                    newEl.setAttribute(attr.name, attr.value);
                }

                if (isReactiveComponent) {
                    getOrAssignHrc(el, newEl, index);
                }

                // Move children
                while (el.firstChild) {
                    newEl.appendChild(el.firstChild);
                }

                el.replaceWith(newEl);
                replacements.push(newEl);
            });

            if (!customElements.get(versionedTagName)) {
                console.log(`${logTimer()}::[hot-replace] - re-defining custom element as: ${versionedTagName}`);
                originalDefine.call(customElements, versionedTagName, ctr, options);
            }

            // Attempt per-element reactive state restoration immediately
            if (globalThis[HRC_STATE_GLOBAL_KEY] instanceof Map && isReactiveComponent) {
                for (const el of replacements) {
                    restoreReactiveComponentStateForElement(el);
                }
            }
        } catch (err) {
            console.error(`${logTimer()}::[hot-replace] - custom element redefine failed`, err);
            // Fallback: try original define (may throw if duplicate)
            try {
                originalDefine.call(customElements, tagName, ctr, options);
            } catch (e2) {
                console.error(`${logTimer()}::[hot-replace] - original define also failed`, e2);
            }
        }
    };
}

function getOrAssignHrc(oldEl, newEl, index) {
    // Prefer existing stable identifier
    if (oldEl?.dataset?.hrc) {
        newEl.dataset.hrc = oldEl.dataset.hrc;
        return;
    }
    // Generate a hash from innerHTML for heuristic identity
    const inner = oldEl?.innerHTML || "";
    let hash = 11 >>> 0;
    for (let i = 0; i < inner.length; i++) {
        hash = (101 * hash + inner.charCodeAt(i)) >>> 0;
    }
    newEl.dataset.hrc = `${String(hash)}-${index}`;
}

/* ----------------------- Reactive State Preservation ----------------------- */

function preserveReactiveComponentsState() {
    const states = new Map(); // hrcId -> plain object
    try {
        const elements = document.querySelectorAll("[data-hrc]");
        elements.forEach((el) => {
            // Expect el.state as a Map (key -> signalFn)
            if (el.state && typeof el.state.forEach === "function") {
                const snapshot = {};
                let hasAny = false;
                el.state.forEach((signal, key) => {
                    try {
                        if (typeof signal === "function") {
                            snapshot[key] = signal();
                            hasAny = true;
                        }
                    } catch (e) {
                        console.warn(`${logTimer()}::[hot-replace] - state read failed for`, key, e);
                    }
                });
                if (hasAny) {
                    states.set(el.dataset.hrc, snapshot);
                }
            }
        });
    } catch (err) {
        console.error(`${logTimer()}::[hot-replace] - preserve state error`, err);
    }
    return states;
}

function restoreReactiveComponentStateForElement(el) {
    if (!el?.dataset?.hrc) return;
    const map = globalThis[HRC_STATE_GLOBAL_KEY];
    if (!(map instanceof Map) || !map.size) return;

    if (!el.state || typeof el.setState !== "function") {
        // Not yet ready; might need another pass later
        return;
    }

    if (map.has(el.dataset.hrc)) {
        const snapshot = map.get(el.dataset.hrc);
        try {
            Object.entries(snapshot).forEach(([k, v]) => {
                try {
                    el.setState(k, v);
                } catch (e) {
                    console.warn(`${logTimer()}::[hot-replace] - setState failed for`, k, e);
                }
            });
            map.delete(el.dataset.hrc);
            console.log(`${logTimer()}::[hot-replace] - restored reactive state for`, el.dataset.hrc);
        } catch (err) {
            console.error(`${logTimer()}::[hot-replace] - restore state error for`, el.dataset.hrc, err);
        }
    }
}

function attemptBatchStateRestoration() {
    const map = globalThis[HRC_STATE_GLOBAL_KEY];
    if (!(map instanceof Map) || !map.size) return;

    const candidates = document.querySelectorAll("[data-hrc]");
    for (const el of candidates) {
        // Avoid returning from the loop/callback — each element may or may not be ready.
        restoreReactiveComponentStateForElement(el);
    }

    if (!map.size) {
        console.log(`${logTimer()}::[hot-replace] - all reactive states restored`);
    }
}

/**
 * Schedule multiple staggered attempts to restore state:
 * - immediate microtask, short delay, and a longer fallback
 */
function scheduleStateRestoration(extraDelay = 0) {
    // First tick (after current call stack)
    setTimeout(() => attemptBatchStateRestoration(), 0 + extraDelay);
    // Short delay for late defined components
    setTimeout(() => attemptBatchStateRestoration(), 50 + extraDelay);
    // Longer safety net
    setTimeout(() => attemptBatchStateRestoration(), 250 + extraDelay);
}

/* ---------------------------- Scroll Preservation -------------------------- */

function captureScrollPositions() {
    const info = [];
    try {
        const body = document.body;
        info.push({
            selector: "body",
            scrollLeft: body.scrollLeft,
            scrollTop: body.scrollTop,
        });

        const extras = document.querySelectorAll("[data-hot-replace-scroll]");
        extras.forEach((el) => {
            if (el.scrollLeft || el.scrollTop) {
                info.push({
                    selector: `[data-hot-replace-scroll="${el.getAttribute("data-hot-replace-scroll")}"]`,
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

/* -------------------------------- Utilities -------------------------------- */

function logTimer() {
    const now = new Date();
    const pad = (n, z = 2) => String(n).padStart(z, "0");
    return `[${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}]`;
}

/**
 * debounce returns a debounced wrapper with cancel() and flush() helpers.
 * - Preserves caller context (this) & last arguments
 * - cancel(): clears pending invocation
 * - flush(): immediately invokes pending call if scheduled
 * NOTE: Minimal utility kept dependency-free for hot reload client.
 */
export function debounce(fn, delay) {
    let timer = null;
    let lastArgs;
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
