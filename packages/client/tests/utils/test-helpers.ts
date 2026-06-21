import { type Context, ReactiveComponent, type StateValue } from "../../src/index";

/**
 * Types of events to simulate
 */
export type EventType = "click" | "input" | "change" | "focus" | "blur" | "keydown" | "keyup";

/**
 * Creates a test fixture from HTML string and returns the root element
 * @param html The HTML content to create the fixture from
 * @returns The root element of the fixture and a cleanup function
 */
export function createFixture(html: string): {
    root: HTMLElement;
    cleanup: () => void;
} {
    const container = document.createElement("div");
    container.innerHTML = html.trim();
    document.body.appendChild(container);

    return {
        root: container,
        cleanup: () => {
            document.body.removeChild(container);
        },
    };
}

// Base test class that exposes protected methods of ReactiveComponent
// for testing purposes by providing public wrapper methods
// around protected functionality like setState and context management
export class TestReactiveComponent extends ReactiveComponent {
    testSetState(key: string, value: unknown) {
        return super.setState(key, value);
    }

    testGetState(key: string) {
        return super.getState(key);
    }

    testConsumeContext(context: Context) {
        return super.consumeContext(context);
    }

    testExposeContext(context: Context) {
        return super.exposeContext(context);
    }

    testCompute<T extends StateValue>(key: string, sources: string[], computation: (...args: T[]) => StateValue) {
        return super.compute(key, sources, computation);
    }

    get testRefs() {
        return this.refs;
    }
}

/**
 * Creates and attaches a component instance for testing
 * @param tagName The custom element tag name
 * @param attributes Optional attributes to set on the element
 * @param innerHTML Optional inner HTML content
 * @returns The component instance and a cleanup function
 */
export function createComponent<T extends ReactiveComponent>(
    tagName: string,
    attributes: Record<string, string> = {},
    innerHTML = "",
): {
    component: T;
    cleanup: () => void;
} {
    const el = document.createElement(tagName);

    // Set attributes
    for (const [name, value] of Object.entries(attributes)) {
        el.setAttribute(name, value);
    }

    // Set inner HTML if provided
    if (innerHTML) {
        el.innerHTML = innerHTML;
    }

    // Initialize component by adding to document
    document.body.appendChild(el);

    // Get the component instance and ensure it's properly initialized
    const component = el as T;

    // Give it a chance to initialize if not already done
    if (typeof component.connectedCallback === "function") {
        component.connectedCallback();
    }

    // Initialize collections if not already done
    if (!Object.hasOwn(component, "state")) {
        Object.assign(component, {
            state: new Map(),
            derived: new Map(),
            exposedContexts: new Map(),
            contextSubscriptions: new Map(),
            bindings: new Map(),
            observers: new Map(),
            stateElements: new Map(),
            refs: {},
        });
    }

    return {
        component,
        cleanup: () => {
            document.body.removeChild(el);
        },
    };
}

/**
 * Simulates an event on a DOM element
 * @param element The element to dispatch the event on
 * @param eventType The type of event to simulate
 * @param eventInit Optional event initialization parameters
 */
export function simulateEvent(element: HTMLElement, eventType: EventType, eventInit: EventInit = {}): void {
    const event = new Event(eventType, {
        bubbles: true,
        cancelable: true,
        ...eventInit,
    });

    element.dispatchEvent(event);
}

/**
 * Simulates user input on form elements
 * @param element The input element
 * @param value The value to set
 */
export function simulateInput(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string): void {
    // Set the value
    element.value = value;

    // Dispatch input event
    simulateEvent(element, "input");

    // Dispatch change event
    simulateEvent(element, "change");
}

/**
 * Simulates a checkbox change
 * @param element The checkbox element
 * @param checked The checked state to set
 */
export function simulateCheck(element: HTMLInputElement, checked: boolean): void {
    // Set checked state
    element.checked = checked;

    // Dispatch change event
    simulateEvent(element, "change");
}

/**
 * Captures all console output during test execution
 */
export function captureConsoleOutput(): {
    logs: string[];
    errors: string[];
    warnings: string[];
    clear: () => void;
    restore: () => void;
} {
    const logs: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    console.log = (...args: unknown[]) => {
        logs.push(args.join(" "));
    };

    console.error = (...args: unknown[]) => {
        errors.push(args.join(" "));
    };

    console.warn = (...args: unknown[]) => {
        warnings.push(args.join(" "));
    };

    return {
        logs,
        errors,
        warnings,
        clear: () => {
            logs.length = 0;
            errors.length = 0;
            warnings.length = 0;
        },
        restore: () => {
            console.log = originalConsoleLog;
            console.error = originalConsoleError;
            console.warn = originalConsoleWarn;
        },
    };
}
