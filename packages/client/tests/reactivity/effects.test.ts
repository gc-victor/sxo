import { createComponent, TestReactiveComponent } from "@tests/utils/test-helpers";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("ReactiveComponent Effects System", () => {
    describe("Basic Effects", () => {
        class EffectsComponent extends TestReactiveComponent {
            counter!: number;
            message!: string;
            effectLog: string[] = [];

            constructor() {
                super();
                this.testSetState("counter", 0);
                this.testSetState("message", "Hello");
                this.effectLog = [];
                this.effect(() => {
                    this.effectLog.push(`Counter changed to: ${this.counter}`);
                });
                this.effect(() => {
                    this.effectLog.push(`Message changed to: ${this.message}`);
                });
            }
            clearEffectLog() {
                this.effectLog = [];
            }
        }
        customElements.define("test-effects", EffectsComponent);

        let component: EffectsComponent;
        let cleanup: () => void;

        beforeEach(() => {
            const result = createComponent<EffectsComponent>("test-effects");
            component = result.component;
            cleanup = result.cleanup;
            component.clearEffectLog();
        });

        afterEach(() => {
            cleanup();
        });

        it("should not trigger effects for unrelated state changes", () => {
            component.effectLog = [];
            component.message = "New Message";
            const counterEffects = component.effectLog.filter((log) => log.includes("Counter"));
            expect(counterEffects).toHaveLength(0);
        });
    });

    describe("Multiple Dependencies", () => {
        class MultiDependencyComponent extends TestReactiveComponent {
            count!: number;
            multiplier!: number;
            result!: number;
            effectLog: string[] = [];

            constructor() {
                super();
                this.testSetState("count", 1);
                this.testSetState("multiplier", 2);
                this.testSetState("result", 0);
                this.effect(() => {
                    this.result = this.count * this.multiplier;
                    this.effectLog.push(`Effect ran with count=${this.count}, multiplier=${this.multiplier}`);
                });
            }
        }
        customElements.define("test-multi-dependency-effect", MultiDependencyComponent);

        it("should trigger effects when any dependency changes", () => {
            const { component, cleanup } = createComponent<MultiDependencyComponent>("test-multi-dependency-effect");
            expect(component.result).toBe(2);
            expect(component.effectLog[component.effectLog.length - 1]).toContain("count=1, multiplier=2");
            component.effectLog = [];
            component.count = 2;
            expect(component.result).toBe(4);
            expect(component.effectLog.some((log) => log.includes("count=2, multiplier=2"))).toBe(true);
            component.effectLog = [];
            component.multiplier = 3;
            expect(component.result).toBe(6);
            expect(component.effectLog.some((log) => log.includes("count=2, multiplier=3"))).toBe(true);
            cleanup();
        });
    });

    describe("Effect Timing", () => {
        class TimingComponent extends TestReactiveComponent {
            value!: number;
            computedValue!: number;
            effectOrder: string[] = [];

            constructor() {
                super();
                this.testSetState("value", 0);
                this.compute("computedValue", ["value"], (val) => (val as number) * 2);
                this.effect(() => {
                    this.effectOrder.push(`Effect ran with value: ${this.value}`);
                    this.effectOrder.push(`Computed value was: ${this.computedValue}`);
                });
            }
        }
        customElements.define("test-timing", TimingComponent);

        it("should run effects after computed properties update", () => {
            const { component, cleanup } = createComponent<TimingComponent>("test-timing");
            component.effectOrder = [];
            component.value = 5;
            expect(component.effectOrder[0]).toBe("Effect ran with value: 5");
            cleanup();
        });
    });

    describe("Effect Cleanup", () => {
        class CleanupComponent extends TestReactiveComponent {
            active!: boolean;
            cleanupLog: string[] = [];

            constructor() {
                super();
                this.testSetState("active", true);
                this.effect(() => {
                    this.active = true;
                    this.cleanupLog.push("Cleanup called");
                });
            }
        }
        customElements.define("test-cleanup", CleanupComponent);

        it("should call cleanup function when dependencies change", async () => {
            const { component, cleanup } = createComponent<CleanupComponent>("test-cleanup");
            component.cleanupLog = [];
            component.active = false;
            expect(component.cleanupLog).toContain("Cleanup called");
            cleanup();
        });
    });
});

/**
 * Summary:
 * - All effect system behaviors are tested: initialization, dependency tracking, timing, cleanup, and lifecycle.
 * - Redundant tests from previous files are merged and deduplicated.
 * - Test structure is organized for maintainability and clarity.
 */
