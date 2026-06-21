import { createComponent, TestReactiveComponent } from "@tests/utils/test-helpers";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("ReactiveComponent $bind-text (Text Content Binding)", () => {
    class TextBindingComponent extends TestReactiveComponent {
        message!: string;

        constructor() {
            super();
            this.testSetState("message", "Initial message");
        }
    }
    customElements.define("test-text-binding", TextBindingComponent);

    let component: TextBindingComponent;
    let cleanup: () => void;

    beforeEach(() => {
        const result = createComponent<TextBindingComponent>(
            "test-text-binding",
            {},
            '<div><p $bind-text="message">Placeholder</p><span $bind-text="message">Placeholder</span></div>',
        );
        component = result.component;
        cleanup = result.cleanup;
    });

    afterEach(() => {
        cleanup();
    });

    it("should bind text content to state", () => {
        const paragraph = component.querySelector("p");
        expect(paragraph?.textContent).toBe("Initial message");

        component.message = "Updated message";
        expect(paragraph?.textContent).toBe("Updated message");
    });
});
