import { createComponent, TestReactiveComponent } from "@tests/utils/test-helpers";
import { describe, expect, it } from "vitest";

describe("ReactiveComponent Disabled Binding", () => {
    class DisabledBindingComponent extends TestReactiveComponent {
        isDisabled!: boolean;

        constructor() {
            super();
            this.testSetState("isDisabled", false);
        }
    }
    customElements.define("test-disabled-binding", DisabledBindingComponent);

    it.each([
        {
            name: "button",
            markup: '<button $bind-disabled="isDisabled">Button</button>',
            selector: "button",
        },
        {
            name: "text input",
            markup: '<input $bind-disabled="isDisabled" type="text" />',
            selector: "input",
        },
    ])("should bind disabled property for $name elements", ({ markup, selector }) => {
        const { component, cleanup } = createComponent<DisabledBindingComponent>("test-disabled-binding", {}, markup);

        const element = component.querySelector(selector) as HTMLButtonElement | HTMLInputElement;
        expect(element.disabled).toBe(false);

        component.isDisabled = true;

        expect(element.disabled).toBe(true);
        expect(element.hasAttribute("disabled")).toBe(true);

        cleanup();
    });
});
