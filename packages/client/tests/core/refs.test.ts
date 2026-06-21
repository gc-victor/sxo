import { captureConsoleOutput, createComponent, TestReactiveComponent } from "@tests/utils/test-helpers";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("ReactiveComponent $ref Management (Core)", () => {
    describe("Basic Ref Functionality", () => {
        class RefsComponent extends TestReactiveComponent {
            message!: string;

            constructor() {
                super();
                this.testSetState("message", "Initial message");
            }

            updateRefContent(content: string) {
                if (this.testRefs.output) {
                    const element = this.testRefs.output as HTMLElement;
                    element.textContent = content;
                }
            }
        }
        customElements.define("test-refs-component", RefsComponent);

        let component: RefsComponent;
        let cleanup: () => void;

        beforeEach(() => {
            const result = createComponent<RefsComponent>(
                "test-refs-component",
                {},
                '<div $ref="output">Initial content</div><input $ref="input" type="text" value="test">',
            );
            component = result.component;
            cleanup = result.cleanup;
        });

        afterEach(() => {
            cleanup();
        });

        it("should create refs for elements with $ref attribute", () => {
            expect(component.testRefs.output).toBeDefined();
            expect(component.testRefs.output instanceof HTMLDivElement).toBe(true);
            expect(component.testRefs.input).toBeDefined();
            expect(component.testRefs.input instanceof HTMLInputElement).toBe(true);
        });
    });

    describe("Multiple Refs Management", () => {
        class MultipleRefsComponent extends TestReactiveComponent {
            getRefCount(): number {
                return Object.keys(this.testRefs).length;
            }

            clearRefs(): void {
                for (const key of Object.keys(this.testRefs)) {
                    delete this.testRefs[key];
                }
            }
        }
        customElements.define("test-multiple-refs", MultipleRefsComponent);

        it("should handle multiple refs and duplicate names", () => {
            const { component, cleanup } = createComponent<MultipleRefsComponent>(
                "test-multiple-refs",
                {},
                '<div $ref="a"></div><span $ref="b"></span><input $ref="a">',
            );

            expect(component.testRefs.a instanceof HTMLInputElement).toBe(true);
            expect(component.testRefs.b instanceof HTMLSpanElement).toBe(true);
            expect(component.getRefCount()).toBe(2);

            cleanup();
        });
    });

    describe("Dynamic Refs", () => {
        class DynamicRefsComponent extends TestReactiveComponent {
            dynamic = false;

            toggleDynamic() {
                this.dynamic = !this.dynamic;
                this.renderDynamic();
            }

            renderDynamic() {
                if (this.dynamic) {
                    const el = document.createElement("div");
                    el.setAttribute("$ref", "dyn");
                    el.textContent = "Dynamic";
                    this.appendChild(el);
                } else {
                    const dyn = this.querySelector("div");
                    if (dyn) dyn.remove();
                }
            }
        }
        customElements.define("test-dynamic-refs", DynamicRefsComponent);

        it("should NOT add refs for dynamically added elements (framework does not support dynamic refs)", () => {
            const { component, cleanup } = createComponent<DynamicRefsComponent>("test-dynamic-refs");

            expect(component.testRefs.dyn).toBeUndefined();

            component.toggleDynamic();

            expect(component.testRefs.dyn).toBeUndefined();

            component.toggleDynamic();
            expect(component.testRefs.dyn).toBeUndefined();

            cleanup();
        });
    });

    describe("Error Cases for $ref", () => {
        class InvalidRefCharComponent extends TestReactiveComponent {}
        customElements.define("invalid-ref-char-component", InvalidRefCharComponent);

        it("should log error for invalid characters in $ref value", () => {
            const { errors, restore } = captureConsoleOutput();

            const { cleanup } = createComponent<InvalidRefCharComponent>(
                "invalid-ref-char-component",
                {},
                '<div $ref="my-ref!">Invalid Ref Name</div>',
            );

            expect(errors.some((e) => e.includes('Invalid binding $ref value "my-ref!": must only contain alphanumeric characters'))).toBe(
                true,
            );

            restore();
            cleanup();
        });

        class EmptyRefValueComponent extends TestReactiveComponent {}
        customElements.define("empty-ref-value-component", EmptyRefValueComponent);

        it("should log error for empty $ref value", () => {
            const { errors, restore } = captureConsoleOutput();

            const { cleanup } = createComponent<EmptyRefValueComponent>("empty-ref-value-component", {}, '<div $ref="">Nameless Ref</div>');

            expect(errors.some((e) => e.includes("Invalid binding $ref value"))).toBe(true);

            restore();
            cleanup();
        });
    });
});
