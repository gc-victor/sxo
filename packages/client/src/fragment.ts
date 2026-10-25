/** Options for {@link swapFragment}. */
export interface SwapOptions {
    /** Passed through to `fetch`. An aborted request returns `false`. */
    signal?: AbortSignal;
    /** Set to `false` to force replacement instead of patching. Default: patch. */
    patch?: boolean;
}

type FocusSegment = {
    tag: string;
    index: number;
    id: string | null;
    name: string | null;
    value: string | null;
    element: Element;
};

type FocusSnapshot = {
    path: FocusSegment[];
    id: string | null;
    name: string | null;
    value: string | null;
    selectionStart: number | null;
    selectionEnd: number | null;
    detached: boolean;
};

type FormState = {
    element: Element;
    value?: string;
    checked?: boolean;
};

let lastFocused: { element: Element; ancestors: Element[]; path: FocusSegment[] } | undefined;
const latestRequests = new WeakMap<Element, symbol>();

if (typeof document !== "undefined") {
    document.addEventListener("focusin", (event) => {
        const target = event.target as Node | null;
        if (!target || target.nodeType !== Node.ELEMENT_NODE) return;
        const element = target as Element;
        const ancestors: Element[] = [];
        const path: FocusSegment[] = [];
        let current: Element | null = element;
        while (current) {
            ancestors.push(current);
            const parent: Element | null = current.parentElement;
            if (parent) path.unshift(makeFocusSegment(current, Array.from(parent.children).indexOf(current)));
            current = parent;
        }
        lastFocused = { element, ancestors, path };
    });
}

function formValue(element: Element): string | null {
    return "value" in element && typeof element.value === "string" ? element.value : null;
}

function makeFocusSegment(element: Element, index: number): FocusSegment {
    return {
        tag: element.tagName,
        index,
        id: element.getAttribute("id"),
        name: element.getAttribute("name"),
        value: formValue(element),
        element,
    };
}

function readSelection(element: Element, property: "selectionStart" | "selectionEnd"): number | null {
    try {
        const value = (element as HTMLInputElement | HTMLTextAreaElement)[property];
        return typeof value === "number" ? value : null;
    } catch {
        return null;
    }
}

function isWithin(root: Element, target: Element | null): boolean {
    return root.contains(target);
}

function focusPath(root: Element, target: Element): FocusSegment[] {
    const path: FocusSegment[] = [];
    let current = target;

    while (current !== root) {
        const parent = current.parentElement;
        if (!parent) return [];
        path.unshift(makeFocusSegment(current, Array.from(parent.children).indexOf(current)));
        current = parent;
    }
    return path;
}

function captureFocus(root: Element): FocusSnapshot | undefined {
    const active = document.activeElement;
    let element: Element | null = isWithin(root, active) ? active : null;
    let path: FocusSegment[] = [];
    let detached = false;

    if (element) {
        path = focusPath(root, element);
    } else if (active === document.body && lastFocused && !lastFocused.element.isConnected && lastFocused.ancestors.includes(root)) {
        element = lastFocused.element;
        const rootIndex = lastFocused.ancestors.indexOf(root);
        path = lastFocused.path.slice(-rootIndex);
        detached = true;
    }

    if (!element) return undefined;
    return {
        path,
        id: element.getAttribute("id"),
        name: element.getAttribute("name"),
        value: formValue(element),
        selectionStart: readSelection(element, "selectionStart"),
        selectionEnd: readSelection(element, "selectionEnd"),
        detached,
    };
}

function matchFocusChild(parent: Element, segment: FocusSegment): Element | null {
    const siblings = Array.from(parent.children);
    const atIndex = siblings[segment.index];
    if (atIndex?.tagName === segment.tag) return atIndex;

    if (segment.id) {
        const byId = siblings.find((sibling) => sibling.getAttribute("id") === segment.id);
        if (byId) return byId;
    }
    if (segment.name && segment.value !== null) {
        const byNameAndValue = siblings.find(
            (sibling) => sibling.getAttribute("name") === segment.name && formValue(sibling) === segment.value,
        );
        if (byNameAndValue) return byNameAndValue;
    }
    return siblings.find((sibling) => segment.element.isEqualNode(sibling)) ?? null;
}

function resolveFocus(root: Element, snapshot: FocusSnapshot): { element: Element | null; complete: boolean } {
    let current = root;
    for (const segment of snapshot.path) {
        const child = matchFocusChild(current, segment);
        if (!child) return { element: current, complete: false };
        current = child;
    }
    return { element: current, complete: true };
}

function descendants(root: Element): Element[] {
    return [root, ...Array.from(root.querySelectorAll("*"))];
}

function findByIdentity(root: Element, snapshot: FocusSnapshot): Element | null {
    const candidates = descendants(root);
    if (snapshot.id) {
        const byId = candidates.find((candidate) => candidate.getAttribute("id") === snapshot.id);
        if (byId) return byId;
    }
    if (snapshot.name) {
        const byNameAndValue = candidates.find(
            (candidate) => candidate.getAttribute("name") === snapshot.name && formValue(candidate) === snapshot.value,
        );
        if (byNameAndValue) return byNameAndValue;
        return candidates.find((candidate) => candidate.getAttribute("name") === snapshot.name) ?? null;
    }
    return null;
}

function resolveFocusTarget(oldRoot: Element, liveRoot: Element, snapshot: FocusSnapshot): { element: Element | null; complete: boolean } {
    if (oldRoot.tagName === liveRoot.tagName) return resolveFocus(liveRoot, snapshot);
    return { element: findByIdentity(liveRoot, snapshot), complete: true };
}

function restoreSelection(candidate: Element, snapshot: FocusSnapshot): void {
    if (snapshot.selectionStart === null) return;
    const selection = candidate as HTMLInputElement | HTMLTextAreaElement;
    if (typeof selection.setSelectionRange !== "function") return;

    try {
        selection.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd ?? snapshot.selectionStart);
    } catch {
        // Some input types do not support text selection.
    }
}

function focusCandidate(root: Element, snapshot: FocusSnapshot, resolved: { element: Element | null; complete: boolean }): Element | null {
    if (!resolved.complete && !snapshot.detached) return null;
    const candidate = resolved.element ?? (snapshot.detached ? root : null);
    if (!candidate || typeof (candidate as HTMLElement).focus !== "function") return null;
    return candidate;
}

function restoreFocus(snapshot: FocusSnapshot | undefined, oldRoot: Element, replacementRoot: Element): void {
    const liveRoot = oldRoot.isConnected ? oldRoot : replacementRoot;
    if (!snapshot || !liveRoot.isConnected) return;

    const resolved = resolveFocusTarget(oldRoot, liveRoot, snapshot);
    const candidate = focusCandidate(liveRoot, snapshot, resolved);
    if (!candidate) return;

    (candidate as HTMLElement).focus();
    if (resolved.complete) restoreSelection(candidate, snapshot);
}

function copyAttributes(from: Element, to: Element): void {
    const sourceNames = new Set(Array.from(from.attributes, ({ name }) => name));
    for (const { name } of Array.from(to.attributes)) {
        if (name.startsWith("$") || !sourceNames.has(name)) to.removeAttribute(name);
    }
    for (const { name, value } of Array.from(from.attributes)) {
        if (name.startsWith("$")) continue;
        if (to.getAttribute(name) !== value) to.setAttribute(name, value);
    }
}

function captureFormState(root: Element): FormState[] {
    return descendants(root).flatMap((element) => {
        const state: FormState = { element };
        if ("value" in element && typeof element.value === "string") state.value = element.value;
        if ("checked" in element && typeof element.checked === "boolean") state.checked = element.checked;
        return state.value !== undefined || state.checked !== undefined ? [state] : [];
    });
}

function restoreFormState(states: FormState[]): void {
    for (const state of states) {
        if (!state.element.isConnected) continue;
        if (state.value !== undefined && "value" in state.element) state.element.value = state.value;
        if (state.checked !== undefined && "checked" in state.element) state.element.checked = state.checked;
    }
}

function nodeKey(node: Node): string | null {
    return node.nodeType === Node.ELEMENT_NODE ? (node as Element).getAttribute("data-key") : null;
}

function sameNodeKind(oldNode: Node, newNode: Node): boolean {
    if (oldNode.nodeType !== newNode.nodeType) return false;
    if (oldNode.nodeType !== Node.ELEMENT_NODE) return true;
    const oldElement = oldNode as Element;
    const newElement = newNode as Element;
    return oldElement.tagName === newElement.tagName && nodeKey(oldNode) === nodeKey(newNode);
}

function uniqueKeyedChildren(nodes: Node[]): Map<string, Element> {
    const keyed = new Map<string, Element>();
    const duplicates = new Set<string>();
    for (const node of nodes) {
        const key = nodeKey(node);
        if (key === null) continue;
        if (keyed.has(key)) duplicates.add(key);
        else keyed.set(key, node as Element);
    }
    for (const key of duplicates) keyed.delete(key);
    return keyed;
}

function syncNode(oldNode: Node, newNode: Node): void {
    if (oldNode.nodeType === Node.ELEMENT_NODE && newNode.nodeType === Node.ELEMENT_NODE) {
        syncElement(oldNode as Element, newNode as Element);
    } else if (oldNode.nodeValue !== newNode.nodeValue) {
        oldNode.nodeValue = newNode.nodeValue;
    }
}

function matchChild(newChild: Node, index: number, oldChildren: Node[], oldByKey: Map<string, Element>, used: Set<Node>): Node | undefined {
    const key = nodeKey(newChild);
    if (key !== null) {
        const keyed = oldByKey.get(key);
        return keyed && !used.has(keyed) && sameNodeKind(keyed, newChild) ? keyed : undefined;
    }

    const positional = oldChildren[index];
    if (!positional || used.has(positional) || nodeKey(positional) !== null || !sameNodeKind(positional, newChild)) return undefined;
    return positional;
}

function syncChildren(oldParent: Element, newParent: Element): void {
    const oldChildren = Array.from(oldParent.childNodes);
    const newChildren = Array.from(newParent.childNodes);
    const oldByKey = uniqueKeyedChildren(oldChildren);
    const used = new Set<Node>();
    const desired: Node[] = [];

    for (let index = 0; index < newChildren.length; index++) {
        const newChild = newChildren[index];
        const match = matchChild(newChild, index, oldChildren, oldByKey, used);
        if (!match) {
            desired.push(newChild.cloneNode(true));
            continue;
        }
        used.add(match);
        syncNode(match, newChild);
        desired.push(match);
    }

    let reference = oldParent.firstChild;
    for (const node of desired) {
        if (node === reference) {
            reference = reference.nextSibling;
        } else {
            oldParent.insertBefore(node, reference);
        }
    }
    for (const node of oldChildren) {
        if (!used.has(node) && node.parentNode === oldParent) oldParent.removeChild(node);
    }
}

function syncElement(oldElement: Element, newElement: Element): void {
    copyAttributes(newElement, oldElement);
    syncChildren(oldElement, newElement);
}

function patchInPlace(oldRoot: Element, newRoot: Element): void {
    if (oldRoot.isEqualNode(newRoot)) return;
    const formState = captureFormState(oldRoot);
    syncElement(oldRoot, newRoot);
    restoreFormState(formState);
}

function resolveTarget(target: string | Element): Element | null {
    return typeof target === "string" ? document.querySelector(target) : target;
}

function findTwin(container: Element, target: string | Element, oldRoot: Element): Element | null {
    if (typeof target === "string") return container.querySelector(target);
    const css = document.defaultView?.CSS;
    if (oldRoot.id && css) return container.querySelector(`#${css.escape(oldRoot.id)}`);
    const first = container.firstElementChild;
    return first?.tagName === oldRoot.tagName ? first : null;
}

async function fetchFragmentRoot(url: string, target: string | Element, oldRoot: Element, signal?: AbortSignal): Promise<Element | null> {
    if (signal?.aborted) return null;
    const request = Symbol();
    latestRequests.set(oldRoot, request);
    const response = await fetch(url, { signal });
    if (!response.ok) return null;
    const html = await response.text();
    if (!html.trim()) return null;

    const container = document.createElement("div");
    container.innerHTML = html;
    const newRoot = findTwin(container, target, oldRoot);
    if (!newRoot || !oldRoot.isConnected || latestRequests.get(oldRoot) !== request) return null;
    return newRoot;
}

function replaceFragmentRoot(oldRoot: Element, newRoot: Element): boolean {
    const parent = oldRoot.parentNode;
    if (!parent) return false;
    const nextSibling = oldRoot.nextSibling;
    oldRoot.remove();
    parent.insertBefore(newRoot, nextSibling?.parentNode === parent ? nextSibling : null);
    return true;
}

function updateFragmentRoot(oldRoot: Element, newRoot: Element, snapshot: FocusSnapshot | undefined, patch: boolean): boolean {
    if (patch && oldRoot.tagName === newRoot.tagName) {
        patchInPlace(oldRoot, newRoot);
    } else if (!replaceFragmentRoot(oldRoot, newRoot)) {
        return false;
    }
    restoreFocus(snapshot, oldRoot, newRoot);
    return true;
}

/**
 * Fetch trusted server-rendered HTML and patch its root into the live target, preserving node identity and DOM state.
 *
 * The response must contain an element matching `target` (outer semantics). Matching root tags are patched in place;
 * different root tags replace the target. The promise resolves after the patch or replacement is applied. HTML is
 * inserted without sanitization: escape untrusted server values. See
 * [SXO security guidance](https://github.com/gc-victor/sxo/blob/main/docs/security.md#escaping-the-1-app-level-risk).
 *
 * Returns `false` without changing the DOM when the target is unresolved or disconnected, it carries a detectable
 * `$bind-html`, `$bind-text`, or `$state` directive, a newer request supersedes this one, the request fails or is
 * aborted, the response is not OK, the body is empty, or no matching root is found.
 *
 * @param url Fragment endpoint returning a subtree whose root matches `target`.
 * @param target Live element, or a selector resolved via `document.querySelector`.
 * @param opts Fetch and patch options.
 * @returns `true` if the DOM was updated; `false` otherwise (DOM left untouched).
 */
export async function swapFragment(url: string, target: string | Element, opts: SwapOptions = {}): Promise<boolean> {
    try {
        const oldRoot = resolveTarget(target);
        if (!oldRoot?.isConnected) return false;
        if (oldRoot.hasAttribute("$bind-html") || oldRoot.hasAttribute("$bind-text") || oldRoot.hasAttribute("$state")) {
            console.error("[fragment] swap target cannot carry $bind-html, $bind-text, or $state");
            return false;
        }

        const newRoot = await fetchFragmentRoot(url, target, oldRoot, opts.signal);
        if (!newRoot) return false;
        const snapshot = captureFocus(oldRoot);
        return updateFragmentRoot(oldRoot, newRoot, snapshot, opts.patch !== false);
    } catch {
        return false;
    }
}
