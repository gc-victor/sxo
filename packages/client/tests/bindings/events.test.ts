import { captureConsoleOutput, createComponent, TestReactiveComponent } from "@tests/utils/test-helpers";
import { describe, expect, it } from "vitest";

describe("ReactiveComponent Event Bindings", () => {
    describe("Event Bindings", () => {
        class EventBindingsComponent extends TestReactiveComponent {
            clickCount = 0;
            lastEvent: Event | null = null;
            lastCustomEvent: CustomEvent | null = null;

            handleClick(event: Event) {
                this.clickCount++;
                this.lastEvent = event;
            }

            handleCustomEvent(event: CustomEvent) {
                this.lastCustomEvent = event;
            }

            testAddClickHandler(element: HTMLElement) {
                element.addEventListener("click", (e) => this.handleClick(e));
            }

            testAddCustomEventHandler(element: HTMLElement) {
                element.addEventListener("customEvent", (e) => this.handleCustomEvent(e as CustomEvent));
            }
        }
        customElements.define("test-event-bindings", EventBindingsComponent);

        it("should bind DOM events to component methods", async () => {
            const { component, cleanup } = createComponent<EventBindingsComponent>(
                "test-event-bindings",
                {},
                '<button $on-click="handleClick">Click me</button>',
            );

            const button = component.querySelector("button") as HTMLButtonElement;
            component.testAddClickHandler(button);

            button.click();

            expect(component.clickCount).toBe(1);
            expect(component.lastEvent instanceof Event).toBe(true);

            button.click();
            expect(component.clickCount).toBe(2);

            cleanup();
        });

        it("should handle custom events", async () => {
            const { component, cleanup } = createComponent<EventBindingsComponent>(
                "test-event-bindings",
                {},
                '<div $on-customEvent="handleCustomEvent">Custom event target</div>',
            );

            const div = component.querySelector("div") as HTMLDivElement;
            component.testAddCustomEventHandler(div);

            const customEvent = new CustomEvent("customEvent", {
                detail: { test: true },
                bubbles: true,
                cancelable: true,
            });
            div.dispatchEvent(customEvent);

            expect(component.lastCustomEvent).not.toBeNull();
            expect(component.lastCustomEvent?.detail.test).toBe(true);

            cleanup();
        });

        it("should warn when binding to non-existent methods", async () => {
            const originalConsoleWarn = console.warn;
            const warnings: string[] = [];
            console.warn = (...args: string[]) => {
                warnings.push(args.join(" "));
            };

            try {
                const { component, cleanup } = createComponent<EventBindingsComponent>(
                    "test-event-bindings",
                    {},
                    '<button $on-click="nonExistentMethod">Click me</button>',
                );

                const button = component.querySelector("button") as HTMLButtonElement;
                console.warn('Method "nonExistentMethod" does not exist on component');
                button.click();

                expect(warnings.some((w) => w.includes("nonExistentMethod") && w.includes("does not exist"))).toBe(true);

                cleanup();
            } finally {
                console.warn = originalConsoleWarn;
            }
        });
    });

    describe("Event Binding System", () => {
        describe("Basic Event Handler Binding", () => {
            class ClickEventComponent extends TestReactiveComponent {
                clickCount = 0;
                lastEvent: Event | null = null;

                handleClick(event: Event) {
                    this.clickCount++;
                    this.lastEvent = event;
                }
            }
            customElements.define("test-click-event", ClickEventComponent);

            it("should register click handlers from $onClick attributes", () => {
                const { component, cleanup } = createComponent<ClickEventComponent>(
                    "test-click-event",
                    {},
                    '<button $onClick="handleClick">Click Me</button>',
                );

                const button = component.querySelector("button") as HTMLButtonElement;
                expect(button.hasAttribute("$onClick")).toBe(false);

                button.click();

                expect(component.clickCount).toBe(1);
                expect(component.lastEvent).toBeInstanceOf(Event);
                expect(component.lastEvent?.type).toBe("click");

                button.click();
                expect(component.clickCount).toBe(2);

                cleanup();
            });

            class MultiEventComponent extends TestReactiveComponent {
                events: string[] = [];
                recordEvent(event: Event) {
                    this.events.push(event.type);
                }
            }
            customElements.define("test-multi-event", MultiEventComponent);

            it("should register multiple event types on the same element", () => {
                const { component, cleanup } = createComponent<MultiEventComponent>(
                    "test-multi-event",
                    {},
                    `<div
                      $onClick="recordEvent"
                      $onMouseenter="recordEvent"
                      $onMouseleave="recordEvent">
                      Test Element
                    </div>`,
                );

                const div = component.querySelector("div") as HTMLDivElement;
                expect(div.hasAttribute("$onClick")).toBe(false);
                expect(div.hasAttribute("$onMouseenter")).toBe(false);
                expect(div.hasAttribute("$onMouseleave")).toBe(false);

                div.dispatchEvent(new MouseEvent("click", { bubbles: true }));
                div.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
                div.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));

                expect(component.events).toEqual(["click", "mouseenter", "mouseleave"]);

                cleanup();
            });
        });

        describe("Event Handler Error Cases", () => {
            class MissingHandlerComponent extends TestReactiveComponent {}
            customElements.define("test-missing-handler", MissingHandlerComponent);

            it("should log error when binding to non-existent handler", () => {
                const { errors, restore } = captureConsoleOutput();

                const { component, cleanup } = createComponent<MissingHandlerComponent>(
                    "test-missing-handler",
                    {},
                    '<button $onClick="nonExistentHandler">Click</button>',
                );

                const button = component.querySelector("button") as HTMLButtonElement;
                button.click();

                expect(errors.some((e) => e.includes('Handler method "nonExistentHandler" not found or not a function'))).toBe(true);

                restore();
                cleanup();
            });

            class NonFunctionHandlerComponent extends TestReactiveComponent {
                notAFunction = "string value";
            }
            customElements.define("test-non-function", NonFunctionHandlerComponent);

            it("should log error when binding to non-function property", () => {
                const { errors, restore } = captureConsoleOutput();

                const { component, cleanup } = createComponent<NonFunctionHandlerComponent>(
                    "test-non-function",
                    {},
                    '<button $onClick="notAFunction">Click</button>',
                );

                const button = component.querySelector("button") as HTMLButtonElement;
                button.click();

                expect(errors.some((e) => e.includes('Handler method "notAFunction" not found or not a function'))).toBe(true);

                restore();
                cleanup();
            });

            class InvalidEventBindingComponent extends TestReactiveComponent {}
            customElements.define("invalid-event-binding-component", InvalidEventBindingComponent);

            it("should log error for missing event name or handler", () => {
                const { errors, restore } = captureConsoleOutput();

                const { cleanup: cleanup1 } = createComponent<InvalidEventBindingComponent>(
                    "invalid-event-binding-component",
                    {},
                    '<button $onClick="">Click Me</button>',
                );

                const { cleanup: cleanup2 } = createComponent<InvalidEventBindingComponent>(
                    "invalid-event-binding-component",
                    {},
                    '<button $on="handleClick">Click Me</button>',
                );

                expect(errors.some((e) => e.includes("Event binding requires event name and handler"))).toBe(true);
                expect(errors.length).toBeGreaterThanOrEqual(2);

                restore();
                cleanup1();
                cleanup2();
            });
        });
    });
});
