import { afterEach, describe, expect, it, vi } from "vitest";
import { type Context, type Definition, define, type Element } from "../../src/define.js";
import { createFixture, simulateCheck, simulateEvent, simulateInput } from "../utils/test-helpers.js";

describe("Define", () => {
    let cleanup: (() => void) | null = null;

    afterEach(() => {
        cleanup?.();
        cleanup = null;
    });

    describe("Component Registration", () => {
        it("should register custom elements and handle re-registration", () => {
            const spy = vi.spyOn(customElements, "define");

            // Test basic registration
            const ComponentClass = define("test-registration", function TestRegistration({ $state }: Context) {
                $state.test = "value";
            });

            expect(customElements.get("test-registration")).toBeDefined();
            expect(ComponentClass).toBeDefined();

            // Test duplicate registration (should not re-register)
            define("test-registration", function TestRegistration({ $state }: Context) {
                $state.test = "value2";
            });

            // Should only be called once for the same name
            expect(spy).toHaveBeenCalledTimes(1);

            spy.mockRestore();
        });
    });

    describe("Core Functionality Integration", () => {
        it("should handle comprehensive state management, binding, and reactivity", () => {
            let effectRunCount = 0;
            let lastEffectValue: unknown;
            let methodCallCount = 0;
            let connectedCalled = false;

            define("comprehensive-test", function ComprehensiveTest({ $state, $bind, $effect, $compute }: Context) {
                // Initialize various state types
                $state.count = 0;
                $state.name = "John";
                $state.active = true;
                $state.items = [1, 2, 3];

                // Complex object state
                $state.user = {
                    firstName: "John",
                    lastName: "Doe",
                    age: 30,
                };

                // Computed properties
                $compute("doubleCount", ["count"], (count: unknown) => (count as number) * 2);
                $compute("fullName", ["user"], (user: unknown) => {
                    const u = user as { firstName: string; lastName: string };
                    return `${u.firstName} ${u.lastName}`;
                });

                // Effects
                $effect(() => {
                    effectRunCount++;
                    lastEffectValue = $state.count;
                });

                // Method binding
                $bind.increment = function (this: Element) {
                    this.setState("count", (this.getState("count") as number) + 1);
                };

                $bind.updateName = () => {
                    methodCallCount++;
                    $state.name = "Updated";
                };

                $bind.updateUser = () => {
                    $state.user = { ...($state.user as object), age: 31 } as unknown;
                };

                return {
                    connected: () => {
                        connectedCalled = true;
                    },
                };
            });

            const { root, cleanup: cleanupFn } = createFixture(`
                <comprehensive-test>
                    <span class="count" $bind-text="count"></span>
                    <span class="double" $bind-text="doubleCount"></span>
                    <span class="name" $bind-text="name"></span>
                    <span class="full" $bind-text="fullName"></span>
                    <button class="inc" $onclick="increment">Inc</button>
                    <button class="update" $onclick="updateName">Update</button>
                </comprehensive-test>
            `);
            cleanup = cleanupFn;

            const component = root.querySelector("comprehensive-test") as Element;
            const countSpan = component.querySelector(".count");
            const doubleSpan = component.querySelector(".double");
            const nameSpan = component.querySelector(".name");
            const fullSpan = component.querySelector(".full");
            const incBtn = component.querySelector(".inc") as HTMLElement;
            const updateBtn = component.querySelector(".update") as HTMLElement;

            // Test lifecycle
            expect(connectedCalled).toBe(true);

            // Test initial state and computed values
            expect(component.getState("count")).toBe(0);
            expect(component.getState("doubleCount")).toBe(0);
            expect(component.getState("fullName")).toBe("John Doe");
            expect(countSpan?.textContent).toBe("0");
            expect(doubleSpan?.textContent).toBe("0");
            expect(nameSpan?.textContent).toBe("John");
            expect(fullSpan?.textContent).toBe("John Doe");

            // Test initial effect run
            expect(effectRunCount).toBe(1);
            expect(lastEffectValue).toBe(0);

            // Test method binding and reactivity
            simulateEvent(incBtn, "click");
            expect(component.getState("count")).toBe(1);
            expect(component.getState("doubleCount")).toBe(2);
            expect(countSpan?.textContent).toBe("1");
            expect(doubleSpan?.textContent).toBe("2");
            expect(effectRunCount).toBe(2);
            expect(lastEffectValue).toBe(1);

            // Test another method
            simulateEvent(updateBtn, "click");
            expect(methodCallCount).toBe(1);
            expect(component.getState("name")).toBe("Updated");
            expect(nameSpan?.textContent).toBe("Updated");

            // Test complex state updates
            expect(component.getState("active")).toBe(true);
            expect((component.getState("items") as number[]).length).toBe(3);
        });

        it("should handle forms with two-way binding and validation", () => {
            let submitData: { username: string; email: string; agreed: boolean } | null = null;

            define("form-test", function FormTest({ $state, $bind, $compute }: Context) {
                $state.username = "";
                $state.email = "";
                $state.agreed = false;

                // Computed validation
                $compute("isValid", ["username", "email", "agreed"], (username, email, agreed) => {
                    return (username as string).length > 0 && (email as string).includes("@") && (agreed as boolean);
                });

                $bind.handleSubmit = (e: unknown) => {
                    (e as Event).preventDefault();
                    if ($state.isValid) {
                        submitData = {
                            username: $state.username as string,
                            email: $state.email as string,
                            agreed: $state.agreed as boolean,
                        };
                    }
                };
            });

            const { root, cleanup: cleanupFn } = createFixture(`
                <form-test>
                    <form $onsubmit="handleSubmit">
                        <input type="text" class="username" $bind-value="username" />
                        <input type="email" class="email" $bind-value="email" />
                        <input type="checkbox" class="agreed" $bind-checked="agreed" />
                        <span class="valid" $bind-text="isValid"></span>
                        <button type="submit">Submit</button>
                    </form>
                </form-test>
            `);
            cleanup = cleanupFn;

            const component = root.querySelector("form-test") as Element;
            const usernameInput = component.querySelector(".username") as HTMLInputElement;
            const emailInput = component.querySelector(".email") as HTMLInputElement;
            const checkbox = component.querySelector(".agreed") as HTMLInputElement;
            const validSpan = component.querySelector(".valid");
            const form = component.querySelector("form") as HTMLFormElement;

            // Initially invalid
            expect(component.getState("isValid")).toBe(false);
            expect(validSpan?.textContent).toBe("false");

            // Fill form
            simulateInput(usernameInput, "john");
            simulateInput(emailInput, "john@example.com");
            simulateCheck(checkbox, true);

            // Should be valid now
            expect(component.getState("isValid")).toBe(true);
            expect(validSpan?.textContent).toBe("true");

            // Submit form
            // Create and dispatch a proper submit event
            const submitEvent = new Event("submit", { bubbles: true, cancelable: true });
            form.dispatchEvent(submitEvent);
            expect(submitData).toEqual({
                username: "john",
                email: "john@example.com",
                agreed: true,
            });
        });

        it("should handle $state and $bind proxy edge branches", () => {
            // Captured variables to assert after component instantiation
            let nullCoerced: unknown;
            let symbolGet: unknown;
            let symbolHas: boolean | null = null;
            let bindExistingIsFunction: boolean | null = null;
            let bindExistingCallResult: unknown;
            let bindNonExistingIsUndefined: boolean | null = null;
            let bindSymbolGet: unknown;

            define("proxy-probe", function ProxyProbe({ $state, $bind }: Context) {
                $state.nullish = null;
                // Directly read via the proxy get-trap after setting null; should yield undefined
                nullCoerced = ($state as Record<string, unknown>).nullish;

                // Proxy with symbol key - non-string key path returns false
                const sym = Symbol("s");
                symbolGet = Reflect.get($state as object, sym);
                symbolHas = Reflect.has($state as object, sym);

                $bind.sample = () => "ok";
                const existing = Reflect.get($bind as object, "sample") as unknown;
                bindExistingIsFunction = typeof existing === "function";
                bindExistingCallResult = typeof existing === "function" ? (existing as () => unknown)() : undefined;

                const missing = Reflect.get($bind as object, "nope") as unknown;
                bindNonExistingIsUndefined = missing === undefined;

                const symB = Symbol("b");
                bindSymbolGet = Reflect.get($bind as object, symB) as unknown;
            });

            const { root, cleanup: cleanupFn } = createFixture("<proxy-probe></proxy-probe>");
            cleanup = cleanupFn;

            // Ensure element is instantiated (constructor + define context executed)
            const el = root.querySelector("proxy-probe");
            expect(el).toBeTruthy();

            // Assertions for edge branches
            expect(nullCoerced).toBeUndefined();
            expect(symbolGet).toBeUndefined();
            expect(symbolHas).toBe(false);

            expect(bindExistingIsFunction).toBe(true);
            expect(bindExistingCallResult).toBe("ok");
            expect(bindNonExistingIsUndefined).toBe(true);
            expect(bindSymbolGet).toBeUndefined();
        });
    });

    describe("Advanced Features", () => {
        it("should handle lifecycle callbacks and attribute changes", () => {
            let connectedCalled = false;
            let disconnectedCalled = false;
            let adoptedCalled = false;
            let attributeChangedArgs: [string, string | null, string | null] | null = null;

            const def = function LifecycleTest({ $state }: Context) {
                $state.initialized = false;

                return {
                    connected: () => {
                        connectedCalled = true;
                        $state.initialized = true;
                    },
                    disconnected: () => {
                        disconnectedCalled = true;
                    },
                    adopted: () => {
                        adoptedCalled = true;
                    },
                    attributeChanged: (name: string, oldValue: string | null, newValue: string | null) => {
                        attributeChangedArgs = [name, oldValue, newValue];
                    },
                };
            } as Definition;

            define("lifecycle-test", def);

            const { root, cleanup: cleanupFn } = createFixture(`
                <lifecycle-test>
                    <span $bind-text="initialized"></span>
                </lifecycle-test>
            `);
            cleanup = cleanupFn;

            const component = root.querySelector("lifecycle-test") as Element;
            const span = component.querySelector("span");

            // Test connected callback
            expect(connectedCalled).toBe(true);
            expect(component.getState("initialized")).toBe(true);
            expect(span?.textContent).toBe("true");

            // Test attribute change
            const htmlComponent = component as HTMLElement & {
                attributeChangedCallback?: (name: string, oldValue: string | null, newValue: string | null) => void;
                adoptedCallback?: () => void;
            };

            component.setAttribute("test-attr", "new-value");
            htmlComponent.attributeChangedCallback?.("test-attr", null, "new-value");
            expect(attributeChangedArgs).toEqual(["test-attr", null, "new-value"]);

            // Test adopted callback
            htmlComponent.adoptedCallback?.();
            expect(adoptedCalled).toBe(true);

            // Test disconnected callback
            component.remove();
            expect(disconnectedCalled).toBe(true);
        });

        it("should handle element access, custom properties, and edge cases", () => {
            let elementRef: Element | null = null;
            let effectCleanupCalled = false;
            let undefinedValue: unknown;
            let hasExistingProp = false;
            let hasNonExistingProp = false;

            define("advanced-test", function AdvancedTest({ $element, $state, $bind, $effect }: Context) {
                // Element access
                elementRef = $element;

                // Custom properties
                $element.customProp = "custom value";
                $element.customMethod = () => "result";

                // Edge cases
                undefinedValue = $state.nonExistent;
                $state.nullValue = null;
                $state.existingValue = "exists";

                hasExistingProp = "existingValue" in $state;
                hasNonExistingProp = "nonExistingValue" in $state;

                // Effect with cleanup
                const cleanup = $effect(() => {
                    // Effect runs
                });

                // Test cleanup
                setTimeout(() => {
                    cleanup();
                    effectCleanupCalled = true;
                }, 0);

                // Method overriding test
                $bind.method = () => "first";
                $bind.method = () => "second"; // Should override

                // Direct state manipulation
                $state.count = 5;
                $element.setState("direct", "value");
            });

            const { root, cleanup: cleanupFn } = createFixture(`
                <advanced-test>
                    <button $onclick="method">Test</button>
                </advanced-test>
            `);

            const component = root.querySelector("advanced-test") as Element;

            // Test element access
            expect(elementRef).toBe(component);

            // Test custom properties
            expect(component.customProp).toBe("custom value");
            expect((component.customMethod as () => string)()).toBe("result");

            // Test state edge cases
            expect(undefinedValue).toBe(undefined);
            expect(hasExistingProp).toBe(true);
            expect(hasNonExistingProp).toBe(false);

            // Test state values
            expect(component.getState("count")).toBe(5);
            expect(component.getState("direct")).toBe("value");
            expect(component.getState("nullValue")).toBe(null);

            // Test method overriding
            const button = component.querySelector("button");
            if (button) {
                simulateEvent(button, "click");
                // Should call the overridden method (second one)
                expect((component as { method?: () => string }).method?.()).toBe("second");
            }

            cleanup = cleanupFn;

            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    expect(effectCleanupCalled).toBe(true);
                    resolve();
                }, 10);
            });
        });

        it("should handle empty components and minimal definitions", () => {
            define("empty-test", function EmptyTest(_: Context) {
                // Minimal component
            });

            const { root, cleanup: cleanupFn } = createFixture("<empty-test></empty-test>");
            cleanup = cleanupFn;

            const component = root.querySelector("empty-test");
            expect(component).toBeDefined();
            expect(component?.tagName.toLowerCase()).toBe("empty-test");
        });
    });

    describe("Reference Integration", () => {
        it("should handle element references through $ref function", () => {
            let headerRef: HTMLElement | null = null;
            let contentRef: HTMLElement | null = null;

            define("ref-integration", function RefIntegration({ $ref }: Context) {
                // Access refs after DOM is processed
                setTimeout(() => {
                    headerRef = $ref.header || null;
                    contentRef = $ref.content || null;
                }, 0);
            });

            const { cleanup: cleanupFn } = createFixture(`
                <ref-integration>
                    <div $ref="header">Header Content</div>
                    <div $ref="content">Main Content</div>
                </ref-integration>
            `);
            cleanup = cleanupFn;

            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    expect(headerRef).toBeDefined();
                    expect(headerRef?.textContent).toBe("Header Content");
                    expect(contentRef).toBeDefined();
                    expect(contentRef?.textContent).toBe("Main Content");
                    resolve();
                }, 10);
            });
        });
    });

    describe("Custom Binding Handlers", () => {
        it("should allow defining custom binding handlers", () => {
            define("custom-binding-test", function CustomBindingTest({ $state, $customBindingHandlers }: Context) {
                $state.activeTab = "tab1";

                // Define custom binding handler
                $customBindingHandlers["tab-trigger"] = ({ element, rawValue }) => {
                    if (!(element instanceof HTMLElement)) return;
                    const name = element.dataset.name;
                    if (!name) return;

                    const isActive = rawValue === name;
                    element.setAttribute("aria-selected", isActive ? "true" : "false");
                    element.tabIndex = isActive ? 0 : -1;
                };
            });

            const { root, cleanup: cleanupFn } = createFixture(`
                <custom-binding-test>
                    <button data-name="tab1" $bind-tab-trigger="activeTab">Tab 1</button>
                    <button data-name="tab2" $bind-tab-trigger="activeTab">Tab 2</button>
                </custom-binding-test>
            `);
            cleanup = cleanupFn;

            const component = root.querySelector("custom-binding-test") as Element;
            const tab1 = component.querySelector('[data-name="tab1"]') as HTMLElement;
            const tab2 = component.querySelector('[data-name="tab2"]') as HTMLElement;

            // Initial state - tab1 should be active
            expect(tab1.getAttribute("aria-selected")).toBe("true");
            expect(tab1.tabIndex).toBe(0);
            expect(tab2.getAttribute("aria-selected")).toBe("false");
            expect(tab2.tabIndex).toBe(-1);

            // Change state to tab2
            component.setState("activeTab", "tab2");

            // tab2 should now be active
            expect(tab1.getAttribute("aria-selected")).toBe("false");
            expect(tab1.tabIndex).toBe(-1);
            expect(tab2.getAttribute("aria-selected")).toBe("true");
            expect(tab2.tabIndex).toBe(0);
        });

        it("should handle multiple custom binding handlers", () => {
            define("multi-binding-test", function MultiBindingTest({ $state, $customBindingHandlers }: Context) {
                $state.progress = 50;
                $state.status = "active";

                // Custom progress binding
                $customBindingHandlers.progress = ({ element, rawValue }) => {
                    if (element instanceof HTMLProgressElement) {
                        element.value = Number(rawValue) || 0;
                        element.max = 100;
                    }
                };

                // Custom status binding
                $customBindingHandlers.status = ({ element, rawValue }) => {
                    if (!(element instanceof HTMLElement)) return;
                    element.dataset.status = String(rawValue);
                };
            });

            const { root, cleanup: cleanupFn } = createFixture(`
                <multi-binding-test>
                    <progress $bind-progress="progress"></progress>
                    <div $bind-status="status"></div>
                </multi-binding-test>
            `);
            cleanup = cleanupFn;

            const component = root.querySelector("multi-binding-test") as Element;
            const progressBar = component.querySelector("progress") as HTMLProgressElement;
            const statusDiv = component.querySelector("div") as HTMLElement;

            // Initial state
            expect(progressBar.value).toBe(50);
            expect(progressBar.max).toBe(100);
            expect(statusDiv.dataset.status).toBe("active");

            // Update state
            component.setState("progress", 75);
            component.setState("status", "complete");

            // Verify updates
            expect(progressBar.value).toBe(75);
            expect(statusDiv.dataset.status).toBe("complete");
        });

        it("should handle edge cases for custom binding handlers", () => {
            define("edge-binding-test", function EdgeBindingTest({ $state, $customBindingHandlers }: Context) {
                $state.value = "test";

                // Handler that returns early for non-HTMLElement
                $customBindingHandlers.strict = ({ element, rawValue }) => {
                    if (!(element instanceof HTMLElement)) return;
                    element.dataset.value = String(rawValue);
                };

                // Handler that uses complex logic
                $customBindingHandlers.complex = ({ element, rawValue }) => {
                    if (!(element instanceof HTMLElement)) return;
                    const numValue = Number(rawValue);
                    if (!Number.isNaN(numValue)) {
                        element.style.width = `${numValue}%`;
                    }
                };
            });

            const { root, cleanup: cleanupFn } = createFixture(`
                <edge-binding-test>
                    <div $bind-strict="value"></div>
                    <div $bind-complex="value"></div>
                </edge-binding-test>
            `);
            cleanup = cleanupFn;

            const component = root.querySelector("edge-binding-test") as Element;
            const strictDiv = component.querySelector("div:first-child") as HTMLElement;

            expect(strictDiv.dataset.value).toBe("test");
        });
    });

    describe("Context Integration", () => {
        it("should expose and consume context between components using define API", () => {
            const themeContext = { id: Symbol("theme"), eventName: "reactive-component-context-theme", state: "theme" };

            define("ctx-provider", function CtxProvider({ $state, $element }: Context) {
                $state.theme = "light";
                $element.exposeContext(themeContext);
            });

            define("ctx-consumer", function CtxConsumer({ $element }: Context) {
                $element.consumeContext(themeContext);
            });

            const { root, cleanup: cleanupFn } = createFixture(`
                <ctx-provider>
                    <ctx-consumer></ctx-consumer>
                </ctx-provider>
            `);
            cleanup = cleanupFn;

            const provider = root.querySelector("ctx-provider") as Element;
            const consumer = root.querySelector("ctx-consumer") as Element;

            // Context should be consumed
            expect(consumer.getState("theme")).toBe("light");

            // Update in provider should propagate
            provider.setState("theme", "dark");
            expect(consumer.getState("theme")).toBe("dark");
        });

        it("should consume context immediately when component is already connected", () => {
            const dataContext = { id: Symbol("data"), eventName: "reactive-component-context-data", state: "data" };

            define("late-provider", function LateProvider({ $state, $element }: Context) {
                $state.data = "initial";
                $element.exposeContext(dataContext);
            });

            define("late-consumer", function LateConsumer({ $element }: Context) {
                // Intentionally consume context in connected callback
                return {
                    connected: () => {
                        // Component is now connected, this should trigger immediate consumption
                        $element.consumeContext(dataContext);
                    },
                };
            });

            const { root, cleanup: cleanupFn } = createFixture(`
                <late-provider>
                    <late-consumer></late-consumer>
                </late-provider>
            `);
            cleanup = cleanupFn;

            const provider = root.querySelector("late-provider") as Element;
            const consumer = root.querySelector("late-consumer") as Element;

            // Context should be consumed even when called after connection
            expect(consumer.getState("data")).toBe("initial");

            // Update should still propagate
            provider.setState("data", "updated");
            expect(consumer.getState("data")).toBe("updated");
        });
    });

    describe("$on Alias", () => {
        it("should bind methods via $on and update state when invoked", () => {
            define("rc-on-alias", function OnAlias({ $state, $on }: Context) {
                $state.count = 0;
                $on.increment = () => {
                    $state.count = ($state.count as number) + 1;
                };
            });

            const { root, cleanup: cleanupFn } = createFixture(`
                <rc-on-alias>
                    <button $onclick="increment">+</button>
                    <span $bind-text="count"></span>
                </rc-on-alias>
            `);
            cleanup = cleanupFn;

            const component = root.querySelector("rc-on-alias") as Element;
            const button = component.querySelector("button") as HTMLElement;
            const span = component.querySelector("span");

            // Initial state
            expect(component.getState("count")).toBe(0);
            expect(span?.textContent).toBe("0");

            // Verify method exists
            expect((component as { increment?: () => void }).increment).toBeTypeOf("function");

            // Trigger increment via event
            simulateEvent(button, "click");

            // State should update
            expect(component.getState("count")).toBe(1);
            expect(span?.textContent).toBe("1");
        });

        it("should share the same proxy instance between $on and $bind", () => {
            let onMethod: unknown;
            let bindMethod: unknown;

            define("rc-on-bind-sync", function OnBindSync({ $on, $bind }: Context) {
                // Set method via $on
                $on.testMethod = () => "via-on";

                // Read via $bind - should get the same method
                bindMethod = $bind.testMethod;

                // Set method via $bind
                $bind.otherMethod = () => "via-bind";

                // Read via $on - should get the same method
                onMethod = $on.otherMethod;
            });

            const { root, cleanup: cleanupFn } = createFixture("<rc-on-bind-sync></rc-on-bind-sync>");
            cleanup = cleanupFn;

            const component = root.querySelector("rc-on-bind-sync") as Element;

            // Both should exist and work
            expect(typeof bindMethod).toBe("function");
            expect(typeof onMethod).toBe("function");
            expect((bindMethod as () => string)()).toBe("via-on");
            expect((onMethod as () => string)()).toBe("via-bind");

            // Methods should also be on the component
            expect((component as { testMethod?: () => string }).testMethod?.()).toBe("via-on");
            expect((component as { otherMethod?: () => string }).otherMethod?.()).toBe("via-bind");
        });

        it("should ignore non-function values in $on proxy", () => {
            define("rc-on-non-func", function OnNonFunc({ $on }: Context) {
                // biome-ignore lint/suspicious/noExplicitAny: Testing non-function assignment
                ($on as any).notAFunction = "string value";
                // biome-ignore lint/suspicious/noExplicitAny: Testing non-function assignment
                ($on as any).alsoNotAFunction = 123;
            });

            const { root, cleanup: cleanupFn } = createFixture("<rc-on-non-func></rc-on-non-func>");
            cleanup = cleanupFn;

            const component = root.querySelector("rc-on-non-func") as Element & Record<string, unknown>;

            // Non-function values should not be bound
            expect(component.notAFunction).toBeUndefined();
            expect(component.alsoNotAFunction).toBeUndefined();
        });

        it("should handle symbol keys gracefully in $on proxy", () => {
            let symbolGet: unknown;

            define("rc-on-symbol", function OnSymbol({ $on }: Context) {
                const sym = Symbol("test");
                symbolGet = Reflect.get($on as object, sym);

                // Attempting to set via symbol should be ignored
                Reflect.set($on as object, sym, () => "symbol-value");
            });

            const { root, cleanup: cleanupFn } = createFixture("<rc-on-symbol></rc-on-symbol>");
            cleanup = cleanupFn;

            const el = root.querySelector("rc-on-symbol");
            expect(el).toBeTruthy();

            // Symbol get should return undefined
            expect(symbolGet).toBeUndefined();
        });
    });

    describe("Proxy Edge Cases", () => {
        it("should handle non-string (symbol) keys in proxies", () => {
            let refSymbolGet: unknown;
            let refSymbolHas: boolean | null = null;
            let refStringHas: boolean | null = null;
            let handlerSymbolGet: unknown;
            let handlerStringGet: unknown;

            define("proxy-edge-test", function ProxyEdgeTest({ $ref, $customBindingHandlers }: Context) {
                // Add a handler to test get trap with string
                $customBindingHandlers.testHandler = ({ element }) => {
                    (element as HTMLElement).dataset.test = "value";
                };

                const sym = Symbol("test");

                // Test $ref proxy with symbol keys
                refSymbolGet = Reflect.get($ref as object, sym);
                refSymbolHas = Reflect.has($ref as object, sym);

                // Test $ref has trap with non-existent string key
                refStringHas = Reflect.has($ref as object, "nonExistent");

                // Test $customBindingHandlers proxy with both symbol and string keys
                handlerSymbolGet = Reflect.get($customBindingHandlers as object, sym);
                handlerStringGet = Reflect.get($customBindingHandlers as object, "testHandler");
            });

            const { root, cleanup: cleanupFn } = createFixture(`
                <proxy-edge-test>
                    <div $ref="existingRef">Test</div>
                </proxy-edge-test>
            `);
            cleanup = cleanupFn;

            const el = root.querySelector("proxy-edge-test");
            expect(el).toBeTruthy();

            // Proxies should safely ignore non-string keys
            expect(refSymbolGet).toBeUndefined();
            expect(refSymbolHas).toBe(false);
            expect(handlerSymbolGet).toBeUndefined();

            // String key (non-existent ref) should return false via has trap
            expect(refStringHas).toBe(false);

            // String key (existing handler) should return the handler function
            expect(typeof handlerStringGet).toBe("function");
        });
    });

    describe("Proxy Uncovered Branches", () => {
        it("should skip custom handler when rawValue is undefined", () => {
            let handlerCallCount = 0;
            const callValues: unknown[] = [];

            define("undefined-rawvalue-test", function UndefinedRawValueTest({ $state, $compute, $customBindingHandlers }: Context) {
                // State controls whether computed returns undefined or a value
                $state.enabled = true;

                // Computed returns "active" when enabled, undefined when disabled
                $compute("maybeValue", ["enabled"], (enabled) => {
                    return enabled ? "active" : undefined;
                });

                $customBindingHandlers["undefined-check"] = ({ element, rawValue }) => {
                    handlerCallCount++;
                    callValues.push(rawValue);
                    if (element instanceof HTMLElement) {
                        element.dataset.calls = String(handlerCallCount);
                    }
                };
            });

            const { root, cleanup: cleanupFn } = createFixture(`
                <undefined-rawvalue-test>
                    <div $bind-undefined-check="maybeValue">Test</div>
                </undefined-rawvalue-test>
            `);
            cleanup = cleanupFn;

            const component = root.querySelector("undefined-rawvalue-test") as Element;
            expect(component).toBeTruthy();

            // Handler called once during binding setup with initial value "active"
            expect(handlerCallCount).toBe(1);
            expect(callValues[0]).toBe("active");

            // Disable - computed returns undefined, handler should NOT be called
            component.setState("enabled", false);

            // Handler call count should remain 1 (undefined value skipped)
            expect(handlerCallCount).toBe(1);

            // Re-enable - computed returns "active", handler called again
            component.setState("enabled", true);

            expect(handlerCallCount).toBe(2);
            expect(callValues[1]).toBe("active");
        });

        it("should handle customBindingHandlers when element or rawValue is missing", () => {
            define("custom-handler-edge-test", function CustomHandlerEdgeTest({ $state, $customBindingHandlers }: Context) {
                $state.testValue = "test";

                $customBindingHandlers["test-handler"] = ({ element, rawValue }) => {
                    if (element instanceof HTMLElement) {
                        element.dataset.value = String(rawValue);
                    }
                };
            });

            const { root, cleanup: cleanupFn } = createFixture(`
                <custom-handler-edge-test>
                    <div $bind-test-handler="testValue">Test</div>
                </custom-handler-edge-test>
            `);
            cleanup = cleanupFn;

            const component = root.querySelector("custom-handler-edge-test") as Element;
            expect(component).toBeTruthy();

            // The handler should have been called with element and rawValue
            const div = component.querySelector("div") as HTMLElement;
            expect(div.dataset.value).toBe("test");
        });

        it("should ignore symbol keys in $state proxy set", () => {
            let setResult = false;

            define("state-symbol-set", function StateSymbolSet({ $state }: Context) {
                const sym = Symbol("test");
                setResult = Reflect.set($state as object, sym, "value");

                $state.normalKey = "normalValue";
            });

            const { root, cleanup: cleanupFn } = createFixture("<state-symbol-set></state-symbol-set>");
            cleanup = cleanupFn;

            const component = root.querySelector("state-symbol-set") as Element;
            expect(component).toBeTruthy();

            // Set operation should return true (proxy returns true)
            expect(setResult).toBe(true);

            // Normal key should be set
            expect(component.getState("normalKey")).toBe("normalValue");
        });

        it("should ignore invalid handler assignments in $customBindingHandlers", () => {
            let stringNonFuncResult = false;
            let symbolKeyResult = false;

            define("handler-invalid-set", function HandlerInvalidSet({ $state, $customBindingHandlers }: Context) {
                $state.test = "testValue";

                // Try to set with string key but non-function value
                stringNonFuncResult = Reflect.set($customBindingHandlers as object, "stringKey", "not a function");

                // Try to set with symbol key
                const sym = Symbol("handler");
                symbolKeyResult = Reflect.set($customBindingHandlers as object, sym, () => "value");

                // Valid handler should still work
                $customBindingHandlers["valid-handler"] = ({ element, rawValue }) => {
                    if (element instanceof HTMLElement) {
                        element.dataset.valid = String(rawValue);
                    }
                };
            });

            const { root, cleanup: cleanupFn } = createFixture(`
                <handler-invalid-set>
                    <div $bind-valid-handler="test">Content</div>
                </handler-invalid-set>
            `);
            cleanup = cleanupFn;

            const component = root.querySelector("handler-invalid-set") as Element;
            expect(component).toBeTruthy();

            // Set operations should return true (proxy returns true)
            expect(stringNonFuncResult).toBe(true);
            expect(symbolKeyResult).toBe(true);

            // Valid handler should have been called
            const div = component.querySelector("div") as HTMLElement;
            expect(div.dataset.valid).toBe("testValue");
        });

        it("should initialize state in constructor when definition is provided", () => {
            define("constructor-init-test", function ConstructorInitTest({ $state }: Context) {
                $state.value = "test";
            });

            const { root, cleanup: cleanupFn } = createFixture("<constructor-init-test></constructor-init-test>");
            cleanup = cleanupFn;

            const component = root.querySelector("constructor-init-test") as Element;
            expect(component).toBeTruthy();
            expect(component.getState("value")).toBe("test");
        });
    });
});
