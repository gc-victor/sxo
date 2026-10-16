import { afterEach, describe, expect, it, vi } from "vitest";
import { swapFragment } from "../../src/fragment.js";

function response(markup: string) {
    return { ok: true, text: async () => markup };
}

function list(items: string): HTMLUListElement {
    const root = document.createElement("ul");
    root.id = "list";
    root.innerHTML = items;
    document.body.append(root);
    return root;
}

describe("fragment reconciliation", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        document.body.innerHTML = "";
    });

    it("appends, prepends, and deletes positional children", async () => {
        const root = list("<li>a</li><li>b</li>");
        const first = root.children[0];
        vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response('<ul id="list"><li>a</li><li>b</li><li>c</li></ul>')));
        await expect(swapFragment("/fragment", "#list")).resolves.toBe(true);
        expect(root.children).toHaveLength(3);
        expect(root.children[0]).toBe(first);

        vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response('<ul id="list"><li>x</li><li>a</li><li>b</li><li>c</li></ul>')));
        await expect(swapFragment("/fragment", "#list")).resolves.toBe(true);
        expect(root.textContent).toBe("xabc");

        vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response('<ul id="list"><li>x</li><li>c</li></ul>')));
        await expect(swapFragment("/fragment", "#list")).resolves.toBe(true);
        expect(root.textContent).toBe("xc");
        expect(root.children).toHaveLength(2);
    });

    it("uses data-key to preserve identity across a sibling reorder", async () => {
        const root = list('<li data-key="a">A</li><li data-key="b">B</li><li data-key="c">C</li>');
        const [a, b, c] = Array.from(root.children);
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(response('<ul id="list"><li data-key="c">C</li><li data-key="b">B</li><li data-key="a">A</li></ul>')),
        );

        await expect(swapFragment("/fragment", "#list")).resolves.toBe(true);
        expect(Array.from(root.children)).toEqual([c, b, a]);
        expect(root.textContent).toBe("CBA");
    });

    it("does not use stale parent references during a move plus insertion", async () => {
        const root = list('<li data-key="a">A</li><li data-key="b">B</li><li data-key="c">C</li>');
        const markup = '<ul id="list"><li data-key="b">B</li><li data-key="d">D</li><li data-key="a">A</li><li data-key="c">C</li></ul>';
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(markup)));

        await expect(swapFragment("/fragment", "#list")).resolves.toBe(true);
        expect(root.textContent).toBe("BDAC");
        expect(root.children).toHaveLength(4);
    });
});
