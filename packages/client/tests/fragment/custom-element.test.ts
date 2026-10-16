import { afterEach, describe, expect, it, vi } from "vitest";
import { define } from "../../src/define.js";
import { swapFragment } from "../../src/fragment.js";
import { requiredElement } from "../utils/test-helpers.js";

describe("custom-element lifecycle during fragment swaps", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        document.body.innerHTML = "";
    });

    it("keeps a same-tag custom-element instance connected", async () => {
        const lifecycle: string[] = [];
        class SwapIsland extends HTMLElement {
            connectedCallback() {
                lifecycle.push("connected");
            }
            disconnectedCallback() {
                lifecycle.push("disconnected");
            }
        }
        customElements.define("x-swap-same", SwapIsland);
        const root = document.createElement("x-swap-same");
        root.id = "target";
        root.innerHTML = "<span>before</span>";
        document.body.append(root);
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({ ok: true, text: async () => '<x-swap-same id="target"><span>after</span></x-swap-same>' }),
        );

        await expect(swapFragment("/fragment", root)).resolves.toBe(true);
        expect(document.querySelector("x-swap-same")).toBe(root);
        expect(lifecycle).toEqual(["connected"]);
        expect(root.textContent).toBe("after");
    });

    it("disconnects the old instance before connecting a different root tag", async () => {
        const lifecycle: string[] = [];
        class OldIsland extends HTMLElement {
            connectedCallback() {
                lifecycle.push("old-connected");
            }
            disconnectedCallback() {
                lifecycle.push("old-disconnected");
            }
        }
        class NewIsland extends HTMLElement {
            connectedCallback() {
                lifecycle.push("new-connected");
            }
        }
        customElements.define("x-swap-old", OldIsland);
        customElements.define("x-swap-new", NewIsland);
        const root = document.createElement("x-swap-old");
        root.id = "target";
        document.body.append(root);
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: async () => '<x-swap-new id="target">new</x-swap-new>' }));

        await expect(swapFragment("/fragment", root)).resolves.toBe(true);
        expect(lifecycle).toEqual(["old-connected", "old-disconnected", "new-connected"]);
        expect(document.querySelector("x-swap-new")?.textContent).toBe("new");
    });

    it("preserves a nested custom-element instance but patches its internals", async () => {
        class NestedIsland extends HTMLElement {}
        customElements.define("x-swap-nested", NestedIsland);
        const root = document.createElement("div");
        root.id = "target";
        root.innerHTML = "<x-swap-nested><span>before</span></x-swap-nested>";
        document.body.append(root);
        const nested = root.querySelector("x-swap-nested");
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: true,
                text: async () => '<div id="target"><x-swap-nested><span>after</span></x-swap-nested></div>',
            }),
        );

        await expect(swapFragment("/fragment", root)).resolves.toBe(true);
        expect(root.querySelector("x-swap-nested")).toBe(nested);
        expect(nested?.textContent).toBe("after");
    });

    it("leaves a swapped plain root directive inert but wires its descendants", async () => {
        const hits = { root: 0, child: 0 };
        define("x-swap-owner", ({ $on }) => {
            $on.rootHit = () => hits.root++;
            $on.childHit = () => hits.child++;
        });
        const owner = document.createElement("x-swap-owner");
        owner.innerHTML = '<div id="target"><button id="old">Old</button></div>';
        document.body.append(owner);
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: true,
                text: async () => '<section id="target" $onclick="rootHit"><button id="child" $onclick="childHit">New</button></section>',
            }),
        );

        await expect(swapFragment("/fragment", "#target")).resolves.toBe(true);
        const section = requiredElement(document.querySelector("section"));
        section.click();
        requiredElement(section.querySelector("button")).click();
        expect(hits).toEqual({ root: 0, child: 1 });
        expect(section.hasAttribute("$onclick")).toBe(true);
        expect(section.querySelector("button")?.hasAttribute("$onclick")).toBe(false);
    });
});
