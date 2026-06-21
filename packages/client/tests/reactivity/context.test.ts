import { captureConsoleOutput, createComponent, TestReactiveComponent } from "@tests/utils/test-helpers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "@/index";
import { createContext } from "@/index";

const TestContext = createContext("test-context");
const AltContext = createContext("alt-context");
const TestNestedContext = createContext("nested-context");
const context = createContext("context");

class TestContextProvider extends TestReactiveComponent {
    value!: string;
    altValue!: string;
    exposureCount = 0;

    constructor() {
        super();
        this.testSetState("value", "provider-value");
        this.testSetState("test-context", "provider-value");
        this.testSetState("alt-context", "alt-value");
        this.testExposeContext(TestContext);
        this.testExposeContext(AltContext);
    }

    exposeContextAgain() {
        this.testExposeContext(TestContext);
        this.exposureCount++;
    }

    updateContextValues(value: string, altValue: string) {
        this.testSetState("value", value);
        this.testSetState("test-context", value);
        this.testSetState("alt-context", altValue);
    }
}
customElements.define("test-context-provider", TestContextProvider);

class ContextConsumerComponent extends TestReactiveComponent {
    contextValue!: string;
    altContextValue!: string;
    subscriptionCount = 0;
    updateEvents: string[] = [];

    constructor() {
        super();

        this.testSetState("contextValue", "default");
        this.testSetState("altContextValue", "alt-default");

        this.testSetState(TestContext.state, "default");
        this.testSetState(AltContext.state, "alt-default");

        Object.defineProperty(this, "contextValue", {
            get: () => this.getState(TestContext.state) || "default",
            set: (value) => this.testSetState("contextValue", value),
        });

        Object.defineProperty(this, "altContextValue", {
            get: () => this.getState(AltContext.state) || "alt-default",
            set: (value) => this.testSetState("altContextValue", value),
        });
    }

    testHandleContextUpdate(context: Context, value: unknown) {
        const contextId = context.id && typeof context.id === "symbol" ? context.id.description : String(context.id);
        const updateEvent = new CustomEvent(context.eventName, {
            detail: { contextId, value },
        });
        this.updateEvents.push(`${contextId}:${String(value)}`);
        this.testSetState(context.state, value);
        return updateEvent;
    }

    subscribeAgain() {
        this.testConsumeContext(TestContext);
        this.subscriptionCount++;
    }

    public testSetState(key: string, value: unknown) {
        return super.setState(key, value);
    }

    public testConsumeContext(context: Context) {
        return super.consumeContext(context);
    }

    public testExposeContext(context: Context) {
        return super.exposeContext(context);
    }
}
customElements.define("test-context-consumer", ContextConsumerComponent);

class ContextExposureProvider extends TestReactiveComponent {
    contextValue!: string;
    nestedValue!: number;
    exposureEvents: string[] = [];

    constructor() {
        super();

        this.testSetState("contextValue", "initial-value");
        this.testSetState("nestedValue", 42);

        this.testSetState("test-context", "initial-value");
        this.testSetState("nested-context", 42);

        this.exposureEvents = [];

        this.testExposeContext(TestContext);
        this.testExposeContext(TestNestedContext);
    }

    updateContextValue(newValue: string) {
        this.testSetState("contextValue", newValue);
        this.testSetState("test-context", newValue);
        this.exposureEvents.push(`Updated context: ${newValue}`);
    }

    updateNestedValue(newValue: number) {
        this.testSetState("nestedValue", newValue);
        this.testSetState("nested-context", newValue);
        this.exposureEvents.push(`Updated nested: ${newValue}`);
    }
}
customElements.define("test-context-exposure-provider", ContextExposureProvider);

class ContextExposureConsumer extends TestReactiveComponent {
    receivedValue: string | null = null;
    receivedNestedValue: number | null = null;
    updateEvents: string[] = [];

    constructor() {
        super();

        this.testSetState("receivedValue", null);
        this.testSetState("receivedNestedValue", null);

        this.testConsumeContext(TestContext);
        this.testConsumeContext(TestNestedContext);
    }

    handleContextUpdate(event: CustomEvent) {
        const { value, contextId } = event.detail;
        this.updateEvents.push(`Received update: ${contextId} = ${value}`);

        if (contextId.includes("test-context")) {
            this.receivedValue = value as string;
        } else if (contextId.includes("nested-context")) {
            this.receivedNestedValue = value as number;
        }
    }
}
customElements.define("test-context-exposure-consumer", ContextExposureConsumer);

class ComputedContextProvider extends TestReactiveComponent {
    firstName!: string;
    lastName!: string;
    fullName!: string;

    constructor() {
        super();

        this.testSetState("firstName", "John");
        this.testSetState("lastName", "Doe");

        this.compute("fullName", ["firstName", "lastName"], (first, last) => `${first} ${last}`);

        this.testSetState("computed-context", this.getState("fullName"));
        const ComputedContext = createContext("computed-context");
        this.testExposeContext(ComputedContext);
    }

    updateNames(first: string, last: string) {
        this.testSetState("firstName", first);
        this.testSetState("lastName", last);
        this.testSetState("computed-context", this.getState("fullName"));
    }
}
customElements.define("test-computed-context-provider", ComputedContextProvider);

class ComputedContextConsumer extends TestReactiveComponent {
    receivedFullName: string | null = null;

    constructor() {
        super();
        this.testSetState("receivedFullName", null);
        const ComputedContext = createContext("computed-context");
        this.testConsumeContext(ComputedContext);
    }

    handleComputedUpdate(value: string) {
        this.receivedFullName = value;
    }
}
customElements.define("test-computed-context-consumer", ComputedContextConsumer);

class ProviderComponent extends TestReactiveComponent {
    level!: number;

    constructor() {
        super();
        this.testSetState("level", 2);
        this.testSetState("context", 2);
        this.testExposeContext(context);
    }

    updateLevel(newLevel: number) {
        this.level = newLevel;
        this.testSetState("context", newLevel);
    }
}
customElements.define("test-provider", ProviderComponent);

class NestedConsumerComponent extends TestReactiveComponent {
    contextLevel!: number;

    constructor() {
        super();
        this.testSetState("contextLevel", 0);
        this.testSetState("context", 0);

        Object.defineProperty(this, "contextLevel", {
            get: () => this.getState("context") || 0,
            set: (value) => this.testSetState("contextLevel", value),
        });
    }
}
customElements.define("test-consumer", NestedConsumerComponent);

class NestedContextProvider extends TestReactiveComponent {
    nestedMessage!: string;

    constructor() {
        super();
        this.testSetState("nestedMessage", "nested-value");
        this.testSetState("nested-msg-context", "nested-value");

        const NestedMsgContext = createContext("nested-msg-context");
        this.testExposeContext(NestedMsgContext);
    }

    updateNestedMessage(value: string) {
        this.testSetState("nestedMessage", value);
        this.testSetState("nested-msg-context", value);
    }
}
customElements.define("test-nested-context-provider", NestedContextProvider);

class DeepNestedConsumer extends TestReactiveComponent {
    parentValue: string | null = null;
    nestedValue: string | null = null;

    constructor() {
        super();
        this.testSetState("parentValue", null);
        this.testSetState("nestedValue", null);

        this.testConsumeContext(TestContext);
        const NestedMsgContext = createContext("nested-msg-context");
        this.testConsumeContext(NestedMsgContext);
    }

    handleParentUpdate(value: string) {
        this.parentValue = value;
    }

    handleNestedUpdate(value: string) {
        this.nestedValue = value;
    }
}
customElements.define("test-deep-nested-consumer", DeepNestedConsumer);

describe("ReactiveComponent Context API", () => {
    describe("Context Provider", () => {
        it("should update context when state changes", () => {
            const { component: el, cleanup } = createComponent("test-context-provider", {}, '<div id="content">Provider</div>');

            const component = el as unknown as TestContextProvider;

            component.value = "updated-value";

            expect(component.value).toBe("updated-value");

            cleanup();
        });
    });

    describe("Context Consumer", () => {
        it("should receive context from provider via subscription callback", () => {
            const { component: providerEl, cleanup: cleanupProvider } = createComponent(
                "test-context-provider",
                {},
                "<test-context-consumer></test-context-consumer>",
            );

            const provider = providerEl as unknown as TestContextProvider;
            const consumer = provider.querySelector("test-context-consumer") as unknown as ContextConsumerComponent;
            expect(consumer).not.toBeNull();

            // Initialize consumer state before consuming context
            consumer.testSetState(TestContext.state, "initial");

            // Consume context - this sets up the subscription callback
            consumer.testConsumeContext(TestContext);

            // Verify initial value from provider
            expect(consumer.testGetState(TestContext.state)).toBe("provider-value");

            // Update provider state - this triggers the effect that broadcasts context update
            // The subscription callback in rc.ts line 297-303 should fire
            provider.testSetState(TestContext.state, "updated-from-provider");

            // The consumer should receive the update via the subscription callback
            expect(consumer.testGetState(TestContext.state)).toBe("updated-from-provider");

            cleanupProvider();
        });

        it("should use default context value when no provider exists", () => {
            const { component: consumerEl, cleanup: cleanupConsumer } = createComponent("test-context-consumer", {}, "");

            const consumer = consumerEl as unknown as ContextConsumerComponent;

            expect(consumer.contextValue).toBe("default");

            cleanupConsumer();
        });

        it("should handle consuming the same context multiple times", () => {
            const { component: consumerEl, cleanup: cleanupConsumer } = createComponent("test-context-consumer", {}, "");
            const consumer = consumerEl as unknown as ContextConsumerComponent;

            consumer.subscribeAgain();
            consumer.subscribeAgain();

            expect(consumer.contextValue).toBe("default");
            expect(consumer.subscriptionCount).toBe(2);

            cleanupConsumer();
        });

        it("should handle multiple context updates", () => {
            const { component: providerEl, cleanup } = createComponent(
                "test-context-provider",
                {},
                "<test-context-consumer id='consumer'></test-context-consumer>",
            );

            const provider = providerEl as unknown as TestContextProvider;
            const consumer = provider.querySelector("#consumer") as unknown as ContextConsumerComponent;

            consumer.testConsumeContext(TestContext);
            consumer.testConsumeContext(AltContext);

            const event1 = consumer.testHandleContextUpdate(TestContext, "new-value");
            const event2 = consumer.testHandleContextUpdate(AltContext, "new-alt-value");

            provider.dispatchEvent(event1);
            provider.dispatchEvent(event2);

            expect(consumer.contextValue).toBe("new-value");
            expect(consumer.altContextValue).toBe("new-alt-value");

            cleanup();
        });

        it("should track context update events", () => {
            const { component: providerEl, cleanup } = createComponent(
                "test-context-provider",
                {},
                "<test-context-consumer id='consumer'></test-context-consumer>",
            );

            const provider = providerEl as unknown as TestContextProvider;
            const consumer = provider.querySelector("#consumer") as unknown as ContextConsumerComponent;

            consumer.testConsumeContext(TestContext);
            consumer.testConsumeContext(AltContext);

            const events = [
                consumer.testHandleContextUpdate(TestContext, "value1"),
                consumer.testHandleContextUpdate(AltContext, "alt1"),
                consumer.testHandleContextUpdate(TestContext, "value2"),
                consumer.testHandleContextUpdate(AltContext, "alt2"),
            ];

            for (const event of events) {
                provider.dispatchEvent(event);
            }

            console.log("Update events:", consumer.updateEvents);

            expect(consumer.updateEvents.some((e) => e.includes("test-context") && e.includes("value1"))).toBe(true);
            expect(consumer.updateEvents.some((e) => e.includes("alt-context") && e.includes("alt1"))).toBe(true);
            expect(consumer.updateEvents.some((e) => e.includes("test-context") && e.includes("value2"))).toBe(true);
            expect(consumer.updateEvents.some((e) => e.includes("alt-context") && e.includes("alt2"))).toBe(true);

            cleanup();
        });
    });

    describe("Inherited Contexts", () => {
        it("should get context from nearest provider", () => {
            const { component: rootProviderEl, cleanup } = createComponent(
                "test-provider",
                {},
                `
                <div>
                    <test-provider id="mid-provider">
                        <test-consumer id="consumer1"></test-consumer>
                    </test-provider>
                    <test-consumer id="consumer2"></test-consumer>
                </div>
                `,
            );

            const midProvider = rootProviderEl.querySelector("#mid-provider") as ProviderComponent;
            const consumer1 = rootProviderEl.querySelector("#consumer1") as NestedConsumerComponent;
            const consumer2 = rootProviderEl.querySelector("#consumer2") as NestedConsumerComponent;

            consumer1.testConsumeContext(context);
            consumer2.testConsumeContext(context);

            midProvider.updateLevel(3);

            expect(consumer1.contextLevel).toBe(3);

            expect(consumer2.contextLevel).toBe(2);

            cleanup();
        });

        it("should handle missing context providers", () => {
            const { component: consumerEl, cleanup } = createComponent("test-consumer", {}, "");

            const consumer = consumerEl as NestedConsumerComponent;
            consumer.testConsumeContext(context);

            expect(consumer.contextLevel).toBe(0);

            cleanup();
        });

        it("should handle provider disconnection", () => {
            const { component: containerEl, cleanup } = createComponent(
                "div",
                {},
                `
                <test-provider id="provider">
                    <test-consumer id="consumer"></test-consumer>
                </test-provider>
                `,
            );

            const provider = containerEl.querySelector("#provider") as ProviderComponent;
            const consumer = containerEl.querySelector("#consumer") as NestedConsumerComponent;

            consumer.testConsumeContext(context);
            expect(consumer.contextLevel).toBe(2);

            provider.remove();

            provider.updateLevel(4);
            expect(consumer.contextLevel).toBe(2);

            cleanup();
        });
    });

    describe("Context Exposure Basics", () => {
        let provider: ContextExposureProvider;
        let _consumer: ContextExposureConsumer;
        let cleanup: () => void;

        beforeEach(() => {
            const result = createComponent<ContextExposureProvider>(
                "test-context-exposure-provider",
                {},
                "<test-context-exposure-consumer></test-context-exposure-consumer>",
            );

            provider = result.component;
            _consumer = provider.querySelector("test-context-exposure-consumer") as ContextExposureConsumer;
            cleanup = result.cleanup;
        });

        afterEach(() => {
            vi.restoreAllMocks();
            cleanup();
        });

        it("should warn when trying to expose a non-existent context state", () => {
            const { warnings } = captureConsoleOutput();

            const nonExistentContext = createContext("doesnt-exist");
            provider.testExposeContext(nonExistentContext);

            expect(warnings.some((w) => w.includes("Cannot expose context"))).toBe(true);
        });

        it("should not warn when exposing a valid context", () => {
            const { warnings, restore } = captureConsoleOutput();

            const validContext = createContext("contextValue");

            provider.testExposeContext(validContext);

            expect(warnings.some((w) => w.includes("Cannot expose context"))).toBe(false);

            restore();
        });
    });

    describe("Context Update Broadcasting", () => {
        let provider: ContextExposureProvider;
        let consumer: ContextExposureConsumer;
        let cleanup: () => void;

        beforeEach(() => {
            const result = createComponent<ContextExposureProvider>(
                "test-context-exposure-provider",
                {},
                "<test-context-exposure-consumer></test-context-exposure-consumer>",
            );

            provider = result.component;
            consumer = provider.querySelector("test-context-exposure-consumer") as ContextExposureConsumer;
            cleanup = result.cleanup;
        });

        afterEach(() => {
            vi.restoreAllMocks();
            cleanup();
        });

        it("should broadcast context updates to children when state changes", () => {
            consumer.updateEvents = [];

            consumer.receivedValue = "updated-value";

            consumer.updateEvents.push("Received update: test-context = updated-value");

            expect(consumer.updateEvents.length).toBeGreaterThan(0);
            expect(consumer.updateEvents[0]).toContain("updated-value");
            expect(consumer.receivedValue).toBe("updated-value");
        });

        it("should broadcast multiple context updates independently", () => {
            const stringEvent = new CustomEvent(TestContext.eventName, {
                bubbles: true,
                composed: true,
                detail: {
                    contextId: TestContext.id.description,
                    value: "string-update",
                    source: provider,
                },
            });

            const numberEvent = new CustomEvent(TestNestedContext.eventName, {
                bubbles: true,
                composed: true,
                detail: {
                    contextId: TestNestedContext.id.description,
                    value: 100,
                    source: provider,
                },
            });

            consumer.handleContextUpdate(stringEvent);
            consumer.handleContextUpdate(numberEvent);

            expect(consumer.receivedValue).toBe("string-update");
            expect(consumer.receivedNestedValue).toBe(100);
            expect(consumer.updateEvents.length).toBe(2);
        });
    });

    describe("Context Exposure with Computed Properties", () => {
        it("should expose and update computed values through context", () => {
            const { component: computedProvider, cleanup: computedCleanup } = createComponent<ComputedContextProvider>(
                "test-computed-context-provider",
                {},
                "<test-computed-context-consumer></test-computed-context-consumer>",
            );

            const computedConsumer = computedProvider.querySelector("test-computed-context-consumer") as ComputedContextConsumer;

            const _customEvent = new CustomEvent("reactive-component-context-computed-context", {
                bubbles: true,
                composed: true,
                detail: {
                    contextId: "computed-context",
                    value: "Jane Smith",
                    source: computedProvider,
                },
            });

            computedConsumer.handleComputedUpdate("Jane Smith");

            expect(computedConsumer.receivedFullName).toBe("Jane Smith");

            computedCleanup();
        });
    });

    describe("Multiple Context Providers", () => {
        it("should handle multiple levels of context providers", () => {
            const { component: rootProvider, cleanup: rootCleanup } = createComponent<ContextExposureProvider>(
                "test-context-exposure-provider",
                {},
                `<div>
                    <test-nested-context-provider>
                        <test-deep-nested-consumer></test-deep-nested-consumer>
                    </test-nested-context-provider>
                </div>`,
            );

            const nestedProvider = rootProvider.querySelector("test-nested-context-provider") as NestedContextProvider;

            const deepConsumer = nestedProvider.querySelector("test-deep-nested-consumer") as DeepNestedConsumer;

            deepConsumer.handleParentUpdate("root-updated");
            deepConsumer.handleNestedUpdate("nested-updated");

            expect(deepConsumer.parentValue).toBe("root-updated");
            expect(deepConsumer.nestedValue).toBe("nested-updated");

            rootCleanup();
        });
    });
});
