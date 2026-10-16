import { afterEach, describe, expect, it, vi } from "vitest";
import { swapFragment } from "../../src/fragment.js";

function mockResponse(html: string) {
    return { ok: true, text: async () => html };
}

describe("fragment patch helpers", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        document.body.innerHTML = "";
    });

    it("preserves root and matched descendant identity while updating content", async () => {
        const root = document.createElement("ul");
        root.id = "items";
        root.innerHTML = "<li>old</li>";
        document.body.append(root);
        const item = root.firstElementChild;
        const click = vi.fn();
        root.addEventListener("click", click);
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse('<ul id="items"><li>new</li></ul>')));

        await expect(swapFragment("/fragment", "#items")).resolves.toBe(true);
        expect(document.querySelector("#items")).toBe(root);
        expect(root.firstElementChild).toBe(item);
        expect(root.textContent).toBe("new");
        root.dispatchEvent(new Event("click"));
        expect(click).toHaveBeenCalledOnce();
    });

    it("does not copy directives and synchronizes input types", async () => {
        const root = document.createElement("form");
        root.id = "form";
        root.innerHTML = '<input type="text" value="server"><input type="checkbox" checked>';
        document.body.append(root);
        const [input, checkbox] = Array.from(root.querySelectorAll("input"));
        input.value = "typed";
        checkbox.checked = false;
        vi.stubGlobal(
            "fetch",
            vi
                .fn()
                .mockResolvedValue(
                    mockResponse(
                        '<form id="form" $ref="form"><input type="checkbox" value="new" $onclick="save"><input type="checkbox" checked></form>',
                    ),
                ),
        );

        await expect(swapFragment("/fragment", "#form")).resolves.toBe(true);
        expect(root.hasAttribute("$ref")).toBe(false);
        expect(input.hasAttribute("$onclick")).toBe(false);
        expect(input.getAttribute("type")).toBe("checkbox");
        expect(input.value).toBe("typed");
        expect(checkbox.checked).toBe(false);
    });

    it("preserves a checked live checkbox when the server fragment says unchecked", async () => {
        const root = document.createElement("div");
        root.id = "target";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        root.append(checkbox);
        document.body.append(root);
        checkbox.checked = true;
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse('<div id="target"><input type="checkbox"></div>')));

        await expect(swapFragment("/fragment", root)).resolves.toBe(true);
        expect(root.querySelector("input")).toBe(checkbox);
        expect(checkbox.checked).toBe(true);
    });

    it("uses the text input default when a fragment omits type", async () => {
        const root = document.createElement("div");
        root.id = "target";
        root.innerHTML = '<input type="checkbox" checked>';
        document.body.append(root);
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse('<div id="target"><input checked></div>')));

        await expect(swapFragment("/fragment", root)).resolves.toBe(true);
        const input = root.querySelector("input");
        expect(input?.hasAttribute("type")).toBe(false);
        expect(input?.type).toBe("text");
    });

    it("updates mixed text while retaining matched child nodes", async () => {
        const root = document.createElement("div");
        root.id = "target";
        root.innerHTML = "before <span>child</span> after";
        document.body.append(root);
        const child = root.querySelector("span");
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse('<div id="target">changed <span>child</span> after</div>')));

        await expect(swapFragment("/fragment", root)).resolves.toBe(true);
        expect(root.textContent).toBe("changed child after");
        expect(root.querySelector("span")).toBe(child);
    });
});
