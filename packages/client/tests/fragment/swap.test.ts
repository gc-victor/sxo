import { afterEach, describe, expect, it, vi } from "vitest";
import { swapFragment } from "../../src/index.js";

function response(html: string, ok = true) {
    return { ok, text: async () => html };
}

describe("swapFragment", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        document.body.innerHTML = "";
    });

    it("returns false without fetching when the target is absent or disconnected", async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
        await expect(swapFragment("/fragment", "#missing")).resolves.toBe(false);
        const detached = document.createElement("div");
        await expect(swapFragment("/fragment", detached)).resolves.toBe(false);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it.each(["$bind-html", "$bind-text", "$state"])("rejects a detectable %s binding on the swap target", async (binding) => {
        const target = document.createElement("div");
        target.id = "target";
        target.setAttribute(binding, "content");
        document.body.append(target);
        vi.spyOn(console, "error").mockImplementation(() => {});
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);

        await expect(swapFragment("/fragment", target)).resolves.toBe(false);
        expect(fetchMock).not.toHaveBeenCalled();
        expect(target.hasAttribute(binding)).toBe(true);
    });

    it.each([
        ["network errors", () => Promise.reject(new Error("offline"))],
        ["non-OK responses", () => Promise.resolve(response("<div id=target></div>", false))],
        [
            "response body errors",
            () =>
                Promise.resolve({
                    ok: true,
                    text: async () => {
                        throw new Error("body");
                    },
                }),
        ],
        ["empty bodies", () => Promise.resolve(response(" \n "))],
        ["missing response roots", () => Promise.resolve(response("<p>not a target</p>"))],
    ])("returns false for %s without mutating the target", async (_name, fetchResponse) => {
        const target = document.createElement("div");
        target.id = "target";
        target.textContent = "before";
        document.body.append(target);
        vi.stubGlobal("fetch", vi.fn(fetchResponse));

        await expect(swapFragment("/fragment", "#target")).resolves.toBe(false);
        expect(target.textContent).toBe("before");
        expect(target.isConnected).toBe(true);
    });

    it("passes the abort signal to fetch and returns false on abort", async () => {
        const target = document.createElement("div");
        target.id = "target";
        document.body.append(target);
        const controller = new AbortController();
        const fetchMock = vi.fn((_url: string, options: { signal?: AbortSignal }) => {
            expect(options.signal).toBe(controller.signal);
            return Promise.reject(new DOMException("Aborted", "AbortError"));
        });
        vi.stubGlobal("fetch", fetchMock);

        await expect(swapFragment("/fragment", target, { signal: controller.signal })).resolves.toBe(false);
    });

    it("drops a slow response after a newer request for the same target", async () => {
        const target = document.createElement("div");
        target.id = "target";
        target.textContent = "initial";
        document.body.append(target);
        const pending: Array<(value: ReturnType<typeof response>) => void> = [];
        vi.stubGlobal(
            "fetch",
            vi.fn(() => new Promise((resolve) => pending.push(resolve))),
        );

        const older = swapFragment("/older", target);
        const newer = swapFragment("/newer", target);
        pending[1](response('<div id="target">newer</div>'));
        await expect(newer).resolves.toBe(true);
        pending[0](response('<div id="target">older</div>'));
        await expect(older).resolves.toBe(false);
        expect(target.textContent).toBe("newer");
    });

    it("locates an element target whose id requires CSS escaping", async () => {
        const target = document.createElement("div");
        target.id = "odd:id";
        target.textContent = "before";
        document.body.append(target);
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response('<div id="odd:id">after</div>')));

        await expect(swapFragment("/fragment", target)).resolves.toBe(true);
        expect(target.textContent).toBe("after");
    });

    it("updates button types while patching in place", async () => {
        const target = document.createElement("form");
        target.id = "target";
        target.innerHTML = '<button type="button">Save</button>';
        document.body.append(target);
        vi.stubGlobal(
            "fetch",
            vi
                .fn()
                .mockResolvedValueOnce(response('<form id="target"><button type="submit">Save</button></form>'))
                .mockResolvedValueOnce(response('<form id="target"><button>Save</button></form>')),
        );

        await expect(swapFragment("/fragment", target)).resolves.toBe(true);
        expect(target.querySelector("button")?.type).toBe("submit");
        await expect(swapFragment("/fragment", target)).resolves.toBe(true);
        expect(target.querySelector("button")?.hasAttribute("type")).toBe(false);
    });

    it("can force same-tag replacement", async () => {
        const target = document.createElement("div");
        target.id = "target";
        target.textContent = "before";
        document.body.append(target);
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response('<div id="target">after</div>')));

        await expect(swapFragment("/fragment", target, { patch: false })).resolves.toBe(true);
        expect(document.querySelector("#target")).not.toBe(target);
        expect(target.isConnected).toBe(false);
        expect(document.querySelector("#target")?.textContent).toBe("after");
    });
});
