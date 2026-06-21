import { captureConsoleOutput, createComponent, TestReactiveComponent } from "@tests/utils/test-helpers";
import { describe, expect, it } from "vitest";

describe("ReactiveComponent Attribute Bindings", () => {
    describe("$bind-attr Handling", () => {
        class BindAttrObjectComponent extends TestReactiveComponent {
            attrs!: object;
            constructor() {
                super();
                this.testSetState("attrs", { "data-id": "123", "aria-label": "Test Element" });
            }
            updateAttributes(newAttrs: object) {
                this.attrs = newAttrs;
            }
        }
        customElements.define("bind-attr-object-component", BindAttrObjectComponent);

        it("should bind and update multiple attributes from an object", () => {
            const { component, cleanup } = createComponent<BindAttrObjectComponent>(
                "bind-attr-object-component",
                {},
                '<div $bind-attr="attrs">Content</div>',
            );
            const div = component.querySelector("div") as HTMLDivElement;
            expect(div.hasAttribute("$bind-attr")).toBe(false);
            expect(div.getAttribute("data-id")).toBe("123");
            expect(div.getAttribute("aria-label")).toBe("Test Element");
            component.attrs = { "data-id": "456", role: "button" };
            expect(div.getAttribute("data-id")).toBe("456");
            expect(div.hasAttribute("aria-label")).toBe(true);
            expect(div.getAttribute("role")).toBe("button");
            cleanup();
        });

        class BindAttrRemoveComponent extends TestReactiveComponent {
            attrs!: object;
            constructor() {
                super();
                this.testSetState("attrs", { "data-active": "true", disabled: true });
            }
        }
        customElements.define("bind-attr-remove-component", BindAttrRemoveComponent);

        it("should remove attributes when values are null or false", () => {
            const { component, cleanup } = createComponent<BindAttrRemoveComponent>(
                "bind-attr-remove-component",
                {},
                '<button $bind-attr="attrs">Action</button>',
            );
            const button = component.querySelector("button") as HTMLButtonElement;
            expect(button.getAttribute("data-active")).toBe("true");
            expect(button.getAttribute("disabled")).toBe("");
            expect(button.hasAttribute("disabled")).toBe(true);
            component.attrs = { "data-active": null, disabled: false };
            expect(button.hasAttribute("data-active")).toBe(false);
            expect(button.hasAttribute("disabled")).toBe(false);
            cleanup();
        });

        class BindAttrStringRemoveComponent extends TestReactiveComponent {
            attrToRemove!: string | null;
            constructor() {
                super();
                this.testSetState("attrToRemove", null);
            }
        }
        customElements.define("bind-attr-string-remove-component", BindAttrStringRemoveComponent);

        it("should remove single attribute when bound to string", () => {
            const { component, cleanup } = createComponent<BindAttrStringRemoveComponent>(
                "bind-attr-string-remove-component",
                {},
                '<div data-to-remove="exists" $bind-attr="attrToRemove">Content</div>',
            );
            const div = component.querySelector("div") as HTMLDivElement;
            expect(div.hasAttribute("data-to-remove")).toBe(true);
            component.attrToRemove = "data-to-remove";
            expect(div.hasAttribute("data-to-remove")).toBe(false);
            cleanup();
        });

        class AttributeBindingComponent extends TestReactiveComponent {
            inputAttrs!: object;
            divAttrs!: object;

            constructor() {
                super();
                this.testSetState("inputAttrs", { placeholder: "Enter value..." });
                this.testSetState("divAttrs", { "data-test": "initial-value" });
            }
        }
        customElements.define("test-attr-binding", AttributeBindingComponent);

        it("should bind string attributes using $bind-attr", () => {
            const { component, cleanup } = createComponent<AttributeBindingComponent>(
                "test-attr-binding",
                {},
                '<input $bind-attr="inputAttrs" />',
            );

            const input = component.querySelector("input") as HTMLInputElement;

            expect(input.getAttribute("placeholder")).toBe("Enter value...");

            component.inputAttrs = { placeholder: "New placeholder" };

            expect(input.getAttribute("placeholder")).toBe("New placeholder");

            cleanup();
        });

        it("should handle null and undefined attribute values with $bind-attr", () => {
            class NullAttrComponent extends TestReactiveComponent {
                attrs!: object;

                constructor() {
                    super();
                    this.testSetState("attrs", {
                        "data-null": "has-value",
                        "data-undefined": "has-value",
                        "data-empty": "has-value",
                    });
                }
            }
            customElements.define("test-null-attr", NullAttrComponent);

            const { component, cleanup } = createComponent<NullAttrComponent>("test-null-attr", {}, '<div $bind-attr="attrs"></div>');

            const div = component.querySelector("div") as HTMLDivElement;

            expect(div.getAttribute("data-null")).toBe("has-value");
            expect(div.getAttribute("data-undefined")).toBe("has-value");
            expect(div.getAttribute("data-empty")).toBe("has-value");

            component.attrs = {
                "data-null": null,
                "data-undefined": undefined,
                "data-empty": "",
            };

            expect(div.hasAttribute("data-null")).toBe(false);
            expect(div.hasAttribute("data-undefined")).toBe(false);
            expect(div.hasAttribute("data-empty")).toBe(false);

            cleanup();
        });
    });

    describe("Attribute Processing Error Cases", () => {
        class InvalidStateCharComponent extends TestReactiveComponent {}
        customElements.define("invalid-state-char-component", InvalidStateCharComponent);

        it("should log error for invalid characters in $state value", () => {
            const { errors, restore } = captureConsoleOutput();
            const { cleanup } = createComponent<InvalidStateCharComponent>(
                "invalid-state-char-component",
                {},
                '<div $state="my-state!">Initial</div>',
            );
            expect(
                errors.some((e) => e.includes('Invalid binding $state value "my-state!": must only contain alphanumeric characters')),
            ).toBe(true);
            restore();
            cleanup();
        });

        class InvalidBindCharComponent extends TestReactiveComponent {
            constructor() {
                super();
                this.testSetState("my_state", "test");
            }
        }
        customElements.define("invalid-bind-char-component", InvalidBindCharComponent);

        it("should log error for invalid characters in $bind-* value", () => {
            const { errors, restore } = captureConsoleOutput();
            const { cleanup } = createComponent<InvalidBindCharComponent>(
                "invalid-bind-char-component",
                {},
                '<input $bind-value="my-state!" type="text">',
            );
            expect(
                errors.some((e) => e.includes('Invalid binding $bind-value value "my-state!": must only contain alphanumeric characters')),
            ).toBe(true);
            restore();
            cleanup();
        });

        class InvalidBindTypeComponent extends TestReactiveComponent {
            message!: string;
            constructor() {
                super();
                this.testSetState("message", "test");
            }
        }
        customElements.define("invalid-bind-type-component", InvalidBindTypeComponent);

        it("should log error for invalid characters in binding type", () => {
            const { errors, restore } = captureConsoleOutput();
            const { cleanup } = createComponent<InvalidBindTypeComponent>(
                "invalid-bind-type-component",
                {},
                '<div $bind-text@content="message">Test</div>',
            );
            expect(
                errors.some((e) =>
                    e.includes(
                        'Invalid binding type "text@content" in attribute "$bind-text@content": must only contain alphanumeric characters or hyphens',
                    ),
                ),
            ).toBe(true);
            restore();
            cleanup();
        });
    });
});
