import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createComponent, TestReactiveComponent } from "../utils/test-helpers";

describe("ReactiveComponent Computed Properties", () => {
    describe("Basic Computed Properties", () => {
        class ComputedTestComponent extends TestReactiveComponent {
            firstName!: string;
            lastName!: string;
            fullName!: string;
            displayName!: string;

            constructor() {
                super();
                this.testSetState("firstName", "John");
                this.testSetState("lastName", "Doe");
                this.compute("fullName", ["firstName", "lastName"], (first, last) => `${first} ${last}`);
                this.compute("displayName", ["fullName"], (full) => `Display: ${full}`);
            }
            getComputedFullName(): string {
                return this.getState("fullName") as string;
            }
            getComputedDisplayName(): string {
                return this.getState("displayName") as string;
            }
        }
        customElements.define("test-computed-component", ComputedTestComponent);

        let component: ComputedTestComponent;
        let cleanup: () => void;

        beforeEach(() => {
            const result = createComponent<ComputedTestComponent>("test-computed-component");
            component = result.component;
            cleanup = result.cleanup;
        });

        afterEach(() => {
            cleanup();
        });

        it("should update chained computed properties", () => {
            component.firstName = "Alice";
            expect(component.getComputedFullName()).toBe("Alice Doe");
            expect(component.getComputedDisplayName()).toBe("Display: Alice Doe");
        });
    });

    describe("Multiple Dependencies", () => {
        class MultiDependencyComponent extends TestReactiveComponent {
            greeting!: string;
            salutation!: string;
            firstName!: string;
            lastName!: string;

            constructor() {
                super();
                this.testSetState("greeting", "Hello");
                this.testSetState("salutation", "Mr.");
                this.testSetState("firstName", "John");
                this.testSetState("lastName", "Doe");
                this.compute(
                    "formalName",
                    ["greeting", "salutation", "firstName", "lastName"],
                    (greeting, salutation, first, last) => `${greeting}, ${salutation} ${first} ${last}`,
                );
            }
            getComputedFormalName(): string {
                return this.getState("formalName") as string;
            }
        }
        customElements.define("test-multi-dependency-computed", MultiDependencyComponent);

        it("should handle computed properties with multiple dependencies", () => {
            const { component, cleanup } = createComponent<MultiDependencyComponent>("test-multi-dependency-computed");
            expect(component.getComputedFormalName()).toBe("Hello, Mr. John Doe");
            component.greeting = "Greetings";
            expect(component.getComputedFormalName()).toBe("Greetings, Mr. John Doe");
            component.salutation = "Dr.";
            expect(component.getComputedFormalName()).toBe("Greetings, Dr. John Doe");
            cleanup();
        });
    });

    describe("Compute Method Implementation", () => {
        class ComputeImplementationComponent extends TestReactiveComponent {
            value1!: number;
            value2!: number;
            value3!: string;
            computedValue!: number;
            computedString!: string;
            updateTracker: string[] = [];

            constructor() {
                super();
                this.testSetState("value1", 10);
                this.testSetState("value2", 20);
                this.testSetState("value3", "test");
                this.updateTracker = [];
                this.compute("computedValue", ["value1", "value2"], (v1: number, v2: number) => {
                    this.updateTracker.push(`Computed: ${v1} + ${v2}`);
                    return v1 + v2;
                });
                this.compute("computedString", ["value3", "computedValue"], (str: string, num: number) => {
                    this.updateTracker.push(`String computed: ${str}-${num}`);
                    return `${str}-${num}`;
                });
                Object.defineProperty(this, "computedValue", {
                    get: () => this.testGetState("computedValue"),
                });
                Object.defineProperty(this, "computedString", {
                    get: () => this.testGetState("computedString"),
                });
            }
            resetTracker() {
                this.updateTracker = [];
            }
            updateValues(v1: number, v2: number) {
                this.value1 = v1;
                this.value2 = v2;
            }
        }
        customElements.define("test-compute-implementation", ComputeImplementationComponent);

        let component: ComputeImplementationComponent;
        let cleanup: () => void;

        beforeEach(() => {
            const result = createComponent<ComputeImplementationComponent>("test-compute-implementation");
            component = result.component;
            cleanup = result.cleanup;
        });

        afterEach(() => {
            cleanup();
        });

        it("should handle redefinition of computed properties", () => {
            const consoleWarnSpy = vi.spyOn(console, "warn");
            component.testCompute("computedValue", ["value1"], (v: number) => v * 2);
            expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Computed property "computedValue" is being redefined'));
            consoleWarnSpy.mockRestore();
        });
    });

    describe("Compute with Bindings", () => {
        class ComputeWithBindingsComponent extends TestReactiveComponent {
            count!: number;
            multiplier!: number;
            result!: number;
            displayValue!: string;

            constructor() {
                super();
                this.testSetState("count", 5);
                this.testSetState("multiplier", 2);
                this.compute("result", ["count", "multiplier"], (c: number, m: number) => c * m);
                this.compute("displayValue", ["result"], (r) => `Result: ${r}`);
                Object.defineProperty(this, "result", {
                    get: () => this.testGetState("result"),
                });
                Object.defineProperty(this, "displayValue", {
                    get: () => this.testGetState("displayValue"),
                });
            }
        }
        customElements.define("test-compute-with-bindings", ComputeWithBindingsComponent);

        it("should update DOM bindings when computed values change", () => {
            const { component, cleanup } = createComponent<ComputeWithBindingsComponent>(
                "test-compute-with-bindings",
                {},
                `<div>
          <span id="result" $bind-text="result"></span>
          <p id="display" $bind-text="displayValue"></p>
        </div>`,
            );
            const resultElement = component.querySelector("#result") as HTMLElement;
            const displayElement = component.querySelector("#display") as HTMLElement;
            expect(resultElement.textContent).toBe("10");
            expect(displayElement.textContent).toBe("Result: 10");
            component.count = 7;

            expect(component.result).toBe(14);
            expect(component.displayValue).toBe("Result: 14");
            expect(resultElement.textContent).toBe("14");
            expect(displayElement.textContent).toBe("Result: 14");
            cleanup();
        });
    });

    describe("Edge Cases", () => {
        class EdgeCaseComponent extends TestReactiveComponent {
            emptyDep!: string;
            nullValue!: string | null;
            existingProp!: string;

            constructor() {
                super();
                this.testSetState("nullValue", null);
                Object.defineProperty(this, "existingProp", {
                    get: () => "Property already defined",
                    set: () => {},
                });
                this.compute("emptyDep", ["nonExistentKey"], () => "Computed with missing dependency");
                this.compute("existingProp", ["nullValue"], () => "This should not be set");
            }
            getComputedEmptyDep(): string {
                return this.getState("emptyDep") as string;
            }
            getNullValue(): string | null {
                return this.getState("nullValue") as string | null;
            }
            getExistingProp(): string {
                return this.existingProp;
            }
        }
        customElements.define("test-edge-case", EdgeCaseComponent);

        it("should handle computed properties with missing dependencies", () => {
            const { component, cleanup } = createComponent<EdgeCaseComponent>("test-edge-case");
            expect(component.getComputedEmptyDep()).toBe("Computed with missing dependency");
            cleanup();
        });

        it("should handle computed properties with null state values", () => {
            const { component, cleanup } = createComponent<EdgeCaseComponent>("test-edge-case");
            expect(component.getNullValue()).toBeNull();
            cleanup();
        });

        it("should not override existing properties with compute", () => {
            const { component, cleanup } = createComponent<EdgeCaseComponent>("test-edge-case");
            expect(component.getExistingProp()).toBe("Property already defined");
            component.nullValue = "Updated value";
            expect(component.getExistingProp()).toBe("Property already defined");
            cleanup();
        });
    });

    describe("Computed Property Value Coercion", () => {
        class ComputeCoercionComponent extends TestReactiveComponent {
            numericValue!: number;
            booleanValue!: boolean;
            stringValue!: string;
            computedNumber!: number;
            computedBoolean!: boolean;
            computedString!: string;

            constructor() {
                super();
                this.testSetState("numericValue", 42);
                this.testSetState("booleanValue", true);
                this.testSetState("stringValue", "hello");
                this.compute("computedNumber", ["stringValue"], (str) => `${str}123`);
                this.compute("computedBoolean", ["numericValue"], (num) => num === 0);
                this.compute("computedString", ["booleanValue", "numericValue"], (bool, num) => ({ status: bool, value: num }));
                Object.defineProperty(this, "computedNumber", {
                    get: () => this.testGetState("computedNumber"),
                });
                Object.defineProperty(this, "computedBoolean", {
                    get: () => this.testGetState("computedBoolean"),
                });
                Object.defineProperty(this, "computedString", {
                    get: () => this.testGetState("computedString"),
                });
            }
        }
        customElements.define("test-compute-coercion", ComputeCoercionComponent);

        it("should coerce computed values to expected types", () => {
            const { component, cleanup } = createComponent<ComputeCoercionComponent>("test-compute-coercion");
            expect(typeof component.computedNumber).toBe("string");
            expect(component.computedNumber).toBe("hello123");
            expect(component.computedBoolean).toBe(false);
            expect(typeof component.computedString).toBe("object");
            expect(component.computedString).toHaveProperty("status");
            expect(component.computedString).toHaveProperty("value");
            cleanup();
        });
    });

    describe("Lifecycle: Effect and Computed Property Initialization", () => {
        class EffectLifecycleComponent extends TestReactiveComponent {
            counter!: number;
            doubleCounter!: number;
            effectCalled = 0;
            computedUpdated = 0;

            constructor() {
                super();
                this.testSetState("counter", 0);
                this.effectCalled = 0;
                this.computedUpdated = 0;
                this.compute("doubleCounter", ["counter"], (value) => {
                    this.computedUpdated++;
                    return (value as number) * 2;
                });
                this.effect(() => {
                    this.effectCalled++;
                    return `Effect saw counter=${this.counter} doubleCounter=${this.getState("doubleCounter")}`;
                });
            }
            incrementCounter() {
                this.counter++;
            }
            getEffectCallCount() {
                return this.effectCalled;
            }
            getComputedUpdateCount() {
                return this.computedUpdated;
            }
        }
        customElements.define("test-effect-lifecycle", EffectLifecycleComponent);

        it("should initialize effects and computed properties correctly", () => {
            const { component, cleanup } = createComponent<EffectLifecycleComponent>("test-effect-lifecycle");
            expect(component.getEffectCallCount()).toBe(1);
            expect(component.testGetState("doubleCounter")).toBe(0);
            expect(component.getComputedUpdateCount()).toBe(1);
            component.incrementCounter();
            expect(component.counter).toBe(1);
            expect(component.testGetState("doubleCounter")).toBe(2);
            expect(component.getEffectCallCount()).toBe(2);
            expect(component.getComputedUpdateCount()).toBe(2);
            cleanup();
        });
    });
});
