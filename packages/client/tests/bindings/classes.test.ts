import { createComponent, TestReactiveComponent } from "@tests/utils/test-helpers";
import { describe, expect, it } from "vitest";

describe("ReactiveComponent Class and Style Bindings", () => {
    describe("Class Bindings", () => {
        class ClassBindingComponent extends TestReactiveComponent {
            activeClass!: { toggle: string };
            themeClass!: { add: string; remove?: string };
            classConfig!: { add: string; remove: string };
            toggleClasses!: { toggle: string };

            constructor() {
                super();
                this.testSetState("activeClass", { toggle: "active" });
                this.testSetState("themeClass", { add: "light" });
                this.testSetState("classConfig", { add: "highlight", remove: "hidden" });
                this.testSetState("toggleClasses", { toggle: "class1" });
            }
        }
        customElements.define("test-class-binding", ClassBindingComponent);

        it("should bind boolean class to state", () => {
            const { component, cleanup } = createComponent<ClassBindingComponent>(
                "test-class-binding",
                {},
                '<div $bind-class="activeClass">Element</div>',
            );
            const div = component.querySelector("div") as HTMLDivElement;

            // Initially has active class (toggle operation adds it)
            expect(div.classList.contains("active")).toBe(true);

            // Toggle again, should remove active class
            component.activeClass = { toggle: "active" };
            expect(div.classList.contains("active")).toBe(false);

            // Toggle again, should add active class back
            component.activeClass = { toggle: "active" };
            expect(div.classList.contains("active")).toBe(true);

            cleanup();
        });

        it("should bind conditional classes based on state value", () => {
            const { component, cleanup } = createComponent<ClassBindingComponent>(
                "test-class-binding",
                {},
                '<div $bind-class="themeClass">Element</div>',
            );
            const div = component.querySelector("div") as HTMLDivElement;

            // Initially "light"
            expect(div.classList.contains("light")).toBe(true);

            // Change to "dark"
            component.themeClass = { add: "dark", remove: "light" };
            expect(div.classList.contains("light")).toBe(false);
            expect(div.classList.contains("dark")).toBe(true);

            cleanup();
        });

        it("should support add/remove class syntax", () => {
            const { component, cleanup } = createComponent<ClassBindingComponent>(
                "test-class-binding",
                {},
                '<div class="base-class" $bind-class="classConfig">Element</div>',
            );
            const div = component.querySelector("div") as HTMLDivElement;

            // Initially: base-class should remain, highlight should be added, hidden should be removed
            expect(div.classList.contains("base-class")).toBe(true);
            expect(div.classList.contains("highlight")).toBe(true);
            expect(div.classList.contains("hidden")).toBe(false);

            // Change config - this applies new operations without undoing previous ones
            component.classConfig = { add: "new-class", remove: "base-class" };
            expect(div.classList.contains("base-class")).toBe(false);
            expect(div.classList.contains("highlight")).toBe(true); // Previous add remains
            expect(div.classList.contains("new-class")).toBe(true);

            cleanup();
        });

        it("should support toggle class syntax", () => {
            const { component, cleanup } = createComponent<ClassBindingComponent>(
                "test-class-binding",
                {},
                '<div $bind-class="toggleClasses">Element</div>',
            );
            const div = component.querySelector("div") as HTMLDivElement;

            // Initially: class1 should be toggled on
            expect(div.classList.contains("class1")).toBe(true);

            // Toggle class1 again - should toggle it off
            component.toggleClasses = { toggle: "class1" };
            expect(div.classList.contains("class1")).toBe(false);

            // Toggle a different class - should add class2
            component.toggleClasses = { toggle: "class2" };
            expect(div.classList.contains("class1")).toBe(false); // Still off
            expect(div.classList.contains("class2")).toBe(true); // Toggled on

            cleanup();
        });

        it("should handle replace operation in $bind-class", () => {
            class BindClassReplaceComponent extends TestReactiveComponent {
                classOps!: object;
                constructor() {
                    super();
                    this.testSetState("classOps", { replace: ["old-class", "new-class"] });
                }
            }
            customElements.define("bind-class-replace-component", BindClassReplaceComponent);
            const { component, cleanup } = createComponent<BindClassReplaceComponent>(
                "bind-class-replace-component",
                {},
                '<div class="initial old-class" $bind-class="classOps">Content</div>',
            );
            const div = component.querySelector("div") as HTMLDivElement;
            expect(div.classList.contains("initial")).toBe(true);
            expect(div.classList.contains("old-class")).toBe(false);
            expect(div.classList.contains("new-class")).toBe(true);
            component.classOps = { replace: ["new-class", "another-class"] };
            expect(div.classList.contains("new-class")).toBe(false);
            expect(div.classList.contains("another-class")).toBe(true);
            cleanup();
        });

        it("should handle replace operation with invalid array in $bind-class", () => {
            class BindClassReplaceInvalidComponent extends TestReactiveComponent {
                classOps!: object;
                constructor() {
                    super();
                    this.testSetState("classOps", { replace: "not-an-array" });
                }
            }
            customElements.define("bind-class-replace-invalid-component", BindClassReplaceInvalidComponent);
            const { component, cleanup } = createComponent<BindClassReplaceInvalidComponent>(
                "bind-class-replace-invalid-component",
                {},
                '<div class="initial old-class" $bind-class="classOps">Content</div>',
            );
            const div = component.querySelector("div") as HTMLDivElement;
            // With non-array replace value, no replacement should occur
            expect(div.classList.contains("initial")).toBe(true);
            expect(div.classList.contains("old-class")).toBe(true);
            // Test with array of wrong length (not 2)
            component.classOps = { replace: ["only-one-element"] };
            expect(div.classList.contains("initial")).toBe(true);
            expect(div.classList.contains("old-class")).toBe(true);
            cleanup();
        });

        it("should handle toggle operation with object value in $bind-class", () => {
            class BindClassToggleObjectComponent extends TestReactiveComponent {
                classOps!: object;
                constructor() {
                    super();
                    this.testSetState("classOps", { toggle: { key: "conditional-class", value: true } });
                }
            }
            customElements.define("bind-class-toggle-object-component", BindClassToggleObjectComponent);
            const { component, cleanup } = createComponent<BindClassToggleObjectComponent>(
                "bind-class-toggle-object-component",
                {},
                '<div class="initial" $bind-class="classOps">Content</div>',
            );
            const div = component.querySelector("div") as HTMLDivElement;
            expect(div.classList.contains("conditional-class")).toBe(true);
            component.classOps = { toggle: { key: "conditional-class", value: false } };
            expect(div.classList.contains("conditional-class")).toBe(false);
            component.classOps = { toggle: { key: "conditional-class", value: true } };
            expect(div.classList.contains("conditional-class")).toBe(true);
            cleanup();
        });

        it("should handle toggle operation with invalid value type in $bind-class", () => {
            class BindClassToggleInvalidComponent extends TestReactiveComponent {
                classOps!: object;
                constructor() {
                    super();
                    this.testSetState("classOps", { toggle: 123 });
                }
            }
            customElements.define("bind-class-toggle-invalid-component", BindClassToggleInvalidComponent);
            const { component, cleanup } = createComponent<BindClassToggleInvalidComponent>(
                "bind-class-toggle-invalid-component",
                {},
                '<div class="initial" $bind-class="classOps">Content</div>',
            );
            const div = component.querySelector("div") as HTMLDivElement;
            // With invalid toggle value (neither string nor object), no toggle should occur
            expect(div.classList.contains("initial")).toBe(true);
            // Test with boolean value
            component.classOps = { toggle: true };
            expect(div.classList.contains("initial")).toBe(true);
            cleanup();
        });

        it("should remove class attribute when classList becomes empty", () => {
            class BindClassEmptyComponent extends TestReactiveComponent {
                classOps!: object;
                constructor() {
                    super();
                    this.testSetState("classOps", { remove: "initial-class" });
                }
            }
            customElements.define("bind-class-empty-component", BindClassEmptyComponent);
            const { component, cleanup } = createComponent<BindClassEmptyComponent>(
                "bind-class-empty-component",
                {},
                '<div class="initial-class" $bind-class="classOps">Content</div>',
            );
            const div = component.querySelector("div") as HTMLDivElement;
            expect(div.hasAttribute("class")).toBe(false);
            cleanup();
        });

        it("should handle non-object values gracefully", () => {
            class BindClassInvalidTypeComponent extends TestReactiveComponent {
                classOps!: number;
                constructor() {
                    super();
                    this.testSetState("classOps", "not-an-object");
                }
            }
            customElements.define("bind-class-invalid-type-component", BindClassInvalidTypeComponent);
            const { component, cleanup } = createComponent<BindClassInvalidTypeComponent>(
                "bind-class-invalid-type-component",
                {},
                '<div class="initial-class" $bind-class="classOps">Content</div>',
            );
            const div = component.querySelector("div") as HTMLDivElement;
            expect(div.classList.contains("initial-class")).toBe(true);
            expect(div.classList.length).toBe(1);
            component.classOps = 123;
            expect(div.classList.contains("initial-class")).toBe(true);
            expect(div.classList.length).toBe(1);
            cleanup();
        });

        it("should handle array values in add/remove class syntax", () => {
            class BindClassArrayComponent extends TestReactiveComponent {
                classOps!: object;
                constructor() {
                    super();
                    this.testSetState("classOps", { add: ["class1", "class2", "class3"] });
                }
            }
            customElements.define("bind-class-array-component", BindClassArrayComponent);
            const { component, cleanup } = createComponent<BindClassArrayComponent>(
                "bind-class-array-component",
                {},
                '<div $bind-class="classOps">Content</div>',
            );
            const div = component.querySelector("div") as HTMLDivElement;
            expect(div.classList.contains("class1")).toBe(true);
            expect(div.classList.contains("class2")).toBe(true);
            expect(div.classList.contains("class3")).toBe(true);
            component.classOps = { remove: ["class1", "class2", "class3"] };
            expect(div.classList.contains("class1")).toBe(false);
            expect(div.classList.contains("class2")).toBe(false);
            expect(div.classList.contains("class3")).toBe(false);
            cleanup();
        });
    });
});
