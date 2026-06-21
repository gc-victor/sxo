import { type Context as RCContext, ReactiveComponent, type StateValue } from "./rc.js";

/**
 * A ReactiveComponent with public access to protected methods for define API
 */
export type Element = ReactiveComponent & {
    setState(key: string, value: unknown): void;
    getState(key: string): StateValue;
    compute<T extends StateValue[]>(key: string, sources: string[], computation: (...args: T) => StateValue): void;
    effect(callback: () => void): () => void;
    exposeContext(context: RCContext): void;
    consumeContext(context: RCContext): void;
    refs: Record<string, HTMLElement | undefined>;
    [key: string]: unknown;
};

/**
 * State proxy type with property-only API
 */
// biome-ignore lint/suspicious/noExplicitAny: $state is a proxy for any property.
export type State = Record<string, any>;

/**
 * Bind proxy type for method binding
 */
export type Bind = {
    [key: string]: ((...args: unknown[]) => unknown) | undefined;
};

/**
 * Custom binding handler function signature
 */
export type CustomBindingHandler = (params: { element: HTMLElement; rawValue: StateValue }) => void;

/**
 * Custom binding handlers object type
 */
export type CustomBindingHandlers = {
    [key: string]: CustomBindingHandler;
};

/**
 * Lifecycle methods that can be implemented in define components
 */
export interface LifecycleMethods {
    connected?: () => void;
    disconnected?: () => void;
    adopted?: () => void;
    attributeChanged?: (name: string, oldValue: string | null, newValue: string | null) => void;
}

/**
 * Define component return shape for lifecycle
 */
export type DefinitionReturn = Partial<LifecycleMethods>;

/**
 * Ref proxy type for element references
 */
export type Ref = {
    [key: string]: HTMLElement | undefined;
};

/**
 * Context object provided to define component definitions
 */
export interface Context {
    /**
     * Reference to the component instance with public method wrappers
     */
    $element: Element;

    /**
     * Element references with property-only API
     * - Access: $ref.refName
     */
    $ref: Ref;

    /**
     * State management with property-only API
     * - Property mode: $state.property or $state.property = value
     */
    $state: State;

    /**
     * Register an effect that runs after state changes.
     * Returns a cleanup function to remove the effect.
     */
    $effect: (callback: () => void) => () => void;

    /**
     * Compute a derived state value from sources.
     * - Usage: $compute(key, sources, computation)
     */
    $compute: <T extends StateValue[]>(key: string, sources: string[], computation: (...args: T) => StateValue) => void;

    /**
     * Bind methods to the component (identical to $on).
     * - Usage: $bind.methodName = () => { ... }
     * - NOTE: Prefer $bind for method handlers to match $bind-* attributes.
     */
    $bind: Bind;

    /**
     * Bind methods for $on* event attributes (alias of $bind).
     * - Usage: $on.methodName = () => { ... }
     * - NOTE: Prefer $on for event handlers to match $on* attributes.
     */
    $on: Bind;

    /**
     * Custom binding handlers for extending the binding system
     */
    $customBindingHandlers: CustomBindingHandlers;
}

/**
 * Define component definition function
 */
export type Definition = (this: Element, context: Context) => unknown;

/**
 * ReactiveComponent wrapper for define API
 */
class Define extends ReactiveComponent {
    // Lifecycle callback storage
    private connected?: () => void;
    private disconnected?: () => void;
    private adopted?: () => void;
    private attributeChanged?: (name: string, oldValue: string | null, newValue: string | null) => void;

    // Store custom binding handlers defined in the component
    private customHandlers: CustomBindingHandlers = {};

    // Store pending context consumptions to be processed when connected
    private pendingContexts: RCContext[] = [];

    // Public wrappers for protected methods
    public setState(key: string, value: unknown): void {
        super.setState(key, value);
    }

    public getState(key: string): StateValue {
        return super.getState(key);
    }

    public compute<T extends StateValue[]>(key: string, sources: string[], computation: (...args: T) => StateValue): void {
        super.compute(key, sources, computation);
    }

    public effect(callback: () => void): () => void {
        return super.effect(callback);
    }

    public exposeContext(context: RCContext): void {
        super.exposeContext(context);
    }

    public consumeContext(context: RCContext): void {
        // If already connected, consume immediately
        if (this.isConnected) {
            super.consumeContext(context);
        } else {
            // Otherwise queue for later
            this.pendingContexts.push(context);
        }
    }

    /**
     * Override customBindingHandlers to use stored handlers
     */
    protected override customBindingHandlers({
        element,
        rawValue,
    }: {
        stateKey?: string;
        element?: HTMLElement;
        formattedValue?: string;
        rawValue?: StateValue;
    }): Record<string, () => void> {
        const handlers: Record<string, () => void> = {};

        // Convert stored handlers to the format expected by ReactiveComponent
        for (const [key, handler] of Object.entries(this.customHandlers)) {
            handlers[key] = () => {
                if (element && rawValue !== undefined) {
                    handler({ element, rawValue });
                }
            };
        }

        return handlers;
    }

    /**
     * Initialize define component
     */
    constructor() {
        super();

        // Create a shared method-binding proxy before constructing the context.
        const methodBindingProxy: Bind = new Proxy({} as Bind, {
            set: (_target, prop: string | symbol, value: unknown): boolean => {
                if (typeof prop !== "string") return true;
                if (typeof value === "function") {
                    const boundMethod = (value as (...args: unknown[]) => unknown).bind(this);
                    Object.defineProperty(this, prop, {
                        value: boundMethod,
                        writable: true,
                        enumerable: true,
                        configurable: true,
                    });
                }
                return true;
            },
            get: (_target, prop: string | symbol): unknown => {
                if (typeof prop === "string") {
                    return (this as Record<string, unknown>)[prop];
                }
                return undefined;
            },
        });

        // Create context object
        const context: Context = {
            $element: this as unknown as Element,

            // Reference proxy with property-only API
            $ref: new Proxy({} as Ref, {
                get: (_target, prop: string | symbol): HTMLElement | undefined => {
                    if (typeof prop === "string") {
                        return (this as unknown as Element).refs[prop];
                    }
                    return undefined;
                },
                has: (_target, prop: string | symbol): boolean => {
                    if (typeof prop === "string") {
                        return (this as unknown as Element).refs[prop] !== undefined;
                    }
                    return false;
                },
            }),

            // State proxy with property-only API
            $state: new Proxy({} as Record<string, StateValue | undefined>, {
                get: (_target, prop: string | symbol): unknown => {
                    if (typeof prop === "string") {
                        const value = this.getState(prop);
                        return value === null ? undefined : value;
                    }
                    return undefined;
                },
                set: (_target, prop: string | symbol, value: unknown): boolean => {
                    if (typeof prop === "string") {
                        this.setState(prop, value);
                    }
                    return true;
                },
                has: (_target, prop: string | symbol): boolean => {
                    if (typeof prop === "string") {
                        const value = this.getState(prop);
                        return value !== undefined && value !== null;
                    }
                    return false;
                },
            }),

            // Effect registration wrapper - forwards to instance method
            $effect: (callback: () => void): (() => void) => {
                return this.effect(callback);
            },

            // Compute registration wrapper - forwards to instance method
            $compute: <T extends StateValue[]>(key: string, sources: string[], computation: (...args: T) => StateValue): void => {
                this.compute(key, sources, computation);
            },

            // Method binding proxy (shared by $bind and $on)
            $bind: methodBindingProxy,

            // Alias of $bind using the same proxy instance
            $on: methodBindingProxy,

            // Custom binding handlers
            $customBindingHandlers: new Proxy({} as CustomBindingHandlers, {
                set: (_target, prop: string | symbol, value: unknown): boolean => {
                    if (typeof prop === "string" && typeof value === "function") {
                        this.customHandlers[prop] = value as CustomBindingHandler;
                    }
                    return true;
                },
                get: (_target, prop: string | symbol): unknown => {
                    if (typeof prop === "string") {
                        return this.customHandlers[prop];
                    }
                    return undefined;
                },
            }),
        };

        // Get the definition function from the constructor
        const ctor = this.constructor as typeof Define & { __definition?: Definition };
        const definition = ctor.__definition;

        // biome-ignore lint/style/noNonNullAssertion: definition is set by define()
        const result = definition!.call(this as unknown as Element, context);
        const ret = (typeof result === "object" && result !== null ? result : {}) as DefinitionReturn;

        const { connected, disconnected, adopted, attributeChanged } = ret;

        if (connected) this.connected = connected;
        if (disconnected) this.disconnected = disconnected;
        if (adopted) this.adopted = adopted;
        if (attributeChanged) this.attributeChanged = attributeChanged;
    }

    // Override lifecycle methods to call define callbacks
    connectedCallback(): void {
        // Process any pending context consumptions first
        for (const context of this.pendingContexts) {
            super.consumeContext(context);
        }
        this.pendingContexts = [];

        super.connectedCallback();
        this.connected?.();
    }

    disconnectedCallback(): void {
        super.disconnectedCallback();
        this.disconnected?.();
    }

    adoptedCallback(): void {
        this.adopted?.();
    }

    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
        this.attributeChanged?.(name, oldValue, newValue);
    }

    // Static property to store definition
    static __definition?: Definition;
}

/**
 * Define a web component using the define context
 *
 * @param name The kebab-case name for the custom element
 * @param definition A named function that defines the component
 * @returns The custom element constructor
 *
 * @example
 * ```typescript
 * define("rc-counter", function Counter({ $state, $on, $effect, $compute, $ref }) {
 *     // Initialize state
 *     $state.count = 0;
 *
 *     // Bind methods for $on* event handlers (alias of $bind)
 *     $on.increment = () => {
 *         $state.count = ($state.count as number) + 1;
 *     };
 *
 *     // Create computed values
 *     $compute("doubleCount", ["count"], (count) => (count as number) * 2);
 *
 *     // Add effects
 *     $effect(() => {
 *         console.log("Count changed:", $state.count);
 *     });
 *
 *     // Access element references
 *     $on.focusInput = () => {
 *         const input = $ref.countInput;
 *         input?.focus();
 *     };
 *
 *     return {
 *         connected: () => {
 *             console.log("Counter connected!");
 *         },
 *     };
 * });
 * ```
 */
export function define(name: string, definition: Definition): CustomElementConstructor {
    const elementName = name;

    // Create a new class for this specific component
    class ComponentClass extends Define {
        static override __definition = definition;
    }

    // Register the custom element
    if (!customElements.get(elementName)) {
        customElements.define(elementName, ComponentClass as unknown as CustomElementConstructor);
    }

    return ComponentClass as unknown as CustomElementConstructor;
}

// Export for global access if needed
/* v8 ignore start */
if (typeof window !== "undefined") {
    (window as Window & { define?: typeof define }).define = define;
}
/* v8 ignore stop */
