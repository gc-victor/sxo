import { createComponent, TestReactiveComponent } from "@tests/utils/test-helpers";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("ReactiveComponent State Management (Core)", () => {
    describe("State Initialization and Updates", () => {
        class TestCounter extends TestReactiveComponent {
            count!: number;
            doubleCount!: number;

            constructor() {
                super();
                this.testSetState("count", 0);
            }

            increment() {
                this.count++;
            }

            decrement() {
                this.count--;
            }
        }

        customElements.define("test-local-counter", TestCounter);

        let component: TestCounter;
        let cleanup: () => void;

        beforeEach(() => {
            const result = createComponent<TestCounter>("test-local-counter");
            component = result.component;
            cleanup = result.cleanup;
        });

        class StateInitNumberComponent extends TestReactiveComponent {
            count!: number;
            increment() {
                this.count++;
            }
            decrement() {
                this.count--;
            }
        }
        customElements.define("state-init-number-component", StateInitNumberComponent);

        it("should coerce string number to number and support increment/decrement", () => {
            const { component, cleanup } = createComponent<StateInitNumberComponent>(
                "state-init-number-component",
                {},
                '<span $state="count">42</span>',
            );

            expect(typeof component.count).toBe("number");
            expect(component.count).toBe(42);

            component.increment();
            expect(component.count).toBe(43);

            component.decrement();
            expect(component.count).toBe(42);

            cleanup();
        });

        describe("State Value Coercion", () => {
            class StateInitBooleanComponent extends TestReactiveComponent {
                isActive!: boolean;
            }
            customElements.define("state-init-boolean-component", StateInitBooleanComponent);

            it("should initialize boolean state from text content", () => {
                const { component: trueComponent, cleanup: cleanupTrue } = createComponent<StateInitBooleanComponent>(
                    "state-init-boolean-component",
                    {},
                    '<span $state="isActive">true</span>',
                );

                expect(trueComponent.isActive).toBe(true);
                expect(typeof trueComponent.isActive).toBe("boolean");

                const { component: falseComponent, cleanup: cleanupFalse } = createComponent<StateInitBooleanComponent>(
                    "state-init-boolean-component",
                    {},
                    '<span $state="isActive">false</span>',
                );

                expect(falseComponent.isActive).toBe(false);
                expect(typeof falseComponent.isActive).toBe("boolean");

                cleanupTrue();
                cleanupFalse();
            });

            class StateInitObjectComponent extends TestReactiveComponent {
                config!: { theme: string; count: number };
            }
            customElements.define("state-init-object-component", StateInitObjectComponent);

            it("should initialize object state from JSON text content", () => {
                const { component, cleanup } = createComponent<StateInitObjectComponent>(
                    "state-init-object-component",
                    {},
                    '<div $state="config">{"theme": "dark", "count": 10}</div>',
                );

                expect(typeof component.config).toBe("object");
                expect(component.config.theme).toBe("dark");
                expect(component.config.count).toBe(10);

                cleanup();
            });
        });

        afterEach(() => {
            cleanup();
        });

        it("should update state through methods", async () => {
            component.increment();
            expect(component.count).toBe(1);

            component.decrement();
            expect(component.count).toBe(0);
        });
    });

    describe("State Property Definition", () => {
        class PropertyComponent extends TestReactiveComponent {
            count!: number;
            message!: string;
            isActive!: boolean;

            constructor() {
                super();
                this.testSetState("count", 0);
                this.testSetState("message", "Hello");
                this.testSetState("isActive", false);
            }
        }
        customElements.define("test-property-component", PropertyComponent);

        let component: PropertyComponent;
        let cleanup: () => void;

        beforeEach(() => {
            const result = createComponent<PropertyComponent>("test-property-component");
            component = result.component;
            cleanup = result.cleanup;
        });

        afterEach(() => {
            cleanup();
        });

        it("should update state when property is modified", async () => {
            component.count = 42;

            component.message = "Updated";

            component.isActive = true;

            expect(component.count).toBe(42);
            expect(component.message).toBe("Updated");
            expect(component.isActive).toBe(true);
        });
    });

    describe("Complex State Types", () => {
        class ComplexStateComponent extends TestReactiveComponent {
            user!: { name: string; age: number };
            items!: string[];

            constructor() {
                super();
                this.testSetState("user", { name: "John", age: 30 });
                this.testSetState("items", ["apple", "banana"]);
            }

            updateUser(name: string, age: number) {
                this.user = { name, age };
            }

            addItem(item: string) {
                this.items = [...this.items, item];
            }
        }
        customElements.define("test-complex-state", ComplexStateComponent);

        let component: ComplexStateComponent;
        let cleanup: () => void;

        beforeEach(() => {
            const result = createComponent<ComplexStateComponent>("test-complex-state");
            component = result.component;
            cleanup = result.cleanup;
        });

        afterEach(() => {
            cleanup();
        });

        it("should handle object state properly", async () => {
            expect(component.user).toEqual({ name: "John", age: 30 });

            component.updateUser("Alice", 25);

            expect(component.user).toEqual({ name: "Alice", age: 25 });
        });

        it("should handle array state properly", async () => {
            expect(component.items).toEqual(["apple", "banana"]);

            component.addItem("cherry");

            expect(component.items).toEqual(["apple", "banana", "cherry"]);
        });
    });

    describe("State Binding Edge Cases", () => {
        it("should handle state binding on element without $state declaration", () => {
            class StateBindingEdgeCaseComponent extends TestReactiveComponent {
                externalState!: string;
                constructor() {
                    super();
                    this.testSetState("externalState", "initial");
                }
            }
            customElements.define("state-binding-edge-case-component", StateBindingEdgeCaseComponent);

            const { component, cleanup } = createComponent<StateBindingEdgeCaseComponent>(
                "state-binding-edge-case-component",
                {},
                '<span $state="declaredState">Declared</span><span $bind-text="externalState">External</span>',
            );
            const externalSpan = component.querySelectorAll("span")[1] as HTMLSpanElement;
            // The externalState binding should still work even though it wasn't declared via $state
            expect(externalSpan.textContent).toBe("initial");
            component.externalState = "updated";
            expect(externalSpan.textContent).toBe("updated");
            cleanup();
        });

        it("should handle state binding when stateElements does not have the key", () => {
            class StateElementsMissingComponent extends TestReactiveComponent {
                orphanState!: string;
                constructor() {
                    super();
                    this.testSetState("orphanState", "initial");
                }
            }
            customElements.define("state-elements-missing-component", StateElementsMissingComponent);

            const { component, cleanup } = createComponent<StateElementsMissingComponent>(
                "state-elements-missing-component",
                {},
                '<span $state="existingState">Existing</span><span $bind-state="orphanState">Orphan</span>',
            );
            // orphanState is bound via $bind-state but not declared via $state on any element
            // The BINDING_TYPE_STATE handler should not update textContent when stateKey is not in stateElements
            const orphanSpan = component.querySelectorAll("span")[1] as HTMLSpanElement;
            expect(orphanSpan.textContent).toBe("Orphan");
            // Update state - since orphanState is not in stateElements, textContent should not change
            component.orphanState = "updated";
            expect(orphanSpan.textContent).toBe("Orphan");
            cleanup();
        });
    });
});
