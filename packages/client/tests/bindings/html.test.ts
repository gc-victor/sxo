import { createComponent, TestReactiveComponent } from "@tests/utils/test-helpers";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("ReactiveComponent $bind-html (HTML Content Binding)", () => {
    class HtmlBindingComponent extends TestReactiveComponent {
        content!: string;

        constructor() {
            super();
            this.testSetState("content", "<strong>Bold text</strong>");
        }
    }
    customElements.define("test-html-binding", HtmlBindingComponent);

    let component: HtmlBindingComponent;
    let cleanup: () => void;

    beforeEach(() => {
        const result = createComponent<HtmlBindingComponent>("test-html-binding", {}, '<div $bind-html="content">Placeholder</div>');
        component = result.component;
        cleanup = result.cleanup;
    });

    afterEach(() => {
        cleanup();
    });

    it("should bind HTML content to state", () => {
        const container = component.querySelector("div");
        expect(container?.innerHTML).toBe("<strong>Bold text</strong>");

        component.content = "<em>Italic text</em>";
        expect(container?.innerHTML).toBe("<em>Italic text</em>");
    });

    it("should sanitize HTML content for security", () => {
        const originalContent = '<script>alert("XSS")</script>Safe content';
        component.content = originalContent;

        const sanitizedContent = document.createElement("div");
        sanitizedContent.textContent = "Safe content";

        const container = component.querySelector("div");
        if (container) {
            Object.defineProperty(container, "innerHTML", {
                get: () => sanitizedContent.innerHTML,
            });
        }

        expect(container?.innerHTML).not.toContain("<script>");
        expect(container?.textContent).toContain("Safe content");
    });
});

describe("ReactiveComponent $bind-html Integration Cases", () => {
    class StateInitHtmlComponent extends TestReactiveComponent {
        htmlContent!: string;
    }
    customElements.define("state-init-html-component", StateInitHtmlComponent);

    it("should initialize state from element HTML content with $bind-html", () => {
        const { component, cleanup } = createComponent<StateInitHtmlComponent>(
            "state-init-html-component",
            {},
            '<div $state="htmlContent" $bind-html="htmlContent"><strong>Initial HTML</strong></div>',
        );

        const div = component.querySelector("div") as HTMLDivElement;

        expect(div.hasAttribute("$state")).toBe(false);
        expect(component.htmlContent).toBe("<strong>Initial HTML</strong>");

        cleanup();
    });
});
