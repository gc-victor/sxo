import { afterEach, describe, expect, it, vi } from "vitest";
import { swapFragment } from "../../src/fragment.js";
import { requiredElement } from "../utils/test-helpers.js";

function response(html: string) {
    return { ok: true, text: async () => html };
}

describe("fragment focus restoration", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        document.body.innerHTML = "";
    });

    it("preserves focus and selection across a same-tag patch", async () => {
        const root = document.createElement("form");
        root.id = "form";
        root.innerHTML = '<input id="title" value="server">';
        document.body.append(root);
        const input = requiredElement(root.querySelector("input"));
        input.focus();
        input.value = "typed";
        input.setSelectionRange(1, 4);
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response('<form id="form"><input id="title" value="updated"></form>')));

        await expect(swapFragment("/fragment", root)).resolves.toBe(true);
        expect(document.activeElement).toBe(input);
        expect(input.value).toBe("typed");
        expect(input.selectionStart).toBe(1);
        expect(input.selectionEnd).toBe(4);
    });

    it("matches a changed-root focus using the live value property rather than its attribute", async () => {
        const root = document.createElement("div");
        root.id = "old-root";
        root.innerHTML = '<input name="title" value="initial">';
        document.body.append(root);
        const input = requiredElement(root.querySelector("input"));
        input.value = "typed";
        input.focus();
        vi.stubGlobal(
            "fetch",
            vi
                .fn()
                .mockResolvedValue(
                    response(
                        '<section id="old-root"><button></button><input name="title" value="initial"><input name="title" value="typed"></section>',
                    ),
                ),
        );

        await expect(swapFragment("/fragment", root)).resolves.toBe(true);
        const newRoot = requiredElement(document.querySelector("section"));
        expect(document.activeElement).toBe(newRoot.querySelectorAll("input")[1]);
    });

    it("uses the structural index to focus the corresponding identical sibling", async () => {
        const root = document.createElement("div");
        root.id = "target";
        root.innerHTML = '<input value="same"><input value="same">';
        document.body.append(root);
        const second = root.querySelectorAll("input")[1];
        second.focus();
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response('<div id="target"><input value="same"><input value="same"></div>')));

        await expect(swapFragment("/fragment", root)).resolves.toBe(true);
        expect(document.activeElement).toBe(second);
    });

    it("re-resolves focus by id after a root tag change", async () => {
        const root = document.createElement("div");
        root.id = "old";
        root.innerHTML = '<input id="name" value="alice">';
        document.body.append(root);
        requiredElement(root.querySelector("input")).focus();
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response('<section id="old"><input id="name" value="alice"></section>')));

        await expect(swapFragment("/fragment", root)).resolves.toBe(true);
        const newRoot = requiredElement(document.querySelector("section"));
        expect(document.activeElement).toBe(newRoot.querySelector("#name"));
    });

    it("returns focus to a surviving ancestor when the active node was removed before the swap", async () => {
        const root = document.createElement("div");
        root.id = "target";
        root.innerHTML = '<section tabindex="-1"><button id="remove-me">Remove</button></section>';
        document.body.append(root);
        const section = requiredElement(root.querySelector("section"));
        const button = requiredElement(root.querySelector("button"));
        button.focus();
        button.remove();
        expect(document.activeElement).toBe(document.body);
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response('<div id="target"><section tabindex="-1">Updated</section></div>')));

        await expect(swapFragment("/fragment", root)).resolves.toBe(true);
        expect(document.activeElement).toBe(section);
    });

    it("does not guess a new focus target when the active node has no counterpart", async () => {
        const root = document.createElement("div");
        root.id = "target";
        root.innerHTML = '<button id="active">Active</button>';
        document.body.append(root);
        const active = requiredElement(root.querySelector("button"));
        active.focus();
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response('<div id="target"><p>replacement</p></div>')));

        await expect(swapFragment("/fragment", root)).resolves.toBe(true);
        expect(document.activeElement).toBe(document.body);
        expect(document.activeElement).not.toBe(root.querySelector("p"));
    });
});
